import { z } from 'zod';

export const commentSchema = z.object({
  content: z.string().min(1, 'El comentario no puede estar vacío').max(1000, 'Máximo 1000 caracteres'),
});

export const feedQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().positive().max(50).optional().default(20),
});

export type CommentInput = z.infer<typeof commentSchema>;
export type FeedQuery = z.infer<typeof feedQuerySchema>;
