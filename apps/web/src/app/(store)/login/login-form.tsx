'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { loginSchema, type LoginInput, type SessionDto } from '@shayara/shared';
import { AuthShell } from '@/components/account/auth-shell';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/form-controls';
import { Alert } from '@/components/ui/misc';
import { applyApiErrors, safeNext } from '@/hooks/use-api-form';
import { api } from '@/lib/api-client';
import { useCart } from '@/stores/cart-store';
import { useSession } from '@/stores/session-store';

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const setSession = useSession((s) => s.setSession);
  const refreshCart = useCart((s) => s.refresh);
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      const session = await api<SessionDto>('/auth/login', { method: 'POST', body: values });
      setSession(session);
      await refreshCart().catch(() => undefined);
      router.replace(safeNext(params.get('next'), session.user?.role === 'admin' ? '/admin' : '/account/profile'));
      router.refresh();
    } catch (err) {
      setFormError(applyApiErrors(err, setError, ['email', 'password']));
    }
  });

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Log in to see your orders, addresses and saved bag."
      footer={
        <>
          New to Shayara?{' '}
          <Link href={`/register${params.get('next') ? `?next=${encodeURIComponent(params.get('next')!)}` : ''}`} className="font-semibold text-rose-deep underline underline-offset-4">
            Create an account
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} noValidate className="space-y-5">
        {formError && <Alert variant="error">{formError}</Alert>}
        <Field id="email" label="Email" error={errors.email?.message}>
          <Input type="email" autoComplete="email" {...register('email')} />
        </Field>
        <Field id="password" label="Password" error={errors.password?.message}>
          <Input type="password" autoComplete="current-password" {...register('password')} />
        </Field>
        <div className="flex justify-end">
          <Link href="/forgot-password" className="text-xs text-rose-deep underline underline-offset-4">
            Forgot password?
          </Link>
        </div>
        <Button type="submit" className="w-full" loading={isSubmitting}>
          Log in
        </Button>
      </form>
    </AuthShell>
  );
}
