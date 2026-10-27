import { Router } from 'express';
import { razorpayCreateOrderSchema, razorpayVerifySchema } from '@shayara/shared';
import { currentUser, requireAuth } from '../../middleware/security';
import { parseBody } from '../../utils/http';
import { toOrderDto } from '../orders/order.mappers';
import { isOnlinePaymentConfigured } from './gateway';
import { createProviderOrder, verifyCheckout } from './payment.service';

export const paymentsRouter = Router();

/** Public: which payment options the storefront should offer. No secrets. */
paymentsRouter.get('/config', (_req, res) => {
  res.json({ razorpayEnabled: isOnlinePaymentConfigured(), codEnabled: true });
});

paymentsRouter.post('/razorpay/create-order', requireAuth, async (req, res) => {
  const { orderNumber } = parseBody(req, razorpayCreateOrderSchema);
  res.set('Cache-Control', 'no-store').json(await createProviderOrder(currentUser(req), orderNumber));
});

paymentsRouter.post('/razorpay/verify', requireAuth, async (req, res) => {
  const input = parseBody(req, razorpayVerifySchema);
  const { order, paid } = await verifyCheckout(currentUser(req), input);
  res.set('Cache-Control', 'no-store').json({
    paid,
    message: paid ? 'Payment confirmed' : 'We are confirming your payment with the bank. This page will update shortly.',
    order: toOrderDto(order),
  });
});
