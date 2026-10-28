'use client';

import { Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { toast } from 'sonner';
import { FREE_SHIPPING_THRESHOLD_PAISE, type CartLineDto } from '@shayara/shared';
import { ProductImage } from '@/components/product/product-image';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent } from '@/components/ui/overlays';
import { errorMessage } from '@/lib/api-client';
import { formatPaise } from '@/lib/utils';
import { useCart } from '@/stores/cart-store';

export function CartLine({ line, compact = false }: { line: CartLineDto; compact?: boolean }) {
  const { update, remove } = useCart();
  const [busy, setBusy] = useState(false);
  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    try {
      await fn();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };
  const maxQty = Math.min(10, line.availableStock || line.quantity);

  return (
    <li className="flex gap-4 py-4" aria-busy={busy}>
      <Link href={line.slug ? `/products/${line.slug}` : '#'} className="relative aspect-square w-20 shrink-0 overflow-hidden rounded-sm bg-ivory-deep sm:w-24">
        {line.image && <ProductImage src={line.image.url} alt={line.image.alt} fill sizes="96px" />}
      </Link>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <Link href={`/products/${line.slug}`} className="block truncate font-display text-lg leading-tight hover:text-rose-deep">
              {line.name}
            </Link>
            <p className="mt-0.5 text-xs text-charcoal-soft">
              {line.size ? `Size ${line.size} · ` : ''}
              {formatPaise(line.unitPricePaise)}
            </p>
          </div>
          <p className="text-sm font-semibold">{formatPaise(line.lineTotalPaise)}</p>
        </div>
        {line.issue && <p className="mt-1 text-xs font-medium text-danger">{line.issue}</p>}
        <div className="mt-3 flex items-center justify-between">
          <div className="inline-flex items-center rounded-sm border border-input" role="group" aria-label={`Quantity for ${line.name}`}>
            <button type="button" className="p-2 disabled:opacity-40" disabled={busy || line.quantity <= 1} onClick={() => run(() => update(line.productId, line.quantity - 1))} aria-label="Decrease quantity">
              <Minus className="size-3.5" />
            </button>
            <span className="w-8 text-center text-sm" aria-live="polite">
              {line.quantity}
            </span>
            <button type="button" className="p-2 disabled:opacity-40" disabled={busy || line.quantity >= maxQty} onClick={() => run(() => update(line.productId, line.quantity + 1))} aria-label="Increase quantity">
              <Plus className="size-3.5" />
            </button>
          </div>
          {!compact && (
            <button type="button" onClick={() => run(() => remove(line.productId))} disabled={busy} className="inline-flex items-center gap-1 text-xs text-charcoal-soft hover:text-danger">
              <Trash2 className="size-3.5" /> Remove
            </button>
          )}
          {compact && (
            <button type="button" onClick={() => run(() => remove(line.productId))} disabled={busy} className="p-1.5 text-charcoal-soft hover:text-danger" aria-label={`Remove ${line.name}`}>
              <Trash2 className="size-4" />
            </button>
          )}
        </div>
      </div>
    </li>
  );
}

export function FreeShippingProgress({ subtotalPaise }: { subtotalPaise: number }) {
  const remaining = FREE_SHIPPING_THRESHOLD_PAISE - subtotalPaise;
  const pct = Math.min(100, Math.round((subtotalPaise / FREE_SHIPPING_THRESHOLD_PAISE) * 100));
  return (
    <div>
      <p className="text-xs text-charcoal-soft">
        {remaining > 0 ? (
          <>
            Add <strong className="text-charcoal">{formatPaise(remaining)}</strong> more for free shipping
          </>
        ) : (
          <strong className="text-success">You&apos;ve unlocked free shipping</strong>
        )}
      </p>
      <div className="mt-2 h-1 overflow-hidden rounded-full bg-ivory-deep" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Progress to free shipping">
        <div className="h-full bg-champagne transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function CartDrawer() {
  const { cart, drawerOpen, setDrawerOpen } = useCart();
  const lines = cart?.lines ?? [];
  return (
    <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
      <SheetContent title="Your bag">
        {lines.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
            <ShoppingBag className="size-10 text-rose-deep" aria-hidden />
            <p className="font-display text-2xl">Your bag is empty</p>
            <p className="text-sm text-charcoal-soft">Find something that feels like you.</p>
            <Button asChild onClick={() => setDrawerOpen(false)}>
              <Link href="/shop">Start shopping</Link>
            </Button>
          </div>
        ) : (
          <>
            <div className="border-b border-border px-5 py-4">
              <FreeShippingProgress subtotalPaise={cart!.subtotalPaise} />
            </div>
            <ul className="flex-1 divide-y divide-border overflow-y-auto px-5">
              {lines.map((l) => (
                <CartLine key={l.productId} line={l} compact />
              ))}
            </ul>
            <div className="space-y-3 border-t border-border px-5 py-5">
              <div className="flex justify-between text-sm">
                <span>Subtotal</span>
                <span className="font-semibold">{formatPaise(cart!.subtotalPaise)}</span>
              </div>
              <p className="text-xs text-charcoal-soft">Shipping, coupons and any COD fee are applied at checkout.</p>
              <Button asChild className="w-full" onClick={() => setDrawerOpen(false)}>
                <Link href="/checkout">Checkout</Link>
              </Button>
              <Button asChild variant="outline" className="w-full" onClick={() => setDrawerOpen(false)}>
                <Link href="/cart">View bag</Link>
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
