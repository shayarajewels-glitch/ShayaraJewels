'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { nameSchema, passwordSchema, phoneSchema, type UserDto } from '@shayara/shared';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/form-controls';
import { Alert, Badge, Card } from '@/components/ui/misc';
import { applyApiErrors } from '@/hooks/use-api-form';
import { api, errorMessage, setCsrfToken } from '@/lib/api-client';
import { formatDate } from '@/lib/utils';
import { useSession } from '@/stores/session-store';

const profileSchema = z.object({
  name: nameSchema,
  phone: z.union([z.literal(''), phoneSchema]).transform((v) => (v === '' ? null : v)),
});
const passwordForm = z
  .object({ currentPassword: z.string().min(1, 'Enter your current password'), newPassword: passwordSchema, confirm: z.string() })
  .refine((v) => v.newPassword === v.confirm, { path: ['confirm'], message: 'Passwords do not match' });

export default function ProfilePage() {
  const { user, setUser } = useSession();
  const [pwError, setPwError] = useState<string | null>(null);
  const [resent, setResent] = useState(false);

  const profile = useForm<z.input<typeof profileSchema>, unknown, z.output<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: user?.name ?? '', phone: user?.phone ?? '' },
  });
  const pw = useForm<z.infer<typeof passwordForm>>({ resolver: zodResolver(passwordForm) });

  if (!user) return null;

  return (
    <div className="space-y-8">
      <h1 className="text-4xl">Profile</h1>

      <Card className="p-6">
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-sm">{user.email}</p>
          {user.emailVerified ? <Badge variant="success">Verified</Badge> : <Badge variant="muted">Not verified</Badge>}
        </div>
        <p className="mt-1 text-xs text-charcoal-soft">Member since {formatDate(user.createdAt)}</p>
        {!user.emailVerified && (
          <div className="mt-4">
            {resent ? (
              <Alert variant="success">If email delivery is set up, a new verification link is on its way.</Alert>
            ) : (
              <Button
                variant="link"
                onClick={async () => {
                  try {
                    await api('/auth/resend-verification', { method: 'POST' });
                    setResent(true);
                  } catch (err) {
                    toast.error(errorMessage(err));
                  }
                }}
              >
                Resend verification email
              </Button>
            )}
          </div>
        )}
      </Card>

      <Card className="p-6">
        <h2 className="mb-5 text-2xl">Personal details</h2>
        <form
          noValidate
          className="grid gap-5 sm:grid-cols-2"
          onSubmit={profile.handleSubmit(async (values) => {
            try {
              const res = await api<{ user: UserDto }>('/users/me', { method: 'PATCH', body: values });
              setUser(res.user);
              toast.success('Profile updated');
            } catch (err) {
              const msg = applyApiErrors(err, profile.setError, ['name', 'phone']);
              if (msg) toast.error(msg);
            }
          })}
        >
          <Field id="name" label="Full name" error={profile.formState.errors.name?.message}>
            <Input autoComplete="name" {...profile.register('name')} />
          </Field>
          <Field id="phone" label="Mobile number" error={profile.formState.errors.phone?.message}>
            <Input type="tel" autoComplete="tel-national" {...profile.register('phone')} />
          </Field>
          <div className="sm:col-span-2">
            <Button type="submit" loading={profile.formState.isSubmitting}>
              Save changes
            </Button>
          </div>
        </form>
      </Card>

      <Card className="p-6">
        <h2 className="mb-1 text-2xl">Change password</h2>
        <p className="mb-5 text-sm text-charcoal-soft">You&apos;ll stay signed in here; other devices will be signed out.</p>
        <form
          noValidate
          className="grid max-w-md gap-5"
          onSubmit={pw.handleSubmit(async ({ currentPassword, newPassword }) => {
            setPwError(null);
            try {
              const res = await api<{ user: UserDto; csrfToken?: string }>('/users/me', { method: 'PATCH', body: { currentPassword, newPassword } });
              if (res.csrfToken) setCsrfToken(res.csrfToken);
              pw.reset();
              toast.success('Password changed');
            } catch (err) {
              setPwError(applyApiErrors(err, pw.setError, ['currentPassword', 'newPassword']));
            }
          })}
        >
          {pwError && <Alert variant="error">{pwError}</Alert>}
          <Field id="currentPassword" label="Current password" error={pw.formState.errors.currentPassword?.message}>
            <Input type="password" autoComplete="current-password" {...pw.register('currentPassword')} />
          </Field>
          <Field id="newPassword" label="New password" error={pw.formState.errors.newPassword?.message}>
            <Input type="password" autoComplete="new-password" {...pw.register('newPassword')} />
          </Field>
          <Field id="confirm" label="Confirm new password" error={pw.formState.errors.confirm?.message}>
            <Input type="password" autoComplete="new-password" {...pw.register('confirm')} />
          </Field>
          <div>
            <Button type="submit" variant="outline" loading={pw.formState.isSubmitting}>
              Update password
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
