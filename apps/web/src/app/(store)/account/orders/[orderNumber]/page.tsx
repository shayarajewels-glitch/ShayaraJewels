'use client';

import { CheckCircle2, Truck } from 'lucide-react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { toast } from 'sonner';
import { ORDER_STATUS_LABELS, RETURN_WINDOW_DAYS, type OrderDto } from '@shayara/shared';
import { AddressBlock } from '@/components/account/address-form';
import { OrderStatusBadge, PaymentStatusBadge } from '@/components/account/order-status-badge';
import { ReviewForm } from '@/components/account/review-form';
import { ProductImage } from '@/components/product/product-image';
import { Button } from '@/components/ui/button';
import { Label, Textarea } from '@/components/ui/form-controls';
import { Alert, Card, Skeleton } from '@/components/ui/misc';
import { Dialog, DialogClose, DialogContent } from '@/components/ui/overlays';
import { useApiQuery } from '@/hooks/use-api-query';
import { api, errorMessage } from '@/lib/api-client';
import { payWithRazorpay } from '@/lib/razorpay';
import { formatDate, formatDateTime, formatPaise } from '@/lib/utils';

function OrderDetail() {
  const { orderNumber } = useParams<{ orderNumber: string }>();
  const justPlaced = useSearchParams().get('placed') === '1';
  const { data: order, error, reload: load, setData: setOrder } = useApiQuery<OrderDto>(`/orders/${encodeURIComponent(orderNumber)}`);
  const [paying, setPaying] = useState(false);
  const [dialog, setDialog] = useState<'cancel' | 'return' | { review: string } | null>(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  const pay = async () => {
    setPaying(true);
    try {
      const outcome = await payWithRazorpay(orderNumber);
      if (outcome.status === 'paid') {
        setOrder(outcome.order);
        toast.success('Payment received — thank you!');
      } else if (outcome.status === 'pending') {
        setOrder(outcome.order);
        toast(outcome.message);
      } else if (outcome.status === 'failed') toast.error(outcome.message);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setPaying(false);
    }
  };

  const submitAction = async (kind: 'cancel' | 'return') => {
    setBusy(true);
    try {
      const updated = await api<OrderDto>(`/orders/${encodeURIComponent(orderNumber)}/${kind === 'cancel' ? 'cancel' : 'return-request'}`, {
        method: 'POST',
        body: kind === 'cancel' ? { reason: reason || 'Cancelled by customer' } : { reason },
      });
      setOrder(updated);
      setDialog(null);
      setReason('');
      toast.success(kind === 'cancel' ? 'Your order has been cancelled' : 'Return requested — we will be in touch');
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  if (error) return <Alert variant="error">{error}</Alert>;
  if (!order) return <Skeleton className="h-96" />;

  return (
    <div className="space-y-8">
      <div>
        <Link href="/account/orders" className="text-xs text-charcoal-soft hover:text-rose-deep">
          ← All orders
        </Link>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <h1 className="text-4xl">Order {order.orderNumber}</h1>
          <OrderStatusBadge status={order.status} />
        </div>
        <p className="mt-1 text-sm text-charcoal-soft">Placed on {formatDateTime(order.createdAt)}</p>
      </div>

      {justPlaced && order.status !== 'pending_payment' && (
        <Alert variant="success" title="Thank you for your order!">
          We&apos;ve received it and will let you know when it ships.
        </Alert>
      )}
      {order.canPay && (
        <Alert variant="warning" title="Payment pending">
          <p>
            Complete payment by {order.paymentExpiresAt ? formatDateTime(order.paymentExpiresAt) : 'soon'} to confirm your order. Items are reserved for you until then.
          </p>
          <Button className="mt-3" variant="rose" size="sm" loading={paying} onClick={pay}>
            Pay {formatPaise(order.totalPaise)}
          </Button>
        </Alert>
      )}

      {order.tracking && (
        <Card className="flex items-start gap-4 p-5">
          <Truck className="mt-0.5 size-5 text-champagne" aria-hidden />
          <div className="text-sm">
            <p className="font-semibold">
              Shipped with {order.tracking.carrier}
              {order.tracking.shippedAt ? ` on ${formatDate(order.tracking.shippedAt)}` : ''}
            </p>
            <p className="text-charcoal-soft">
              Tracking number: <span className="font-mono">{order.tracking.trackingNumber}</span>
            </p>
            {order.tracking.trackingUrl && (
              <a href={order.tracking.trackingUrl} target="_blank" rel="noopener noreferrer" className="text-rose-deep underline underline-offset-4">
                Track shipment
              </a>
            )}
          </div>
        </Card>
      )}

      <div className="grid gap-8 lg:grid-cols-[1fr_20rem]">
        <Card className="p-5">
          <h2 className="mb-2 text-2xl">Items</h2>
          <ul className="divide-y divide-border">
            {order.items.map((i) => (
              <li key={i.productId} className="flex gap-4 py-4">
                <div className="relative size-20 shrink-0 overflow-hidden rounded-sm bg-ivory-deep">{i.image && <ProductImage src={i.image} alt={i.name} fill sizes="80px" />}</div>
                <div className="flex-1 text-sm">
                  <Link href={`/products/${i.slug}`} className="font-display text-lg hover:text-rose-deep">
                    {i.name}
                  </Link>
                  <p className="text-xs text-charcoal-soft">
                    SKU {i.sku}
                    {i.size ? ` · Size ${i.size}` : ''} · Qty {i.quantity} × {formatPaise(i.unitPricePaise)}
                  </p>
                  {order.reviewableProductIds.includes(i.productId) && (
                    <button type="button" className="mt-2 text-xs font-semibold text-rose-deep underline underline-offset-4" onClick={() => setDialog({ review: i.productId })}>
                      Write a review
                    </button>
                  )}
                </div>
                <p className="text-sm font-semibold">{formatPaise(i.lineTotalPaise)}</p>
              </li>
            ))}
          </ul>
        </Card>

        <div className="space-y-6">
          <Card className="p-5 text-sm">
            <h2 className="mb-3 text-xl">Summary</h2>
            <dl className="space-y-2">
              <Row label="Subtotal" value={formatPaise(order.subtotalPaise)} />
              <Row label="Shipping" value={order.shippingPaise ? formatPaise(order.shippingPaise) : 'Free'} />
              {order.paymentFeePaise > 0 && <Row label="COD fee" value={formatPaise(order.paymentFeePaise)} />}
              {order.discountPaise > 0 && <Row label={order.couponCode ? `Coupon ${order.couponCode}` : 'Discount'} value={`−${formatPaise(order.discountPaise)}`} />}
              <div className="flex justify-between border-t border-border pt-2 text-base font-semibold">
                <dt>Total</dt>
                <dd>{formatPaise(order.totalPaise)}</dd>
              </div>
              {order.refundedPaise > 0 && <Row label="Refunded" value={formatPaise(order.refundedPaise)} />}
            </dl>
            <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
              <span>{order.paymentMethod === 'cod' ? 'Cash on Delivery' : 'Paid online'}</span>
              <PaymentStatusBadge status={order.paymentStatus} />
            </div>
          </Card>
          <Card className="p-5">
            <h2 className="mb-3 text-xl">Delivering to</h2>
            <AddressBlock address={order.shippingAddress} />
          </Card>
          <div className="flex flex-col gap-2">
            {order.canCancel && (
              <Button variant="outline" onClick={() => setDialog('cancel')}>
                Cancel order
              </Button>
            )}
            {order.canRequestReturn && (
              <Button variant="outline" onClick={() => setDialog('return')}>
                Request a return
              </Button>
            )}
          </div>
          {order.cancellation && (
            <Alert variant="info" title="Cancelled">
              {order.cancellation.reason} ({formatDate(order.cancellation.at)})
            </Alert>
          )}
          {order.returnRequest && (
            <Alert variant="info" title="Return request">
              {order.returnRequest.reason}
              {order.returnRequest.outcome ? ` — ${order.returnRequest.outcome === 'returned' ? 'return accepted' : 'return declined'}` : ' — under review'}
            </Alert>
          )}
        </div>
      </div>

      <Card className="p-5">
        <h2 className="mb-4 text-2xl">Order timeline</h2>
        <ol className="space-y-4">
          {order.timeline.map((t, idx) => (
            <li key={idx} className="flex gap-3 text-sm">
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-champagne" aria-hidden />
              <div>
                <p className="font-semibold">{ORDER_STATUS_LABELS[t.status]}</p>
                <p className="text-xs text-charcoal-soft">
                  {formatDateTime(t.at)}
                  {t.note ? ` · ${t.note}` : ''}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </Card>

      <Dialog open={dialog === 'cancel' || dialog === 'return'} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent
          title={dialog === 'cancel' ? 'Cancel this order?' : 'Request a return'}
          description={
            dialog === 'cancel'
              ? order.paymentStatus === 'paid'
                ? 'Your payment will be refunded to the original payment method.'
                : 'Reserved items will be released.'
              : `Returns are accepted within ${RETURN_WINDOW_DAYS} days of delivery for unworn pieces in original packaging.`
          }
        >
          <div className="space-y-4">
            <div>
              <Label htmlFor="reason">{dialog === 'cancel' ? 'Reason (optional)' : 'What went wrong?'}</Label>
              <Textarea id="reason" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} />
            </div>
            <div className="flex justify-end gap-3">
              <DialogClose asChild>
                <Button variant="ghost">Back</Button>
              </DialogClose>
              <Button variant={dialog === 'cancel' ? 'destructive' : 'default'} loading={busy} disabled={dialog === 'return' && reason.trim().length < 10} onClick={() => submitAction(dialog as 'cancel' | 'return')}>
                {dialog === 'cancel' ? 'Cancel order' : 'Request return'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={typeof dialog === 'object' && dialog !== null} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent title="Write a review" description="Reviews are checked before they appear on the product page.">
          {typeof dialog === 'object' && dialog !== null && (
            <ReviewForm
              productId={dialog.review}
              onDone={() => {
                setDialog(null);
                toast.success('Thank you! Your review is now live.');
                void load();
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <dt className="text-charcoal-soft">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

export default function OrderDetailPage() {
  return (
    <Suspense>
      <OrderDetail />
    </Suspense>
  );
}
