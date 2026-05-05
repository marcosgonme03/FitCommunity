import { Request } from 'express';
import { UserRole } from '@prisma/client';

// ─── Authenticated Request ────────────────────────────────────────────────────

export interface AuthUser {
  userId: string;
  email: string;
  role: UserRole;
}

export interface AuthRequest extends Request {
  user?: AuthUser;
}

// ─── Pagination ───────────────────────────────────────────────────────────────

export interface PaginationQuery {
  page?: number;
  limit?: number;
}

export interface PaginationResult {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

// ─── Common ───────────────────────────────────────────────────────────────────

export interface IdParam {
  id: string;
}
