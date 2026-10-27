'use client';

import { Minus, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { MAX_QUANTITY_PER_ITEM, type ProductDetailDto } from '@shayara/shared';
import { Button } from '@/components/ui/button';
import { errorMessage } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import { useCart } from '@/stores/cart-store';
import { WishlistButton } from './wishlist-button';

export function PurchasePanel({ product, preview = false }: { product: ProductDetailDto; preview?: boolean }) {
  const router = useRouter();
  const { add, setDrawerOpen } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [size, setSize] = useState<string | null>(product.sizeOptions.length === 1 ? product.sizeOptions[0]! : null);
  const [busy, setBusy] = useState<'add' | 'buy' | null>(null);
  const [sizeError, setSizeError] = useState(false);
  const maxQty = Math.min(MAX_QUANTITY_PER_ITEM, product.stockLeft ?? MAX_QUANTITY_PER_ITEM);
  const disabled = !product.inStock || preview;

  const submit = async (mode: 'add' | 'buy') => {
    if (product.sizeOptions.length > 0 && !size) {
      setSizeError(true);
      return;
    }
    setBusy(mode);
    try {
      await add(product.id, quantity, size ?? undefined);
      if (mode === 'buy') router.push('/checkout');
      else {
        toast.success(`${product.name} added to your bag`);
        setDrawerOpen(true);
      }
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-6">
      {product.sizeOptions.length > 0 && (
        <fieldset>
          <legend className="eyebrow mb-3">
            Size{size ? <span className="ml-2 normal-case tracking-normal text-charcoal">: {size}</span> : null}
          </legend>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-describedby={sizeError ? 'size-error' : undefined}>
            {product.sizeOptions.map((s) => (
              <button
                key={s}
                type="button"
                role="radio"
                aria-checked={size === s}
                onClick={() => {
                  setSize(s);
                  setSizeError(false);
                }}
                className={cn('min-w-12 rounded-sm border px-3 py-2 text-sm transition-colors', size === s ? 'border-charcoal bg-charcoal text-ivory' : 'border-input hover:border-charcoal')}
              >
                {s}
              </button>
            ))}
          </div>
          {sizeError && (
            <p id="size-error" role="alert" className="mt-2 text-xs text-danger">
              Please choose a size.
            </p>
          )}
        </fieldset>
      )}

      <div className="flex items-center gap-4">
        <span className="eyebrow">Quantity</span>
        <div className="inline-flex items-center rounded-sm border border-input" role="group" aria-label="Quantity">
          <button type="button" className="p-3 disabled:opacity-40" onClick={() => setQuantity((q) => Math.max(1, q - 1))} disabled={quantity <= 1 || disabled} aria-label="Decrease quantity">
            <Minus className="size-3.5" />
          </button>
          <span className="w-10 text-center text-sm" aria-live="polite">
            {quantity}
          </span>
          <button type="button" className="p-3 disabled:opacity-40" onClick={() => setQuantity((q) => Math.min(maxQty, q + 1))} disabled={quantity >= maxQty || disabled} aria-label="Increase quantity">
            <Plus className="size-3.5" />
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Button size="lg" className="flex-1" onClick={() => submit('add')} loading={busy === 'add'} disabled={disabled || busy !== null}>
          {product.inStock ? 'Add to bag' : 'Sold out'}
        </Button>
        {product.inStock && (
          <Button size="lg" variant="rose" className="flex-1" onClick={() => submit('buy')} loading={busy === 'buy'} disabled={disabled || busy !== null}>
            Buy now
          </Button>
        )}
        <WishlistButton product={product} withLabel className="justify-center" />
      </div>
      {preview && <p className="text-xs text-charcoal-soft">Preview mode — buying is disabled.</p>}
    </div>
  );
}
