import { ChevronLeft, ChevronRight, SearchX } from 'lucide-react';
import Link from 'next/link';
import { Suspense } from 'react';
import type { ProductType } from '@shayara/shared';
import { Button } from '@/components/ui/button';
import { Alert, EmptyState } from '@/components/ui/misc';
import { serverApi, type ProductListResponse } from '@/lib/api-server';
import { ProductGrid } from './product-card';
import { ActiveFilters, FiltersSidebar, MobileFilters, SortSelect } from './listing-controls';

export type RawSearchParams = Record<string, string | string[] | undefined>;

const ALLOWED = ['q', 'type', 'finish', 'minPrice', 'maxPrice', 'inStock', 'sort', 'page'] as const;

/** Keeps only known listing parameters (and forces the category's type). */
export function toListingQuery(sp: RawSearchParams, fixedType?: ProductType): URLSearchParams {
  const qs = new URLSearchParams();
  for (const key of ALLOWED) {
    const v = sp[key];
    const value = Array.isArray(v) ? v.join(',') : v;
    if (value) qs.set(key, value.slice(0, 120));
  }
  if (fixedType) qs.set('type', fixedType);
  qs.set('limit', '12');
  return qs;
}

/** Pages with filters or sorting are not indexed; plain paginated listings are. */
export function hasNonIndexableParams(sp: RawSearchParams): boolean {
  return ['finish', 'minPrice', 'maxPrice', 'inStock', 'sort', 'type'].some((k) => sp[k] !== undefined);
}

function pageHref(basePath: string, sp: RawSearchParams, page: number) {
  const qs = new URLSearchParams();
  for (const key of ALLOWED) {
    const v = sp[key];
    if (key !== 'page' && v) qs.set(key, Array.isArray(v) ? v.join(',') : v);
  }
  if (page > 1) qs.set('page', String(page));
  const s = qs.toString();
  return s ? `${basePath}?${s}` : basePath;
}

export async function CatalogueListing({
  basePath,
  searchParams,
  fixedType,
  mode = 'products',
}: {
  basePath: string;
  searchParams: RawSearchParams;
  fixedType?: ProductType;
  mode?: 'products' | 'search';
}) {
  const qs = toListingQuery(searchParams, fixedType);
  let data: ProductListResponse | null = null;
  let failed = false;
  try {
    data = mode === 'search' ? await serverApi.search(qs.toString()) : await serverApi.products(qs.toString());
  } catch {
    failed = true;
  }

  return (
    <div className="flex gap-10">
      <Suspense>
        <FiltersSidebar showType={!fixedType} />
      </Suspense>
      <div className="min-w-0 flex-1">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-charcoal-soft" aria-live="polite">
            {data ? `${data.total} piece${data.total === 1 ? '' : 's'}` : ' '}
          </p>
          <div className="flex items-center gap-3">
            <Suspense>
              <MobileFilters showType={!fixedType} />
              <SortSelect />
            </Suspense>
          </div>
        </div>
        <div className="mb-6">
          <Suspense>
            <ActiveFilters />
          </Suspense>
        </div>

        {failed && <Alert variant="error" title="We couldn't load products right now.">Please refresh the page in a moment.</Alert>}
        {data && data.items.length === 0 && (
          <EmptyState icon={<SearchX />} title="Nothing matches just yet" action={<Button asChild variant="outline"><Link href={basePath}>Clear filters</Link></Button>}>
            Try removing a filter or searching for something broader, like “ring” or “gold”.
          </EmptyState>
        )}
        {data && data.items.length > 0 && (
          <>
            <ProductGrid products={data.items} priorityCount={4} />
            {data.totalPages > 1 && (
              <nav aria-label="Pagination" className="mt-14 flex items-center justify-center gap-2">
                {data.page > 1 ? (
                  <Button asChild variant="outline" size="sm">
                    <Link href={pageHref(basePath, searchParams, data.page - 1)} rel="prev">
                      <ChevronLeft /> Previous
                    </Link>
                  </Button>
                ) : null}
                <span className="px-4 text-sm text-charcoal-soft">
                  Page {data.page} of {data.totalPages}
                </span>
                {data.page < data.totalPages ? (
                  <Button asChild variant="outline" size="sm">
                    <Link href={pageHref(basePath, searchParams, data.page + 1)} rel="next">
                      Next <ChevronRight />
                    </Link>
                  </Button>
                ) : null}
              </nav>
            )}
          </>
        )}
      </div>
    </div>
  );
}
