import { Request, Response, NextFunction } from 'express';
import { ZodError, z } from 'zod';
import { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';
import { AppError, errorHandler, notFoundHandler } from '../errorHandler';

/** Minimal response mock */
function mockRes() {
  const jsonMock = jest.fn();
  const statusMock = jest.fn().mockReturnValue({ json: jsonMock });
  const res = { status: statusMock } as unknown as Response;
  return { res, statusMock, jsonMock };
}

const req = {} as Request;
const next: NextFunction = jest.fn();

// Silence logger in tests
jest.mock('../../utils/logger', () => ({
  logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn(), debug: jest.fn() },
}));

describe('AppError', () => {
  it('sets message, statusCode and code correctly', () => {
    const err = new AppError('Not found', 404, 'NOT_FOUND');
    expect(err.message).toBe('Not found');
    expect(err.statusCode).toBe(404);
    expect(err.code).toBe('NOT_FOUND');
    expect(err.name).toBe('AppError');
  });

  it('defaults statusCode to 400 when not provided', () => {
    const err = new AppError('Bad');
    expect(err.statusCode).toBe(400);
  });

  it('is an instance of Error', () => {
    expect(new AppError('x')).toBeInstanceOf(Error);
  });
});

describe('errorHandler middleware', () => {
  // ─── AppError ─────────────────────────────────────────────────────────────

  it('handles AppError with correct status and body', () => {
    const { res, statusMock, jsonMock } = mockRes();
    errorHandler(new AppError('Forbidden', 403, 'FORBIDDEN'), req, res, next);

    expect(statusMock).toHaveBeenCalledWith(403);
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, error: 'Forbidden', code: 'FORBIDDEN' }),
    );
  });

  it('handles AppError without code', () => {
    const { res, jsonMock } = mockRes();
    errorHandler(new AppError('Bad request', 400), req, res, next);
    expect(jsonMock.mock.calls[0][0]).not.toHaveProperty('code');
  });

  // ─── ZodError ────────────────────────────────────────────────────────────

  it('handles ZodError with 422 and VALIDATION_ERROR code', () => {
    const { res, statusMock, jsonMock } = mockRes();
    let zodErr!: ZodError;
    try {
      z.object({ email: z.string().email() }).parse({ email: 'bad' });
    } catch (e) {
      zodErr = e as ZodError;
    }

    errorHandler(zodErr, req, res, next);
    expect(statusMock).toHaveBeenCalledWith(422);
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, code: 'VALIDATION_ERROR' }),
    );
  });

  // ─── JWT errors ───────────────────────────────────────────────────────────

  it('handles TokenExpiredError with 401 and TOKEN_EXPIRED code', () => {
    const { res, statusMock, jsonMock } = mockRes();
    errorHandler(new TokenExpiredError('jwt expired', new Date()), req, res, next);

    expect(statusMock).toHaveBeenCalledWith(401);
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'TOKEN_EXPIRED' }),
    );
  });

  it('handles JsonWebTokenError with 401 and TOKEN_INVALID code', () => {
    const { res, statusMock, jsonMock } = mockRes();
    errorHandler(new JsonWebTokenError('invalid signature'), req, res, next);

    expect(statusMock).toHaveBeenCalledWith(401);
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'TOKEN_INVALID' }),
    );
  });

  // ─── Unknown error ────────────────────────────────────────────────────────

  it('handles unknown errors with 500 and INTERNAL_ERROR code', () => {
    const { res, statusMock, jsonMock } = mockRes();
    errorHandler(new Error('Something blew up'), req, res, next);

    expect(statusMock).toHaveBeenCalledWith(500);
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, code: 'INTERNAL_ERROR' }),
    );
  });
});

describe('notFoundHandler middleware', () => {
  it('responds with 404 and NOT_FOUND code', () => {
    const { res, statusMock, jsonMock } = mockRes();
    const fakeReq = { method: 'GET', path: '/nonexistent' } as Request;
    notFoundHandler(fakeReq, res);

    expect(statusMock).toHaveBeenCalledWith(404);
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, code: 'NOT_FOUND' }),
    );
  });

  it('includes the requested method and path in the error message', () => {
    const { res, jsonMock } = mockRes();
    const fakeReq = { method: 'DELETE', path: '/api/gone' } as Request;
    notFoundHandler(fakeReq, res);

    const body = jsonMock.mock.calls[0][0];
    expect(body.error).toContain('DELETE');
    expect(body.error).toContain('/api/gone');
  });
});
