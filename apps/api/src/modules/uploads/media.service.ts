import type { Types } from 'mongoose';
import { UTApi } from 'uploadthing/server';
import { getConfig } from '../../config/env';
import { getLogger } from '../../config/logger';
import { MediaAssetModel, ProductModel } from '../../models';
import { badRequest } from '../../utils/errors';

/** Hosts that serve UploadThing files. Only these (or site-relative paths) may be stored as product media. */
const ALLOWED_MEDIA_HOSTS = [/^utfs\.io$/, /^[a-z0-9]+\.ufs\.sh$/i];

export function assertAllowedMediaUrl(url: string, field: string): void {
  if (url.startsWith('/')) return;
  let host: string;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:') throw new Error('not https');
    host = parsed.hostname;
  } catch {
    throw badRequest('Media URLs must be https links to uploaded files', 'INVALID_MEDIA', [{ path: field, message: 'Invalid media URL' }]);
  }
  if (!ALLOWED_MEDIA_HOSTS.some((re) => re.test(host))) {
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
  media.images?.forEach((img, i) => assertAllowedMediaUrl(img.url, `images.${i}.url`));
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

/** Test hook. */
export function setUtApi(next: UTApi | null | undefined): void {
  utapi = next;
}

/**
 * Deletes files from UploadThing unless another product still references
 * them. Failures are logged and retried by the orphan-media cleanup job.
 */
export async function releaseMedia(keys: string[], exceptProductId?: Types.ObjectId): Promise<void> {
  if (keys.length === 0) return;
  const stillUsed = await ProductModel.find({
    ...(exceptProductId ? { _id: { $ne: exceptProductId } } : {}),
    $or: [{ 'images.key': { $in: keys } }, { 'videos.key': { $in: keys } }, { 'videos.thumbnailKey': { $in: keys } }],
  })
    .select('images.key videos.key videos.thumbnailKey')
    .lean();
  const used = new Set(stillUsed.flatMap((p) => collectKeys(p as unknown as MediaRefs)));
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
