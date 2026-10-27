'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { useForm } from 'react-hook-form';
import { passwordSchema } from '@shayara/shared';
import { z } from 'zod';
import { AuthShell } from '@/components/account/auth-shell';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/form-controls';
import { Alert } from '@/components/ui/misc';
import { api, errorMessage, setCsrfToken } from '@/lib/api-client';
import { useSession } from '@/stores/session-store';

const schema = z
  .object({ password: passwordSchema, confirm: z.string() })
  .refine((v) => v.password === v.confirm, { path: ['confirm'], message: 'Passwords do not match' });

function ResetForm() {
  const token = useSearchParams().get('token') ?? '';
  const [done, setDone] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema) });

  const onSubmit = handleSubmit(async ({ password }) => {
    setFormError(null);
    try {
      const res = await api<{ csrfToken: string }>('/auth/reset-password', { method: 'POST', body: { token, password } });
      setCsrfToken(res.csrfToken);
      useSession.setState({ user: null, status: 'ready' });
      setDone(true);
    } catch (err) {
      setFormError(errorMessage(err));
    }
  });

  if (!token) {
    return (
      <Alert variant="error" title="This link is incomplete">
        Please use the full link from your email, or <Link href="/forgot-password" className="underline">request a new one</Link>.
      </Alert>
    );
  }
  if (done) {
    return (
      <div className="space-y-5">
        <Alert variant="success" title="Password updated">
          For your security we signed you out on all devices.
        </Alert>
        <Button asChild className="w-full">
          <Link href="/login">Log in</Link>
        </Button>
      </div>
    );
  }
  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      {formError && (
        <Alert variant="error">
          {formError} <Link href="/forgot-password" className="underline">Request a new link</Link>
        </Alert>
      )}
      <Field id="password" label="New password" error={errors.password?.message} hint="At least 10 characters, with a letter and a number.">
        <Input type="password" autoComplete="new-password" {...register('password')} />
      </Field>
      <Field id="confirm" label="Confirm new password" error={errors.confirm?.message}>
        <Input type="password" autoComplete="new-password" {...register('confirm')} />
      </Field>
      <Button type="submit" className="w-full" loading={isSubmitting}>
        Set new password
      </Button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <AuthShell title="Choose a new password">
      <Suspense>
        <ResetForm />
      </Suspense>
    </AuthShell>
  );
}
