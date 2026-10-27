'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import type { z } from 'zod';
import { registerSchema, type SessionDto } from '@shayara/shared';
import { AuthShell } from '@/components/account/auth-shell';
import { Button } from '@/components/ui/button';
import { Checkbox, Field, Input } from '@/components/ui/form-controls';
import { Alert } from '@/components/ui/misc';
import { applyApiErrors, safeNext } from '@/hooks/use-api-form';
import { api } from '@/lib/api-client';
import { useCart } from '@/stores/cart-store';
import { useSession } from '@/stores/session-store';

type FormInput = z.input<typeof registerSchema>;
type FormOutput = z.output<typeof registerSchema>;

export function RegisterForm() {
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
  } = useForm<FormInput, unknown, FormOutput>({ resolver: zodResolver(registerSchema) });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      const session = await api<SessionDto>('/auth/register', { method: 'POST', body: values });
      setSession(session);
      await refreshCart().catch(() => undefined);
      router.replace(safeNext(params.get('next')));
      router.refresh();
    } catch (err) {
      setFormError(applyApiErrors(err, setError, ['name', 'email', 'password', 'phone', 'acceptTerms']));
    }
  });

  return (
    <AuthShell
      title="Create your account"
      subtitle="Save addresses, track orders and keep your bag across devices."
      footer={
        <>
          Already have an account?{' '}
          <Link href="/login" className="font-semibold text-rose-deep underline underline-offset-4">
            Log in
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} noValidate className="space-y-5">
        {formError && <Alert variant="error">{formError}</Alert>}
        <Field id="name" label="Full name" error={errors.name?.message}>
          <Input autoComplete="name" {...register('name')} />
        </Field>
        <Field id="email" label="Email" error={errors.email?.message}>
          <Input type="email" autoComplete="email" {...register('email')} />
        </Field>
        <Field id="phone" label="Mobile number (optional)" error={errors.phone?.message} hint="For delivery updates only.">
          <Input type="tel" inputMode="tel" autoComplete="tel-national" {...register('phone', { setValueAs: (v: string) => (v ? v : undefined) })} />
        </Field>
        <Field id="password" label="Password" error={errors.password?.message} hint="At least 10 characters, with a letter and a number.">
          <Input type="password" autoComplete="new-password" {...register('password')} />
        </Field>
        <div>
          <label className="flex items-start gap-3 text-sm">
            <Checkbox className="mt-0.5" {...register('acceptTerms')} aria-invalid={errors.acceptTerms ? true : undefined} />
            <span>
              I agree to the{' '}
              <Link href="/terms" className="text-rose-deep underline underline-offset-4" target="_blank">
                terms
              </Link>{' '}
              and{' '}
              <Link href="/privacy-policy" className="text-rose-deep underline underline-offset-4" target="_blank">
                privacy policy
              </Link>
              .
            </span>
          </label>
          {errors.acceptTerms && (
            <p role="alert" className="mt-1.5 text-xs text-danger">
              {errors.acceptTerms.message}
            </p>
          )}
        </div>
        <Button type="submit" className="w-full" loading={isSubmitting}>
          Create account
        </Button>
      </form>
    </AuthShell>
  );
}
