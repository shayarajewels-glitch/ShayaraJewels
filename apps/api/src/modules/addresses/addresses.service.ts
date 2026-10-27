import type { Types } from 'mongoose';
import type { AddressData, AddressDto } from '@shayara/shared';
import { withOptionalTransaction } from '../../config/db';
import { AddressModel, type Address } from '../../models';
import { badRequest, notFound } from '../../utils/errors';

export const MAX_ADDRESSES = 10;

export function toAddressDto(a: Address): AddressDto {
  return {
    id: a._id.toString(),
    label: a.label,
    fullName: a.fullName,
    phone: a.phone,
    addressLine1: a.addressLine1,
    addressLine2: a.addressLine2 || undefined,
    landmark: a.landmark || undefined,
    city: a.city,
    state: a.state,
    postalCode: a.postalCode,
    country: 'IN',
    isDefault: a.isDefault,
  };
}

export async function listAddresses(userId: Types.ObjectId) {
  return AddressModel.find({ userId }).sort({ isDefault: -1, createdAt: -1 });
}

export async function createAddress(userId: Types.ObjectId, input: AddressData) {
  const count = await AddressModel.countDocuments({ userId });
  if (count >= MAX_ADDRESSES) throw badRequest(`You can save up to ${MAX_ADDRESSES} addresses`, 'ADDRESS_LIMIT');
  const makeDefault = input.isDefault || count === 0;
  return withOptionalTransaction(async (session) => {
    if (makeDefault) await AddressModel.updateMany({ userId, isDefault: true }, { isDefault: false }, { session });
    const [created] = await AddressModel.create([{ ...input, userId, isDefault: makeDefault }], { session });
    return created!;
  });
}

export async function updateAddress(userId: Types.ObjectId, id: string, input: Partial<AddressData>) {
  const address = await AddressModel.findOne({ _id: id, userId });
  if (!address) throw notFound('Address not found');
  return withOptionalTransaction(async (session) => {
    if (input.isDefault === true && !address.isDefault) {
      await AddressModel.updateMany({ userId, isDefault: true }, { isDefault: false }, { session });
    }
    // A default address can only stop being default by making another address the default.
    const { isDefault, ...rest } = input;
    address.set(Object.fromEntries(Object.entries(rest).filter(([, v]) => v !== undefined)));
    if (isDefault === true) address.isDefault = true;
    await address.save({ session });
    return address;
  });
}

export async function deleteAddress(userId: Types.ObjectId, id: string) {
  const address = await AddressModel.findOneAndDelete({ _id: id, userId });
  if (!address) throw notFound('Address not found');
  if (address.isDefault) {
    const next = await AddressModel.findOne({ userId }).sort({ createdAt: -1 });
    if (next) await AddressModel.updateOne({ _id: next._id }, { isDefault: true });
  }
}
