import type { Types } from 'mongoose';
import { CUSTOMER_CANCELLABLE_STATUSES, type OrderStatus } from '@shayara/shared';
import { getLogger } from '../../config/logger';
import { OrderModel, ReviewModel, type Actor, type Order } from '../../models';
import { AppError, notFound } from '../../utils/errors';
import { paginate } from '../../utils/http';
import { refundOrder } from '../payments/payment.service';
import { releaseOrderStock, setSalesCounted } from './inventory.service';
import { returnWindowOpen, toOrderDto } from './order.mappers';

export async function listOrdersForUser(userId: Types.ObjectId, page: number, limit: number, status?: OrderStatus) {
  const filter = { userId, ...(status ? { status } : {}) };
  const [orders, total] = await Promise.all([
    OrderModel.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean<Order[]>(),
    OrderModel.countDocuments(filter),
  ]);
  return paginate(orders.map((o) => toOrderDto(o)), total, page, limit);
}

/** Customers can only ever load their own orders; others look like "not found". */
export async function getOrderForUser(userId: Types.ObjectId, orderNumber: string) {
  const order = await OrderModel.findOne({ orderNumber, userId }).lean<Order>();
  if (!order) throw notFound('Order not found');
  const reviewed = await ReviewModel.find({ userId, productId: { $in: order.items.map((i) => i.productId) } })
    .select('productId')
    .lean();
  return toOrderDto(order, reviewed.map((r) => r.productId.toString()));
}

/**
 * Cancels an order via an atomic status transition, then releases stock,
 * removes it from sales counts and refunds any captured payment.
 */
export async function cancelOrder(params: {
  orderId: Types.ObjectId;
  by: Actor;
  reason: string;
  allowedStatuses: readonly OrderStatus[];
}): Promise<Order> {
  const now = new Date();
  const cancelled = await OrderModel.findOneAndUpdate(
    { _id: params.orderId, status: { $in: params.allowedStatuses } },
    {
      $set: { status: 'cancelled', cancellation: { reason: params.reason, by: params.by, at: now } },
      $push: { timeline: { status: 'cancelled', at: now, by: params.by, note: params.reason } },
    },
    { returnDocument: 'after' },
  ).lean<Order>();
  if (!cancelled) {
    const exists = await OrderModel.exists({ _id: params.orderId });
    if (!exists) throw notFound('Order not found');
    throw new AppError(409, 'NOT_CANCELLABLE', 'This order can no longer be cancelled');
  }

  await releaseOrderStock(cancelled._id);
  await setSalesCounted(cancelled._id, false);

  if (cancelled.paymentStatus === 'pending' || cancelled.paymentStatus === 'failed') {
    await OrderModel.updateOne({ _id: cancelled._id, paymentStatus: { $in: ['pending', 'failed'] } }, { paymentStatus: 'expired' });
  } else if (cancelled.paymentMethod === 'razorpay' && cancelled.paymentStatus === 'paid') {
    try {
      await refundOrder({ orderId: cancelled._id, reason: `Order cancelled: ${params.reason}`, source: params.by === 'admin' ? 'admin' : 'system' });
    } catch (err) {
      getLogger().error({ orderNumber: cancelled.orderNumber, err: err instanceof Error ? err.message : err }, 'Automatic refund failed');
      await OrderModel.updateOne(
        { _id: cancelled._id },
        { attention: 'Order cancelled but the automatic refund failed. Issue the refund from the admin panel.' },
      );
    }
  }
  return (await OrderModel.findById(cancelled._id).lean<Order>())!;
}

export async function cancelOrderAsCustomer(userId: Types.ObjectId, orderNumber: string, reason: string) {
  const order = await OrderModel.findOne({ orderNumber, userId }).select('_id').lean();
  if (!order) throw notFound('Order not found');
  await cancelOrder({ orderId: order._id, by: 'customer', reason, allowedStatuses: CUSTOMER_CANCELLABLE_STATUSES });
  return getOrderForUser(userId, orderNumber);
}

export async function requestReturn(userId: Types.ObjectId, orderNumber: string, reason: string) {
  const order = await OrderModel.findOne({ orderNumber, userId }).lean<Order>();
  if (!order) throw notFound('Order not found');
  if (!returnWindowOpen(order)) {
    throw new AppError(409, 'RETURN_NOT_ALLOWED', 'This order is not eligible for a return');
  }
  const now = new Date();
  const updated = await OrderModel.updateOne(
    { _id: order._id, status: 'delivered', returnRequest: null },
    {
      $set: { status: 'return_requested', returnRequest: { reason, requestedAt: now } },
      $push: { timeline: { status: 'return_requested', at: now, by: 'customer', note: reason } },
    },
  );
  if (updated.modifiedCount !== 1) throw new AppError(409, 'RETURN_NOT_ALLOWED', 'This order is not eligible for a return');
  return getOrderForUser(userId, orderNumber);
}

/** Releases stock held by unpaid orders whose payment window has passed. */
export async function expireOrder(orderId: Types.ObjectId): Promise<boolean> {
  const now = new Date();
  const expired = await OrderModel.findOneAndUpdate(
    { _id: orderId, status: 'pending_payment', paymentExpiresAt: { $lte: now } },
    {
      $set: {
        status: 'cancelled',
        paymentStatus: 'expired',
        cancellation: { reason: 'Payment not completed in time', by: 'system', at: now },
      },
      $push: { timeline: { status: 'cancelled', at: now, by: 'system', note: 'Payment window expired' } },
    },
    { returnDocument: 'after' },
  );
  if (!expired) return false;
  await releaseOrderStock(expired._id);
  return true;
}
