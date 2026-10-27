import type { Request } from 'express';
import type { z } from 'zod';

/** Parses untrusted input with a Zod schema. ZodErrors are turned into 400 responses by the error handler. */
export function parse<S extends z.ZodType>(schema: S, value: unknown): z.output<S> {
  return schema.parse(value);
}

export const parseBody = <S extends z.ZodType>(req: Request, schema: S) => parse(schema, req.body ?? {});
export const parseQuery = <S extends z.ZodType>(req: Request, schema: S) => parse(schema, req.query);
export const parseParams = <S extends z.ZodType>(req: Request, schema: S) => parse(schema, req.params);

export function paginate<T>(items: T[], total: number, page: number, limit: number) {
  return { items, page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) };
}

export function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
