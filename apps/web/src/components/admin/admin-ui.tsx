'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { ORDER_STATUS_LABELS, PAYMENT_STATUS_LABELS, type OrderStatus, type PaymentStatus, type ProductStatus } from '@shayara/shared';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/misc';
import { api, errorMessage } from '@/lib/api-client';

export function AdminPageHeader({ title, description, actions }: { title: string; description?: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-3xl sm:text-4xl">{title}</h1>
        {description && <p className="mt-1 text-sm text-charcoal-soft">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

/** Fetches an admin resource; `reload` re-runs it. Path null = don't fetch yet. */
export function useAdminResource<T>(path: string | null) {
  // `loadedPath` records which request the current data/error belong to;
  // a mismatch with `path` means a load is in flight. Previous data stays
  // visible while the next page or filter loads.
  const [state, setState] = useState<{ loadedPath: string | null; data: T | null; error: string | null }>({ loadedPath: null, data: null, error: null });
  const [reloading, setReloading] = useState(false);

  const fetchInto = useCallback(async (p: string) => {
    try {
      const data = await api<T>(p);
      setState({ loadedPath: p, data, error: null });
    } catch (err) {
      setState((s) => ({ ...s, loadedPath: p, error: errorMessage(err) }));
    }
  }, []);

  useEffect(() => {
    if (!path) return;
    let cancelled = false;
    api<T>(path).then(
      (data) => !cancelled && setState({ loadedPath: path, data, error: null }),
      (err) => !cancelled && setState((s) => ({ ...s, loadedPath: path, error: errorMessage(err) })),
    );
    return () => {
      cancelled = true;
    };
  }, [path]);

  const reload = useCallback(async () => {
    if (!path) return;
    setReloading(true);
    try {
      await fetchInto(path);
    } finally {
      setReloading(false);
    }
  }, [path, fetchInto]);

  const setData = useCallback((data: T) => setState((s) => ({ ...s, data, error: null })), []);
  const loading = Boolean(path) && (state.loadedPath !== path || reloading);

  return { data: state.data, error: state.loadedPath === path ? state.error : null, loading, reload, setData };
}

const ORDER_VARIANT: Record<OrderStatus, 'default' | 'rose' | 'gold' | 'muted' | 'success' | 'danger' | 'outline'> = {
  pending_payment: 'gold',
  confirmed: 'rose',
  processing: 'rose',
  shipped: 'default',
  delivered: 'success',
  cancelled: 'muted',
  return_requested: 'danger',
  returned: 'muted',
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return <Badge variant={ORDER_VARIANT[status]}>{ORDER_STATUS_LABELS[status]}</Badge>;
}

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  const variant = status === 'paid' ? 'success' : status === 'failed' || status === 'expired' ? 'danger' : status === 'pending' ? 'gold' : 'muted';
  return <Badge variant={variant}>{PAYMENT_STATUS_LABELS[status]}</Badge>;
}

export function ProductStatusBadge({ status }: { status: ProductStatus }) {
  return <Badge variant={status === 'published' ? 'success' : status === 'draft' ? 'gold' : 'muted'}>{status}</Badge>;
}

export function Pager({ page, totalPages, total, onPage }: { page: number; totalPages: number; total: number; onPage: (p: number) => void }) {
  if (totalPages <= 1) return <p className="mt-4 text-xs text-charcoal-soft">{total} result{total === 1 ? '' : 's'}</p>;
  return (
    <nav aria-label="Pagination" className="mt-6 flex items-center justify-between gap-3">
      <p className="text-xs text-charcoal-soft">
        {total} results · page {page} of {totalPages}
      </p>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>
          <ChevronLeft /> Prev
        </Button>
        <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => onPage(page + 1)}>
          Next <ChevronRight />
        </Button>
      </div>
    </nav>
  );
}

/** Responsive table wrapper: horizontally scrollable on small screens. */
export function TableWrap({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <div className="overflow-x-auto rounded-md border border-border bg-card" role="region" aria-label={label} tabIndex={0}>
      <table className="w-full min-w-[40rem] text-left text-sm [&_td]:px-4 [&_td]:py-3 [&_th]:px-4 [&_th]:py-3 [&_th]:text-[0.68rem] [&_th]:font-semibold [&_th]:uppercase [&_th]:tracking-[0.14em] [&_th]:text-charcoal-soft [&_thead]:border-b [&_thead]:border-border [&_tbody_tr]:border-b [&_tbody_tr]:border-border last:[&_tbody_tr]:border-0">
        {children}
      </table>
    </div>
  );
}

export function rupeesInput(paise: number | null | undefined): string {
  if (paise == null) return '';
  return (paise / 100).toString();
}

/** "1,299.50" -> 129950; empty -> null. Returns NaN on invalid input. */
export function toPaise(value: string): number | null {
  const v = value.replace(/,/g, '').trim();
  if (!v) return null;
  if (!/^\d+(\.\d{1,2})?$/.test(v)) return Number.NaN;
  return Math.round(Number(v) * 100);
}
