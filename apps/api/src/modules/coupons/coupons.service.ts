import { Types } from 'mongoose';
import type { AppliedCouponDto, CartLineDto, CouponDto, CouponInput, PublicCouponDto } from '@shayara/shared';
import { isDuplicateKeyError } from '../../config/db';
import { CouponModel, MediaAssetModel, OrderModel, type Coupon } from '../../models';
import { AppError, conflict, notFound } from '../../utils/errors';
import { notifyCatalogueChanged } from '../../lib/storefront-cache';
import { assertAllowedMediaUrl, releaseMedia } from '../uploads/media.service';

/** Coupons that are switched on and inside their date window. */
function liveFilter(now = new Date()) {
  return {
    active: true,
    $and: [{ $or: [{ startsAt: null }, { startsAt: { $lte: now } }] }, { $or: [{ endsAt: null }, { endsAt: { $gt: now } }] }],
  };
}

export async function listLiveCoupons(): Promise<PublicCouponDto[]> {
  const coupons = await CouponModel.find(liveFilter()).sort({ sortOrder: 1, createdAt: -1 }).limit(12).lean<Coupon[]>();
  return coupons.map((c) => ({
    code: c.code,
    title: c.title,
    description: c.description,
    discountPercent: c.discountPercent,
    appliesTo: c.appliesTo,
    image: c.image ? { url: c.image.url, alt: c.image.alt } : null,
    endsAt: c.endsAt?.toISOString() ?? null,
  }));
}

export interface CouponApplication {
  coupon: AppliedCouponDto;
  discountPaise: number;
}

/**
 * Validates a code against the cart and returns the discount. The percentage
 * applies only to lines whose product type the coupon covers.
 */
export async function applyCoupon(code: string, lines: Pick<CartLineDto, 'type' | 'lineTotalPaise'>[]): Promise<CouponApplication> {
  const coupon = await CouponModel.findOne({ code: code.trim().toUpperCase() }).lean<Coupon>();
  if (!coupon || !coupon.active) throw new AppError(400, 'COUPON_INVALID', 'This coupon code is not valid');
  const now = new Date();
  if (coupon.startsAt && coupon.startsAt > now) throw new AppError(400, 'COUPON_NOT_STARTED', 'This coupon is not active yet');
  if (coupon.endsAt && coupon.endsAt <= now) throw new AppError(400, 'COUPON_EXPIRED', 'This coupon has expired');
  const eligible = coupon.appliesTo.length === 0 ? lines : lines.filter((l) => coupon.appliesTo.includes(l.type));
  const eligibleTotal = eligible.reduce((sum, l) => sum + l.lineTotalPaise, 0);
  if (eligibleTotal === 0) {
    throw new AppError(400, 'COUPON_NOT_APPLICABLE', `This coupon applies only to ${coupon.appliesTo.map((t) => `${t}s`).join(', ')}`);
  }
  return {
    coupon: { code: coupon.code, title: coupon.title, discountPercent: coupon.discountPercent, appliesTo: coupon.appliesTo },
    discountPaise: Math.round((eligibleTotal * coupon.discountPercent) / 100),
  };
}

/* --------------------------------- admin --------------------------------- */

async function usageCounts(codes: string[]): Promise<Map<string, number>> {
  const rows = await OrderModel.aggregate<{ _id: string; n: number }>([
    { $match: { couponCode: { $in: codes }, status: { $ne: 'cancelled' } } },
    { $group: { _id: '$couponCode', n: { $sum: 1 } } },
  ]);
  return new Map(rows.map((r) => [r._id, r.n]));
}

function toCouponDto(c: Coupon, usage: number): CouponDto {
  return {
    id: c._id.toString(),
    code: c.code,
    title: c.title,
    description: c.description,
    discountPercent: c.discountPercent,
    appliesTo: c.appliesTo,
    image: c.image ? { url: c.image.url, ...(c.image.key ? { key: c.image.key } : {}), alt: c.image.alt } : null,
    active: c.active,
    startsAt: c.startsAt?.toISOString() ?? null,
    endsAt: c.endsAt?.toISOString() ?? null,
    sortOrder: c.sortOrder,
    usageCount: usage,
    createdAt: c.createdAt.toISOString(),
  };
}

export async function adminListCoupons(): Promise<CouponDto[]> {
  const coupons = await CouponModel.find().sort({ active: -1, sortOrder: 1, createdAt: -1 }).lean<Coupon[]>();
  const usage = await usageCounts(coupons.map((c) => c.code));
  return coupons.map((c) => toCouponDto(c, usage.get(c.code) ?? 0));
}

export async function adminGetCoupon(id: string): Promise<CouponDto> {
  const coupon = await CouponModel.findById(id).lean<Coupon>();
  if (!coupon) throw notFound('Coupon not found');
  return toCouponDto(coupon, (await usageCounts([coupon.code])).get(coupon.code) ?? 0);
}

function toDoc(input: CouponInput) {
  if (input.image) assertAllowedMediaUrl(input.image.url, 'image.url');
  return {
    ...input,
    image: input.image ? { url: input.image.url, key: input.image.key ?? null, alt: input.image.alt || input.title } : null,
    startsAt: input.startsAt ? new Date(input.startsAt) : null,
    endsAt: input.endsAt ? new Date(input.endsAt) : null,
  };
}

/** Uploaded banners are tracked so the orphan-media cleanup never deletes one in use. */
async function keepBanner(key: string | null | undefined) {
  if (key) await MediaAssetModel.updateMany({ key, status: 'pending' }, { status: 'attached' });
}

export async function adminCreateCoupon(input: CouponInput): Promise<CouponDto> {
  try {
    const coupon = await CouponModel.create(toDoc(input));
    await keepBanner(coupon.image?.key);
    notifyCatalogueChanged();
    return toCouponDto(coupon.toObject(), 0);
  } catch (err) {
    if (isDuplicateKeyError(err)) throw conflict('A coupon with this code already exists', 'COUPON_CODE_TAKEN');
    throw err;
  }
}

export async function adminUpdateCoupon(id: string, input: CouponInput): Promise<CouponDto> {
  const coupon = await CouponModel.findById(id);
  if (!coupon) throw notFound('Coupon not found');
  const oldKey = coupon.image?.key ?? null;
  coupon.set(toDoc(input));
  try {
    await coupon.save();
  } catch (err) {
    if (isDuplicateKeyError(err)) throw conflict('A coupon with this code already exists', 'COUPON_CODE_TAKEN');
    throw err;
  }
  const newKey = coupon.image?.key ?? null;
  await keepBanner(newKey);
  if (oldKey && oldKey !== newKey) await releaseMedia([oldKey]);
  notifyCatalogueChanged();
  return adminGetCoupon(id);
}

export async function adminDeleteCoupon(id: string): Promise<void> {
  const coupon = await CouponModel.findByIdAndDelete(new Types.ObjectId(id)).lean<Coupon>();
  if (!coupon) throw notFound('Coupon not found');
  if (coupon.image?.key) await releaseMedia([coupon.image.key]);
  notifyCatalogueChanged();
}
