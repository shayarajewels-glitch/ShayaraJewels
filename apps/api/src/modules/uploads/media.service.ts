import type { Types } from 'mongoose';
import { UTApi } from 'uploadthing/server';
import { getConfig } from '../../config/env';
import { getLogger } from '../../config/logger';
import { BlogModel, CategoryImageModel, CouponModel, MediaAssetModel, ProductModel } from '../../models';
import { badRequest } from '../../utils/errors';

/** Hosts that serve UploadThing files. Videos (and any file with a key) must come from these. */
const ALLOWED_MEDIA_HOSTS = [/^utfs\.io$/, /^[a-z0-9]+\.ufs\.sh$/i];

/**
 * Site paths and UploadThing links are always allowed. With `anyHost`, an image
 * may also be a direct https link hosted elsewhere (pasted by an admin).
 */
export function assertAllowedMediaUrl(url: string, field: string, { anyHost = false } = {}): void {
  if (url.startsWith('/')) return;
  let host: string;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:') throw new Error('not https');
    host = parsed.hostname;
  } catch {
    throw badRequest('Media URLs must be https links to uploaded files', 'INVALID_MEDIA', [{ path: field, message: 'Invalid media URL' }]);
  }
  if (!anyHost && !ALLOWED_MEDIA_HOSTS.some((re) => re.test(host))) {
    throw badRequest('Media must be uploaded through the admin uploader', 'INVALID_MEDIA', [
      { path: field, message: `Host ${host} is not an allowed media host` },
    ]);
  }
}

export interface MediaRefs {
  images: { url: string; key?: string }[];
  videos: { url: string; key?: string; thumbnailUrl?: string; thumbnailKey?: string }[];
}

export function collectKeys(media: MediaRefs): string[] {
  const keys = [
    ...media.images.map((i) => i.key),
    ...media.videos.flatMap((v) => [v.key, v.thumbnailKey]),
  ].filter((k): k is string => Boolean(k));
  return [...new Set(keys)];
}

export function validateMediaUrls(media: Partial<MediaRefs>): void {
  media.images?.forEach((img, i) => assertAllowedMediaUrl(img.url, `images.${i}.url`, { anyHost: !img.key }));
  media.videos?.forEach((v, i) => {
    assertAllowedMediaUrl(v.url, `videos.${i}.url`);
    if (v.thumbnailUrl) assertAllowedMediaUrl(v.thumbnailUrl, `videos.${i}.thumbnailUrl`);
  });
}

/** Every referenced file key must be a tracked upload that is unattached or already attached to this product. */
export async function assertKeysAttachable(keys: string[], productId: Types.ObjectId | null): Promise<void> {
  if (keys.length === 0) return;
  const assets = await MediaAssetModel.find({ key: { $in: keys }, status: { $ne: 'deleted' } }).lean();
  const usable = new Set(
    assets
      .filter((a) => a.status === 'pending' || (productId && a.productId?.equals(productId)))
      .map((a) => a.key),
  );
  const missing = keys.filter((k) => !usable.has(k));
  if (missing.length) {
    throw badRequest('Some media files are unknown or belong to another product. Please upload them again.', 'INVALID_MEDIA');
  }
}

export async function markAttached(keys: string[], productId: Types.ObjectId): Promise<void> {
  if (keys.length === 0) return;
  await MediaAssetModel.updateMany({ key: { $in: keys } }, { status: 'attached', productId });
}

let utapi: UTApi | null | undefined;
function getUtApi(): UTApi | null {
  if (utapi === undefined) {
    const token = getConfig().uploadthing.token;
    utapi = token ? new UTApi({ token }) : null;
  }
  return utapi;
}

/**
 * Records uploads the admin's browser reports as finished. UploadThing's own
 * callback normally records them first; this covers callbacks that never reach
 * the API (wrong API_BASE_URL, cold start). Keys are checked with UploadThing,
 * and the stored URL is the one UploadThing returns.
 */
export async function confirmUploads(keys: string[], kind: 'image' | 'video', userId: Types.ObjectId): Promise<void> {
  const known = await MediaAssetModel.find({ key: { $in: keys } }).select('key').lean();
  const unknown = keys.filter((k) => !known.some((a) => a.key === k));
  if (unknown.length === 0) return;
  const api = getUtApi();
  if (!api) throw badRequest('Media uploads are not configured on the server', 'UPLOADS_NOT_CONFIGURED');
  let found: readonly { key: string; url: string }[];
  try {
    found = (await api.getFileUrls(unknown)).data;
  } catch (err) {
    getLogger().error({ err: err instanceof Error ? err.message : String(err) }, 'UploadThing file lookup failed');
    throw badRequest('Could not confirm the upload with UploadThing. Please try again.', 'INVALID_MEDIA');
  }
  const missing = unknown.filter((k) => !found.some((f) => f.key === k));
  if (missing.length) throw badRequest('Some uploads were not found on UploadThing. Please upload them again.', 'INVALID_MEDIA');
  await MediaAssetModel.bulkWrite(
    found.map((f) => ({
      updateOne: {
        filter: { key: f.key },
        update: { $setOnInsert: { key: f.key, url: f.url, kind, uploadedBy: userId, status: 'pending' as const } },
        upsert: true,
      },
    })),
  );
}

/** Test hook. */
export function setUtApi(next: UTApi | null | undefined): void {
  utapi = next;
}

/**
 * Deletes files from UploadThing unless a product, coupon banner, category picture or blog post
 * still references them. Failures are logged and retried by the orphan-media cleanup job.
 */
export async function releaseMedia(keys: string[], exceptProductId?: Types.ObjectId): Promise<void> {
  if (keys.length === 0) return;
  const stillUsed = await ProductModel.find({
    ...(exceptProductId ? { _id: { $ne: exceptProductId } } : {}),
    $or: [{ 'images.key': { $in: keys } }, { 'videos.key': { $in: keys } }, { 'videos.thumbnailKey': { $in: keys } }],
  })
    .select('images.key videos.key videos.thumbnailKey')
    .lean();
  const bannerUsers = await CouponModel.find({ 'image.key': { $in: keys } }).select('image.key').lean();
  const categoryUsers = await CategoryImageModel.find({ key: { $in: keys } }).select('key').lean();
  const blogUsers = await BlogModel.find({ 'image.key': { $in: keys } }).select('image.key').lean();
  const used = new Set([
    ...stillUsed.flatMap((p) => collectKeys(p as unknown as MediaRefs)),
    ...bannerUsers.map((c) => c.image!.key!),
    ...categoryUsers.map((c) => c.key!),
    ...blogUsers.map((b) => b.image.key!),
  ]);
  const deletable = keys.filter((k) => !used.has(k));
  if (deletable.length === 0) return;

  const api = getUtApi();
  if (!api) {
    // Nothing to delete remotely (uploads disabled); keep records consistent.
    await MediaAssetModel.updateMany({ key: { $in: deletable } }, { status: 'deleted', productId: null });
    return;
  }
  try {
    await api.deleteFiles(deletable);
    await MediaAssetModel.updateMany({ key: { $in: deletable } }, { status: 'deleted', productId: null });
  } catch (err) {
    getLogger().error({ err: err instanceof Error ? err.message : String(err), count: deletable.length }, 'UploadThing delete failed');
    // Mark as pending so the cleanup job retries the deletion.
    await MediaAssetModel.updateMany({ key: { $in: deletable } }, { status: 'pending', productId: null });
  }
}

/** Removes uploads that were never attached to a product (abandoned forms). */
export async function cleanupOrphanMedia(olderThanMs = 24 * 60 * 60 * 1000): Promise<number> {
  const stale = await MediaAssetModel.find({ status: 'pending', createdAt: { $lt: new Date(Date.now() - olderThanMs) } })
    .select('key')
    .limit(500)
    .lean();
  const keys = stale.map((s) => s.key);
  await releaseMedia(keys);
  return keys.length;
}
