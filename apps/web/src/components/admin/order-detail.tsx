'use client';

import Link from 'next/link';
import { ORDER_STATUS_LABELS, type AdminOrderDto } from '@shayara/shared';
import { ProductImage } from '@/components/product/product-image';
import { Alert, Badge, Card, Skeleton } from '@/components/ui/misc';
import { formatDateTime, formatPaise } from '@/lib/utils';
import { AdminPageHeader, OrderStatusBadge, PaymentStatusBadge, useAdminResource } from './admin-ui';
import { RefundForm, StatusUpdater } from './order-actions';

export function OrderDetail({ id }: { id: string }) {
  const { data: order, error, loading, setData } = useAdminResource<AdminOrderDto>(`/admin/orders/${id}`);

  return (
    <div>
      <Link href="/admin/orders" className="text-xs text-rose-deep hover:underline">
        ← All orders
      </Link>
      {error && (
        <Alert variant="error" title="Could not load this order" className="mt-4">
          {error}
        </Alert>
      )}
      {loading && !order && <Skeleton className="mt-4 h-96" />}
      {order && (
        <>
          <AdminPageHeader
            title={order.orderNumber}
            description={`Placed ${formatDateTime(order.createdAt)}`}
            actions={
              <div className="flex flex-wrap items-center gap-2">
                <OrderStatusBadge status={order.status} />
                <PaymentStatusBadge status={order.paymentStatus} />
                <Badge variant="outline">{order.paymentMethod === 'cod' ? 'Cash on Delivery' : 'Online'}</Badge>
              </div>
            }
          />
          {order.attention && (
            <Alert variant="warning" title="Needs attention" className="mb-6">
              {order.attention}
            </Alert>
          )}

          <div className="grid gap-6 xl:grid-cols-[1fr_22rem]">
            <div className="space-y-6">
              <Card className="p-5">
                <h2 className="mb-4 font-sans text-sm font-semibold">Items</h2>
                <ul className="divide-y divide-border">
                  {order.items.map((item) => (
                    <li key={`${item.productId}-${item.size}`} className="flex gap-4 py-3">
                      <div className="relative size-16 shrink-0 overflow-hidden rounded-sm bg-ivory-deep">
                        {item.image && <ProductImage src={item.image} alt="" fill sizes="64px" />}
                      </div>
                      <div className="min-w-0 flex-1 text-sm">
                        <Link href={`/admin/products/${item.productId}`} className="font-medium hover:underline">
                          {item.name}
                        </Link>
                        <p className="text-xs text-charcoal-soft">
                          SKU {item.sku}
                          {item.size ? ` · Size ${item.size}` : ''} · {formatPaise(item.unitPricePaise)} × {item.quantity}
                        </p>
                      </div>
                      <p className="text-sm font-medium">{formatPaise(item.lineTotalPaise)}</p>
                    </li>
                  ))}
                </ul>
                <dl className="mt-4 space-y-1.5 border-t border-border pt-4 text-sm">
                  <Row label="Subtotal" value={formatPaise(order.subtotalPaise)} />
                  <Row label="Shipping" value={order.shippingPaise ? formatPaise(order.shippingPaise) : 'Free'} />
                  {order.paymentFeePaise > 0 && <Row label="COD fee" value={formatPaise(order.paymentFeePaise)} />}
                  {order.discountPaise > 0 && <Row label="Discount" value={`−${formatPaise(order.discountPaise)}`} />}
                  <Row label="Total" value={formatPaise(order.totalPaise)} strong />
                  {order.refundedPaise > 0 && <Row label="Refunded (processed)" value={`−${formatPaise(order.refundedPaise)}`} />}
                </dl>
              </Card>

              <div className="grid gap-6 md:grid-cols-2">
                <Card className="p-5 text-sm">
                  <h2 className="mb-3 font-sans text-sm font-semibold">Customer</h2>
                  {order.customer ? (
                    <>
                      <p>{order.customer.name}</p>
                      <p className="text-charcoal-soft">{order.customer.email}</p>
                      {order.customer.phone && <p className="text-charcoal-soft">{order.customer.phone}</p>}
                    </>
                  ) : (
                    <p className="text-charcoal-soft">Account no longer exists.</p>
                  )}
                  {order.notes && (
                    <p className="mt-3 rounded-sm bg-ivory-deep p-2 text-xs">
                      <span className="font-semibold">Customer note:</span> {order.notes}
                    </p>
                  )}
                </Card>
                <Card className="p-5 text-sm">
                  <h2 className="mb-3 font-sans text-sm font-semibold">Ship to (as ordered)</h2>
                  <address className="not-italic leading-6">
                    {order.shippingAddress.fullName}
                    <br />
                    {order.shippingAddress.addressLine1}
                    {order.shippingAddress.addressLine2 && (
                      <>
                        <br />
                        {order.shippingAddress.addressLine2}
                      </>
                    )}
                    {order.shippingAddress.landmark && (
                      <>
                        <br />
                        Near {order.shippingAddress.landmark}
                      </>
                    )}
                    <br />
                    {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.postalCode}
                    <br />
                    Phone {order.shippingAddress.phone}
                  </address>
                  {order.tracking && (
                    <p className="mt-3 text-xs">
                      <span className="font-semibold">{order.tracking.carrier}</span> · {order.tracking.trackingNumber}
                      {order.tracking.trackingUrl && (
                        <>
                          {' · '}
                          <a href={order.tracking.trackingUrl} target="_blank" rel="noopener noreferrer" className="text-rose-deep underline">
                            Track
                          </a>
                        </>
                      )}
                    </p>
                  )}
                </Card>
              </div>

              <Card className="p-5">
                <h2 className="mb-4 font-sans text-sm font-semibold">Payments</h2>
                {order.payments.length === 0 ? (
                  <p className="text-sm text-charcoal-soft">{order.paymentMethod === 'cod' ? `Cash on Delivery — collection ${order.codCollectionStatus.replace('_', ' ')}.` : 'No payment attempt yet.'}</p>
                ) : (
                  <ul className="space-y-4 text-sm">
                    {order.payments.map((p) => (
                      <li key={p.id} className="rounded-sm border border-border p-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="font-mono text-xs">{p.providerOrderId}</span>
                          <Badge variant={p.status === 'captured' ? 'success' : p.status === 'failed' ? 'danger' : 'muted'}>{p.status.replace('_', ' ')}</Badge>
                        </div>
                        <p className="mt-1 text-xs text-charcoal-soft">
                          {formatPaise(p.amountPaise)} · {p.providerPaymentId ?? 'no successful payment'}
                          {p.method ? ` · ${p.method}` : ''} · {formatDateTime(p.createdAt)}
                        </p>
                        {p.refunds.length > 0 && (
                          <ul className="mt-2 space-y-1 border-t border-border pt-2 text-xs">
                            {p.refunds.map((r) => (
                              <li key={r.id} className="flex justify-between">
                                <span>
                                  Refund {r.id} · {formatDateTime(r.createdAt)}
                                </span>
                                <span>
                                  {formatPaise(r.amountPaise)} · <span className={r.status === 'failed' ? 'text-danger' : r.status === 'processed' ? 'text-success' : ''}>{r.status}</span>
                                </span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </Card>

              {order.returnRequest && (
                <Card className="p-5 text-sm">
                  <h2 className="mb-2 font-sans text-sm font-semibold">Return request</h2>
                  <p>{order.returnRequest.reason}</p>
                  <p className="mt-1 text-xs text-charcoal-soft">
                    Requested {formatDateTime(order.returnRequest.requestedAt)}
                    {order.returnRequest.outcome && ` · ${order.returnRequest.outcome}`}
                  </p>
                </Card>
              )}

              <Card className="p-5">
                <h2 className="mb-4 font-sans text-sm font-semibold">Timeline</h2>
                <ol className="space-y-3 border-l border-sand pl-4 text-sm">
                  {order.timeline.map((t, i) => (
                    <li key={i}>
                      <p className="font-medium">{ORDER_STATUS_LABELS[t.status]}</p>
                      <p className="text-xs text-charcoal-soft">
                        {formatDateTime(t.at)}
                        {t.note ? ` — ${t.note}` : ''}
                      </p>
                    </li>
                  ))}
                </ol>
                {order.cancellation && (
                  <p className="mt-4 text-xs text-charcoal-soft">
                    Cancelled by {order.cancellation.by}: {order.cancellation.reason}
                  </p>
                )}
              </Card>
            </div>

            <div className="space-y-6 xl:sticky xl:top-8 xl:self-start">
              <StatusUpdater key={`${order.status}-${order.codCollectionStatus}`} order={order} onUpdated={setData} />
              <RefundForm key={`${order.paymentStatus}-${order.refundedPaise}`} order={order} onUpdated={setData} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`flex justify-between ${strong ? 'text-base font-semibold' : ''}`}>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
