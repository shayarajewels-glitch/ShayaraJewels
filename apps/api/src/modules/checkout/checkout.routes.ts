import { Router } from 'express';
import { IDEMPOTENCY_HEADER, checkoutQuoteSchema, checkoutSchema } from '@shayara/shared';
import type { RateLimiters } from '../../middleware/rate-limit';
import { currentUser, requireAuth } from '../../middleware/security';
import { badRequest } from '../../utils/errors';
import { parseBody } from '../../utils/http';
import { toOrderDto } from '../orders/order.mappers';
import { isOnlinePaymentConfigured } from '../payments/gateway';
import { placeOrder, quoteForUser } from './checkout.service';

export function buildCheckoutRouter(limiters: RateLimiters): Router {
  const router = Router();
  router.use(requireAuth, (_req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
  });

  router.post('/quote', async (req, res) => {
    const { paymentMethod } = parseBody(req, checkoutQuoteSchema);
    const quote = await quoteForUser(currentUser(req)._id, paymentMethod);
    res.json({ ...quote, onlinePaymentAvailable: isOnlinePaymentConfigured() });
  });

  router.post('/', limiters.checkout, async (req, res) => {
    const key = req.get(IDEMPOTENCY_HEADER);
    if (!key || !/^[A-Za-z0-9_-]{16,100}$/.test(key)) {
      throw badRequest('A valid Idempotency-Key header is required', 'IDEMPOTENCY_KEY_REQUIRED');
    }
    const input = parseBody(req, checkoutSchema);
    const { order, replayed } = await placeOrder(currentUser(req), input, key);
    res.status(replayed ? 200 : 201).json({ order: toOrderDto(order), replayed });
  });

  return router;
}
