import { Router } from 'express';
import { getConfig } from '../../config/env';
import { currentUser } from '../../middleware/security';
import { serviceUnavailable } from '../../utils/errors';
import { issueUploadToken } from './upload-token';

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
