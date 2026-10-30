import type { Finish, ProductStatus, ProductType } from '../constants/catalogue';
import type {
  CodCollectionStatus,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  ReviewStatus,
  UserRole,
} from '../constants/commerce';

/** Shapes returned by the REST API. Dates are ISO strings on the wire. */

export interface UserDto {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: UserRole;
  emailVerified: boolean;
  createdAt: string;
}

export interface SessionDto {
  user: UserDto | null;
  csrfToken: string;
}

export interface AddressDto {
  id: string;
  label: string;
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  landmark?: string;
  city: string;
  state: string;
  postalCode: string;
  country: 'IN';
  isDefault: boolean;
}

export interface ProductImageDto {
  url: string;
  key?: string;
  alt: string;
  sortOrder: number;
}

export interface ProductVideoDto {
  url: string;
  key?: string;
  thumbnailUrl?: string;
  thumbnailKey?: string;
}

export interface ProductSummaryDto {
  id: string;
  name: string;
  slug: string;
  type: ProductType;
  finish: Finish;
  pricePaise: number;
  compareAtPricePaise: number | null;
  inStock: boolean;
  /** Low-stock hint shown on the storefront; null when stock is comfortable. */
  stockLeft: number | null;
  image: ProductImageDto | null;
  hoverImage: ProductImageDto | null;
  averageRating: number;
  reviewCount: number;
  featured: boolean;
  createdAt: string;
}

export interface ProductDetailDto extends ProductSummaryDto {
  sku: string;
  description: string;
  baseMaterial: string | null;
  sizeOptions: string[];
  careInstructions: string | null;
  images: ProductImageDto[];
  videos: ProductVideoDto[];
  seoTitle: string | null;
  seoDescription: string | null;
  updatedAt: string;
}

export interface AdminProductDto extends ProductDetailDto {
  status: ProductStatus;
  stock: number;
  reservedHint?: number;
  unitsSold: number;
  searchKeywords: string[];
}

/** Type-ahead results for the header search box. */
export interface SearchSuggestionsDto {
  /** Search phrases (or a category) that match what was typed. */
  suggestions: { label: string; href: string }[];
  products: ProductSummaryDto[];
}

export interface CategoryDto {
  slug: string;
  type: ProductType;
  name: string;
  tagline: string;
  description: string;
  productCount: number;
  /** Custom tile picture set in admin; null means the storefront's built-in photo. */
  image: { url: string; alt: string } | null;
}

/** A category with its custom tile picture, for the admin editor. */
export interface AdminCategoryImageDto {
  type: ProductType;
  slug: string;
  name: string;
  image: { url: string; key: string | null; alt: string } | null;
  updatedAt: string | null;
}

export interface CartLineDto {
  productId: string;
  slug: string;
  name: string;
  sku: string;
  finish: Finish;
  /** Used to decide which lines a category coupon applies to. */
  type: ProductType;
  image: ProductImageDto | null;
  size: string | null;
  quantity: number;
  unitPricePaise: number;
  compareAtPricePaise: number | null;
  lineTotalPaise: number;
  availableStock: number;
  /** Set when the line cannot be bought as-is (out of stock, unpublished, reduced quantity). */
  issue: string | null;
}

export interface CartDto {
  lines: CartLineDto[];
  itemCount: number;
  subtotalPaise: number;
}

export interface QuoteDto {
  lines: CartLineDto[];
  subtotalPaise: number;
  shippingPaise: number;
  paymentFeePaise: number;
  discountPaise: number;
  totalPaise: number;
  codAvailable: boolean;
  issues: string[];
  freeShippingThresholdPaise: number;
  /** The coupon applied to this quote, if one was entered and is valid. */
  coupon: AppliedCouponDto | null;
  /** Why the entered coupon could not be applied. */
  couponError: string | null;
}

export interface AppliedCouponDto {
  code: string;
  title: string;
  discountPercent: number;
  appliesTo: ProductType[];
}

/** Active coupon as shown in the storefront carousel. */
export interface PublicCouponDto {
  code: string;
  title: string;
  description: string;
  discountPercent: number;
  /** Empty means the whole store. */
  appliesTo: ProductType[];
  image: { url: string; alt: string } | null;
  endsAt: string | null;
}

export interface CouponDto {
  id: string;
  code: string;
  title: string;
  description: string;
  discountPercent: number;
  appliesTo: ProductType[];
  image: { url: string; key?: string; alt: string } | null;
  active: boolean;
  startsAt: string | null;
  endsAt: string | null;
  sortOrder: number;
  /** Orders placed with this code (excluding cancelled ones). */
  usageCount: number;
  createdAt: string;
}

export interface OrderItemDto {
  productId: string;
  name: string;
  slug: string;
  sku: string;
  image: string | null;
  size: string | null;
  unitPricePaise: number;
  quantity: number;
  lineTotalPaise: number;
}

export interface AddressSnapshotDto {
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  landmark?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export interface OrderTimelineEntryDto {
  status: OrderStatus;
  at: string;
  note?: string;
}

export interface OrderDto {
  orderNumber: string;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  codCollectionStatus: CodCollectionStatus;
  items: OrderItemDto[];
  shippingAddress: AddressSnapshotDto;
  subtotalPaise: number;
  shippingPaise: number;
  paymentFeePaise: number;
  discountPaise: number;
  couponCode: string | null;
  totalPaise: number;
  refundedPaise: number;
  paymentExpiresAt: string | null;
  tracking: { carrier: string; trackingNumber: string; trackingUrl?: string; shippedAt?: string } | null;
  cancellation: { reason: string; by: 'customer' | 'admin' | 'system'; at: string } | null;
  returnRequest: { reason: string; requestedAt: string; resolvedAt?: string; outcome?: string } | null;
  timeline: OrderTimelineEntryDto[];
  canCancel: boolean;
  canRequestReturn: boolean;
  canPay: boolean;
  reviewableProductIds: string[];
  createdAt: string;
}

export interface AdminOrderDto extends OrderDto {
  id: string;
  customer: { id: string; name: string; email: string; phone: string | null } | null;
  payments: PaymentDto[];
  notes?: string;
  /** Set when an administrator needs to act, e.g. a payment that arrived after the order expired. */
  attention?: string;
}

export interface PaymentDto {
  id: string;
  provider: 'razorpay' | 'mock';
  providerOrderId: string;
  providerPaymentId: string | null;
  amountPaise: number;
  currency: 'INR';
  status: 'created' | 'authorized' | 'captured' | 'failed' | 'refunded' | 'partially_refunded';
  method: string | null;
  refunds: { id: string; amountPaise: number; status: 'pending' | 'processed' | 'failed'; createdAt: string }[];
  createdAt: string;
}

export interface RazorpayCheckoutDto {
  keyId: string;
  razorpayOrderId: string;
  amountPaise: number;
  currency: 'INR';
  orderNumber: string;
  name: string;
  description: string;
  prefill: { name: string; email: string; contact?: string };
}

export interface ReviewDto {
  id: string;
  productId: string;
  rating: number;
  title: string;
  comment: string;
  authorName: string;
  verifiedPurchase: true;
  status: ReviewStatus;
  createdAt: string;
}

export interface AdminReviewDto extends ReviewDto {
  product: { id: string; name: string; slug: string } | null;
  user: { id: string; name: string; email: string } | null;
  orderNumber: string | null;
  moderationNote?: string;
}

export interface DashboardDto {
  orderCount: number;
  grossSalesPaise: number;
  refundsPaise: number;
  netSalesPaise: number;
  averageOrderValuePaise: number;
  last30Days: { orders: number; grossSalesPaise: number };
  statusSummary: Partial<Record<OrderStatus, number>>;
  recentOrders: AdminOrderDto[];
  lowStock: { id: string; name: string; sku: string; stock: number; slug: string }[];
  bestsellers: { id: string; name: string; slug: string; unitsSold: number }[];
  pendingReviews: number;
}
