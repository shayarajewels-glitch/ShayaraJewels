import { Router } from 'express';
import { z } from 'zod';
import { getConfig } from '../../config/env';
import { currentUser } from '../../middleware/security';
import { serviceUnavailable } from '../../utils/errors';
import { parseBody } from '../../utils/http';
import { confirmUploads } from './media.service';
import { issueUploadToken } from './upload-token';

const confirmSchema = z.strictObject({
  kind: z.enum(['image', 'video']),
  keys: z.array(z.string().trim().min(1).max(200)).min(1).max(10),
});

/** Mounted under /admin (already admin-protected). */
export const adminUploadsRouter = Router();

adminUploadsRouter.get('/config', (_req, res) => {
  const { uploadthing } = getConfig();
  res.json({
    enabled: Boolean(uploadthing.token),
    maxImageSize: uploadthing.maxImageSize,
    maxVideoSize: uploadthing.maxVideoSize,
    maxVideoSeconds: uploadthing.maxVideoSeconds,
  });
});

adminUploadsRouter.post('/token', (req, res) => {
  if (!getConfig().uploadthing.token) {
    throw serviceUnavailable('Media uploads are not configured on the server', 'UPLOADS_NOT_CONFIGURED');
  }
  res.set('Cache-Control', 'no-store').json(issueUploadToken(currentUser(req)._id));
});

/** The browser reports finished uploads so they are tracked even if UploadThing's callback was missed. */
adminUploadsRouter.post('/confirm', async (req, res) => {
  const { kind, keys } = parseBody(req, confirmSchema);
  await confirmUploads(keys, kind, currentUser(req)._id);
  res.status(204).end();
});
