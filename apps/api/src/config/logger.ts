import pino, { type Logger } from 'pino';
import { getConfig } from './env';

/** Paths removed from every log line. Covers headers, credentials, tokens and payment secrets. */
export const REDACT_PATHS = [
  'req.headers.cookie',
  'req.headers.authorization',
  'req.headers["x-csrf-token"]',
  'req.headers["x-razorpay-signature"]',
  'res.headers["set-cookie"]',
  '*.password',
  '*.newPassword',
  '*.currentPassword',
  '*.passwordHash',
  '*.token',
  '*.tokenHash',
  '*.csrfToken',
  '*.razorpay_signature',
  '*.keySecret',
  '*.webhookSecret',
  '*.sessionSecret',
  '*.authorization',
  '*.cookie',
];

let rootLogger: Logger | undefined;

export function getLogger(): Logger {
  if (!rootLogger) {
    const config = getConfig();
    rootLogger = pino({
      level: config.logLevel,
      base: { service: 'shayara-api', env: config.env },
      redact: { paths: REDACT_PATHS, censor: '[redacted]' },
      timestamp: pino.stdTimeFunctions.isoTime,
      ...(config.env === 'development'
        ? { transport: { target: 'pino-pretty', options: { colorize: true, translateTime: 'SYS:HH:MM:ss' } } }
        : {}),
    });
  }
  return rootLogger;
}
