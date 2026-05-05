import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';

type RequestField = 'body' | 'query' | 'params';

/**
 * Middleware factory that validates a request field against a Zod schema
 *
 * @example
 * router.post('/register', validate(registerSchema, 'body'), controller.register)
 */
export function validate(schema: ZodSchema, field: RequestField = 'body') {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[field]);

    if (!result.success) {
      next(result.error);
      return;
    }

    // Replace the request field with the parsed (and potentially transformed) data
    (req as unknown as Record<string, unknown>)[field] = result.data;
    next();
  };
}
