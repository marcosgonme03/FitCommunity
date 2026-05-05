import { Response } from 'express';

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
  message?: string;
  meta?: Record<string, unknown>;
}

/**
 * Send a successful API response
 */
export function sendSuccess<T>(
  res: Response,
  data: T,
  options?: {
    statusCode?: number;
    message?: string;
    meta?: Record<string, unknown>;
  }
): void {
  const { statusCode = 200, message, meta } = options ?? {};
  res.status(statusCode).json({
    success: true,
    data,
    ...(message && { message }),
    ...(meta && { meta }),
  } satisfies ApiResponse<T>);
}

/**
 * Send an error API response
 */
export function sendError(
  res: Response,
  error: string,
  options?: {
    statusCode?: number;
    code?: string;
  }
): void {
  const { statusCode = 400, code } = options ?? {};
  res.status(statusCode).json({
    success: false,
    error,
    ...(code && { code }),
  } satisfies ApiResponse);
}

/**
 * Paginated response helper
 */
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export function sendPaginated<T>(
  res: Response,
  data: T[],
  pagination: PaginationMeta,
  extraMeta?: Record<string, unknown>
): void {
  res.status(200).json({
    success: true,
    data,
    meta: { pagination, ...(extraMeta ?? {}) },
  } satisfies ApiResponse<T[]>);
}
