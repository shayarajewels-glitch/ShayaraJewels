import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="container-page flex flex-col items-center py-24 text-center">
      <p className="eyebrow mb-4 text-rose-deep">Error 404</p>
      <h1 className="text-5xl sm:text-6xl">This piece has wandered off</h1>
      <p className="mt-4 max-w-md text-sm text-charcoal-soft">The page you&apos;re looking for doesn&apos;t exist, or the product is no longer available.</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button asChild>
          <Link href="/shop">Shop all jewellery</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/">Back to home</Link>
        </Button>
      </div>
    </div>
  );
}
