import { jsonLd } from '@/lib/json-ld';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import {
  FINISH_LABELS,
  FREE_SHIPPING_THRESHOLD_PAISE,
  RETURN_WINDOW_DAYS,
  STANDARD_SHIPPING_PAISE,
  categoryByType,
  productSeoDescription,
  productSeoTitle,
  type ProductDetailDto,
} from '@shayara/shared';
import { Breadcrumbs } from '@/components/layout/page-heading';
import { ProductDetailView } from '@/components/product/product-detail-view';
import { ProductRail } from '@/components/product/product-rail';
import { ReviewsSection } from '@/components/product/reviews-section';
import { ApiNotFoundError, serverApi } from '@/lib/api-server';
import { DEMO_NOTICE, SITE_NAME, SITE_URL } from '@/lib/config';

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
  const title = product.seoTitle || productSeoTitle(product);
  const description = product.seoDescription || productSeoDescription(product);
  const image = product.images[0];
  const images = image && !image.url.endsWith('.svg') ? [{ url: absolute(image.url), alt: image.alt }] : undefined;
  return {
    title,
    description,
    alternates: { canonical: `/products/${product.slug}` },
    openGraph: { type: 'website', title, description, url: `/products/${product.slug}`, images },
    twitter: { card: 'summary_large_image', title, description, images: images?.map((i) => i.url) },
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
      shippingDetails: {
        '@type': 'OfferShippingDetails',
        shippingRate: {
          '@type': 'MonetaryAmount',
          value: product.pricePaise >= FREE_SHIPPING_THRESHOLD_PAISE ? '0' : (STANDARD_SHIPPING_PAISE / 100).toFixed(2),
          currency: 'INR',
        },
        shippingDestination: { '@type': 'DefinedRegion', addressCountry: 'IN' },
        deliveryTime: {
          '@type': 'ShippingDeliveryTime',
          handlingTime: { '@type': 'QuantitativeValue', minValue: 1, maxValue: 2, unitCode: 'DAY' },
          transitTime: { '@type': 'QuantitativeValue', minValue: 3, maxValue: 7, unitCode: 'DAY' },
        },
      },
      hasMerchantReturnPolicy: {
        '@type': 'MerchantReturnPolicy',
        applicableCountry: 'IN',
        returnPolicyCategory: 'https://schema.org/MerchantReturnFiniteReturnWindow',
        merchantReturnDays: RETURN_WINDOW_DAYS,
        returnMethod: 'https://schema.org/ReturnByMail',
        url: `${SITE_URL}/returns-policy`,
      },
    },
    // While the store runs as a demo (DEMO_NOTICE set), ratings are not reported to search engines.
    ...(product.reviewCount > 0 && !DEMO_NOTICE
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
