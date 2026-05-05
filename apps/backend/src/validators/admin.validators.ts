import { z } from 'zod';

export const banUserSchema = z.object({
  reason: z.string().min(3, 'Motivo demasiado corto').max(500, 'Máximo 500 caracteres'),
});

export const updateRoleSchema = z.object({
  role: z.enum(['USER', 'ADMIN']),
});

export const listUsersQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
  search: z.string().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'BANNED', 'PENDING_VERIFICATION']).optional(),
  role: z.enum(['USER', 'ADMIN']).optional(),
  /** Filtra por flag is_premium del usuario (true/false como string en query) */
  isPremium: z
    .union([z.boolean(), z.enum(['true', 'false'])])
    .optional()
    .transform((v) => (typeof v === 'string' ? v === 'true' : v)),
  sortBy: z.enum(['createdAt', 'workouts', 'lastLogin']).optional(),
  sortDir: z.enum(['asc', 'desc']).optional(),
});

export const listWorkoutsAdminQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
  search: z.string().optional(),
});

export const listSubscriptionsQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
  search: z.string().optional(),
  status: z
    .enum(['ACTIVE', 'PAST_DUE', 'CANCELED', 'INCOMPLETE', 'INCOMPLETE_EXPIRED', 'TRIALING', 'UNPAID'])
    .optional(),
});

export const analyticsRangeSchema = z.object({
  days: z.coerce.number().int().positive().max(365).optional().default(30),
});

// ─── Broadcasts ───────────────────────────────────────────────────────────────

const BROADCAST_SEGMENTS = ['ALL', 'PREMIUM', 'INACTIVE_7D', 'INACTIVE_14D', 'NEW_USERS_7D'] as const;
export type BroadcastSegment = typeof BROADCAST_SEGMENTS[number];

export const broadcastSchema = z.object({
  title: z.string().min(3, 'Mínimo 3 caracteres').max(100, 'Máximo 100 caracteres'),
  body: z.string().min(5, 'Mínimo 5 caracteres').max(500, 'Máximo 500 caracteres'),
  segment: z.enum(BROADCAST_SEGMENTS),
  templateKey: z.string().optional(),
});

export const broadcastPreviewQuerySchema = z.object({
  segment: z.enum(BROADCAST_SEGMENTS),
});

export const directMessageSchema = z.object({
  title: z.string().min(3, 'Mínimo 3 caracteres').max(100, 'Máximo 100 caracteres'),
  body: z.string().min(5, 'Mínimo 5 caracteres').max(500, 'Máximo 500 caracteres'),
});

export const listCampaignsQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
});

export type BanUserInput = z.infer<typeof banUserSchema>;
export type UpdateRoleInput = z.infer<typeof updateRoleSchema>;
export type BroadcastInput = z.infer<typeof broadcastSchema>;
export type DirectMessageInput = z.infer<typeof directMessageSchema>;
