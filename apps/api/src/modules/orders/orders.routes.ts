import { Router } from 'express';
import { z } from 'zod';
import { cancelOrderSchema, orderListQuerySchema, returnRequestSchema } from '@shayara/shared';
import { currentUser, requireAuth } from '../../middleware/security';
import { parseBody, parseParams, parseQuery } from '../../utils/http';
import { cancelOrderAsCustomer, getOrderForUser, listOrdersForUser, requestReturn } from './orders.service';

const orderParams = z.object({ orderNumber: z.string().trim().regex(/^SHY-\d{6}-[A-Z0-9]{6}$/, 'Invalid order number') });

export const ordersRouter = Router();
ordersRouter.use(requireAuth, (_req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});

ordersRouter.get('/', async (req, res) => {
  const { page, limit, status } = parseQuery(req, orderListQuerySchema);
  res.json(await listOrdersForUser(currentUser(req)._id, page, limit, status));
});

ordersRouter.get('/:orderNumber', async (req, res) => {
  const { orderNumber } = parseParams(req, orderParams);
  res.json(await getOrderForUser(currentUser(req)._id, orderNumber));
});

ordersRouter.post('/:orderNumber/cancel', async (req, res) => {
  const { orderNumber } = parseParams(req, orderParams);
  const { reason } = parseBody(req, cancelOrderSchema);
  res.json(await cancelOrderAsCustomer(currentUser(req)._id, orderNumber, reason));
});

ordersRouter.post('/:orderNumber/return-request', async (req, res) => {
  const { orderNumber } = parseParams(req, orderParams);
  const { reason } = parseBody(req, returnRequestSchema);
  res.json(await requestReturn(currentUser(req)._id, orderNumber, reason));
});
