'use client';

import { ExternalLink } from 'lucide-react';
import Link from 'next/link';
import type { AdminProductDto } from '@shayara/shared';
import { Alert, Skeleton } from '@/components/ui/misc';
import { AdminPageHeader, ProductStatusBadge, useAdminResource } from './admin-ui';
import { ProductForm } from './product-form';

export function EditProduct({ id }: { id: string }) {
  const { data, error, loading } = useAdminResource<AdminProductDto>(`/admin/products/${id}`);
  return (
    <div>
      <Link href="/admin/products" className="text-xs text-rose-deep hover:underline">
        ← All products
      </Link>
      {error && (
        <Alert variant="error" title="Could not load this product" className="mt-4">
          {error}
        </Alert>
      )}
      {loading && !data && <Skeleton className="mt-4 h-96" />}
      {data && (
        <>
          <AdminPageHeader
            title={data.name}
            description={`SKU ${data.sku}`}
            actions={
              <div className="flex items-center gap-3">
                <ProductStatusBadge status={data.status} />
                {data.status === 'published' && (
                  <Link href={`/products/${data.slug}`} target="_blank" className="inline-flex items-center gap-1 text-xs text-rose-deep underline underline-offset-4">
                    View in store <ExternalLink className="size-3" aria-hidden />
                  </Link>
                )}
              </div>
            }
          />
          {/* Remount when the product id changes so the form picks up fresh defaults. */}
          <ProductForm key={data.id} product={data} />
        </>
      )}
    </div>
  );
}
