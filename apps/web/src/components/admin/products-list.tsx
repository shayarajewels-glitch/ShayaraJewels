'use client';

import { Eye, ExternalLink, Plus } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { toast } from 'sonner';
import { FINISHES, FINISH_LABELS, PRODUCT_STATUSES, PRODUCT_TYPES, formatPaise, type AdminProductDto, type Paginated } from '@shayara/shared';
import { ProductImage } from '@/components/product/product-image';
import { Button } from '@/components/ui/button';
import { Checkbox, Input, Label, NativeSelect } from '@/components/ui/form-controls';
import { Alert, EmptyState, Skeleton } from '@/components/ui/misc';
import { api, errorMessage } from '@/lib/api-client';
import { AdminPageHeader, Pager, ProductStatusBadge, TableWrap, useAdminResource } from './admin-ui';
import { ConfirmDialog } from './confirm-dialog';
import { useQueryState } from './use-query-state';

const LIST_KEYS = ['q', 'type', 'finish', 'status', 'lowStock', 'sort', 'page'];

export function ProductsList() {
  const { params, set } = useQueryState();
  const qs = new URLSearchParams();
  for (const k of LIST_KEYS) {
    const v = params.get(k);
    if (v) qs.set(k, v);
  }
  qs.set('limit', '20');
  const { data, error, loading, reload } = useAdminResource<Paginated<AdminProductDto>>(`/admin/products?${qs.toString()}`);
  const [search, setSearch] = useState(params.get('q') ?? '');
  const [busyId, setBusyId] = useState<string | null>(null);

  const setStatus = async (p: AdminProductDto, status: 'published' | 'draft') => {
    setBusyId(p.id);
    try {
      await api(`/admin/products/${p.id}`, { method: 'PATCH', body: { status } });
      toast.success(status === 'published' ? `${p.name} is now live` : `${p.name} is hidden from the store`);
      await reload();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (p: AdminProductDto) => {
    setBusyId(p.id);
    try {
      const res = await api<{ result: 'archived' | 'deleted' }>(`/admin/products/${p.id}`, { method: 'DELETE' });
      toast.success(res.result === 'archived' ? `${p.name} was archived (it appears in past orders)` : `${p.name} was deleted`);
      await reload();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      <AdminPageHeader
        title="Products"
        description="Archived products are hidden unless you filter by status."
        actions={
          <Button asChild>
            <Link href="/admin/products/new">
              <Plus /> New product
            </Link>
          </Button>
        }
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-[1.5fr_repeat(4,1fr)_auto] lg:items-end">
        <form
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            set({ q: search.trim() || null });
          }}
        >
          <Label htmlFor="product-search">Search</Label>
          <Input id="product-search" type="search" placeholder="Name, SKU or slug" value={search} onChange={(e) => setSearch(e.target.value)} className="h-10" />
        </form>
        <FilterSelect id="f-type" label="Type" value={params.get('type')} options={PRODUCT_TYPES.map((t) => [t, t])} onChange={(v) => set({ type: v })} />
        <FilterSelect id="f-finish" label="Finish" value={params.get('finish')} options={FINISHES.map((f) => [f, FINISH_LABELS[f]])} onChange={(v) => set({ finish: v })} />
        <FilterSelect id="f-status" label="Status" value={params.get('status')} options={PRODUCT_STATUSES.map((s) => [s, s])} onChange={(v) => set({ status: v })} />
        <FilterSelect
          id="f-sort"
          label="Sort"
          value={params.get('sort')}
          allLabel="Recently updated"
          options={[
            ['name', 'Name'],
            ['stock', 'Stock (low first)'],
            ['price', 'Price'],
          ]}
          onChange={(v) => set({ sort: v })}
        />
        <label className="flex h-10 items-center gap-2 text-sm">
          <Checkbox checked={params.get('lowStock') === 'true'} onChange={(e) => set({ lowStock: e.target.checked ? 'true' : null })} />
          Low stock
        </label>
      </div>

      {error && <Alert variant="error" title="Could not load products">{error}</Alert>}
      {loading && !data && <Skeleton className="h-64" />}
      {data && data.items.length === 0 && (
        <EmptyState title="No products found" action={<Button asChild variant="outline"><Link href="/admin/products/new">Create a product</Link></Button>}>
          Try clearing the filters.
        </EmptyState>
      )}
      {data && data.items.length > 0 && (
        <div aria-busy={loading}>
          <TableWrap label="Products">
            <thead>
              <tr>
                <th>Product</th>
                <th>SKU</th>
                <th>Status</th>
                <th className="text-right">Price</th>
                <th className="text-right">Stock</th>
                <th className="text-right">Sold</th>
                <th>
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((p) => (
                <tr key={p.id}>
                  <td>
                    <div className="flex items-center gap-3">
                      <div className="relative size-12 shrink-0 overflow-hidden rounded-sm bg-ivory-deep">
                        {p.images[0] && <ProductImage src={p.images[0].url} alt="" fill sizes="48px" />}
                      </div>
                      <div className="min-w-0">
                        <Link href={`/admin/products/${p.id}`} className="font-medium hover:text-rose-deep hover:underline">
                          {p.name}
                        </Link>
                        <p className="text-xs capitalize text-charcoal-soft">
                          {p.type} · {FINISH_LABELS[p.finish]}
                          {p.featured ? ' · Featured' : ''}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="font-mono text-xs">{p.sku}</td>
                  <td>
                    <ProductStatusBadge status={p.status} />
                  </td>
                  <td className="text-right">{formatPaise(p.pricePaise)}</td>
                  <td className={`text-right ${p.stock === 0 ? 'font-semibold text-danger' : p.stock <= 5 ? 'font-semibold text-champagne' : ''}`}>{p.stock}</td>
                  <td className="text-right">{p.unitsSold}</td>
                  <td>
                    <div className="flex items-center justify-end gap-1">
                      {p.status === 'published' ? (
                        <Link href={`/products/${p.slug}`} target="_blank" className="rounded-sm p-2 hover:bg-ivory-deep" aria-label={`View ${p.name} in the store`}>
                          <ExternalLink className="size-4" />
                        </Link>
                      ) : (
                        <Link href={`/admin/products/${p.id}/preview`} className="rounded-sm p-2 hover:bg-ivory-deep" aria-label={`Preview ${p.name}`}>
                          <Eye className="size-4" />
                        </Link>
                      )}
                      {p.status !== 'archived' && (
                        <Button size="sm" variant="ghost" loading={busyId === p.id} onClick={() => setStatus(p, p.status === 'published' ? 'draft' : 'published')}>
                          {p.status === 'published' ? 'Unpublish' : 'Publish'}
                        </Button>
                      )}
                      {p.status !== 'archived' && (
                        <ConfirmDialog
                          title={`Remove ${p.name}?`}
                          description="Products that appear in past orders are archived (hidden, but kept for order history). Products never ordered are deleted permanently with their media."
                          confirmLabel="Remove"
                          destructive
                          onConfirm={() => remove(p)}
                          trigger={
                            <Button size="sm" variant="ghost" className="text-danger" disabled={busyId === p.id}>
                              Remove
                            </Button>
                          }
                        />
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
          <Pager page={data.page} totalPages={data.totalPages} total={data.total} onPage={(page) => set({ page: String(page) }, false)} />
        </div>
      )}
    </div>
  );
}

function FilterSelect({
  id,
  label,
  value,
  options,
  onChange,
  allLabel = 'All',
}: {
  id: string;
  label: string;
  value: string | null;
  options: [string, string][];
  onChange: (v: string | null) => void;
  allLabel?: string;
}) {
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <NativeSelect id={id} value={value ?? ''} onChange={(e) => onChange(e.target.value || null)} className="h-10 capitalize">
        <option value="">{allLabel}</option>
        {options.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </NativeSelect>
    </div>
  );
}

export { FilterSelect };
