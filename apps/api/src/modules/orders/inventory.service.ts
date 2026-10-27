import type { ClientSession, Types } from 'mongoose';
import { OrderModel, ProductModel, type Order } from '../../models';
import { AppError } from '../../utils/errors';

export interface StockLine {
  productId: Types.ObjectId;
  quantity: number;
  name?: string;
}

/**
 * Atomically deducts stock for each line using a conditional update
 * (`stock >= quantity`), so concurrent checkouts can never oversell or take
 * stock negative. Without a transaction, already-deducted lines are restored
 * if a later line fails.
 */
export async function reserveStock(lines: StockLine[], session?: ClientSession): Promise<void> {
  const done: StockLine[] = [];
  try {
    for (const line of lines) {
      const res = await ProductModel.updateOne(
        { _id: line.productId, status: 'published', stock: { $gte: line.quantity } },
        { $inc: { stock: -line.quantity } },
        { session },
      );
      if (res.modifiedCount !== 1) {
        throw new AppError(
          409,
          'INSUFFICIENT_STOCK',
          `${line.name ?? 'An item in your bag'} just sold out or has fewer units left. Please review your bag.`,
        );
      }
      done.push(line);
    }
  } catch (err) {
    if (!session) await restoreStock(done);
    throw err;
  }
}

export async function restoreStock(lines: StockLine[], session?: ClientSession): Promise<void> {
  for (const line of lines) {
    await ProductModel.updateOne({ _id: line.productId }, { $inc: { stock: line.quantity } }, { session });
  }
}

const linesOf = (order: Pick<Order, 'items'>): StockLine[] =>
  order.items.map((i) => ({ productId: i.productId, quantity: i.quantity, name: i.name }));

/** Returns an order's reserved units to stock exactly once (guarded by the stockReserved flag). */
export async function releaseOrderStock(orderId: Types.ObjectId): Promise<boolean> {
  const order = await OrderModel.findOneAndUpdate({ _id: orderId, stockReserved: true }, { stockReserved: false }, { returnDocument: 'after' });
  if (!order) return false;
  await restoreStock(linesOf(order));
  return true;
}

/** Re-deducts stock for an order whose reservation was released (e.g. a payment that arrived after expiry). */
export async function reacquireOrderStock(orderId: Types.ObjectId): Promise<boolean> {
  const order = await OrderModel.findOneAndUpdate({ _id: orderId, stockReserved: false }, { stockReserved: true }, { returnDocument: 'after' });
  if (!order) return true; // already reserved
  try {
    await reserveStock(linesOf(order));
    return true;
  } catch {
    await OrderModel.updateOne({ _id: orderId }, { stockReserved: false });
    return false;
  }
}

/** Adds (or removes) an order's units from product.unitsSold exactly once. */
export async function setSalesCounted(orderId: Types.ObjectId, counted: boolean, session?: ClientSession): Promise<void> {
  const order = await OrderModel.findOneAndUpdate(
    { _id: orderId, salesCounted: !counted },
    { salesCounted: counted },
    { returnDocument: 'after', session },
  );
  if (!order) return;
  const sign = counted ? 1 : -1;
  for (const item of order.items) {
    await ProductModel.updateOne(
      { _id: item.productId, ...(counted ? {} : { unitsSold: { $gte: item.quantity } }) },
      { $inc: { unitsSold: sign * item.quantity } },
      { session },
    );
  }
}
