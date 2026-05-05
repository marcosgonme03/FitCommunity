import { Response } from 'express';
import { sendSuccess, sendError, sendPaginated, PaginationMeta } from '../apiResponse';

/** Minimal mock for express Response */
function mockRes() {
  const res: Partial<Response> = {};
  const jsonMock = jest.fn();
  const statusMock = jest.fn().mockReturnValue({ json: jsonMock });
  res.status = statusMock;
  return { res: res as Response, statusMock, jsonMock };
}

describe('apiResponse utils', () => {
  // ─── sendSuccess ─────────────────────────────────────────────────────────────

  describe('sendSuccess', () => {
    it('sends 200 by default with success: true and data', () => {
      const { res, statusMock, jsonMock } = mockRes();
      sendSuccess(res, { id: 1 });

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, data: { id: 1 } }),
      );
    });

    it('uses the provided statusCode', () => {
      const { res, statusMock } = mockRes();
      sendSuccess(res, null, { statusCode: 201 });
      expect(statusMock).toHaveBeenCalledWith(201);
    });

    it('includes message when provided', () => {
      const { res, jsonMock } = mockRes();
      sendSuccess(res, {}, { message: 'Created!' });
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Created!' }),
      );
    });

    it('includes meta when provided', () => {
      const { res, jsonMock } = mockRes();
      sendSuccess(res, [], { meta: { total: 5 } });
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({ meta: { total: 5 } }),
      );
    });

    it('does NOT include message or meta when omitted', () => {
      const { res, jsonMock } = mockRes();
      sendSuccess(res, 'ok');
      const call = jsonMock.mock.calls[0][0];
      expect(call).not.toHaveProperty('message');
      expect(call).not.toHaveProperty('meta');
    });
  });

  // ─── sendError ───────────────────────────────────────────────────────────────

  describe('sendError', () => {
    it('sends 400 by default with success: false and error message', () => {
      const { res, statusMock, jsonMock } = mockRes();
      sendError(res, 'Bad request');

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, error: 'Bad request' }),
      );
    });

    it('uses the provided statusCode', () => {
      const { res, statusMock } = mockRes();
      sendError(res, 'Not found', { statusCode: 404 });
      expect(statusMock).toHaveBeenCalledWith(404);
    });

    it('includes code when provided', () => {
      const { res, jsonMock } = mockRes();
      sendError(res, 'Conflict', { statusCode: 409, code: 'DUPLICATE_ENTRY' });
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({ code: 'DUPLICATE_ENTRY' }),
      );
    });

    it('does NOT include code when omitted', () => {
      const { res, jsonMock } = mockRes();
      sendError(res, 'Bad request');
      expect(jsonMock.mock.calls[0][0]).not.toHaveProperty('code');
    });
  });

  // ─── sendPaginated ───────────────────────────────────────────────────────────

  describe('sendPaginated', () => {
    const pagination: PaginationMeta = {
      page: 1,
      limit: 20,
      total: 100,
      totalPages: 5,
      hasNextPage: true,
      hasPrevPage: false,
    };

    it('sends 200 with success: true, data array, and pagination meta', () => {
      const { res, statusMock, jsonMock } = mockRes();
      sendPaginated(res, [{ id: 1 }], pagination);

      expect(statusMock).toHaveBeenCalledWith(200);
      const body = jsonMock.mock.calls[0][0];
      expect(body.success).toBe(true);
      expect(body.data).toEqual([{ id: 1 }]);
      expect(body.meta.pagination).toEqual(pagination);
    });

    it('merges extraMeta into the meta object', () => {
      const { res, jsonMock } = mockRes();
      sendPaginated(res, [], pagination, { totalCalories: 9999 });
      const body = jsonMock.mock.calls[0][0];
      expect(body.meta.totalCalories).toBe(9999);
    });
  });
});
