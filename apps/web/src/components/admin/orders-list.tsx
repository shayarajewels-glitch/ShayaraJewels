'use client';

import { AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { ORDER_STATUSES, ORDER_STATUS_LABELS, PAYMENT_STATUSES, PAYMENT_STATUS_LABELS, type AdminOrderDto, type Paginated } from '@shayara/shared';
import { Input, Label } from '@/components/ui/form-controls';
import { Alert, EmptyState, Skeleton } from '@/components/ui/misc';
import { formatDateTime, formatPaise } from '@/lib/utils';
import { AdminPageHeader, OrderStatusBadge, Pager, PaymentStatusBadge, TableWrap, useAdminResource } from './admin-ui';
import { FilterSelect } from './products-list';
import { useQueryState } from './use-query-state';

const KEYS = ['q', 'status', 'paymentStatus', 'paymentMethod', 'page'];

export function OrdersList() {
  const { params, set } = useQueryState();
  const qs = new URLSearchParams();
  for (const k of KEYS) {
    const v = params.get(k);
    if (v) qs.set(k, v);
  }
  qs.set('limit', '20');
  const { data, error, loading } = useAdminResource<Paginated<AdminOrderDto>>(`/admin/orders?${qs.toString()}`);
  const [search, setSearch] = useState(params.get('q') ?? '');

  return (
    <div>
      <AdminPageHeader title="Orders" />
      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-[1.5fr_repeat(3,1fr)] lg:items-end">
        <form
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            set({ q: search.trim() || null });
          }}
        >
          <Label htmlFor="order-search">Search</Label>
          <Input id="order-search" type="search" placeholder="Order number, phone, customer name or email" value={search} onChange={(e) => setSearch(e.target.value)} className="h-10" />
        </form>
        <FilterSelect id="o-status" label="Status" value={params.get('status')} options={ORDER_STATUSES.map((s) => [s, ORDER_STATUS_LABELS[s]])} onChange={(v) => set({ status: v })} />
        <FilterSelect id="o-pay" label="Payment" value={params.get('paymentStatus')} options={PAYMENT_STATUSES.map((s) => [s, PAYMENT_STATUS_LABELS[s]])} onChange={(v) => set({ paymentStatus: v })} />
        <FilterSelect
          id="o-method"
          label="Method"
          value={params.get('paymentMethod')}
          options={[
            ['razorpay', 'Online (Razorpay)'],
            ['cod', 'Cash on Delivery'],
          ]}
          onChange={(v) => set({ paymentMethod: v })}
        />
      </div>

      {error && <Alert variant="error" title="Could not load orders">{error}</Alert>}
      {loading && !data && <Skeleton className="h-64" />}
      {data && data.items.length === 0 && <EmptyState title="No orders found">Orders will appear here as customers check out.</EmptyState>}
      {data && data.items.length > 0 && (
        <div aria-busy={loading}>
          <TableWrap label="Orders">
            <thead>
              <tr>
                <th>Order</th>
                <th>Placed</th>
                <th>Customer</th>
                <th>Items</th>
                <th>Status</th>
                <th>Payment</th>
                <th className="text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((o) => (
                <tr key={o.id}>
                  <td className="whitespace-nowrap">
                    <Link href={`/admin/orders/${o.id}`} className="font-medium text-rose-deep hover:underline">
                      {o.orderNumber}
                    </Link>
                    {o.attention && <AlertTriangle className="ml-1.5 inline size-3.5 text-danger" aria-label="Needs attention" />}
                  </td>
                  <td className="whitespace-nowrap text-xs">{formatDateTime(o.createdAt)}</td>
                  <td>
                    <p>{o.customer?.name ?? o.shippingAddress.fullName}</p>
                    <p className="text-xs text-charcoal-soft">{o.customer?.email}</p>
                  </td>
                  <td>{o.items.reduce((n, i) => n + i.quantity, 0)}</td>
                  <td>
                    <OrderStatusBadge status={o.status} />
                  </td>
                  <td>
                    <div className="flex flex-col items-start gap-1">
                      <PaymentStatusBadge status={o.paymentStatus} />
                      <span className="text-[0.68rem] uppercase text-charcoal-soft">{o.paymentMethod === 'cod' ? 'COD' : 'Online'}</span>
                    </div>
                  </td>
                  <td className="text-right font-medium">{formatPaise(o.totalPaise)}</td>
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
