import type { ErrorRequestHandler, RequestHandler } from 'express';
import mongoose from 'mongoose';
import { ZodError } from 'zod';
import { getLogger } from '../config/logger';
import { isDuplicateKeyError } from '../config/db';
import { AppError } from '../utils/errors';

export const notFoundHandler: RequestHandler = (req, _res, next) => {
  next(new AppError(404, 'ROUTE_NOT_FOUND', `No route for ${req.method} ${req.path}`));
};

const DUPLICATE_MESSAGES: Record<string, string> = {
  email: 'An account with this email already exists',
  slug: 'Another product already uses this slug',
  sku: 'Another product already uses this SKU',
  orderNumber: 'Order number collision, please retry',
  providerPaymentId: 'This payment has already been recorded',
};

/** Converts every error into a safe JSON body. Internal details are logged, never returned. */
export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  let status = 500;
  let code = 'INTERNAL_ERROR';
  let message = 'Something went wrong. Please try again.';
  let details: { path: string; message: string }[] | undefined;

  if (err instanceof AppError) {
    ({ status, code, message, details } = err);
  } else if (err instanceof ZodError) {
    status = 400;
    code = 'VALIDATION_ERROR';
    message = 'Please check the highlighted fields';
    details = err.issues.map((i) => ({ path: i.path.join('.'), message: i.message }));
  } else if (err instanceof mongoose.Error.CastError) {
    status = 400;
    code = 'INVALID_ID';
    message = 'Invalid identifier';
  } else if (err instanceof mongoose.Error.ValidationError) {
    status = 400;
    code = 'VALIDATION_ERROR';
    message = 'Please check the highlighted fields';
    details = Object.values(err.errors).map((e) => ({ path: e.path, message: e.message }));
  } else if (isDuplicateKeyError(err)) {
    status = 409;
    code = 'DUPLICATE';
    const field = Object.keys(err.keyPattern ?? {})[0] ?? '';
    message = DUPLICATE_MESSAGES[field] ?? 'This record already exists';
  } else if (isBodyParserError(err)) {
    status = err.status;
    code = err.type === 'entity.too.large' ? 'PAYLOAD_TOO_LARGE' : 'INVALID_JSON';
    message = err.type === 'entity.too.large' ? 'Request body is too large' : 'Request body is not valid JSON';
  }

  const log = getLogger();
  if (status >= 500) log.error({ err, requestId: req.id, path: req.path }, 'Unhandled error');
  else log.debug({ code, requestId: req.id, path: req.path }, message);

  res.status(status).json({ error: { code, message, details, requestId: req.id } });
};

function isBodyParserError(err: unknown): err is { status: number; type: string } {
  return (
    typeof err === 'object' &&
    err !== null &&
    typeof (err as { status?: unknown }).status === 'number' &&
    typeof (err as { type?: unknown }).type === 'string' &&
    String((err as { type: string }).type).startsWith('entity.')
  );
}
