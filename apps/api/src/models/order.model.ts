import { Schema, model, type HydratedDocument, type Types } from 'mongoose';
import {
  COD_COLLECTION_STATUSES,
  ORDER_STATUSES,
  PAYMENT_METHODS,
  PAYMENT_STATUSES,
  type CodCollectionStatus,
  type OrderStatus,
  type PaymentMethod,
  type PaymentStatus,
} from '@shayara/shared';

export interface OrderItem {
  productId: Types.ObjectId;
  name: string;
  slug: string;
  sku: string;
  image?: string | null;
  size?: string | null;
  unitPricePaise: number;
  quantity: number;
  lineTotalPaise: number;
}

export interface AddressSnapshot {
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string | null;
  landmark?: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export type Actor = 'customer' | 'admin' | 'system';

export interface TimelineEntry {
  status: OrderStatus;
  at: Date;
  note?: string;
  by?: Actor;
}

export interface Order {
  _id: Types.ObjectId;
  orderNumber: string;
  userId: Types.ObjectId;
  items: OrderItem[];
  shippingAddress: AddressSnapshot;
  subtotalPaise: number;
  shippingPaise: number;
  paymentFeePaise: number;
  discountPaise: number;
  totalPaise: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  codCollectionStatus: CodCollectionStatus;
  status: OrderStatus;
  /** Prepaid orders hold stock until this time. */
  paymentExpiresAt?: Date | null;
  /** True while this order's units are deducted from product stock. */
  stockReserved: boolean;
  /** True while this order's units are counted in product.unitsSold. */
  salesCounted: boolean;
  refundedPaise: number;
  paidAt?: Date | null;
  deliveredAt?: Date | null;
  cancellation?: { reason: string; by: Actor; at: Date } | null;
  returnRequest?: { reason: string; requestedAt: Date; resolvedAt?: Date; outcome?: 'returned' | 'rejected' } | null;
  tracking?: { carrier: string; trackingNumber: string; trackingUrl?: string; shippedAt?: Date } | null;
  timeline: TimelineEntry[];
  idempotencyKey: string;
  notes?: string | null;
  /** Flag for administrators, e.g. a late payment that had to be refunded. */
  attention?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const orderItemSchema = new Schema<OrderItem>(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    name: { type: String, required: true },
    slug: { type: String, required: true },
    sku: { type: String, required: true },
    image: { type: String, default: null },
    size: { type: String, default: null },
    unitPricePaise: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1 },
    lineTotalPaise: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const addressSnapshotSchema = new Schema<AddressSnapshot>(
  {
    fullName: { type: String, required: true },
    phone: { type: String, required: true },
    addressLine1: { type: String, required: true },
    addressLine2: String,
    landmark: String,
    city: { type: String, required: true },
    state: { type: String, required: true },
    postalCode: { type: String, required: true },
    country: { type: String, required: true },
  },
  { _id: false },
);

const timelineSchema = new Schema<TimelineEntry>(
  {
    status: { type: String, enum: ORDER_STATUSES, required: true },
    at: { type: Date, required: true },
    note: String,
    by: { type: String, enum: ['customer', 'admin', 'system'] },
  },
  { _id: false },
);

const orderSchema = new Schema<Order>(
  {
    orderNumber: { type: String, required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    items: { type: [orderItemSchema], required: true, validate: (v: unknown[]) => v.length > 0 },
    shippingAddress: { type: addressSnapshotSchema, required: true },
    subtotalPaise: { type: Number, required: true, min: 0 },
    shippingPaise: { type: Number, required: true, min: 0 },
    paymentFeePaise: { type: Number, required: true, min: 0, default: 0 },
    discountPaise: { type: Number, required: true, min: 0, default: 0 },
    totalPaise: { type: Number, required: true, min: 0 },
    paymentMethod: { type: String, enum: PAYMENT_METHODS, required: true },
    paymentStatus: { type: String, enum: PAYMENT_STATUSES, required: true, default: 'pending' },
    codCollectionStatus: { type: String, enum: COD_COLLECTION_STATUSES, required: true, default: 'not_applicable' },
    status: { type: String, enum: ORDER_STATUSES, required: true },
    paymentExpiresAt: { type: Date, default: null },
    stockReserved: { type: Boolean, required: true, default: false },
    salesCounted: { type: Boolean, required: true, default: false },
    refundedPaise: { type: Number, required: true, default: 0, min: 0 },
    paidAt: { type: Date, default: null },
    deliveredAt: { type: Date, default: null },
    cancellation: {
      type: new Schema(
        { reason: String, by: { type: String, enum: ['customer', 'admin', 'system'] }, at: Date },
        { _id: false },
      ),
      default: null,
    },
    returnRequest: {
      type: new Schema(
        { reason: String, requestedAt: Date, resolvedAt: Date, outcome: { type: String, enum: ['returned', 'rejected'] } },
        { _id: false },
      ),
      default: null,
    },
    tracking: {
      type: new Schema({ carrier: String, trackingNumber: String, trackingUrl: String, shippedAt: Date }, { _id: false }),
      default: null,
    },
    timeline: { type: [timelineSchema], default: [] },
    idempotencyKey: { type: String, required: true, maxlength: 100 },
    notes: { type: String, maxlength: 300, default: null },
    attention: { type: String, maxlength: 500, default: null },
  },
  { timestamps: true },
);

orderSchema.index({ orderNumber: 1 }, { unique: true });
orderSchema.index({ userId: 1, idempotencyKey: 1 }, { unique: true });
orderSchema.index({ userId: 1, createdAt: -1 });
orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index({ paymentStatus: 1, createdAt: -1 });
orderSchema.index({ status: 1, paymentExpiresAt: 1 });
orderSchema.index({ userId: 1, status: 1, 'items.productId': 1 });

export type OrderDocument = HydratedDocument<Order>;
export const OrderModel = model<Order>('Order', orderSchema);
