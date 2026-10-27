import { Schema, model, type HydratedDocument, type Types } from 'mongoose';

export const PAYMENT_RECORD_STATUSES = ['created', 'authorized', 'captured', 'failed', 'refunded', 'partially_refunded'] as const;
export type PaymentRecordStatus = (typeof PAYMENT_RECORD_STATUSES)[number];

export interface PaymentRefund {
  providerRefundId: string;
  amountPaise: number;
  status: 'pending' | 'processed' | 'failed';
  reason?: string;
  requestedBy?: Types.ObjectId | null;
  createdAt: Date;
  processedAt?: Date | null;
}

export interface PaymentEvent {
  type: string;
  at: Date;
  source: 'checkout' | 'webhook' | 'reconcile' | 'admin' | 'system';
  detail?: string;
}

/** One provider order (one Razorpay order) for an internal order. Kept as an audit record. */
export interface Payment {
  _id: Types.ObjectId;
  orderId: Types.ObjectId;
  userId: Types.ObjectId;
  provider: 'razorpay' | 'mock';
  providerOrderId: string;
  providerPaymentId?: string | null;
  amountPaise: number;
  currency: 'INR';
  status: PaymentRecordStatus;
  method?: string | null;
  signatureVerifiedAt?: Date | null;
  capturedAt?: Date | null;
  failureReason?: string | null;
  refunds: PaymentRefund[];
  events: PaymentEvent[];
  createdAt: Date;
  updatedAt: Date;
}

const refundSchema = new Schema<PaymentRefund>(
  {
    providerRefundId: { type: String, required: true },
    amountPaise: { type: Number, required: true, min: 1 },
    status: { type: String, enum: ['pending', 'processed', 'failed'], required: true },
    reason: String,
    requestedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    createdAt: { type: Date, default: () => new Date() },
    processedAt: { type: Date, default: null },
  },
  { _id: false },
);

const eventSchema = new Schema<PaymentEvent>(
  {
    type: { type: String, required: true },
    at: { type: Date, required: true },
    source: { type: String, enum: ['checkout', 'webhook', 'reconcile', 'admin', 'system'], required: true },
    detail: { type: String, maxlength: 300 },
  },
  { _id: false },
);

const paymentSchema = new Schema<Payment>(
  {
    orderId: { type: Schema.Types.ObjectId, ref: 'Order', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    provider: { type: String, enum: ['razorpay', 'mock'], required: true },
    providerOrderId: { type: String, required: true },
    providerPaymentId: { type: String, default: null },
    amountPaise: { type: Number, required: true, min: 100 },
    currency: { type: String, enum: ['INR'], default: 'INR', required: true },
    status: { type: String, enum: PAYMENT_RECORD_STATUSES, default: 'created', required: true },
    method: { type: String, default: null },
    signatureVerifiedAt: { type: Date, default: null },
    capturedAt: { type: Date, default: null },
    failureReason: { type: String, default: null, maxlength: 300 },
    refunds: { type: [refundSchema], default: [] },
    events: { type: [eventSchema], default: [] },
  },
  { timestamps: true },
);

paymentSchema.index({ providerOrderId: 1 }, { unique: true });
// A provider payment can belong to exactly one payment record.
paymentSchema.index(
  { providerPaymentId: 1 },
  { unique: true, partialFilterExpression: { providerPaymentId: { $type: 'string' } } },
);
paymentSchema.index(
  { 'refunds.providerRefundId': 1 },
  { unique: true, partialFilterExpression: { 'refunds.providerRefundId': { $type: 'string' } } },
);
paymentSchema.index({ orderId: 1, createdAt: -1 });

export type PaymentDocument = HydratedDocument<Payment>;
export const PaymentModel = model<Payment>('Payment', paymentSchema);
