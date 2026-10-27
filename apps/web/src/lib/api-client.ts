'use client';

import { CSRF_HEADER, type ApiErrorBody } from '@shayara/shared';
import { PUBLIC_API_BASE_URL } from './config';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: { path: string; message: string }[],
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

let csrfToken = '';
let csrfPromise: Promise<string> | null = null;
let onSession: ((body: unknown) => void) | null = null;

export function setCsrfToken(token: string) {
  csrfToken = token;
}

/** Lets the session store learn about new sessions (e.g. after login) from any response. */
export function onSessionPayload(listener: (body: unknown) => void) {
  onSession = listener;
}

async function ensureCsrf(): Promise<string> {
  if (csrfToken) return csrfToken;
  csrfPromise ??= fetch(`${PUBLIC_API_BASE_URL}/auth/me`, { credentials: 'include', cache: 'no-store' })
    .then((r) => r.json())
    .then((body: { csrfToken: string }) => {
      csrfToken = body.csrfToken;
      onSession?.(body);
      return csrfToken;
    })
    .finally(() => {
      csrfPromise = null;
    });
  return csrfPromise;
}

type Method = 'GET' | 'POST' | 'PATCH' | 'DELETE';

/**
 * Browser API client. Sends the session cookie and, for unsafe methods, the
 * CSRF token. Retries once when the session (and so the token) has rotated.
 */
export async function api<T>(path: string, init: { method?: Method; body?: unknown; headers?: Record<string, string> } = {}, retried = false): Promise<T> {
  const method = init.method ?? 'GET';
  const headers: Record<string, string> = { Accept: 'application/json', ...init.headers };
  if (init.body !== undefined) headers['Content-Type'] = 'application/json';
  if (method !== 'GET') headers[CSRF_HEADER] = await ensureCsrf();

  let res: Response;
  try {
    res = await fetch(`${PUBLIC_API_BASE_URL}${path}`, {
      method,
      headers,
      credentials: 'include',
      cache: 'no-store',
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
    });
  } catch {
    throw new ApiError(0, 'NETWORK_ERROR', 'We could not reach Shayara. Check your connection and try again.');
  }

  if (res.status === 204) return undefined as T;
  const body = (await res.json().catch(() => ({}))) as T & Partial<ApiErrorBody> & { csrfToken?: string };

  if (!res.ok) {
    const err = body.error;
    if (res.status === 403 && err?.code === 'CSRF_INVALID' && !retried) {
      csrfToken = '';
      return api<T>(path, init, true);
    }
    throw new ApiError(res.status, err?.code ?? 'UNKNOWN', err?.message ?? 'Something went wrong. Please try again.', err?.details);
  }
  if (body.csrfToken) {
    csrfToken = body.csrfToken;
    onSession?.(body);
  }
  return body;
}

export function errorMessage(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  return 'Something went wrong. Please try again.';
}

export function newIdempotencyKey(): string {
  return crypto.randomUUID().replace(/-/g, '');
}
