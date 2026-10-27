import { Router } from 'express';
import { z } from 'zod';
import { addCartItemSchema, objectIdSchema, updateCartItemSchema } from '@shayara/shared';
import { parseBody, parseParams } from '../../utils/http';
import { addItem, clearCart, findCart, removeItem, resolveCartOwner, toCartDto, updateItem } from './cart.service';

const productParams = z.object({ productId: objectIdSchema });

export const cartRouter = Router();

cartRouter.use((_req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});

cartRouter.get('/', async (req, res) => {
  const owner = req.auth.user ? { userId: req.auth.user._id } : req.auth.session ? { sessionId: req.auth.session._id } : null;
  res.json(await toCartDto(owner ? await findCart(owner) : null));
});

cartRouter.post('/items', async (req, res) => {
  const input = parseBody(req, addCartItemSchema);
  const owner = await resolveCartOwner(req, res);
  res.status(201).json(await toCartDto(await addItem(owner, input)));
});

cartRouter.patch('/items/:productId', async (req, res) => {
  const { productId } = parseParams(req, productParams);
  const input = parseBody(req, updateCartItemSchema);
  const owner = await resolveCartOwner(req, res);
  res.json(await toCartDto(await updateItem(owner, productId, input)));
});

cartRouter.delete('/items/:productId', async (req, res) => {
  const { productId } = parseParams(req, productParams);
  const owner = await resolveCartOwner(req, res);
  res.json(await toCartDto(await removeItem(owner, productId)));
});

cartRouter.delete('/', async (req, res) => {
  const owner = await resolveCartOwner(req, res);
  await clearCart(owner);
  res.json(await toCartDto(null));
});
