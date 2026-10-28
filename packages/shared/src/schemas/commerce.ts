import { z } from 'zod';
import { MAX_QUANTITY_PER_ITEM, ORDER_STATUSES, PAYMENT_METHODS, PAYMENT_STATUSES, REVIEW_STATUSES } from '../constants/commerce';
import { objectIdSchema, paginationSchema, paiseSchema } from './common';
import { couponCodeSchema } from './coupon';

/* ----------------------------------- Cart ---------------------------------- */

export const quantitySchema = z
  .number({ error: 'Quantity is required' })
  .int()
  .min(1, 'Quantity must be at least 1')
  .max(MAX_QUANTITY_PER_ITEM, `You can buy at most ${MAX_QUANTITY_PER_ITEM} of an item`);

export const addCartItemSchema = z.strictObject({
  productId: objectIdSchema,
  quantity: quantitySchema.default(1),
  size: z.string().trim().max(30).optional(),
});
export type AddCartItemInput = z.input<typeof addCartItemSchema>;

export const updateCartItemSchema = z.strictObject({
  quantity: quantitySchema,
  size: z.string().trim().max(30).optional(),
});

/* --------------------------------- Checkout -------------------------------- */

export const checkoutQuoteSchema = z.strictObject({
  addressId: objectIdSchema.optional(),
  paymentMethod: z.enum(PAYMENT_METHODS).default('razorpay'),
  couponCode: couponCodeSchema.optional(),
});
export type CheckoutQuoteInput = z.input<typeof checkoutQuoteSchema>;

export const checkoutSchema = z.strictObject({
  addressId: objectIdSchema,
  paymentMethod: z.enum(PAYMENT_METHODS),
  couponCode: couponCodeSchema.optional(),
  /** The quote total the customer saw; checkout fails if the server total differs. */
  expectedTotalPaise: paiseSchema.optional(),
  notes: z.string().trim().max(300).optional(),
});
export type CheckoutInput = z.infer<typeof checkoutSchema>;

/* --------------------------------- Payments -------------------------------- */

export const razorpayCreateOrderSchema = z.strictObject({
  orderNumber: z.string().trim().max(40),
});

export const razorpayVerifySchema = z.strictObject({
  orderNumber: z.string().trim().max(40),
  razorpay_order_id: z.string().trim().regex(/^order_[A-Za-z0-9]{6,40}$/, 'Invalid Razorpay order id'),
  razorpay_payment_id: z.string().trim().regex(/^pay_[A-Za-z0-9]{6,40}$/, 'Invalid Razorpay payment id'),
  razorpay_signature: z.string().trim().regex(/^[a-f0-9]{64}$/, 'Invalid signature'),
});
export type RazorpayVerifyInput = z.infer<typeof razorpayVerifySchema>;

/* ---------------------------------- Orders --------------------------------- */

export const orderListQuerySchema = paginationSchema.extend({
  status: z.enum(ORDER_STATUSES).optional(),
});

export const cancelOrderSchema = z.strictObject({
  reason: z.string().trim().min(3).max(300).default('Cancelled by customer'),
});

export const returnRequestSchema = z.strictObject({
  reason: z.string().trim().min(10, 'Tell us a little more (at least 10 characters)').max(500),
});

export const adminOrderQuerySchema = paginationSchema.extend({
  q: z.string().trim().max(80).optional(),
  status: z.enum(ORDER_STATUSES).optional(),
  paymentStatus: z.enum(PAYMENT_STATUSES).optional(),
  paymentMethod: z.enum(PAYMENT_METHODS).optional(),
});

export const adminOrderStatusSchema = z.strictObject({
  status: z.enum(ORDER_STATUSES),
  note: z.string().trim().max(300).optional(),
  tracking: z
    .strictObject({
      carrier: z.string().trim().min(2).max(60),
      trackingNumber: z.string().trim().min(3).max(60),
      trackingUrl: z.url({ protocol: /^https$/ }).max(500).optional(),
    })
    .optional(),
  codCollected: z.boolean().optional(),
  /** When marking an order returned: put the units back into sellable stock. */
  restock: z.boolean().optional(),
});
export type AdminOrderStatusInput = z.infer<typeof adminOrderStatusSchema>;

export const adminRefundSchema = z.strictObject({
  /** Omit to refund the remaining refundable amount. */
  amountPaise: paiseSchema.min(100).optional(),
  reason: z.string().trim().min(3).max(300),
  restock: z.boolean().default(true),
});
export type AdminRefundInput = z.input<typeof adminRefundSchema>;

/* ---------------------------------- Reviews -------------------------------- */

export const createReviewSchema = z.strictObject({
  rating: z.number().int().min(1, 'Choose a rating').max(5),
  title: z.string().trim().min(3, 'Add a short title').max(100),
  comment: z.string().trim().min(10, 'Write at least 10 characters').max(2000),
});
export type CreateReviewInput = z.infer<typeof createReviewSchema>;

export const updateReviewSchema = createReviewSchema.partial().refine((v) => Object.keys(v).length > 0, {
  message: 'Nothing to update',
});

export const reviewListQuerySchema = paginationSchema.extend({
  sort: z.enum(['recent', 'highest', 'lowest']).default('recent'),
});

export const adminReviewQuerySchema = paginationSchema.extend({
  status: z.enum(REVIEW_STATUSES).optional(),
});

export const adminReviewModerationSchema = z.strictObject({
  status: z.enum(['approved', 'rejected']),
  moderationNote: z.string().trim().max(300).optional(),
});
