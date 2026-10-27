import { Router } from 'express';
import { z } from 'zod';
import { addressSchema, objectIdSchema, updateAddressSchema } from '@shayara/shared';
import { currentUser } from '../../middleware/security';
import { parseBody, parseParams } from '../../utils/http';
import { createAddress, deleteAddress, listAddresses, toAddressDto, updateAddress } from './addresses.service';

const idParams = z.object({ id: objectIdSchema });

export const addressRouter = Router();

addressRouter.get('/', async (req, res) => {
  const addresses = await listAddresses(currentUser(req)._id);
  res.json({ items: addresses.map(toAddressDto) });
});

addressRouter.post('/', async (req, res) => {
  const input = parseBody(req, addressSchema);
  const address = await createAddress(currentUser(req)._id, input);
  res.status(201).json(toAddressDto(address));
});

addressRouter.patch('/:id', async (req, res) => {
  const { id } = parseParams(req, idParams);
  const input = parseBody(req, updateAddressSchema);
  const address = await updateAddress(currentUser(req)._id, id, input);
  res.json(toAddressDto(address));
});

addressRouter.delete('/:id', async (req, res) => {
  const { id } = parseParams(req, idParams);
  await deleteAddress(currentUser(req)._id, id);
  res.status(204).end();
});
