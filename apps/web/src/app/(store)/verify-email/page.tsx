'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useRef, useState } from 'react';
import { AuthShell } from '@/components/account/auth-shell';
import { Button } from '@/components/ui/button';
import { Alert, Spinner } from '@/components/ui/misc';
import { api, errorMessage } from '@/lib/api-client';
import { useSession } from '@/stores/session-store';

function Verify() {
  const token = useSearchParams().get('token') ?? '';
  const [result, setState] = useState<{ status: 'pending' | 'ok' | 'error'; message?: string }>({ status: 'pending' });
  const state = token ? result : { status: 'error' as const, message: 'This verification link is incomplete.' };
  const started = useRef(false);

  useEffect(() => {
    // Tokens are single-use, so make sure the request is sent only once (Strict Mode runs effects twice).
    if (started.current || !token) return;
    started.current = true;
    api('/auth/verify-email', { method: 'POST', body: { token } })
      .then(() => {
        setState({ status: 'ok' });
        void useSession.getState().load();
      })
      .catch((err) => setState({ status: 'error', message: errorMessage(err) }));
  }, [token]);

  if (state.status === 'pending') return <Spinner label="Verifying your email" />;
  if (state.status === 'error') return <Alert variant="error">{state.message}</Alert>;
  return (
    <div className="space-y-5">
      <Alert variant="success" title="Email verified">
        Thank you — your email address is confirmed.
      </Alert>
      <Button asChild className="w-full">
        <Link href="/shop">Continue shopping</Link>
      </Button>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <AuthShell title="Verify your email">
      <Suspense>
        <Verify />
      </Suspense>
    </AuthShell>
  );
}
