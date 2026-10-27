'use client';

import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';
import { ApiError } from '@/lib/api-client';

/**
 * Maps API validation details onto form fields. Returns a message for
 * errors that do not belong to a single field.
 */
export function applyApiErrors<T extends FieldValues>(err: unknown, setError: UseFormSetError<T>, fields: readonly string[]): string | null {
  if (err instanceof ApiError) {
    let unmatched = false;
    for (const d of err.details ?? []) {
      if (fields.includes(d.path)) setError(d.path as Path<T>, { type: 'server', message: d.message });
      else unmatched = true;
    }
    if (!err.details?.length || unmatched) return err.message;
    return null;
  }
  return 'Something went wrong. Please try again.';
}

/** Only allow same-site relative redirect targets (prevents open redirects). */
export function safeNext(next: string | null | undefined, fallback = '/account/profile'): string {
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.startsWith('/\\')) return fallback;
  return next;
}
