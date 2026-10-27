'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Spinner } from '@/components/ui/misc';
import { useSession } from '@/stores/session-store';

/**
 * Client-side gate for pages that need a signed-in user. This is a UX
 * convenience — the API independently rejects unauthenticated requests.
 */
export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, status, load } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (status === 'idle') void load();
    if (status === 'ready' && !user) router.replace(`/login?next=${encodeURIComponent(pathname)}`);
  }, [status, user, load, router, pathname]);

  if (status !== 'ready' || !user) {
    return (
      <div className="flex min-h-64 items-center justify-center">
        <Spinner label="Checking your session" />
      </div>
    );
  }
  return <>{children}</>;
}
