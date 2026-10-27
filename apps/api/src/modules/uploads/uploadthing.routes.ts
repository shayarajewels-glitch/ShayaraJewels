import { Router, type Request } from 'express';
import { createRouteHandler, createUploadthing, type FileRouter } from 'uploadthing/express';
import { UploadThingError } from 'uploadthing/server';
import { getConfig } from '../../config/env';
import { getLogger } from '../../config/logger';
import { MediaAssetModel, UserModel } from '../../models';
import { verifyUploadToken } from './upload-token';

const f = createUploadthing();

/** Authorizes every upload: valid upload token AND the user is still an active admin. */
export async function authorizeUpload(req: Request): Promise<{ userId: string }> {
  const header = req.get('authorization') ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : undefined;
  const userId = verifyUploadToken(token);
  if (!userId) throw new UploadThingError({ code: 'FORBIDDEN', message: 'Upload session expired. Please refresh and try again.' });
  const user = await UserModel.findById(userId).select('role isActive').lean();
  if (!user || !user.isActive || user.role !== 'admin') {
    throw new UploadThingError({ code: 'FORBIDDEN', message: 'Only administrators can upload media' });
  }
  return { userId };
}

async function recordUpload(kind: 'image' | 'video', userId: string, file: { key: string; ufsUrl: string; name: string; size: number }) {
  await MediaAssetModel.updateOne(
    { key: file.key },
    { $setOnInsert: { key: file.key, url: file.ufsUrl, kind, name: file.name.slice(0, 200), size: file.size, uploadedBy: userId, status: 'pending' } },
    { upsert: true },
  );
  return { key: file.key, url: file.ufsUrl };
}

export function buildFileRouter() {
  const { maxImageSize, maxVideoSize } = getConfig().uploadthing;
  return {
    productImage: f({
      'image/jpeg': { maxFileSize: maxImageSize, maxFileCount: 10 },
      'image/png': { maxFileSize: maxImageSize, maxFileCount: 10 },
      'image/webp': { maxFileSize: maxImageSize, maxFileCount: 10 },
      'image/avif': { maxFileSize: maxImageSize, maxFileCount: 10 },
    })
      .middleware(({ req }) => authorizeUpload(req))
      .onUploadComplete(({ metadata, file }) => recordUpload('image', metadata.userId, file)),
    productVideo: f({
      'video/mp4': { maxFileSize: maxVideoSize, maxFileCount: 1 },
      'video/webm': { maxFileSize: maxVideoSize, maxFileCount: 1 },
    })
      .middleware(({ req }) => authorizeUpload(req))
      .onUploadComplete(({ metadata, file }) => recordUpload('video', metadata.userId, file)),
  } satisfies FileRouter;
}

export type ShayaraFileRouter = ReturnType<typeof buildFileRouter>;

export function buildUploadthingRouter(): Router {
  const config = getConfig();
  if (!config.uploadthing.token) {
    const router = Router();
    router.all('/', (req, res) => {
      res.status(503).json({
        error: {
          code: 'UPLOADS_NOT_CONFIGURED',
          message: 'Media uploads are not configured. Set UPLOADTHING_TOKEN in apps/api/.env, or add media by URL.',
          requestId: req.id,
        },
      });
    });
    return router;
  }
  getLogger().debug('UploadThing route handler mounted at /api/uploadthing');
  return createRouteHandler({
    router: buildFileRouter(),
    config: {
      token: config.uploadthing.token,
      callbackUrl: `${config.apiBaseUrl}/api/uploadthing`,
      isDev: config.env === 'development',
      logLevel: config.isProduction ? 'Warning' : 'Info',
    },
  });
}
