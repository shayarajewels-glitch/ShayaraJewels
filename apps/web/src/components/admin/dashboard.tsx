'use client';

import { AlertTriangle, MessageSquareText } from 'lucide-react';
import Link from 'next/link';
import { ORDER_STATUSES, ORDER_STATUS_LABELS, type DashboardDto } from '@shayara/shared';
import { Alert, Card, Skeleton } from '@/components/ui/misc';
import { formatDate, formatPaise } from '@/lib/utils';
import { AdminPageHeader, OrderStatusBadge, PaymentStatusBadge, TableWrap, useAdminResource } from './admin-ui';

function Metric({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card className="p-5">
      <p className="eyebrow text-[0.62rem]">{label}</p>
      <p className="mt-2 font-display text-3xl">{value}</p>
      {hint && <p className="mt-1 text-xs text-charcoal-soft">{hint}</p>}
    </Card>
  );
}

export function AdminDashboard() {
  const { data, error, loading } = useAdminResource<DashboardDto>('/admin/dashboard');

  return (
    <div>
      <AdminPageHeader title="Dashboard" description="Sales figures count paid online orders and non-cancelled Cash on Delivery orders." />
      {error && <Alert variant="error" title="Could not load the dashboard">{error}</Alert>}
      {loading && !data && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3" aria-busy>
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      )}
      {data && (
        <div className="space-y-10">
          <section aria-label="Key metrics" className="grid grid-cols-2 gap-4 lg:grid-cols-3">
            <Metric label="Orders" value={String(data.orderCount)} hint={`${data.last30Days.orders} in the last 30 days`} />
            <Metric label="Gross sales" value={formatPaise(data.grossSalesPaise)} hint={`${formatPaise(data.last30Days.grossSalesPaise)} in the last 30 days`} />
            <Metric label="Refunds processed" value={formatPaise(data.refundsPaise)} />
            <Metric label="Net sales" value={formatPaise(data.netSalesPaise)} hint="Gross sales minus processed refunds" />
            <Metric label="Average order value" value={formatPaise(data.averageOrderValuePaise)} />
            <Link href="/admin/reviews" className="block rounded-md focus-visible:outline-2">
              <Card className="h-full p-5 transition-colors hover:border-rose-deep">
                <p className="eyebrow flex items-center gap-1.5 text-[0.62rem]">
                  <MessageSquareText className="size-3.5" aria-hidden /> Reviews awaiting moderation
                </p>
                <p className="mt-2 font-display text-3xl">{data.pendingReviews}</p>
              </Card>
            </Link>
          </section>

          <section aria-labelledby="status-summary">
            <h2 id="status-summary" className="mb-4 text-2xl">
              Orders by status
            </h2>
            <ul className="flex flex-wrap gap-2">
              {ORDER_STATUSES.map((s) => (
                <li key={s}>
                  <Link href={`/admin/orders?status=${s}`} className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3.5 py-1.5 text-xs hover:border-charcoal">
                    {ORDER_STATUS_LABELS[s]}
                    <span className="font-semibold">{data.statusSummary[s] ?? 0}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="recent-orders">
            <div className="mb-4 flex items-end justify-between">
              <h2 id="recent-orders" className="text-2xl">
                Recent orders
              </h2>
              <Link href="/admin/orders" className="text-xs text-rose-deep underline underline-offset-4">
                All orders
              </Link>
            </div>
            {data.recentOrders.length === 0 ? (
              <p className="text-sm text-charcoal-soft">No orders yet.</p>
            ) : (
              <TableWrap label="Recent orders">
                <thead>
                  <tr>
                    <th>Order</th>
                    <th>Customer</th>
                    <th>Placed</th>
                    <th>Status</th>
                    <th>Payment</th>
                    <th className="text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentOrders.map((o) => (
                    <tr key={o.id}>
                      <td>
                        <Link href={`/admin/orders/${o.id}`} className="font-medium text-rose-deep hover:underline">
                          {o.orderNumber}
                        </Link>
                        {o.attention && <AlertTriangle className="ml-1.5 inline size-3.5 text-danger" aria-label="Needs attention" />}
                      </td>
                      <td>{o.customer?.name ?? '—'}</td>
                      <td>{formatDate(o.createdAt)}</td>
                      <td>
                        <OrderStatusBadge status={o.status} />
                      </td>
                      <td>
                        <PaymentStatusBadge status={o.paymentStatus} />
                      </td>
                      <td className="text-right">{formatPaise(o.totalPaise)}</td>
                    </tr>
                  ))}
                </tbody>
              </TableWrap>
            )}
          </section>

          <div className="grid gap-8 lg:grid-cols-2">
            <section aria-labelledby="low-stock">
              <h2 id="low-stock" className="mb-4 text-2xl">
                Low stock
              </h2>
              {data.lowStock.length === 0 ? (
                <p className="text-sm text-charcoal-soft">Everything is well stocked.</p>
              ) : (
                <Card className="divide-y divide-border">
                  {data.lowStock.map((p) => (
                    <Link key={p.id} href={`/admin/products/${p.id}`} className="flex items-center justify-between px-4 py-3 text-sm hover:bg-ivory-deep">
                      <span>
                        {p.name} <span className="text-xs text-charcoal-soft">· {p.sku}</span>
                      </span>
                      <span className={p.stock === 0 ? 'font-semibold text-danger' : 'font-semibold'}>{p.stock === 0 ? 'Sold out' : `${p.stock} left`}</span>
                    </Link>
                  ))}
                </Card>
              )}
            </section>
            <section aria-labelledby="bestsellers">
              <h2 id="bestsellers" className="mb-4 text-2xl">
                Bestsellers
              </h2>
              {data.bestsellers.length === 0 ? (
                <p className="text-sm text-charcoal-soft">No confirmed sales yet.</p>
              ) : (
                <Card className="divide-y divide-border">
                  {data.bestsellers.map((p, i) => (
                    <Link key={p.id} href={`/admin/products/${p.id}`} className="flex items-center justify-between px-4 py-3 text-sm hover:bg-ivory-deep">
                      <span>
                        <span className="mr-2 text-charcoal-soft">{i + 1}.</span>
                        {p.name}
                      </span>
                      <span className="font-semibold">{p.unitsSold} sold</span>
                    </Link>
                  ))}
                </Card>
              )}
            </section>
          </div>
        </div>
      )}
    </div>
  );
}
