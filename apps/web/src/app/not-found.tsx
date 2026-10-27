import Link from 'next/link';
import { Logo } from '@/components/brand/logo';
import { Button } from '@/components/ui/button';

/** Fallback for URLs outside the store layout. */
export default function RootNotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-4 text-center">
      <Logo />
      <h1 className="mt-10 text-5xl">Page not found</h1>
      <p className="mt-3 text-sm text-charcoal-soft">The page you&apos;re looking for doesn&apos;t exist.</p>
      <Button asChild className="mt-8">
        <Link href="/">Back to Shayara</Link>
      </Button>
    </main>
  );
}
