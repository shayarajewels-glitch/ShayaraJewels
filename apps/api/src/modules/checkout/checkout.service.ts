import { randomBytes } from 'node:crypto';
import type { Types } from 'mongoose';
import {
  COD_MAX_TOTAL_PAISE,
  FREE_SHIPPING_THRESHOLD_PAISE,
  paymentFeeFor,
  shippingForSubtotal,
  type CartLineDto,
  type CheckoutInput,
  type PaymentMethod,
  type QuoteDto,
} from '@shayara/shared';
import { getConfig } from '../../config/env';
import { isDuplicateKeyError, withOptionalTransaction } from '../../config/db';
import { getLogger } from '../../config/logger';
import { AddressModel, CartModel, OrderModel, type Order, type User } from '../../models';
import { AppError, badRequest, conflict } from '../../utils/errors';
import { buildCartLines } from '../cart/cart.service';
import { applyCoupon, type CouponApplication } from '../coupons/coupons.service';
import { reserveStock, restoreStock, setSalesCounted } from '../orders/inventory.service';
import { isOnlinePaymentConfigured } from '../payments/gateway';

const CHECKOUT_LOCK_MS = 60_000;
const ORDER_NUMBER_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function generateOrderNumber(now = new Date()): string {
  const date = now.toISOString().slice(2, 10).replace(/-/g, '');
  const bytes = randomBytes(6);
  const suffix = Array.from(bytes, (b) => ORDER_NUMBER_ALPHABET[b % ORDER_NUMBER_ALPHABET.length]).join('');
  return `SHY-${date}-${suffix}`;
}

interface Totals {
  subtotalPaise: number;
  shippingPaise: number;
  paymentFeePaise: number;
  discountPaise: number;
  totalPaise: number;
}

/**
 * The single source of truth for order totals. Shipping is based on the
 * subtotal before any coupon, so a discount never takes away free shipping.
 */
export function calculateTotals(lines: Pick<CartLineDto, 'lineTotalPaise'>[], method: PaymentMethod, couponDiscountPaise = 0): Totals {
  const subtotalPaise = lines.reduce((sum, l) => sum + l.lineTotalPaise, 0);
  const shippingPaise = shippingForSubtotal(subtotalPaise);
  const paymentFeePaise = subtotalPaise > 0 ? paymentFeeFor(method) : 0;
  const discountPaise = Math.min(couponDiscountPaise, subtotalPaise);
  return {
    subtotalPaise,
    shippingPaise,
    paymentFeePaise,
    discountPaise,
    totalPaise: subtotalPaise + shippingPaise + paymentFeePaise - discountPaise,
  };
}

export async function quoteForUser(userId: Types.ObjectId, method: PaymentMethod, couponCode?: string): Promise<QuoteDto> {
  const cart = await CartModel.findOne({ userId }).lean();
  const lines = await buildCartLines(cart?.items ?? []);
  const purchasable = lines.filter((l) => !l.issue);
  // An invalid code never blocks the quote; the reason is returned for the coupon field instead.
  let applied: CouponApplication | null = null;
  let couponError: string | null = null;
  if (couponCode && purchasable.length > 0) {
    try {
      applied = await applyCoupon(couponCode, purchasable);
    } catch (err) {
      if (!(err instanceof AppError)) throw err;
      couponError = err.message;
    }
  }
  const totals = calculateTotals(purchasable, method, applied?.discountPaise ?? 0);
  const issues = lines.filter((l) => l.issue).map((l) => `${l.name}: ${l.issue}`);
  if (lines.length === 0) issues.push('Your bag is empty');
  return {
    lines,
    ...totals,
    codAvailable: totals.totalPaise - totals.paymentFeePaise + paymentFeeFor('cod') <= COD_MAX_TOTAL_PAISE,
    issues,
    freeShippingThresholdPaise: FREE_SHIPPING_THRESHOLD_PAISE,
    coupon: applied?.coupon ?? null,
    couponError,
  };
}

/**
 * Creates an order from the user's cart.
 *
 * Guarantees:
 *  - Idempotent per Idempotency-Key: a retried request returns the same order.
 *  - A cart lock blocks concurrent checkouts of the same cart (double clicks, two tabs).
 *  - Prices, totals and stock are computed on the server; the client total is only compared.
 *  - Stock is deducted atomically; the order holds it until paid or expired.
 */
export async function placeOrder(user: User, input: CheckoutInput, idempotencyKey: string): Promise<{ order: Order; replayed: boolean }> {
  const existing = await OrderModel.findOne({ userId: user._id, idempotencyKey }).lean<Order>();
  if (existing) return { order: existing, replayed: true };

  if (input.paymentMethod === 'razorpay' && !isOnlinePaymentConfigured()) {
    throw new AppError(503, 'PAYMENT_NOT_CONFIGURED', 'Online payments are not available right now. Please choose Cash on Delivery.');
  }

  const address = await AddressModel.findOne({ _id: input.addressId, userId: user._id }).lean();
  if (!address) throw badRequest('Please choose a delivery address', 'ADDRESS_REQUIRED');

  const now = new Date();
  const cart = await CartModel.findOneAndUpdate(
    {
      userId: user._id,
      $or: [{ checkoutLock: null }, { 'checkoutLock.at': { $lt: new Date(now.getTime() - CHECKOUT_LOCK_MS) } }],
    },
    { $set: { checkoutLock: { key: idempotencyKey, at: now } } },
    { returnDocument: 'after' },
  );
  if (!cart) {
    const exists = await CartModel.exists({ userId: user._id });
    if (!exists) throw badRequest('Your bag is empty', 'CART_EMPTY');
    throw conflict('Your order is already being placed. Please wait a moment.', 'CHECKOUT_IN_PROGRESS');
  }

  try {
    const lines = await buildCartLines(cart.items);
    if (lines.length === 0) throw badRequest('Your bag is empty', 'CART_EMPTY');
    const problems = lines.filter((l) => l.issue);
    if (problems.length) {
      throw new AppError(409, 'CART_INVALID', 'Some items in your bag need attention', problems.map((l) => ({ path: l.productId, message: `${l.name}: ${l.issue}` })));
    }

    // Re-validated here: the coupon may have expired since the customer saw the quote.
    const applied = input.couponCode ? await applyCoupon(input.couponCode, lines) : null;
    const totals = calculateTotals(lines, input.paymentMethod, applied?.discountPaise ?? 0);
    if (input.expectedTotalPaise !== undefined && input.expectedTotalPaise !== totals.totalPaise) {
      throw new AppError(409, 'PRICE_CHANGED', 'Prices or charges changed since you reviewed your order. Please review the updated total.');
    }
    if (input.paymentMethod === 'cod' && totals.totalPaise > COD_MAX_TOTAL_PAISE) {
      throw badRequest('Cash on Delivery is not available for orders of this value', 'COD_UNAVAILABLE');
    }

    const isCod = input.paymentMethod === 'cod';
    const windowMs = getConfig().payments.windowMinutes * 60_000;
    const stockLines = lines.map((l) => ({ productId: cart.items.find((i) => i.productId.toString() === l.productId)!.productId, quantity: l.quantity, name: l.name }));

    const orderDoc = {
      userId: user._id,
      items: lines.map((l, idx) => ({
        productId: stockLines[idx]!.productId,
        name: l.name,
        slug: l.slug,
        sku: l.sku,
        image: l.image?.url ?? null,
        size: l.size,
        unitPricePaise: l.unitPricePaise,
        quantity: l.quantity,
        lineTotalPaise: l.lineTotalPaise,
      })),
      shippingAddress: {
        fullName: address.fullName,
        phone: address.phone,
        addressLine1: address.addressLine1,
        addressLine2: address.addressLine2 ?? undefined,
        landmark: address.landmark ?? undefined,
        city: address.city,
        state: address.state,
        postalCode: address.postalCode,
        country: address.country,
      },
      ...totals,
      couponCode: applied?.coupon.code ?? null,
      paymentMethod: input.paymentMethod,
      paymentStatus: 'pending' as const,
      codCollectionStatus: isCod ? ('pending' as const) : ('not_applicable' as const),
      status: isCod ? ('confirmed' as const) : ('pending_payment' as const),
      paymentExpiresAt: isCod ? null : new Date(now.getTime() + windowMs),
      stockReserved: true,
      salesCounted: false,
      timeline: [
        {
          status: isCod ? ('confirmed' as const) : ('pending_payment' as const),
          at: now,
          by: 'customer' as const,
          note: isCod ? 'Order placed with Cash on Delivery' : 'Order placed, awaiting payment',
        },
      ],
      idempotencyKey,
      notes: input.notes ?? null,
    };

    let order: Order | undefined;
    for (let attempt = 0; attempt < 3 && !order; attempt++) {
      try {
        order = await withOptionalTransaction(async (session) => {
          await reserveStock(stockLines, session);
          let created;
          try {
            [created] = await OrderModel.create([{ ...orderDoc, orderNumber: generateOrderNumber() }], { session });
          } catch (err) {
            if (!session) await restoreStock(stockLines);
            throw err;
          }
          await CartModel.updateOne({ _id: cart._id }, { $set: { items: [], checkoutLock: null } }, { session });
          return created!.toObject() as Order;
        });
      } catch (err) {
        if (isDuplicateKeyError(err) && err.keyPattern?.orderNumber) continue;
        if (isDuplicateKeyError(err) && err.keyPattern?.idempotencyKey) {
          const winner = await OrderModel.findOne({ userId: user._id, idempotencyKey }).lean<Order>();
          if (winner) return { order: winner, replayed: true };
        }
        throw err;
      }
    }
    if (!order) throw new AppError(500, 'ORDER_NUMBER_EXHAUSTED', 'Could not place your order. Please try again.');

    if (isCod) await setSalesCounted(order._id, true);
    getLogger().info({ orderNumber: order.orderNumber, method: order.paymentMethod, totalPaise: order.totalPaise }, 'Order placed');
    return { order, replayed: false };
  } finally {
    // Release the lock if this attempt failed (success already cleared it).
    await CartModel.updateOne({ _id: cart._id, 'checkoutLock.key': idempotencyKey }, { $set: { checkoutLock: null } });
  }
}

