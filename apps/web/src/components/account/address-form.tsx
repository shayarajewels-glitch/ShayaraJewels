'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import type { z } from 'zod';
import { INDIAN_STATES, addressSchema, type AddressDto, type AddressSnapshotDto } from '@shayara/shared';
import { Button } from '@/components/ui/button';
import { Checkbox, Field, Input, NativeSelect } from '@/components/ui/form-controls';
import { Alert } from '@/components/ui/misc';
import { applyApiErrors } from '@/hooks/use-api-form';
import { api } from '@/lib/api-client';

type In = z.input<typeof addressSchema>;
type Out = z.output<typeof addressSchema>;

const FIELDS = ['label', 'fullName', 'phone', 'addressLine1', 'addressLine2', 'landmark', 'city', 'state', 'postalCode', 'isDefault'] as const;

/** Create or edit a delivery address. Used in the account area and at checkout. */
export function AddressForm({ address, onSaved, onCancel }: { address?: AddressDto; onSaved: (a: AddressDto) => void; onCancel?: () => void }) {
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<In, unknown, Out>({
    resolver: zodResolver(addressSchema),
    defaultValues: address
      ? {
          label: address.label,
          fullName: address.fullName,
          phone: address.phone,
          addressLine1: address.addressLine1,
          addressLine2: address.addressLine2 ?? '',
          landmark: address.landmark ?? '',
          city: address.city,
          state: address.state as In['state'],
          postalCode: address.postalCode,
          country: 'IN',
          isDefault: address.isDefault,
        }
      : { label: 'Home', country: 'IN', isDefault: false },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      const saved = address
        ? await api<AddressDto>(`/users/me/addresses/${address.id}`, { method: 'PATCH', body: values })
        : await api<AddressDto>('/users/me/addresses', { method: 'POST', body: values });
      onSaved(saved);
    } catch (err) {
      setFormError(applyApiErrors(err, setError, FIELDS));
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-5 sm:grid-cols-2">
      {formError && <Alert variant="error" className="sm:col-span-2">{formError}</Alert>}
      <Field id="fullName" label="Full name" error={errors.fullName?.message}>
        <Input autoComplete="name" {...register('fullName')} />
      </Field>
      <Field id="phone" label="Mobile number" error={errors.phone?.message}>
        <Input type="tel" autoComplete="tel-national" {...register('phone')} />
      </Field>
      <Field id="addressLine1" label="Flat, house no., building, street" error={errors.addressLine1?.message} className="sm:col-span-2">
        <Input autoComplete="address-line1" {...register('addressLine1')} />
      </Field>
      <Field id="addressLine2" label="Area, locality (optional)" error={errors.addressLine2?.message}>
        <Input autoComplete="address-line2" {...register('addressLine2')} />
      </Field>
      <Field id="landmark" label="Landmark (optional)" error={errors.landmark?.message}>
        <Input {...register('landmark')} />
      </Field>
      <Field id="city" label="City" error={errors.city?.message}>
        <Input autoComplete="address-level2" {...register('city')} />
      </Field>
      <Field id="state" label="State / UT" error={errors.state?.message}>
        <NativeSelect autoComplete="address-level1" defaultValue="" {...register('state')}>
          <option value="" disabled>
            Select
          </option>
          {INDIAN_STATES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </NativeSelect>
      </Field>
      <Field id="postalCode" label="PIN code" error={errors.postalCode?.message}>
        <Input inputMode="numeric" autoComplete="postal-code" maxLength={6} {...register('postalCode')} />
      </Field>
      <Field id="label" label="Label" error={errors.label?.message} hint="e.g. Home, Office">
        <Input {...register('label')} />
      </Field>
      <label className="flex items-center gap-3 text-sm sm:col-span-2">
        <Checkbox {...register('isDefault')} /> Make this my default address
      </label>
      <div className="flex gap-3 sm:col-span-2">
        <Button type="submit" loading={isSubmitting}>
          Save address
        </Button>
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}

export function AddressBlock({ address }: { address: AddressSnapshotDto }) {
  return (
    <address className="text-sm not-italic leading-6 text-charcoal-soft">
      <span className="font-semibold text-charcoal">{address.fullName}</span>
      <br />
      {address.addressLine1}
      {address.addressLine2 ? `, ${address.addressLine2}` : ''}
      <br />
      {address.landmark ? (
        <>
          Near {address.landmark}
          <br />
        </>
      ) : null}
      {address.city}, {address.state} {address.postalCode}
      <br />
      Phone: {address.phone}
    </address>
  );
}
