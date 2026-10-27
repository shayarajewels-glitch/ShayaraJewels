import Link from 'next/link';
import { AdminPageHeader } from '@/components/admin/admin-ui';
import { ProductForm } from '@/components/admin/product-form';

export const metadata = { title: 'New product' };

export default function NewProductPage() {
  return (
    <div>
      <Link href="/admin/products" className="text-xs text-rose-deep hover:underline">
        ← All products
      </Link>
      <AdminPageHeader title="New product" description="Save as a draft first, then publish when photos and details are ready." />
      <ProductForm />
    </div>
  );
}
