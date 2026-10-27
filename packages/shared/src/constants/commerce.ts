export const CURRENCY = 'INR' as const;

/** Orders at or above this subtotal (in paise) ship free. */
export const FREE_SHIPPING_THRESHOLD_PAISE = 99_900;
export const STANDARD_SHIPPING_PAISE = 7_900;
/** Extra handling fee for cash on delivery orders. */
export const COD_FEE_PAISE = 4_900;
/** COD is offered only up to this order total. */
export const COD_MAX_TOTAL_PAISE = 500_000;

export const MAX_QUANTITY_PER_ITEM = 10;
export const MAX_CART_LINES = 30;

/** Unpaid prepaid orders hold stock for this long before it is released. */
export const PAYMENT_WINDOW_MINUTES = 30;
/** Customers may request a return this many days after delivery. */
export const RETURN_WINDOW_DAYS = 7;

export const PAYMENT_METHODS = ['razorpay', 'cod'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_STATUSES = [
  'pending',
  'paid',
  'failed',
  'expired',
  'partially_refunded',
  'refunded',
] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const ORDER_STATUSES = [
  'pending_payment',
  'confirmed',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
  'return_requested',
  'returned',
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending_payment: 'Awaiting payment',
  confirmed: 'Confirmed',
  processing: 'Being packed',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  return_requested: 'Return requested',
  returned: 'Returned',
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  pending: 'Pending',
  paid: 'Paid',
  failed: 'Failed',
  expired: 'Expired',
  partially_refunded: 'Partially refunded',
  refunded: 'Refunded',
};

/**
 * Fulfilment transitions an administrator may make manually. Payment-driven
 * transitions (pending_payment -> confirmed / cancelled) are handled by the
 * payment and reservation services, never by the admin status endpoint.
 */
export const ADMIN_ORDER_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  pending_payment: [],
  confirmed: ['processing', 'shipped', 'cancelled'],
  processing: ['shipped', 'cancelled'],
  shipped: ['delivered'],
  delivered: [],
  cancelled: [],
  return_requested: ['returned', 'delivered'],
  returned: [],
};

/** Statuses in which the customer can still cancel the order themselves. */
export const CUSTOMER_CANCELLABLE_STATUSES: readonly OrderStatus[] = ['pending_payment', 'confirmed'];

export const COD_COLLECTION_STATUSES = ['not_applicable', 'pending', 'collected', 'failed'] as const;
export type CodCollectionStatus = (typeof COD_COLLECTION_STATUSES)[number];

export const REVIEW_STATUSES = ['pending', 'approved', 'rejected'] as const;
export type ReviewStatus = (typeof REVIEW_STATUSES)[number];

export const USER_ROLES = ['customer', 'admin'] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const INDIAN_STATES = [
  'Andaman and Nicobar Islands',
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chandigarh',
  'Chhattisgarh',
  'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jammu and Kashmir',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Ladakh',
  'Lakshadweep',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Puducherry',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
] as const;

export const CSRF_HEADER = 'x-csrf-token';
export const IDEMPOTENCY_HEADER = 'idempotency-key';
