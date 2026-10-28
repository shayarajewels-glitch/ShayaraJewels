'use client';

import { Pencil } from 'lucide-react';
import Link from 'next/link';
import type { AdminProductDto } from '@shayara/shared';
import { ProductDetailView } from '@/components/product/product-detail-view';
import { Button } from '@/components/ui/button';
import { Alert, Skeleton } from '@/components/ui/misc';
import { useAdminResource } from './admin-ui';

/** Renders the exact customer-facing product component, for drafts too. */
export function ProductPreview({ id }: { id: string }) {
  const { data, error, loading } = useAdminResource<AdminProductDto>(`/admin/products/${id}`);
  if (error) return <Alert variant="error" title="Could not load this product">{error}</Alert>;
  if (loading || !data) return <Skeleton className="h-[32rem]" />;
  return (
    <div>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3 rounded-sm border border-champagne/40 bg-champagne/10 px-4 py-3 text-sm text-champagne" role="status">
        <p>
          Preview — status: <strong className="capitalize">{data.status}</strong>
          {data.status !== 'published' && '. Customers cannot see this product yet.'}
        </p>
        <Button asChild size="sm" variant="outline">
          <Link href={`/admin/products/${data.id}`}>
            <Pencil /> Edit
          </Link>
        </Button>
      </div>
      <div className="rounded-md bg-ivory">
        <ProductDetailView product={data} preview />
      </div>
    </div>
  );
}
