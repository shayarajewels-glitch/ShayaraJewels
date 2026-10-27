import type { QueryFilter, Types } from 'mongoose';
import {
  ADMIN_ORDER_TRANSITIONS,
  LOW_STOCK_THRESHOLD,
  type AdminOrderStatusInput,
  type DashboardDto,
  type OrderStatus,
  type PaymentMethod,
  type PaymentStatus,
} from '@shayara/shared';
import { OrderModel, PaymentModel, ProductModel, ReviewModel, UserModel, type Order, type Payment, type User } from '../../models';
import { AppError, badRequest, notFound } from '../../utils/errors';
import { escapeRegex, paginate } from '../../utils/http';
import { releaseOrderStock, setSalesCounted } from '../orders/inventory.service';
import { toAdminOrderDto } from '../orders/order.mappers';
import { cancelOrder } from '../orders/orders.service';
import { refundOrder } from '../payments/payment.service';

type CustomerRef = Pick<User, '_id' | 'name' | 'email' | 'phone'>;

async function hydrate(orders: Order[]) {
  const userIds = [...new Set(orders.map((o) => o.userId.toString()))];
  const [users, payments] = await Promise.all([
    UserModel.find({ _id: { $in: userIds } }).select('name email phone').lean<CustomerRef[]>(),
    PaymentModel.find({ orderId: { $in: orders.map((o) => o._id) } }).sort({ createdAt: -1 }).lean<Payment[]>(),
  ]);
  const userById = new Map(users.map((u) => [u._id.toString(), u]));
  return orders.map((o) =>
    toAdminOrderDto(
      o,
      userById.get(o.userId.toString()) ?? null,
      payments.filter((p) => p.orderId.equals(o._id)),
    ),
  );
}

export async function adminListOrders(q: {
  page: number;
  limit: number;
  q?: string;
  status?: OrderStatus;
  paymentStatus?: PaymentStatus;
  paymentMethod?: PaymentMethod;
}) {
  const filter: QueryFilter<Order> = {};
  if (q.status) filter.status = q.status;
  if (q.paymentStatus) filter.paymentStatus = q.paymentStatus;
  if (q.paymentMethod) filter.paymentMethod = q.paymentMethod;
  if (q.q) {
    const re = new RegExp(escapeRegex(q.q), 'i');
    const users = await UserModel.find({ $or: [{ email: re }, { name: re }] }).select('_id').limit(50).lean();
    filter.$or = [{ orderNumber: re }, { 'shippingAddress.phone': re }, { userId: { $in: users.map((u) => u._id) } }];
  }
  const [orders, total] = await Promise.all([
    OrderModel.find(filter).sort({ createdAt: -1 }).skip((q.page - 1) * q.limit).limit(q.limit).lean<Order[]>(),
    OrderModel.countDocuments(filter),
  ]);
  return paginate(await hydrate(orders), total, q.page, q.limit);
}

export async function adminGetOrder(id: string) {
  const order = await OrderModel.findById(id).lean<Order>();
  if (!order) throw notFound('Order not found');
  const [dto] = await hydrate([order]);
  return dto!;
}

export async function adminUpdateOrderStatus(id: string, input: AdminOrderStatusInput) {
  const order = await OrderModel.findById(id).lean<Order>();
  if (!order) throw notFound('Order not found');
  const now = new Date();

  // COD collection can be recorded without a status change.
  if (input.status === order.status) {
    if (input.codCollected === undefined) throw badRequest('The order already has this status', 'NO_CHANGE');
    await recordCodCollection(order, input.codCollected);
    return adminGetOrder(id);
  }

  const allowed = ADMIN_ORDER_TRANSITIONS[order.status];
  if (!allowed.includes(input.status)) {
    throw new AppError(409, 'INVALID_TRANSITION', `An order cannot move from "${order.status}" to "${input.status}"`);
  }

  if (input.status === 'cancelled') {
    await cancelOrder({ orderId: order._id, by: 'admin', reason: input.note ?? 'Cancelled by Shayara', allowedStatuses: [order.status] });
    return adminGetOrder(id);
  }

  const set: Record<string, unknown> = { status: input.status };
  if (input.status === 'shipped') {
    if (!input.tracking) throw badRequest('Add the courier and tracking number to mark an order shipped', 'TRACKING_REQUIRED');
    set.tracking = { ...input.tracking, shippedAt: now };
  }
  if (input.status === 'delivered') {
    if (order.status === 'return_requested') {
      set.returnRequest = { ...order.returnRequest, resolvedAt: now, outcome: 'rejected' };
    } else {
      set.deliveredAt = now;
    }
  }
  if (input.status === 'returned') {
    set.returnRequest = { ...order.returnRequest, resolvedAt: now, outcome: 'returned' };
  }

  const updated = await OrderModel.findOneAndUpdate(
    { _id: order._id, status: order.status },
    { $set: set, $push: { timeline: { status: input.status, at: now, by: 'admin', note: input.note } } },
    { returnDocument: 'after' },
  ).lean<Order>();
  if (!updated) throw new AppError(409, 'CONCURRENT_UPDATE', 'The order changed while you were editing. Please reload.');

  if (input.status === 'returned') {
    await setSalesCounted(order._id, false);
    if (input.restock) await releaseOrderStock(order._id);
  }
  if (input.codCollected !== undefined) await recordCodCollection(updated, input.codCollected);
  return adminGetOrder(id);
}

async function recordCodCollection(order: Order, collected: boolean) {
  if (order.paymentMethod !== 'cod') throw badRequest('Only Cash on Delivery orders have a collection status', 'NOT_COD');
  if (collected && !['delivered', 'return_requested', 'returned'].includes(order.status)) {
    throw badRequest('Mark the order delivered before recording cash collection', 'NOT_DELIVERED');
  }
  await OrderModel.updateOne(
    { _id: order._id },
    collected
      ? { codCollectionStatus: 'collected', paymentStatus: 'paid', paidAt: new Date() }
      : { codCollectionStatus: 'failed' },
  );
}

/**
 * Refunds a prepaid order. Before shipping, a refund means cancelling the
 * whole order (stock released, full refund). After delivery, partial or full
 * refunds are allowed.
 */
export async function adminRefundOrder(id: string, input: { amountPaise?: number; reason: string; restock: boolean }, adminId: Types.ObjectId) {
  const order = await OrderModel.findById(id).lean<Order>();
  if (!order) throw notFound('Order not found');
  if (order.status === 'confirmed' || order.status === 'processing') {
    if (input.amountPaise !== undefined && input.amountPaise !== order.totalPaise) {
      throw badRequest('Orders that have not shipped can only be refunded in full by cancelling them', 'PARTIAL_REFUND_NOT_ALLOWED');
    }
    await cancelOrder({ orderId: order._id, by: 'admin', reason: input.reason, allowedStatuses: [order.status] });
    return adminGetOrder(id);
  }
  if (order.status === 'pending_payment' || order.status === 'shipped') {
    throw new AppError(409, 'NOT_REFUNDABLE', order.status === 'shipped' ? 'Wait until the order is delivered or returned before refunding' : 'This order has not been paid');
  }
  await refundOrder({ orderId: order._id, amountPaise: input.amountPaise, reason: input.reason, source: 'admin', adminId });
  if (input.restock && order.status === 'returned') await releaseOrderStock(order._id);
  return adminGetOrder(id);
}

/** Orders that represent real sales: paid prepaid orders and non-cancelled COD orders. */
const SALES_FILTER: QueryFilter<Order> = {
  $or: [
    { paymentStatus: { $in: ['paid', 'partially_refunded', 'refunded'] } },
    { paymentMethod: 'cod', status: { $ne: 'cancelled' } },
  ],
};

export async function adminDashboard(): Promise<DashboardDto> {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const [totals, last30, statusAgg, recent, lowStock, bestsellers, pendingReviews] = await Promise.all([
    OrderModel.aggregate<{ count: number; gross: number; refunds: number }>([
      { $match: SALES_FILTER },
      { $group: { _id: null, count: { $sum: 1 }, gross: { $sum: '$totalPaise' }, refunds: { $sum: '$refundedPaise' } } },
    ]),
    OrderModel.aggregate<{ count: number; gross: number }>([
      { $match: { ...SALES_FILTER, createdAt: { $gte: since } } },
      { $group: { _id: null, count: { $sum: 1 }, gross: { $sum: '$totalPaise' } } },
    ]),
    OrderModel.aggregate<{ _id: OrderStatus; count: number }>([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    OrderModel.find().sort({ createdAt: -1 }).limit(8).lean<Order[]>(),
    ProductModel.find({ status: { $ne: 'archived' }, stock: { $lte: LOW_STOCK_THRESHOLD } })
      .sort({ stock: 1 })
      .limit(10)
      .select('name sku stock slug')
      .lean(),
    ProductModel.find({ unitsSold: { $gt: 0 } }).sort({ unitsSold: -1 }).limit(5).select('name slug unitsSold').lean(),
    ReviewModel.countDocuments({ status: 'pending' }),
  ]);
  const t = totals[0] ?? { count: 0, gross: 0, refunds: 0 };
  return {
    orderCount: t.count,
    grossSalesPaise: t.gross,
    refundsPaise: t.refunds,
    netSalesPaise: t.gross - t.refunds,
    averageOrderValuePaise: t.count ? Math.round(t.gross / t.count) : 0,
    last30Days: { orders: last30[0]?.count ?? 0, grossSalesPaise: last30[0]?.gross ?? 0 },
    statusSummary: Object.fromEntries(statusAgg.map((s) => [s._id, s.count])),
    recentOrders: await hydrate(recent),
    lowStock: lowStock.map((p) => ({ id: p._id.toString(), name: p.name, sku: p.sku, stock: p.stock, slug: p.slug })),
    bestsellers: bestsellers.map((p) => ({ id: p._id.toString(), name: p.name, slug: p.slug, unitsSold: p.unitsSold })),
    pendingReviews,
  };
}
