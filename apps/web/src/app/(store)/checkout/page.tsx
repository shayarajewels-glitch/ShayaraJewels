'use client';

import { Banknote, CreditCard, Lock, Plus } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import type { AddressDto, OrderDto, PaymentMethod, QuoteDto } from '@shayara/shared';
import { AddressBlock, AddressForm } from '@/components/account/address-form';
import { RequireAuth } from '@/components/account/require-auth';
import { ProductImage } from '@/components/product/product-image';
import { Button } from '@/components/ui/button';
import { Alert, Card, Skeleton } from '@/components/ui/misc';
import { useApiQuery } from '@/hooks/use-api-query';
import { ApiError, api, errorMessage, newIdempotencyKey } from '@/lib/api-client';
import { payWithRazorpay } from '@/lib/razorpay';
import { cn, formatPaise } from '@/lib/utils';
import { useCart } from '@/stores/cart-store';

type Quote = QuoteDto & { onlinePaymentAvailable: boolean };

function Checkout() {
  const router = useRouter();
  const refreshCart = useCart((s) => s.refresh);
  const addressQuery = useApiQuery<{ items: AddressDto[] }>('/users/me/addresses');
  const addresses = addressQuery.data?.items ?? null;
  const [chosenAddressId, setAddressId] = useState<string | null>(null);
  const [addingAddressState, setAddingAddress] = useState(false);
  const [method, setMethod] = useState<PaymentMethod>('razorpay');
  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoteVersion, setQuoteVersion] = useState(0);
  const [actionError, setError] = useState<string | null>(null);
  const [placing, setPlacing] = useState(false);
  // One key per checkout attempt: retries and double-clicks reuse it, so only one order is created.
  const idempotencyKey = useRef(newIdempotencyKey());

  const addressId = chosenAddressId ?? addresses?.find((a) => a.isDefault)?.id ?? addresses?.[0]?.id ?? null;
  const addingAddress = addingAddressState || addresses?.length === 0;
  const error = actionError ?? addressQuery.error;

  useEffect(() => {
    let active = true;
    api<Quote>('/checkout/quote', { method: 'POST', body: { paymentMethod: method } }).then(
      (q) => {
        if (!active) return;
        setQuote(q);
        // Fall back to COD when online payments are not configured on the server.
        if (method === 'razorpay' && !q.onlinePaymentAvailable) setMethod('cod');
      },
      (err) => active && setError(errorMessage(err)),
    );
    return () => {
      active = false;
    };
  }, [method, quoteVersion]);
  const reloadQuote = () => setQuoteVersion((v) => v + 1);

  const placeOrder = async () => {
    if (!addressId || !quote) return;
    setPlacing(true);
    setError(null);
    try {
      const { order } = await api<{ order: OrderDto }>('/checkout', {
        method: 'POST',
        body: { addressId, paymentMethod: method, expectedTotalPaise: quote.totalPaise },
        headers: { 'Idempotency-Key': idempotencyKey.current },
      });
      await refreshCart().catch(() => undefined);
      // The order exists now; a new attempt must use a new key.
      idempotencyKey.current = newIdempotencyKey();

      if (order.paymentMethod === 'cod' || order.status !== 'pending_payment') {
        router.push(`/account/orders/${order.orderNumber}?placed=1`);
        return;
      }
      const outcome = await payWithRazorpay(order.orderNumber);
      if (outcome.status === 'paid') toast.success('Payment received — thank you!');
      else if (outcome.status === 'pending') toast(outcome.message);
      else if (outcome.status === 'dismissed') toast('Payment not completed. You can pay from your order page while the items are reserved.');
      else toast.error(outcome.message);
      router.push(`/account/orders/${order.orderNumber}?placed=1`);
    } catch (err) {
      if (err instanceof ApiError && (err.code === 'PRICE_CHANGED' || err.code === 'CART_INVALID' || err.code === 'INSUFFICIENT_STOCK')) {
        reloadQuote();
        await refreshCart().catch(() => undefined);
      }
      setError(errorMessage(err));
    } finally {
      setPlacing(false);
    }
  };

  if (quote && quote.lines.length === 0) {
    return (
      <Alert variant="info" title="Your bag is empty">
        <Link href="/shop" className="underline">
          Continue shopping
        </Link>
      </Alert>
    );
  }

  const blocked = !quote || quote.issues.length > 0 || !addressId || addingAddress;

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_24rem]">
      <div className="space-y-8">
        {error && <Alert variant="error">{error}</Alert>}

        <section aria-labelledby="addr-heading">
          <div className="mb-4 flex items-center justify-between">
            <h2 id="addr-heading" className="text-2xl">
              1. Delivery address
            </h2>
            {!addingAddress && addresses && addresses.length > 0 && (
              <Button variant="ghost" size="sm" onClick={() => setAddingAddress(true)}>
                <Plus /> New address
              </Button>
            )}
          </div>
          {!addresses && <Skeleton className="h-32" />}
          {addingAddress && (
            <Card className="p-5">
              <AddressForm
                onCancel={addresses && addresses.length > 0 ? () => setAddingAddress(false) : undefined}
                onSaved={(a) => {
                  setAddingAddress(false);
                  setAddressId(a.id);
                  addressQuery.reload();
                }}
              />
            </Card>
          )}
          {!addingAddress && addresses && (
            <fieldset className="grid gap-3 sm:grid-cols-2">
              <legend className="sr-only">Choose a delivery address</legend>
              {addresses.map((a) => (
                <label key={a.id} className={cn('flex cursor-pointer gap-3 rounded-md border bg-card p-4', addressId === a.id ? 'border-charcoal ring-1 ring-charcoal' : 'border-border')}>
                  <input type="radio" name="address" className="mt-1 accent-[var(--rose-deep)]" checked={addressId === a.id} onChange={() => setAddressId(a.id)} />
                  <div>
                    <p className="eyebrow mb-1">{a.label}</p>
                    <AddressBlock address={a} />
                  </div>
                </label>
              ))}
            </fieldset>
          )}
        </section>

        <section aria-labelledby="pay-heading">
          <h2 id="pay-heading" className="mb-4 text-2xl">
            2. Payment
          </h2>
          <fieldset className="grid gap-3">
            <legend className="sr-only">Choose a payment method</legend>
            <PaymentOption
              checked={method === 'razorpay'}
              disabled={quote ? !quote.onlinePaymentAvailable : false}
              onSelect={() => setMethod('razorpay')}
              icon={<CreditCard className="size-5" />}
              title="Pay online"
              text={quote && !quote.onlinePaymentAvailable ? 'Online payment is temporarily unavailable.' : 'UPI, cards, netbanking and wallets via Razorpay.'}
            />
            <PaymentOption
              checked={method === 'cod'}
              disabled={quote ? !quote.codAvailable : false}
              onSelect={() => setMethod('cod')}
              icon={<Banknote className="size-5" />}
              title="Cash on Delivery"
              text={quote && !quote.codAvailable ? 'Not available for this order value.' : 'Pay when your order arrives. A small COD fee applies.'}
            />
          </fieldset>
        </section>
      </div>

      <Card className="h-fit p-6 lg:sticky lg:top-28">
        <h2 className="mb-4 text-2xl">Order summary</h2>
        {!quote ? (
          <Skeleton className="h-48" />
        ) : (
          <>
            <ul className="max-h-72 space-y-3 overflow-y-auto">
              {quote.lines.map((l) => (
                <li key={l.productId} className="flex gap-3 text-sm">
                  <div className="relative size-14 shrink-0 overflow-hidden rounded-sm bg-ivory-deep">
                    {l.image && <ProductImage src={l.image.url} alt={l.image.alt} fill sizes="56px" />}
                    <span className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full bg-rose-deep text-[0.65rem] text-ivory">{l.quantity}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate">{l.name}</p>
                    {l.size && <p className="text-xs text-charcoal-soft">Size {l.size}</p>}
                    {l.issue && <p className="text-xs text-danger">{l.issue}</p>}
                  </div>
                  <p>{formatPaise(l.lineTotalPaise)}</p>
                </li>
              ))}
            </ul>
            <dl className="mt-5 space-y-2 border-t border-border pt-4 text-sm">
              <div className="flex justify-between">
                <dt className="text-charcoal-soft">Subtotal</dt>
                <dd>{formatPaise(quote.subtotalPaise)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-charcoal-soft">Shipping</dt>
                <dd>{quote.shippingPaise ? formatPaise(quote.shippingPaise) : 'Free'}</dd>
              </div>
              {quote.paymentFeePaise > 0 && (
                <div className="flex justify-between">
                  <dt className="text-charcoal-soft">COD fee</dt>
                  <dd>{formatPaise(quote.paymentFeePaise)}</dd>
                </div>
              )}
              <div className="flex justify-between border-t border-border pt-3 text-base font-semibold">
                <dt>Total</dt>
                <dd>{formatPaise(quote.totalPaise)}</dd>
              </div>
            </dl>
            {quote.issues.length > 0 && (
              <Alert variant="warning" className="mt-4" title="Please review your bag">
                <ul className="list-disc pl-4">
                  {quote.issues.map((i) => (
                    <li key={i}>{i}</li>
                  ))}
                </ul>
                <Link href="/cart" className="mt-2 inline-block underline">
                  Edit bag
                </Link>
              </Alert>
            )}
            <Button size="lg" className="mt-5 w-full" loading={placing} disabled={blocked || placing} onClick={placeOrder}>
              {method === 'cod' ? 'Place order' : `Pay ${formatPaise(quote.totalPaise)}`}
            </Button>
            <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-charcoal-soft">
              <Lock className="size-3" aria-hidden /> Totals are calculated securely on our server.
            </p>
            <p className="mt-2 text-center text-xs text-charcoal-soft">
              By placing your order you agree to our{' '}
              <Link href="/terms" className="underline">
                terms
              </Link>{' '}
              and{' '}
              <Link href="/returns-policy" className="underline">
                returns policy
              </Link>
              .
            </p>
          </>
        )}
      </Card>
    </div>
  );
}

function PaymentOption({ checked, disabled, onSelect, icon, title, text }: { checked: boolean; disabled: boolean; onSelect: () => void; icon: React.ReactNode; title: string; text: string }) {
  return (
    <label className={cn('flex cursor-pointer items-start gap-3 rounded-md border bg-card p-4', checked ? 'border-charcoal ring-1 ring-charcoal' : 'border-border', disabled && 'cursor-not-allowed opacity-60')}>
      <input type="radio" name="payment" className="mt-1 accent-[var(--rose-deep)]" checked={checked} disabled={disabled} onChange={onSelect} />
      <span className="mt-0.5 text-champagne">{icon}</span>
      <span>
        <span className="block text-sm font-semibold">{title}</span>
        <span className="block text-xs text-charcoal-soft">{text}</span>
      </span>
    </label>
  );
}

export default function CheckoutPage() {
  return (
    <div className="container-page py-10">
      <h1 className="mb-8 text-4xl sm:text-5xl">Checkout</h1>
      <RequireAuth>
        <Checkout />
      </RequireAuth>
    </div>
  );
}
