import { ProductPreview } from '@/components/admin/product-preview';

export const metadata = { title: 'Preview product' };

export default async function ProductPreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ProductPreview id={id} />;
}
