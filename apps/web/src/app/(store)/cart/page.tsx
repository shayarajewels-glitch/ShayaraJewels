'use client';

import { ShoppingBag } from 'lucide-react';
import Link from 'next/link';
import { useEffect } from 'react';
import { CartLine, FreeShippingProgress } from '@/components/layout/cart-drawer';
import { Button } from '@/components/ui/button';
import { Alert, Card, EmptyState, Skeleton } from '@/components/ui/misc';
import { formatPaise } from '@/lib/utils';
import { useCart } from '@/stores/cart-store';

export default function CartPage() {
  const { cart, refresh } = useCart();
  useEffect(() => {
    void refresh().catch(() => undefined);
  }, [refresh]);

  const hasIssues = cart?.lines.some((l) => l.issue);

  return (
    <div className="container-page py-10">
      <h1 className="mb-8 text-4xl sm:text-5xl">Your bag</h1>
      {!cart && <Skeleton className="h-64" />}
      {cart && cart.lines.length === 0 && (
        <EmptyState icon={<ShoppingBag />} title="Your bag is empty" action={<Button asChild><Link href="/shop">Discover jewellery</Link></Button>}>
          Saved something earlier? Log in to see the bag from your account.
        </EmptyState>
      )}
      {cart && cart.lines.length > 0 && (
        <div className="grid gap-10 lg:grid-cols-[1fr_22rem]">
          <div>
            {hasIssues && (
              <Alert variant="warning" className="mb-4" title="Some items need attention">
                Adjust or remove the highlighted items before checking out.
              </Alert>
            )}
            <ul className="divide-y divide-border border-y border-border">
              {cart.lines.map((l) => (
                <CartLine key={l.productId} line={l} />
              ))}
            </ul>
          </div>
          <Card className="h-fit space-y-4 p-6 lg:sticky lg:top-28">
            <h2 className="text-2xl">Order summary</h2>
            <FreeShippingProgress subtotalPaise={cart.subtotalPaise} />
            <div className="flex justify-between text-sm">
              <span>Subtotal ({cart.itemCount} items)</span>
              <span className="font-semibold">{formatPaise(cart.subtotalPaise)}</span>
            </div>
            <p className="text-xs text-charcoal-soft">Shipping, COD fee (if any) and the final total are confirmed at checkout.</p>
            <Button asChild className="w-full" size="lg" aria-disabled={hasIssues}>
              <Link href={hasIssues ? '#' : '/checkout'} onClick={(e) => hasIssues && e.preventDefault()}>
                Proceed to checkout
              </Link>
            </Button>
            <Link href="/shop" className="block text-center text-xs text-charcoal-soft underline underline-offset-4">
              Continue shopping
            </Link>
          </Card>
        </div>
      )}
    </div>
  );
}
