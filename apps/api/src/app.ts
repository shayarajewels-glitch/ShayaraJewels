import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { type Express } from 'express';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';
import { getConfig } from './config/env';
import { getLogger } from './config/logger';
import { errorHandler, notFoundHandler } from './middleware/error-handler';
import { createRateLimiters } from './middleware/rate-limit';
import { csrfProtection, requestId, sessionMiddleware } from './middleware/security';
import { healthRouter } from './modules/health/health.routes';
import { buildApiRouter } from './routes';
import { razorpayWebhookRouter } from './modules/payments/webhook.routes';
import { buildUploadthingRouter } from './modules/uploads/uploadthing.routes';

export function createApp(): Express {
  const config = getConfig();
  const app = express();
  const limiters = createRateLimiters();

  app.disable('x-powered-by');
  app.set('trust proxy', config.trustProxy);
  app.set('query parser', 'extended');

  app.use(requestId);
  app.use(
    pinoHttp({
      logger: getLogger(),
      genReqId: (req) => (req as express.Request).id,
      customLogLevel: (_req, res, err) => (err || res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info'),
      serializers: {
        req: (req: { id: string; method: string; url: string }) => ({ id: req.id, method: req.method, url: req.url }),
        res: (res: { statusCode: number }) => ({ statusCode: res.statusCode }),
      },
      autoLogging: { ignore: (req) => req.url?.startsWith('/health') ?? false },
    }),
  );
  app.use(
    helmet({
      // The API serves JSON only; a locked-down CSP is safe.
      contentSecurityPolicy: { directives: { defaultSrc: ["'none'"], frameAncestors: ["'none'"] } },
      crossOriginResourcePolicy: { policy: 'same-site' },
    }),
  );
  app.use(
    cors({
      origin: (origin, cb) => cb(null, !origin || config.allowedOrigins.includes(origin)),
      credentials: true,
      methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
      maxAge: 600,
    }),
  );

  app.use('/health', healthRouter);

  // Signature-authenticated routes: mounted before JSON parsing and CSRF checks.
  // The Razorpay webhook needs the exact raw body to verify its signature.
  app.use('/api/v1/webhooks/razorpay', express.raw({ type: '*/*', limit: '1mb' }), razorpayWebhookRouter);
  // UploadThing reads the body itself and authorizes uploads with a short-lived upload token.
  app.use('/api/uploadthing', buildUploadthingRouter());

  app.use(cookieParser());
  app.use(express.json({ limit: '200kb' }));
  app.use(express.urlencoded({ extended: false, limit: '50kb' }));
  app.use(sessionMiddleware);
  app.use('/api/v1', limiters.api, csrfProtection, buildApiRouter(limiters));

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
