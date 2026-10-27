import { jsonLd } from '@/lib/json-ld';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { FINISH_LABELS, categoryByType, type ProductDetailDto } from '@shayara/shared';
import { Breadcrumbs } from '@/components/layout/page-heading';
import { ProductDetailView } from '@/components/product/product-detail-view';
import { ProductRail } from '@/components/product/product-rail';
import { ReviewsSection } from '@/components/product/reviews-section';
import { ApiNotFoundError, serverApi } from '@/lib/api-server';
import { SITE_NAME, SITE_URL } from '@/lib/config';

type Props = { params: Promise<{ slug: string }> };

async function loadProduct(slug: string): Promise<ProductDetailDto> {
  try {
    return await serverApi.product(slug);
  } catch (err) {
    if (err instanceof ApiNotFoundError) notFound();
    throw err;
  }
}

const absolute = (url: string) => (url.startsWith('http') ? url : `${SITE_URL}${url}`);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const product = await loadProduct(slug);
  const title = product.seoTitle || `${product.name} — ${FINISH_LABELS[product.finish]} ${categoryByType(product.type).name.replace(/s$/, '')}`;
  const description = product.seoDescription || product.description.slice(0, 160);
  const image = product.images[0];
  return {
    title,
    description,
    alternates: { canonical: `/products/${product.slug}` },
    openGraph: {
      type: 'website',
      title,
      description,
      url: `/products/${product.slug}`,
      images: image && !image.url.endsWith('.svg') ? [{ url: absolute(image.url), alt: image.alt }] : undefined,
    },
  };
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const product = await loadProduct(slug);
  const [related, reviews] = await Promise.all([serverApi.related(product.slug), serverApi.reviews(product.id)]);
  const category = categoryByType(product.type);

  // Structured data reflects the real price and stock; rating only when real reviews exist.
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    sku: product.sku,
    description: product.description,
    image: product.images.map((i) => absolute(i.url)),
    brand: { '@type': 'Brand', name: SITE_NAME },
    category: category.name,
    material: product.baseMaterial ?? undefined,
    color: FINISH_LABELS[product.finish],
    offers: {
      '@type': 'Offer',
      url: `${SITE_URL}/products/${product.slug}`,
      priceCurrency: 'INR',
      price: (product.pricePaise / 100).toFixed(2),
      availability: product.inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      itemCondition: 'https://schema.org/NewCondition',
      seller: { '@type': 'Organization', name: SITE_NAME },
    },
    ...(product.reviewCount > 0
      ? { aggregateRating: { '@type': 'AggregateRating', ratingValue: product.averageRating.toFixed(1), reviewCount: product.reviewCount } }
      : {}),
  };

  return (
    <div className="container-page py-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(structuredData)} />
      <Breadcrumbs crumbs={[{ href: '/', label: 'Home' }, { href: `/categories/${category.slug}`, label: category.name }, { label: product.name }]} />
      <ProductDetailView product={product} />
      <div className="mt-20">
        <ReviewsSection reviews={reviews} averageRating={product.averageRating} reviewCount={product.reviewCount} />
      </div>
      <div className="-mx-4 sm:-mx-6 lg:-mx-8">
        <ProductRail eyebrow="Complete the look" title="You may also like" products={related.items} />
      </div>
    </div>
  );
}
