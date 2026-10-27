import { z } from 'zod';

const PLACEHOLDER_SECRETS = new Set(['changeme', 'change-me', 'secret', 'replace-me']);

const emptyToUndefined = (v: unknown) => (typeof v === 'string' && v.trim() === '' ? undefined : v);
const optionalString = z.preprocess(emptyToUndefined, z.string().trim().optional());
const booleanString = (fallback: boolean) =>
  z.preprocess(emptyToUndefined, z.enum(['true', 'false', '1', '0']).optional()).transform((v) =>
    v === undefined ? fallback : v === 'true' || v === '1',
  );
const intString = (fallback: number, min: number, max: number) =>
  z.preprocess(emptyToUndefined, z.coerce.number().int().min(min).max(max).optional()).transform((v) => v ?? fallback);

/**
 * Variables required for the server to start. Integration credentials
 * (Razorpay, UploadThing, SMTP) are optional here and checked lazily when the
 * integration is first used, so the API boots without them.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: intString(4000, 1, 65535),
  MONGODB_URI: z.preprocess(
    emptyToUndefined,
    z
      .string({ error: 'MONGODB_URI is required (see apps/api/.env.example)' })
      .regex(/^mongodb(\+srv)?:\/\//, 'MONGODB_URI must start with mongodb:// or mongodb+srv://'),
  ),
  SESSION_SECRET: z.preprocess(
    emptyToUndefined,
    z
      .string({ error: 'SESSION_SECRET is required (generate one with: node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'base64url\'))")' })
      .min(32, 'SESSION_SECRET must be at least 32 characters'),
  ),
  FRONTEND_URL: z.preprocess(emptyToUndefined, z.url({ error: 'FRONTEND_URL must be a URL' }).default('http://localhost:3000')),
  API_BASE_URL: z.preprocess(emptyToUndefined, z.url().default('http://localhost:4000')),
  /** Extra comma-separated origins allowed by CORS in addition to FRONTEND_URL. */
  CORS_ORIGINS: optionalString,
  TRUST_PROXY: intString(0, 0, 10),
  COOKIE_SECURE: z.preprocess(emptyToUndefined, z.enum(['true', 'false', 'auto']).default('auto')),
  COOKIE_DOMAIN: optionalString,
  COOKIE_SAMESITE: z.preprocess(emptyToUndefined, z.enum(['lax', 'strict', 'none']).default('lax')),
  SESSION_TTL_DAYS: intString(30, 1, 180),
  LOG_LEVEL: z.preprocess(emptyToUndefined, z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).optional()),
  RATE_LIMIT_ENABLED: booleanString(true),

  UPLOADTHING_TOKEN: optionalString,
  MEDIA_MAX_IMAGE_SIZE: z.preprocess(emptyToUndefined, z.enum(['1MB', '2MB', '4MB', '8MB']).default('4MB')),
  MEDIA_MAX_VIDEO_SIZE: z.preprocess(emptyToUndefined, z.enum(['8MB', '16MB', '32MB', '64MB']).default('32MB')),
  MEDIA_MAX_VIDEO_SECONDS: intString(60, 5, 600),

  PAYMENT_PROVIDER: z.preprocess(emptyToUndefined, z.enum(['razorpay', 'mock']).default('razorpay')),
  RAZORPAY_KEY_ID: optionalString,
  RAZORPAY_KEY_SECRET: optionalString,
  RAZORPAY_WEBHOOK_SECRET: optionalString,
  PAYMENT_WINDOW_MINUTES: intString(30, 5, 180),

  MAIL_TRANSPORT: z.preprocess(emptyToUndefined, z.enum(['smtp', 'console', 'memory', 'disabled']).optional()),
  MAIL_FROM: z.preprocess(emptyToUndefined, z.string().default('Shayara <no-reply@localhost>')),
  SMTP_HOST: optionalString,
  SMTP_PORT: intString(587, 1, 65535),
  SMTP_SECURE: booleanString(false),
  SMTP_USER: optionalString,
  SMTP_PASS: optionalString,

  JOBS_ENABLED: booleanString(true),

  /** Shared secret for the storefront's on-demand cache revalidation endpoint. Optional. */
  REVALIDATE_SECRET: z.preprocess(emptyToUndefined, z.string().min(24, 'REVALIDATE_SECRET must be at least 24 characters').optional()),
  WEB_REVALIDATE_URL: z.preprocess(emptyToUndefined, z.url().optional()),
});

export type Env = z.output<typeof envSchema>;

export interface AppConfig {
  env: Env['NODE_ENV'];
  isProduction: boolean;
  isTest: boolean;
  port: number;
  mongodbUri: string;
  sessionSecret: string;
  frontendUrl: string;
  apiBaseUrl: string;
  allowedOrigins: string[];
  trustProxy: number;
  cookie: {
    name: string;
    secure: boolean;
    domain?: string;
    sameSite: 'lax' | 'strict' | 'none';
  };
  sessionTtlMs: number;
  guestSessionTtlMs: number;
  logLevel: string;
  rateLimitEnabled: boolean;
  uploadthing: {
    token?: string;
    maxImageSize: Env['MEDIA_MAX_IMAGE_SIZE'];
    maxVideoSize: Env['MEDIA_MAX_VIDEO_SIZE'];
    maxVideoSeconds: number;
  };
  payments: {
    provider: 'razorpay' | 'mock';
    keyId?: string;
    keySecret?: string;
    webhookSecret?: string;
    windowMinutes: number;
  };
  mail: {
    transport: 'smtp' | 'console' | 'memory' | 'disabled';
    from: string;
    smtp?: { host: string; port: number; secure: boolean; user?: string; pass?: string };
  };
  jobsEnabled: boolean;
  storefrontRevalidate?: { url: string; secret: string };
}

export class ConfigError extends Error {
  constructor(public readonly problems: string[]) {
    super(`Invalid configuration:\n  - ${problems.join('\n  - ')}`);
    this.name = 'ConfigError';
  }
}

function originOf(url: string): string {
  return new URL(url).origin;
}

export function loadConfig(source: NodeJS.ProcessEnv = process.env): AppConfig {
  const parsed = envSchema.safeParse(source);
  if (!parsed.success) {
    throw new ConfigError(parsed.error.issues.map((i) => `${i.path.join('.') || 'env'}: ${i.message}`));
  }
  const e = parsed.data;
  const isProduction = e.NODE_ENV === 'production';
  const problems: string[] = [];

  const secure = e.COOKIE_SECURE === 'auto' ? isProduction : e.COOKIE_SECURE === 'true';
  const mailTransport =
    e.MAIL_TRANSPORT ?? (e.SMTP_HOST ? 'smtp' : e.NODE_ENV === 'test' ? 'memory' : e.NODE_ENV === 'development' ? 'console' : 'disabled');

  if (isProduction) {
    if (PLACEHOLDER_SECRETS.has(e.SESSION_SECRET.toLowerCase())) problems.push('SESSION_SECRET is a placeholder value');
    if (!e.FRONTEND_URL.startsWith('https://')) problems.push('FRONTEND_URL must use https in production');
    if (!secure) problems.push('COOKIE_SECURE cannot be false in production');
    if (e.PAYMENT_PROVIDER === 'mock') problems.push('PAYMENT_PROVIDER=mock is not allowed in production');
    if (mailTransport === 'console' || mailTransport === 'memory') {
      problems.push(`MAIL_TRANSPORT=${mailTransport} is development-only; use smtp or disabled`);
    }
  }
  if (e.PAYMENT_PROVIDER === 'mock' && e.NODE_ENV !== 'test') {
    problems.push('PAYMENT_PROVIDER=mock may only be used when NODE_ENV=test');
  }
  if (e.COOKIE_SAMESITE === 'none' && !secure) problems.push('COOKIE_SAMESITE=none requires secure cookies');
  if (mailTransport === 'smtp' && !e.SMTP_HOST) problems.push('MAIL_TRANSPORT=smtp requires SMTP_HOST');

  const extraOrigins = (e.CORS_ORIGINS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const allowedOrigins: string[] = [];
  for (const candidate of [e.FRONTEND_URL, ...extraOrigins]) {
    try {
      allowedOrigins.push(originOf(candidate));
    } catch {
      problems.push(`CORS_ORIGINS contains an invalid URL: ${candidate}`);
    }
  }

  if (problems.length) throw new ConfigError(problems);

  // The __Host- prefix pins the cookie to the API host over HTTPS with no Domain attribute.
  const cookieName = secure && !e.COOKIE_DOMAIN ? '__Host-shayara_sid' : 'shayara_sid';

  return Object.freeze({
    env: e.NODE_ENV,
    isProduction,
    isTest: e.NODE_ENV === 'test',
    port: e.PORT,
    mongodbUri: e.MONGODB_URI,
    sessionSecret: e.SESSION_SECRET,
    frontendUrl: e.FRONTEND_URL.replace(/\/$/, ''),
    apiBaseUrl: e.API_BASE_URL.replace(/\/$/, ''),
    allowedOrigins: [...new Set(allowedOrigins)],
    trustProxy: e.TRUST_PROXY,
    cookie: { name: cookieName, secure, domain: e.COOKIE_DOMAIN, sameSite: e.COOKIE_SAMESITE },
    sessionTtlMs: e.SESSION_TTL_DAYS * 24 * 60 * 60 * 1000,
    guestSessionTtlMs: 7 * 24 * 60 * 60 * 1000,
    logLevel: e.LOG_LEVEL ?? (e.NODE_ENV === 'test' ? 'silent' : isProduction ? 'info' : 'debug'),
    rateLimitEnabled: e.RATE_LIMIT_ENABLED,
    uploadthing: {
      token: e.UPLOADTHING_TOKEN,
      maxImageSize: e.MEDIA_MAX_IMAGE_SIZE,
      maxVideoSize: e.MEDIA_MAX_VIDEO_SIZE,
      maxVideoSeconds: e.MEDIA_MAX_VIDEO_SECONDS,
    },
    payments: {
      provider: e.PAYMENT_PROVIDER,
      keyId: e.RAZORPAY_KEY_ID,
      keySecret: e.RAZORPAY_KEY_SECRET,
      webhookSecret: e.RAZORPAY_WEBHOOK_SECRET,
      windowMinutes: e.PAYMENT_WINDOW_MINUTES,
    },
    mail: {
      transport: mailTransport,
      from: e.MAIL_FROM,
      smtp: e.SMTP_HOST
        ? { host: e.SMTP_HOST, port: e.SMTP_PORT, secure: e.SMTP_SECURE, user: e.SMTP_USER, pass: e.SMTP_PASS }
        : undefined,
    },
    jobsEnabled: e.JOBS_ENABLED,
    storefrontRevalidate: e.REVALIDATE_SECRET
      ? { url: e.WEB_REVALIDATE_URL ?? `${e.FRONTEND_URL.replace(/\/$/, '')}/api/revalidate`, secret: e.REVALIDATE_SECRET }
      : undefined,
  });
}

let cached: AppConfig | undefined;

/** Lazily parsed process-wide configuration. */
export function getConfig(): AppConfig {
  cached ??= loadConfig();
  return cached;
}

/** Test hook: replace or reset the cached configuration. */
export function setConfig(config: AppConfig | undefined): void {
  cached = config;
}
