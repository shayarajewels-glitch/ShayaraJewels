'use client';

import { ArrowUpRight, Search, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Fragment, useEffect, useId, useRef, useState } from 'react';
import { CATEGORIES, type SearchSuggestionsDto } from '@shayara/shared';
import { ProductImage } from '@/components/product/product-image';
import { api } from '@/lib/api-client';
import { cn, formatPaise } from '@/lib/utils';

const POPULAR = CATEGORIES.map((c) => ({ label: c.name, href: `/categories/${c.slug}` }));

/** Typed letters stay regular and the rest of each word is bold, so the suggestion's new part stands out. */
function Highlight({ text, query }: { text: string; query: string }) {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  return (
    <>
      {text.split(/(\s+)/).map((part, i) => {
        const term = terms.find((t) => part.toLowerCase().startsWith(t));
        if (!part.trim()) return <Fragment key={i}>{part}</Fragment>;
        return (
          <Fragment key={i}>
            {term && <span className="font-normal text-charcoal-soft">{part.slice(0, term.length)}</span>}
            <span className="font-semibold text-charcoal">{part.slice(term?.length ?? 0)}</span>
          </Fragment>
        );
      })}
    </>
  );
}

type Option = { kind: 'suggestion' | 'product' | 'all'; href: string; key: string };

/**
 * Header search with type-ahead: suggested phrases and matching products
 * appear as you type (debounced), navigable by mouse or arrow keys.
 */
export function SearchBox({ onDone, autoFocus }: { onDone?: () => void; autoFocus?: boolean }) {
  const router = useRouter();
  const id = useId();
  const listId = `${id}-results`;
  const root = useRef<HTMLFormElement>(null);
  const cache = useRef(new Map<string, SearchSuggestionsDto>());
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<{ query: string; data: SearchSuggestionsDto } | null>(null);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(-1);

  const query = q.trim();

  useEffect(() => {
    if (!query) return;
    const key = query.toLowerCase();
    const cached = cache.current.get(key);
    if (cached) {
      setResults({ query, data: cached });
      return;
    }
    let cancelled = false;
    const timer = setTimeout(() => {
      setLoading(true);
      api<SearchSuggestionsDto>(`/search/suggest?q=${encodeURIComponent(query)}`)
        .then((data) => {
          cache.current.set(key, data);
          if (!cancelled) setResults({ query, data });
        })
        .catch(() => undefined)
        .finally(() => !cancelled && setLoading(false));
    }, 180);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  // Close when clicking anywhere outside the search box.
  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', onPointer);
    return () => document.removeEventListener('pointerdown', onPointer);
  }, [open]);

  const data = query ? results?.data : undefined;
  const suggestions = query ? (data?.suggestions ?? []) : POPULAR;
  const products = data?.products ?? [];
  const options: Option[] = [
    ...suggestions.map((s) => ({ kind: 'suggestion' as const, href: s.href, key: `s-${s.label}` })),
    ...products.map((p) => ({ kind: 'product' as const, href: `/products/${p.slug}`, key: `p-${p.id}` })),
    ...(query ? [{ kind: 'all' as const, href: `/search?q=${encodeURIComponent(query)}`, key: 'all' }] : []),
  ];
  const showPanel = open && (query ? Boolean(data) || loading : true);
  const optionId = (i: number) => `${id}-opt-${i}`;

  const go = (href: string) => {
    setOpen(false);
    setActive(-1);
    router.push(href);
    onDone?.();
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setOpen(false);
      setActive(-1);
      return;
    }
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    e.preventDefault();
    setOpen(true);
    if (options.length === 0) return;
    setActive((i) => (e.key === 'ArrowDown' ? (i + 1) % options.length : i <= 0 ? options.length - 1 : i - 1));
  };

  const itemProps = (option: Option) => {
    const i = options.indexOf(option);
    return {
      id: optionId(i),
      role: 'option' as const,
      'aria-selected': active === i,
      onPointerEnter: () => setActive(i),
      onClick: () => go(option.href),
    };
  };

  return (
    <form
      ref={root}
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        const chosen = options[active];
        if (open && chosen) return go(chosen.href);
        if (query) go(`/search?q=${encodeURIComponent(query)}`);
      }}
      className="relative w-full"
    >
      <label htmlFor={id} className="sr-only">
        Search jewellery
      </label>
      <input
        id={id}
        type="text"
        inputMode="search"
        enterKeyHint="search"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={showPanel}
        aria-controls={listId}
        aria-activedescendant={showPanel && active >= 0 ? optionId(active) : undefined}
        autoComplete="off"
        value={q}
        autoFocus={autoFocus}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
          setActive(-1);
        }}
        onKeyDown={onKeyDown}
        placeholder="Search rings, pendants, gold tone…"
        maxLength={80}
        className="h-11 w-full rounded-full border border-input bg-card pl-11 pr-10 text-sm placeholder:text-charcoal-soft/70 focus-visible:border-rose-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-deep/25"
      />
      <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-charcoal-soft" aria-hidden />
      {q && (
        <button
          type="button"
          onClick={() => {
            setQ('');
            setActive(-1);
            root.current?.querySelector('input')?.focus();
          }}
          className="absolute right-2 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-full text-charcoal-soft hover:bg-ivory-deep hover:text-charcoal"
          aria-label="Clear search"
        >
          <X className="size-4" />
        </button>
      )}

      {showPanel && (
        <div
          id={listId}
          role="listbox"
          aria-label="Search suggestions"
          className="absolute inset-x-0 top-full z-50 mt-2 max-h-[min(70vh,34rem)] overflow-y-auto rounded-lg border border-border bg-popover py-2 shadow-2xl shadow-black/60"
        >
          {query && !data && <p className="px-5 py-4 text-sm text-charcoal-soft">Searching…</p>}

          {suggestions.length > 0 && (
            <div role="group" aria-label={query ? 'Suggestions' : 'Popular searches'}>
              <p className="eyebrow border-b border-border px-5 pb-2 pt-2 text-[0.65rem] text-champagne">{query ? 'Suggestions' : 'Popular searches'}</p>
              <ul className="py-1">
                {suggestions.map((s) => {
                  const option = options.find((o) => o.key === `s-${s.label}`)!;
                  const props = itemProps(option);
                  return (
                    <li
                      key={option.key}
                      {...props}
                      className={cn('flex cursor-pointer items-center justify-between gap-3 px-5 py-2.5 text-[0.95rem] capitalize', props['aria-selected'] && 'bg-rose-deep/10')}
                    >
                      <span className="truncate">{query ? <Highlight text={s.label} query={query} /> : <span className="text-charcoal">{s.label}</span>}</span>
                      <ArrowUpRight className="size-4 shrink-0 text-charcoal-soft" aria-hidden />
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {products.length > 0 && (
            <div role="group" aria-label="Products">
              <p className="eyebrow border-b border-border px-5 pb-2 pt-3 text-[0.65rem] text-champagne">Products</p>
              <ul className="py-1">
                {products.map((p) => {
                  const option = options.find((o) => o.key === `p-${p.id}`)!;
                  const props = itemProps(option);
                  return (
                    <li key={option.key} {...props} className={cn('flex cursor-pointer items-center gap-4 px-5 py-2.5', props['aria-selected'] && 'bg-rose-deep/10')}>
                      <div className="relative size-14 shrink-0 overflow-hidden rounded-sm bg-ivory-deep ring-1 ring-border">
                        {p.image && <ProductImage src={p.image.url} alt="" fill sizes="56px" />}
                      </div>
                      <div className="min-w-0">
                        <p className="line-clamp-2 text-sm text-charcoal">{p.name}</p>
                        <p className="mt-1 text-sm">
                          <span className="font-semibold text-rose-deep">{formatPaise(p.pricePaise)}</span>
                          {p.compareAtPricePaise && p.compareAtPricePaise > p.pricePaise && (
                            <span className="ml-2 text-xs text-charcoal-soft line-through">{formatPaise(p.compareAtPricePaise)}</span>
                          )}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {query && data && suggestions.length === 0 && products.length === 0 && (
            <p className="px-5 py-4 text-sm text-charcoal-soft">No matches for “{query}”. Try “ring”, “anklet” or “gold tone”.</p>
          )}

          {query && data && (
            <div className="border-t border-border pt-1">
              {(() => {
                const option = options.find((o) => o.key === 'all')!;
                const props = itemProps(option);
                return (
                  <div {...props} className={cn('cursor-pointer px-5 py-3 text-sm font-semibold text-rose-deep', props['aria-selected'] && 'bg-rose-deep/10')}>
                    See all results for “{query}”
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      )}
    </form>
  );
}
