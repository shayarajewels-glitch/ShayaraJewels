import { Router } from 'express';
import { listLiveCoupons } from './coupons.service';

/** Public: live coupons for the storefront carousel. */
export const couponsRouter = Router();

couponsRouter.get('/', async (_req, res) => {
  res.set('Cache-Control', 'public, max-age=60');
  res.json({ items: await listLiveCoupons() });
});
