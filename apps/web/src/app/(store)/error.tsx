'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';

export default function StoreError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div className="container-page flex flex-col items-center py-24 text-center">
      <p className="eyebrow mb-4 text-rose-deep">Something went wrong</p>
      <h1 className="text-5xl">We hit a snag</h1>
      <p className="mt-4 max-w-md text-sm text-charcoal-soft">
        Please try again. If it keeps happening, our team can trace it with this reference: <span className="font-mono">{error.digest ?? 'n/a'}</span>
      </p>
      <div className="mt-8 flex gap-3">
        <Button onClick={reset}>Try again</Button>
        <Button asChild variant="outline">
          <Link href="/">Home</Link>
        </Button>
      </div>
    </div>
  );
}
