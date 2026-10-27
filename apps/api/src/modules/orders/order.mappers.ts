import {
  CUSTOMER_CANCELLABLE_STATUSES,
  RETURN_WINDOW_DAYS,
  type AdminOrderDto,
  type OrderDto,
  type PaymentDto,
} from '@shayara/shared';
import type { Order, Payment, User } from '../../models';

const iso = (d?: Date | null) => (d ? new Date(d).toISOString() : undefined);

export function returnWindowOpen(order: Pick<Order, 'status' | 'deliveredAt' | 'returnRequest'>, now = Date.now()): boolean {
  if (order.status !== 'delivered' || !order.deliveredAt || order.returnRequest) return false;
  return now - new Date(order.deliveredAt).getTime() <= RETURN_WINDOW_DAYS * 24 * 60 * 60 * 1000;
}

export function toOrderDto(order: Order, reviewedProductIds: string[] = []): OrderDto {
  const now = Date.now();
  const canPay =
    order.status === 'pending_payment' &&
    order.paymentMethod === 'razorpay' &&
    !!order.paymentExpiresAt &&
    new Date(order.paymentExpiresAt).getTime() > now;
  return {
    orderNumber: order.orderNumber,
    status: order.status,
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus,
    codCollectionStatus: order.codCollectionStatus,
    items: order.items.map((i) => ({
      productId: i.productId.toString(),
      name: i.name,
      slug: i.slug,
      sku: i.sku,
      image: i.image ?? null,
      size: i.size ?? null,
      unitPricePaise: i.unitPricePaise,
      quantity: i.quantity,
      lineTotalPaise: i.lineTotalPaise,
    })),
    shippingAddress: {
      fullName: order.shippingAddress.fullName,
      phone: order.shippingAddress.phone,
      addressLine1: order.shippingAddress.addressLine1,
      addressLine2: order.shippingAddress.addressLine2 ?? undefined,
      landmark: order.shippingAddress.landmark ?? undefined,
      city: order.shippingAddress.city,
      state: order.shippingAddress.state,
      postalCode: order.shippingAddress.postalCode,
      country: order.shippingAddress.country,
    },
    subtotalPaise: order.subtotalPaise,
    shippingPaise: order.shippingPaise,
    paymentFeePaise: order.paymentFeePaise,
    discountPaise: order.discountPaise,
    totalPaise: order.totalPaise,
    refundedPaise: order.refundedPaise,
    paymentExpiresAt: iso(order.paymentExpiresAt) ?? null,
    tracking: order.tracking
      ? {
          carrier: order.tracking.carrier,
          trackingNumber: order.tracking.trackingNumber,
          trackingUrl: order.tracking.trackingUrl,
          shippedAt: iso(order.tracking.shippedAt),
        }
      : null,
    cancellation: order.cancellation
      ? { reason: order.cancellation.reason, by: order.cancellation.by, at: iso(order.cancellation.at)! }
      : null,
    returnRequest: order.returnRequest
      ? {
          reason: order.returnRequest.reason,
          requestedAt: iso(order.returnRequest.requestedAt)!,
          resolvedAt: iso(order.returnRequest.resolvedAt),
          outcome: order.returnRequest.outcome,
        }
      : null,
    timeline: order.timeline.map((t) => ({ status: t.status, at: iso(t.at)!, note: t.note })),
    canCancel: CUSTOMER_CANCELLABLE_STATUSES.includes(order.status),
    canRequestReturn: returnWindowOpen(order, now),
    canPay,
    reviewableProductIds:
      order.status === 'delivered' || order.status === 'return_requested' || order.status === 'returned'
        ? [...new Set(order.items.map((i) => i.productId.toString()))].filter((id) => !reviewedProductIds.includes(id))
        : [],
    createdAt: order.createdAt.toISOString(),
  };
}

export function toPaymentDto(p: Payment): PaymentDto {
  return {
    id: p._id.toString(),
    provider: p.provider,
    providerOrderId: p.providerOrderId,
    providerPaymentId: p.providerPaymentId ?? null,
    amountPaise: p.amountPaise,
    currency: 'INR',
    status: p.status,
    method: p.method ?? null,
    refunds: p.refunds.map((r) => ({
      id: r.providerRefundId,
      amountPaise: r.amountPaise,
      status: r.status,
      createdAt: r.createdAt.toISOString(),
    })),
    createdAt: p.createdAt.toISOString(),
  };
}

export function toAdminOrderDto(
  order: Order,
  customer: Pick<User, '_id' | 'name' | 'email' | 'phone'> | null,
  payments: Payment[],
): AdminOrderDto {
  return {
    ...toOrderDto(order),
    id: order._id.toString(),
    customer: customer
      ? { id: customer._id.toString(), name: customer.name, email: customer.email, phone: customer.phone ?? null }
      : null,
    payments: payments.map(toPaymentDto),
    notes: order.notes ?? undefined,
    attention: order.attention ?? undefined,
  };
}
