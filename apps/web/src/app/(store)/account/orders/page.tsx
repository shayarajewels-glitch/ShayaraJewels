'use client';

import { Package } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { OrderDto, Paginated } from '@shayara/shared';
import { OrderStatusBadge } from '@/components/account/order-status-badge';
import { ProductImage } from '@/components/product/product-image';
import { Button } from '@/components/ui/button';
import { Alert, Card, EmptyState, Skeleton } from '@/components/ui/misc';
import { api, errorMessage } from '@/lib/api-client';
import { formatDate, formatPaise } from '@/lib/utils';

export default function OrdersPage() {
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Paginated<OrderDto> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    api<Paginated<OrderDto>>(`/orders?page=${page}&limit=10`)
      .then((d) => active && setData(d))
      .catch((err) => active && setError(errorMessage(err)));
    return () => {
      active = false;
    };
  }, [page]);

  return (
    <div>
      <h1 className="mb-8 text-4xl">Orders</h1>
      {error && <Alert variant="error">{error}</Alert>}
      {!data && !error && (
        <div className="space-y-4">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
      )}
      {data && data.items.length === 0 && (
        <EmptyState icon={<Package />} title="No orders yet" action={<Button asChild><Link href="/shop">Start shopping</Link></Button>}>
          When you place an order, you can track it here.
        </EmptyState>
      )}
      {data && data.items.length > 0 && (
        <>
          <ul className="space-y-4">
            {data.items.map((o) => (
              <li key={o.orderNumber}>
                <Card className="p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">
                        <Link href={`/account/orders/${o.orderNumber}`} className="hover:text-rose-deep">
                          {o.orderNumber}
                        </Link>
                      </p>
                      <p className="text-xs text-charcoal-soft">
                        Placed {formatDate(o.createdAt)} · {o.items.reduce((n, i) => n + i.quantity, 0)} item(s) · {formatPaise(o.totalPaise)}
                      </p>
                    </div>
                    <OrderStatusBadge status={o.status} />
                  </div>
                  <div className="mt-4 flex items-center justify-between gap-4">
                    <ul className="flex gap-2">
                      {o.items.slice(0, 4).map((i) => (
                        <li key={i.productId} className="relative size-14 overflow-hidden rounded-sm bg-ivory-deep">
                          {i.image && <ProductImage src={i.image} alt={i.name} fill sizes="56px" />}
                        </li>
                      ))}
                    </ul>
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/account/orders/${o.orderNumber}`}>{o.canPay ? 'Complete payment' : 'View order'}</Link>
                    </Button>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
          {data.totalPages > 1 && (
            <nav aria-label="Pagination" className="mt-8 flex items-center justify-center gap-3">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                Previous
              </Button>
              <span className="text-sm text-charcoal-soft">
                Page {data.page} of {data.totalPages}
              </span>
              <Button variant="outline" size="sm" disabled={page >= data.totalPages} onClick={() => setPage((p) => p + 1)}>
                Next
              </Button>
            </nav>
          )}
        </>
      )}
    </div>
  );
}
