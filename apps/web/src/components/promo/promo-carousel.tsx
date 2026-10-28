import { serverApi } from '@/lib/api-server';
import { Carousel } from './carousel';
import { DEFAULT_SLIDES, couponSlide } from './slides';

/** Server component: fetches live coupons and renders the promo carousel (coupons first). */
export async function PromoCarousel({ className }: { className?: string }) {
  const { items } = await serverApi.coupons();
  return <Carousel slides={[...items.map(couponSlide), ...DEFAULT_SLIDES]} className={className} />;
}
