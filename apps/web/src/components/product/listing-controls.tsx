'use client';

import { SlidersHorizontal, X } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useOptimistic, useState, useTransition } from 'react';
import { CATEGORIES, FINISHES, FINISH_LABELS, PRODUCT_SORTS, PRODUCT_SORT_LABELS } from '@shayara/shared';
import { Button } from '@/components/ui/button';
import { Checkbox, Input, Label, NativeSelect } from '@/components/ui/form-controls';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/overlays';
import { cn } from '@/lib/utils';

/** Filters live in the URL so every view is shareable, bookmarkable and works with back/forward. */
function useQueryUpdater() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();
  // Controls reflect the requested filters immediately, before the new results arrive.
  const [optimistic, setOptimistic] = useOptimistic<URLSearchParams, URLSearchParams>(params, (_current, next) => next);
  const update = (changes: Record<string, string | null>) => {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(changes)) {
      if (v === null || v === '') next.delete(k);
      else next.set(k, v);
    }
    next.delete('page'); // any filter change returns to page 1
    const qs = next.toString();
    startTransition(() => {
      setOptimistic(next);
      router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    });
  };
  return { params: optimistic, update, pending };
}

export function SortSelect() {
  const { params, update } = useQueryUpdater();
  return (
    <div className="flex items-center gap-2">
      <Label htmlFor="sort" className="mb-0 whitespace-nowrap text-xs text-charcoal-soft">
        Sort by
      </Label>
      <NativeSelect id="sort" value={params.get('sort') ?? 'new'} onChange={(e) => update({ sort: e.target.value === 'new' ? null : e.target.value })} className="h-10 w-48 text-sm">
        {PRODUCT_SORTS.map((s) => (
          <option key={s} value={s}>
            {PRODUCT_SORT_LABELS[s]}
          </option>
        ))}
      </NativeSelect>
    </div>
  );
}

function FilterForm({ showType, onApplied }: { showType: boolean; onApplied?: () => void }) {
  const { params, update, pending } = useQueryUpdater();
  const finishes = (params.get('finish') ?? '').split(',').filter(Boolean);
  const [minPrice, setMin] = useState(params.get('minPrice') ?? '');
  const [maxPrice, setMax] = useState(params.get('maxPrice') ?? '');

  const toggleFinish = (f: string) => {
    const next = finishes.includes(f) ? finishes.filter((x) => x !== f) : [...finishes, f];
    update({ finish: next.join(',') || null });
  };

  return (
    <div className={cn('space-y-8', pending && 'opacity-70')} aria-busy={pending}>
      {showType && (
        <fieldset>
          <legend className="eyebrow mb-3">Product type</legend>
          <div className="flex flex-wrap gap-2">
            {[{ type: '', name: 'All' }, ...CATEGORIES].map((c) => {
              const active = (params.get('type') ?? '') === c.type;
              return (
                <button
                  key={c.type || 'all'}
                  type="button"
                  aria-pressed={active}
                  onClick={() => update({ type: c.type || null })}
                  className={cn('rounded-full border px-3.5 py-1.5 text-xs transition-colors', active ? 'border-charcoal bg-rose-deep text-ivory' : 'border-input hover:border-rose-deep')}
                >
                  {c.name}
                </button>
              );
            })}
          </div>
        </fieldset>
      )}

      <fieldset>
        <legend className="eyebrow mb-3">Finish</legend>
        <div className="space-y-2.5">
          {FINISHES.map((f) => (
            <label key={f} className="flex cursor-pointer items-center gap-3 text-sm">
              <Checkbox checked={finishes.includes(f)} onChange={() => toggleFinish(f)} />
              <span className={cn('size-3.5 rounded-full border border-black/10', f === 'gold' ? 'bg-champagne' : f === 'silver' ? 'bg-[#c5c9ce]' : 'bg-[#d4a08f]')} aria-hidden />
              {FINISH_LABELS[f]}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="eyebrow mb-3">Price (₹)</legend>
        <form
          className="flex items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            update({ minPrice: minPrice || null, maxPrice: maxPrice || null });
            onApplied?.();
          }}
        >
          <div>
            <Label htmlFor="minPrice" className="text-xs text-charcoal-soft">
              Min
            </Label>
            <Input id="minPrice" inputMode="numeric" pattern="[0-9]*" value={minPrice} onChange={(e) => setMin(e.target.value.replace(/\D/g, ''))} className="h-10" />
          </div>
          <span className="pb-2.5 text-charcoal-soft">–</span>
          <div>
            <Label htmlFor="maxPrice" className="text-xs text-charcoal-soft">
              Max
            </Label>
            <Input id="maxPrice" inputMode="numeric" pattern="[0-9]*" value={maxPrice} onChange={(e) => setMax(e.target.value.replace(/\D/g, ''))} className="h-10" />
          </div>
          <Button type="submit" size="sm" variant="outline" className="h-10">
            Go
          </Button>
        </form>
      </fieldset>

      <fieldset>
        <legend className="eyebrow mb-3">Availability</legend>
        <label className="flex cursor-pointer items-center gap-3 text-sm">
          <Checkbox checked={params.get('inStock') === 'true'} onChange={(e) => update({ inStock: e.target.checked ? 'true' : null })} />
          In stock only
        </label>
      </fieldset>
    </div>
  );
}

export function ActiveFilters() {
  const { params, update } = useQueryUpdater();
  const chips: { key: string; label: string; clear: Record<string, null | string> }[] = [];
  const type = params.get('type');
  if (type) chips.push({ key: 'type', label: CATEGORIES.find((c) => c.type === type)?.name ?? type, clear: { type: null } });
  const finishes = (params.get('finish') ?? '').split(',').filter(Boolean);
  for (const f of finishes) {
    chips.push({ key: `finish-${f}`, label: FINISH_LABELS[f as keyof typeof FINISH_LABELS] ?? f, clear: { finish: finishes.filter((x) => x !== f).join(',') || null } });
  }
  if (params.get('minPrice') || params.get('maxPrice')) {
    chips.push({ key: 'price', label: `₹${params.get('minPrice') ?? '0'} – ${params.get('maxPrice') ? `₹${params.get('maxPrice')}` : 'any'}`, clear: { minPrice: null, maxPrice: null } });
  }
  if (params.get('inStock') === 'true') chips.push({ key: 'stock', label: 'In stock', clear: { inStock: null } });
  if (chips.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-2">
      {chips.map((c) => (
        <button key={c.key} type="button" onClick={() => update(c.clear)} className="inline-flex items-center gap-1.5 rounded-full bg-ivory-deep px-3 py-1 text-xs hover:bg-sand" aria-label={`Remove filter ${c.label}`}>
          {c.label} <X className="size-3" aria-hidden />
        </button>
      ))}
      <button type="button" className="text-xs text-rose-deep underline underline-offset-4" onClick={() => update({ type: null, finish: null, minPrice: null, maxPrice: null, inStock: null })}>
        Clear all
      </button>
    </div>
  );
}

export function FiltersSidebar({ showType }: { showType: boolean }) {
  return (
    <aside aria-label="Filters" className="hidden w-60 shrink-0 lg:block">
      <FilterForm showType={showType} />
    </aside>
  );
}

export function MobileFilters({ showType }: { showType: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="lg:hidden">
          <SlidersHorizontal /> Filters
        </Button>
      </SheetTrigger>
      <SheetContent side="left" title="Filters">
        <div className="flex-1 overflow-y-auto px-5 py-6">
          <FilterForm showType={showType} onApplied={() => setOpen(false)} />
        </div>
        <div className="border-t border-border p-5">
          <Button className="w-full" onClick={() => setOpen(false)}>
            Show results
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
