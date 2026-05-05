import { Prisma, UserStatus, SubscriptionStatus, BroadcastSegment } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { config } from '../config';
import { cached, invalidatePrefix } from '../utils/memoryCache';

const ADMIN_OVERVIEW_TTL_SECONDS = 30;
const ADMIN_OVERVIEW_KEY = 'admin:overview';

/** Llamar tras cualquier acción admin que pueda alterar los KPIs (ban, delete, etc.) */
export function invalidateAdminCache(): void {
  invalidatePrefix('admin:');
}

// ─── Helper: obtiene IDs de usuarios para un segmento de broadcast ────────────
async function getUserIdsForSegment(segment: BroadcastSegment): Promise<string[]> {
  const now = new Date();
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(now.getDate() - 7);
  const fourteenDaysAgo = new Date(now);
  fourteenDaysAgo.setDate(now.getDate() - 14);

  switch (segment) {
    case 'ALL': {
      const users = await prisma.user.findMany({
        where: { status: 'ACTIVE' },
        select: { id: true },
      });
      return users.map((u) => u.id);
    }
    case 'PREMIUM': {
      const users = await prisma.user.findMany({
        where: { status: 'ACTIVE', is_premium: true },
        select: { id: true },
      });
      return users.map((u) => u.id);
    }
    case 'INACTIVE_7D': {
      const users = await prisma.user.findMany({
        where: {
          status: 'ACTIVE',
          NOT: { workouts: { some: { created_at: { gte: sevenDaysAgo } } } },
        },
        select: { id: true },
      });
      return users.map((u) => u.id);
    }
    case 'INACTIVE_14D': {
      const users = await prisma.user.findMany({
        where: {
          status: 'ACTIVE',
          NOT: { workouts: { some: { created_at: { gte: fourteenDaysAgo } } } },
        },
        select: { id: true },
      });
      return users.map((u) => u.id);
    }
    case 'NEW_USERS_7D': {
      const users = await prisma.user.findMany({
        where: { status: 'ACTIVE', created_at: { gte: sevenDaysAgo } },
        select: { id: true },
      });
      return users.map((u) => u.id);
    }
    default:
      return [];
  }
}

const PREMIUM_PRICE_EUR = 4.99;

/** Construye el orderBy de Prisma para listUsers según los parámetros admitidos */
function buildUsersOrderBy(
  sortBy?: 'createdAt' | 'workouts' | 'lastLogin',
  sortDir?: 'asc' | 'desc'
): Prisma.UserOrderByWithRelationInput {
  const dir = sortDir ?? 'desc';
  switch (sortBy) {
    case 'workouts':
      return { workouts: { _count: dir } };
    case 'lastLogin':
      // nulls last en desc / nulls first en asc — Prisma lo gestiona con sortOrder
      return { last_login_at: { sort: dir, nulls: dir === 'desc' ? 'last' : 'first' } };
    case 'createdAt':
    default:
      return { created_at: dir };
  }
}

export const adminService = {
  // ─── Users ────────────────────────────────────────────────────────────────
  async listUsers(opts: {
    page: number;
    limit: number;
    search?: string;
    status?: UserStatus;
    role?: 'USER' | 'ADMIN';
    isPremium?: boolean;
    sortBy?: 'createdAt' | 'workouts' | 'lastLogin';
    sortDir?: 'asc' | 'desc';
  }) {
    const where: Prisma.UserWhereInput = {};
    if (opts.status) where.status = opts.status;
    if (opts.role) where.role = opts.role;
    if (typeof opts.isPremium === 'boolean') where.is_premium = opts.isPremium;
    if (opts.search) {
      where.OR = [
        { email: { contains: opts.search, mode: 'insensitive' } },
        { profile: { username: { contains: opts.search, mode: 'insensitive' } } },
        { profile: { display_name: { contains: opts.search, mode: 'insensitive' } } },
      ];
    }

    const skip = (opts.page - 1) * opts.limit;
    const [items, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          role: true,
          status: true,
          is_email_verified: true,
          two_fa_enabled: true,
          is_premium: true,
          created_at: true,
          last_login_at: true,
          banned_at: true,
          banned_reason: true,
          profile: {
            select: {
              username: true,
              display_name: true,
              avatar_url: true,
              experience_level: true,
              location: true,
            },
          },
          subscriptions: {
            where: { status: { in: ['ACTIVE', 'PAST_DUE', 'TRIALING'] } },
            select: {
              status: true,
              current_period_end: true,
              cancel_at_period_end: true,
            },
            orderBy: { created_at: 'desc' },
            take: 1,
          },
          _count: {
            select: { workouts: true, followers: true, following: true },
          },
        },
        orderBy: buildUsersOrderBy(opts.sortBy, opts.sortDir),
        skip,
        take: opts.limit,
      }),
      prisma.user.count({ where }),
    ]);

    return {
      items: items.map((u) => {
        const sub = u.subscriptions[0] ?? null;
        return {
          id: u.id,
          email: u.email,
          role: u.role,
          status: u.status,
          isEmailVerified: u.is_email_verified,
          twoFaEnabled: u.two_fa_enabled,
          isPremium: u.is_premium,
          subscription: sub
            ? {
                status: sub.status,
                currentPeriodEnd: sub.current_period_end,
                cancelAtPeriodEnd: sub.cancel_at_period_end,
              }
            : null,
          createdAt: u.created_at,
          lastLoginAt: u.last_login_at,
          bannedAt: u.banned_at,
          bannedReason: u.banned_reason,
          username: u.profile?.username ?? null,
          displayName: u.profile?.display_name ?? null,
          avatarUrl: u.profile?.avatar_url ?? null,
          experienceLevel: u.profile?.experience_level ?? null,
          location: u.profile?.location ?? null,
          workoutsCount: u._count.workouts,
          followersCount: u._count.followers,
          followingCount: u._count.following,
        };
      }),
      pagination: {
        page: opts.page,
        limit: opts.limit,
        total,
        totalPages: Math.ceil(total / opts.limit) || 1,
        hasNextPage: skip + items.length < total,
        hasPrevPage: opts.page > 1,
      },
    };
  },

  async banUser(adminId: string, targetUserId: string, reason: string, ip?: string) {
    if (adminId === targetUserId) return 'self' as const;
    const user = await prisma.user.findUnique({ where: { id: targetUserId } });
    if (!user) return 'not-found' as const;
    if (user.role === 'ADMIN') return 'cannot-ban-admin' as const;

    const updated = await prisma.user.update({
      where: { id: targetUserId },
      data: {
        status: 'BANNED',
        banned_at: new Date(),
        banned_reason: reason,
      },
    });

    await prisma.refreshToken.updateMany({
      where: { user_id: targetUserId, is_revoked: false },
      data: { is_revoked: true },
    });

    await prisma.adminLog.create({
      data: {
        admin_id: adminId,
        action: 'BAN_USER',
        target_type: 'user',
        target_id: targetUserId,
        metadata: { reason } as Prisma.InputJsonValue,
        ip_address: ip,
      },
    });

    return updated;
  },

  async unbanUser(adminId: string, targetUserId: string, ip?: string) {
    const user = await prisma.user.findUnique({ where: { id: targetUserId } });
    if (!user) return 'not-found' as const;

    const updated = await prisma.user.update({
      where: { id: targetUserId },
      data: {
        status: 'ACTIVE',
        banned_at: null,
        banned_reason: null,
      },
    });

    await prisma.adminLog.create({
      data: {
        admin_id: adminId,
        action: 'UNBAN_USER',
        target_type: 'user',
        target_id: targetUserId,
        ip_address: ip,
      },
    });

    return updated;
  },

  async deleteUser(adminId: string, targetUserId: string, ip?: string) {
    if (adminId === targetUserId) return 'self' as const;
    const user = await prisma.user.findUnique({ where: { id: targetUserId } });
    if (!user) return 'not-found' as const;
    if (user.role === 'ADMIN') return 'cannot-delete-admin' as const;

    await prisma.adminLog.create({
      data: {
        admin_id: adminId,
        action: 'DELETE_USER',
        target_type: 'user',
        target_id: targetUserId,
        metadata: { email: user.email } as Prisma.InputJsonValue,
        ip_address: ip,
      },
    });

    await prisma.user.delete({ where: { id: targetUserId } });
    return true;
  },

  async updateUserRole(adminId: string, targetUserId: string, role: 'USER' | 'ADMIN', ip?: string) {
    const user = await prisma.user.findUnique({ where: { id: targetUserId } });
    if (!user) return 'not-found' as const;

    const updated = await prisma.user.update({
      where: { id: targetUserId },
      data: { role },
    });

    await prisma.adminLog.create({
      data: {
        admin_id: adminId,
        action: 'UPDATE_USER_ROLE',
        target_type: 'user',
        target_id: targetUserId,
        metadata: { role } as Prisma.InputJsonValue,
        ip_address: ip,
      },
    });

    return updated;
  },

  /**
   * Activa o desactiva manualmente el flag is_premium de un usuario.
   * Útil para regalos, testing o resolver desincronizaciones puntuales.
   * NO afecta a su suscripción Stripe — solo el flag local.
   */
  async setPremium(adminId: string, targetUserId: string, isPremium: boolean, ip?: string) {
    const user = await prisma.user.findUnique({ where: { id: targetUserId } });
    if (!user) return 'not-found' as const;

    const updated = await prisma.user.update({
      where: { id: targetUserId },
      data: { is_premium: isPremium },
    });

    await prisma.adminLog.create({
      data: {
        admin_id: adminId,
        action: isPremium ? 'GRANT_PREMIUM' : 'REVOKE_PREMIUM',
        target_type: 'user',
        target_id: targetUserId,
        metadata: { email: user.email, isPremium } as Prisma.InputJsonValue,
        ip_address: ip,
      },
    });

    invalidateAdminCache();
    return updated;
  },

  /**
   * Devuelve toda la información de un usuario para el drawer de detalle:
   * perfil completo, suscripciones (incluido histórico), audit log relativo,
   * últimos entrenamientos, métricas, sesiones activas (refresh tokens).
   */
  async getUserDetails(targetUserId: string) {
    const user = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        is_email_verified: true,
        two_fa_enabled: true,
        is_premium: true,
        created_at: true,
        updated_at: true,
        last_login_at: true,
        banned_at: true,
        banned_reason: true,
        profile: {
          select: {
            username: true,
            display_name: true,
            avatar_url: true,
            bio: true,
            experience_level: true,
            location: true,
            fitness_goal: true,
            weight_kg: true,
            height_cm: true,
            is_profile_public: true,
            onboarding_completed: true,
          },
        },
        _count: {
          select: { workouts: true, followers: true, following: true },
        },
      },
    });
    if (!user) return null;

    const [
      subscriptions,
      activeSessions,
      recentWorkouts,
      auditTrail,
      workoutAggregate,
    ] = await Promise.all([
      prisma.subscription.findMany({
        where: { user_id: targetUserId },
        select: {
          id: true,
          stripe_subscription_id: true,
          stripe_customer_id: true,
          status: true,
          current_period_start: true,
          current_period_end: true,
          cancel_at_period_end: true,
          canceled_at: true,
          created_at: true,
        },
        orderBy: { created_at: 'desc' },
      }),
      prisma.refreshToken.count({
        where: {
          user_id: targetUserId,
          is_revoked: false,
          expires_at: { gt: new Date() },
        },
      }),
      prisma.workout.findMany({
        where: { user_id: targetUserId },
        select: {
          id: true,
          title: true,
          intensity: true,
          duration_min: true,
          calories: true,
          workout_date: true,
        },
        orderBy: { workout_date: 'desc' },
        take: 10,
      }),
      prisma.adminLog.findMany({
        where: { OR: [{ target_id: targetUserId }, { admin_id: targetUserId }] },
        select: {
          id: true,
          action: true,
          target_type: true,
          target_id: true,
          metadata: true,
          ip_address: true,
          created_at: true,
          admin: {
            select: {
              id: true,
              email: true,
              profile: { select: { display_name: true } },
            },
          },
        },
        orderBy: { created_at: 'desc' },
        take: 20,
      }),
      prisma.workout.aggregate({
        where: { user_id: targetUserId },
        _sum: { duration_min: true, calories: true },
      }),
    ]);

    return {
      user,
      subscriptions,
      activeSessionsCount: activeSessions,
      recentWorkouts,
      auditTrail,
      totals: {
        workoutsCount: user._count.workouts,
        totalMinutes: workoutAggregate._sum.duration_min ?? 0,
        totalCalories: workoutAggregate._sum.calories ?? 0,
        followersCount: user._count.followers,
        followingCount: user._count.following,
      },
    };
  },

  /**
   * Cierra todas las sesiones activas del usuario (revoca todos sus refresh
   * tokens). El usuario tendrá que volver a hacer login.
   */
  async forceLogoutUser(adminId: string, targetUserId: string, ip?: string) {
    const user = await prisma.user.findUnique({ where: { id: targetUserId } });
    if (!user) return 'not-found' as const;

    const result = await prisma.refreshToken.updateMany({
      where: { user_id: targetUserId, is_revoked: false },
      data: { is_revoked: true },
    });

    await prisma.adminLog.create({
      data: {
        admin_id: adminId,
        action: 'FORCE_LOGOUT',
        target_type: 'user',
        target_id: targetUserId,
        metadata: { email: user.email, sessionsRevoked: result.count } as Prisma.InputJsonValue,
        ip_address: ip,
      },
    });

    return { sessionsRevoked: result.count };
  },

  /**
   * Marca el email del usuario como verificado a mano. Útil cuando el correo
   * de verificación no llegó o el usuario lo perdió.
   */
  async forceVerifyEmail(adminId: string, targetUserId: string, ip?: string) {
    const user = await prisma.user.findUnique({ where: { id: targetUserId } });
    if (!user) return 'not-found' as const;
    if (user.is_email_verified) return 'already-verified' as const;

    const updated = await prisma.user.update({
      where: { id: targetUserId },
      data: {
        is_email_verified: true,
        // Si estaba pendiente de verificación, actívalo
        ...(user.status === 'PENDING_VERIFICATION' ? { status: 'ACTIVE' } : {}),
      },
    });

    await prisma.adminLog.create({
      data: {
        admin_id: adminId,
        action: 'VERIFY_EMAIL_MANUAL',
        target_type: 'user',
        target_id: targetUserId,
        metadata: { email: user.email } as Prisma.InputJsonValue,
        ip_address: ip,
      },
    });

    return updated;
  },

  /**
   * Resumen agregado de usuarios para mostrar en banda superior del listado:
   * total, premium, baneados, sin verificar, activos últimos 7 días.
   */
  async usersSummary() {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const [total, premium, banned, pending, active7d] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { is_premium: true } }),
      prisma.user.count({ where: { status: 'BANNED' } }),
      prisma.user.count({ where: { status: 'PENDING_VERIFICATION' } }),
      prisma.user.count({
        where: {
          OR: [
            { last_login_at: { gte: sevenDaysAgo } },
            { workouts: { some: { created_at: { gte: sevenDaysAgo } } } },
          ],
        },
      }),
    ]);
    return { total, premium, banned, pending, active7d };
  },

  /**
   * Live activity feed: mezcla los eventos más recientes de la plataforma en
   * una única lista temporal ordenada por fecha desc. Útil para que el admin
   * vea la app "en vivo" sin necesidad de WebSockets.
   *
   * Eventos incluidos: nuevos usuarios, nuevos workouts, nuevas suscripciones,
   * nuevas suscripciones canceladas, nuevos likes y nuevos comentarios.
   */
  async activityFeed(limit = 30) {
    const cap = Math.min(Math.max(limit, 5), 100);

    const [users, workouts, subs, likes, comments] = await Promise.all([
      prisma.user.findMany({
        select: {
          id: true,
          email: true,
          created_at: true,
          profile: { select: { display_name: true, username: true, avatar_url: true } },
        },
        orderBy: { created_at: 'desc' },
        take: cap,
      }),
      prisma.workout.findMany({
        select: {
          id: true,
          title: true,
          created_at: true,
          intensity: true,
          duration_min: true,
          user: {
            select: {
              id: true,
              email: true,
              profile: { select: { display_name: true, username: true, avatar_url: true } },
            },
          },
        },
        orderBy: { created_at: 'desc' },
        take: cap,
      }),
      prisma.subscription.findMany({
        select: {
          id: true,
          status: true,
          created_at: true,
          canceled_at: true,
          user: {
            select: {
              id: true,
              email: true,
              profile: { select: { display_name: true, username: true, avatar_url: true } },
            },
          },
        },
        orderBy: { created_at: 'desc' },
        take: cap,
      }),
      prisma.socialLike.findMany({
        select: {
          id: true,
          created_at: true,
          user: {
            select: {
              id: true,
              profile: { select: { display_name: true, username: true, avatar_url: true } },
            },
          },
          workout: {
            select: { id: true, title: true },
          },
        },
        orderBy: { created_at: 'desc' },
        take: cap,
      }),
      prisma.socialComment.findMany({
        select: {
          id: true,
          created_at: true,
          content: true,
          user: {
            select: {
              id: true,
              profile: { select: { display_name: true, username: true, avatar_url: true } },
            },
          },
          workout: {
            select: { id: true, title: true },
          },
        },
        orderBy: { created_at: 'desc' },
        take: cap,
      }),
    ]);

    type FeedEvent = {
      id: string;
      type: 'USER_REGISTERED' | 'WORKOUT_CREATED' | 'SUBSCRIPTION_CREATED' | 'SUBSCRIPTION_CANCELED' | 'LIKE' | 'COMMENT';
      timestamp: Date;
      actor: {
        id: string;
        displayName: string | null;
        username: string | null;
        avatarUrl: string | null;
      };
      meta: Record<string, unknown>;
    };

    const events: FeedEvent[] = [];

    for (const u of users) {
      events.push({
        id: `user-${u.id}`,
        type: 'USER_REGISTERED',
        timestamp: u.created_at,
        actor: {
          id: u.id,
          displayName: u.profile?.display_name ?? null,
          username: u.profile?.username ?? null,
          avatarUrl: u.profile?.avatar_url ?? null,
        },
        meta: { email: u.email },
      });
    }

    for (const w of workouts) {
      events.push({
        id: `workout-${w.id}`,
        type: 'WORKOUT_CREATED',
        timestamp: w.created_at,
        actor: {
          id: w.user.id,
          displayName: w.user.profile?.display_name ?? null,
          username: w.user.profile?.username ?? null,
          avatarUrl: w.user.profile?.avatar_url ?? null,
        },
        meta: {
          workoutId: w.id,
          title: w.title,
          intensity: w.intensity,
          durationMin: w.duration_min,
        },
      });
    }

    for (const s of subs) {
      // Evento de creación
      events.push({
        id: `sub-create-${s.id}`,
        type: 'SUBSCRIPTION_CREATED',
        timestamp: s.created_at,
        actor: {
          id: s.user.id,
          displayName: s.user.profile?.display_name ?? null,
          username: s.user.profile?.username ?? null,
          avatarUrl: s.user.profile?.avatar_url ?? null,
        },
        meta: { status: s.status, email: s.user.email },
      });
      // Evento extra de cancelación si aplica
      if (s.canceled_at) {
        events.push({
          id: `sub-cancel-${s.id}`,
          type: 'SUBSCRIPTION_CANCELED',
          timestamp: s.canceled_at,
          actor: {
            id: s.user.id,
            displayName: s.user.profile?.display_name ?? null,
            username: s.user.profile?.username ?? null,
            avatarUrl: s.user.profile?.avatar_url ?? null,
          },
          meta: { status: s.status, email: s.user.email },
        });
      }
    }

    for (const l of likes) {
      events.push({
        id: `like-${l.id}`,
        type: 'LIKE',
        timestamp: l.created_at,
        actor: {
          id: l.user.id,
          displayName: l.user.profile?.display_name ?? null,
          username: l.user.profile?.username ?? null,
          avatarUrl: l.user.profile?.avatar_url ?? null,
        },
        meta: { workoutId: l.workout.id, workoutTitle: l.workout.title },
      });
    }

    for (const c of comments) {
      events.push({
        id: `comment-${c.id}`,
        type: 'COMMENT',
        timestamp: c.created_at,
        actor: {
          id: c.user.id,
          displayName: c.user.profile?.display_name ?? null,
          username: c.user.profile?.username ?? null,
          avatarUrl: c.user.profile?.avatar_url ?? null,
        },
        meta: {
          workoutId: c.workout.id,
          workoutTitle: c.workout.title,
          contentPreview: c.content.slice(0, 80),
        },
      });
    }

    // Ordenar desc por timestamp y limitar
    events.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    return { items: events.slice(0, cap) };
  },

  /**
   * Exporta a CSV la lista filtrada (mismos filtros que listUsers, sin
   * paginación). Devuelve un string CSV listo para enviar al cliente.
   */
  async exportUsersCsv(opts: {
    search?: string;
    status?: UserStatus;
    role?: 'USER' | 'ADMIN';
    isPremium?: boolean;
  }): Promise<string> {
    const where: Prisma.UserWhereInput = {};
    if (opts.status) where.status = opts.status;
    if (opts.role) where.role = opts.role;
    if (typeof opts.isPremium === 'boolean') where.is_premium = opts.isPremium;
    if (opts.search) {
      where.OR = [
        { email: { contains: opts.search, mode: 'insensitive' } },
        { profile: { username: { contains: opts.search, mode: 'insensitive' } } },
        { profile: { display_name: { contains: opts.search, mode: 'insensitive' } } },
      ];
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        is_email_verified: true,
        two_fa_enabled: true,
        is_premium: true,
        created_at: true,
        last_login_at: true,
        profile: {
          select: { username: true, display_name: true, location: true, experience_level: true },
        },
        _count: { select: { workouts: true, followers: true, following: true } },
      },
      orderBy: { created_at: 'desc' },
      take: 10000, // tope de seguridad
    });

    // CSV: cabeceras + filas. Escapamos comas y comillas dobles.
    const escape = (v: unknown): string => {
      if (v === null || v === undefined) return '';
      const s = String(v);
      if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
      return s;
    };

    const headers = [
      'id', 'email', 'username', 'displayName', 'role', 'status',
      'isPremium', 'isEmailVerified', 'twoFaEnabled',
      'experienceLevel', 'location',
      'workoutsCount', 'followersCount', 'followingCount',
      'createdAt', 'lastLoginAt',
    ];
    const rows = users.map((u) => [
      u.id,
      u.email,
      u.profile?.username ?? '',
      u.profile?.display_name ?? '',
      u.role,
      u.status,
      u.is_premium ? 'true' : 'false',
      u.is_email_verified ? 'true' : 'false',
      u.two_fa_enabled ? 'true' : 'false',
      u.profile?.experience_level ?? '',
      u.profile?.location ?? '',
      u._count.workouts,
      u._count.followers,
      u._count.following,
      u.created_at.toISOString(),
      u.last_login_at?.toISOString() ?? '',
    ]);

    return [
      headers.join(','),
      ...rows.map((r) => r.map(escape).join(',')),
    ].join('\n');
  },

  // ─── Workouts moderation ──────────────────────────────────────────────────
  async listWorkouts(opts: { page: number; limit: number; search?: string }) {
    const where: Prisma.WorkoutWhereInput = {};
    if (opts.search) {
      where.OR = [
        { title: { contains: opts.search, mode: 'insensitive' } },
        { notes: { contains: opts.search, mode: 'insensitive' } },
      ];
    }

    const skip = (opts.page - 1) * opts.limit;
    const [items, total] = await Promise.all([
      prisma.workout.findMany({
        where,
        select: {
          id: true,
          title: true,
          duration_min: true,
          intensity: true,
          calories: true,
          is_public: true,
          workout_date: true,
          created_at: true,
          user: {
            select: {
              id: true,
              email: true,
              profile: {
                select: { username: true, display_name: true, avatar_url: true },
              },
            },
          },
          _count: { select: { likes: true, comments: true, reports: true, exercises: true } },
        },
        orderBy: { created_at: 'desc' },
        skip,
        take: opts.limit,
      }),
      prisma.workout.count({ where }),
    ]);

    return {
      items: items.map((w) => ({
        id: w.id,
        title: w.title,
        exercisesCount: w._count.exercises,
        durationMin: w.duration_min,
        intensity: w.intensity,
        calories: w.calories,
        isPublic: w.is_public,
        workoutDate: w.workout_date,
        createdAt: w.created_at,
        likesCount: w._count.likes,
        commentsCount: w._count.comments,
        reportsCount: w._count.reports,
        user: {
          id: w.user.id,
          email: w.user.email,
          username: w.user.profile?.username ?? null,
          displayName: w.user.profile?.display_name ?? null,
          avatarUrl: w.user.profile?.avatar_url ?? null,
        },
      })),
      pagination: {
        page: opts.page,
        limit: opts.limit,
        total,
        totalPages: Math.ceil(total / opts.limit) || 1,
        hasNextPage: skip + items.length < total,
        hasPrevPage: opts.page > 1,
      },
    };
  },

  async deleteWorkoutAdmin(adminId: string, workoutId: string, ip?: string) {
    const w = await prisma.workout.findUnique({ where: { id: workoutId } });
    if (!w) return 'not-found' as const;
    await prisma.workout.delete({ where: { id: workoutId } });
    await prisma.adminLog.create({
      data: {
        admin_id: adminId,
        action: 'DELETE_WORKOUT',
        target_type: 'workout',
        target_id: workoutId,
        ip_address: ip,
      },
    });
    return true;
  },

  // ─── Analytics ────────────────────────────────────────────────────────────
  async overview() {
    return cached(ADMIN_OVERVIEW_KEY, ADMIN_OVERVIEW_TTL_SECONDS, async () => {
      const now = new Date();
      const startOfDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
      const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(now.getDate() - 7);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(now.getDate() - 30);

    const [
      totalUsers,
      activeUsers,
      bannedUsers,
      pendingUsers,
      newUsersToday,
      newUsersThisMonth,
      totalWorkouts,
      workoutsToday,
      workoutsThisMonth,
      totalLikes,
      totalComments,
      totalCalories,
      totalMinutes,
      activeUsersLast7Days,
      // Premium / billing
      totalPremiumUsers,
      activeSubscriptions,
      pastDueSubscriptions,
      cancelingSubscriptions,
      newPremiumThisMonth,
      canceledLast30Days,
      aiConversationsTotal,
      aiConversationsThisMonth,
      generatedRoutinesTotal,
      generatedNutritionPlansTotal,
      activeRoutinesCount,
      activeRoutinesData,
      routineDownloadsAgg,
      nutritionDownloadsAgg,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { status: 'ACTIVE' } }),
      prisma.user.count({ where: { status: 'BANNED' } }),
      prisma.user.count({ where: { status: 'PENDING_VERIFICATION' } }),
      prisma.user.count({ where: { created_at: { gte: startOfDay } } }),
      prisma.user.count({ where: { created_at: { gte: startOfMonth } } }),
      prisma.workout.count(),
      prisma.workout.count({ where: { created_at: { gte: startOfDay } } }),
      prisma.workout.count({ where: { created_at: { gte: startOfMonth } } }),
      prisma.socialLike.count(),
      prisma.socialComment.count(),
      prisma.workout.aggregate({ _sum: { calories: true } }),
      prisma.workout.aggregate({ _sum: { duration_min: true } }),
      prisma.user.count({
        where: {
          OR: [
            { last_login_at: { gte: sevenDaysAgo } },
            { workouts: { some: { created_at: { gte: sevenDaysAgo } } } },
          ],
        },
      }),
      // Premium counts
      prisma.user.count({ where: { is_premium: true } }),
      prisma.subscription.count({ where: { status: 'ACTIVE' } }),
      prisma.subscription.count({ where: { status: 'PAST_DUE' } }),
      prisma.subscription.count({ where: { status: 'ACTIVE', cancel_at_period_end: true } }),
      prisma.subscription.count({
        where: { status: 'ACTIVE', created_at: { gte: startOfMonth } },
      }),
      prisma.subscription.count({
        where: { status: 'CANCELED', canceled_at: { gte: thirtyDaysAgo } },
      }),
      prisma.aiConversation.count(),
      prisma.aiConversation.count({ where: { created_at: { gte: startOfMonth } } }),
      prisma.generatedRoutine.count(),
      prisma.nutritionPlan.count(),
      // Métricas de adopción de "rutina activa" (engagement de la feature)
      prisma.generatedRoutine.count({ where: { is_active: true } }),
      prisma.generatedRoutine.findMany({
        where: { is_active: true },
        select: { current_day_idx: true, days_per_week: true, started_at: true },
      }),
      // Total de PDFs descargados (rutinas + dietas)
      prisma.generatedRoutine.aggregate({ _sum: { download_count: true } }),
      prisma.nutritionPlan.aggregate({ _sum: { download_count: true } }),
    ]);

    const mrrEur = activeSubscriptions * PREMIUM_PRICE_EUR;
    const arrEur = mrrEur * 12;
    const conversionRate = totalUsers > 0 ? (totalPremiumUsers / totalUsers) * 100 : 0;
    // Churn aprox = cancelled in last 30d / (active + cancelled in last 30d)
    const churnDenominator = activeSubscriptions + canceledLast30Days;
    const churnRate30d = churnDenominator > 0 ? (canceledLast30Days / churnDenominator) * 100 : 0;

    // Métricas de "rutina activa": adopción y progreso medio
    const activeRoutineAdoptionRate = totalPremiumUsers > 0
      ? (activeRoutinesCount / totalPremiumUsers) * 100
      : 0;
    const avgRoutineProgress = activeRoutinesData.length > 0
      ? activeRoutinesData.reduce((sum, r) => sum + r.current_day_idx, 0) / activeRoutinesData.length
      : 0;

    // PDFs descargados (engagement de la feature export)
    const routineDownloads = routineDownloadsAgg._sum.download_count ?? 0;
    const nutritionDownloads = nutritionDownloadsAgg._sum.download_count ?? 0;
    const totalPdfDownloads = routineDownloads + nutritionDownloads;

    return {
      users: {
        total: totalUsers,
        active: activeUsers,
        banned: bannedUsers,
        pendingVerification: pendingUsers,
        newToday: newUsersToday,
        newThisMonth: newUsersThisMonth,
        activeLast7Days: activeUsersLast7Days,
      },
      workouts: {
        total: totalWorkouts,
        today: workoutsToday,
        thisMonth: workoutsThisMonth,
        totalCalories: totalCalories._sum.calories ?? 0,
        totalMinutes: totalMinutes._sum.duration_min ?? 0,
      },
      engagement: {
        totalLikes,
        totalComments,
        avgWorkoutsPerUser: totalUsers > 0 ? +(totalWorkouts / totalUsers).toFixed(1) : 0,
      },
      premium: {
        totalPremiumUsers,
        activeSubscriptions,
        pastDueSubscriptions,
        cancelingSubscriptions,
        newPremiumThisMonth,
        canceledLast30Days,
        mrrEur: +mrrEur.toFixed(2),
        arrEur: +arrEur.toFixed(2),
        priceEur: PREMIUM_PRICE_EUR,
        conversionRate: +conversionRate.toFixed(2),
        churnRate30d: +churnRate30d.toFixed(2),
      },
      ai: {
        conversationsTotal: aiConversationsTotal,
        conversationsThisMonth: aiConversationsThisMonth,
        generatedRoutines: generatedRoutinesTotal,
        nutritionPlans: generatedNutritionPlansTotal,
        // Engagement de la feature "rutina activa"
        activeRoutines: activeRoutinesCount,
        activeRoutineAdoptionRate: +activeRoutineAdoptionRate.toFixed(1),
        avgRoutineDayProgress: +avgRoutineProgress.toFixed(1),
        // PDFs descargados
        pdfDownloadsTotal: totalPdfDownloads,
        pdfDownloadsRoutines: routineDownloads,
        pdfDownloadsNutrition: nutritionDownloads,
      },
      system: {
        stripeConfigured: !!config.STRIPE_SECRET_KEY && !!config.STRIPE_PRICE_ID,
        webhookConfigured: !!config.STRIPE_WEBHOOK_SECRET,
        aiConfigured: !!config.GROQ_API_KEY,
        aiModel: config.GROQ_MODEL,
      },
      };
    });
  },

  // ─── Subscriptions (Premium) ──────────────────────────────────────────────
  async listSubscriptions(opts: {
    page: number;
    limit: number;
    status?: SubscriptionStatus;
    search?: string;
  }) {
    const where: Prisma.SubscriptionWhereInput = {};
    if (opts.status) where.status = opts.status;
    if (opts.search) {
      where.user = {
        OR: [
          { email: { contains: opts.search, mode: 'insensitive' } },
          { profile: { username: { contains: opts.search, mode: 'insensitive' } } },
          { profile: { display_name: { contains: opts.search, mode: 'insensitive' } } },
        ],
      };
    }

    const skip = (opts.page - 1) * opts.limit;
    const [items, total] = await Promise.all([
      prisma.subscription.findMany({
        where,
        select: {
          id: true,
          stripe_subscription_id: true,
          stripe_customer_id: true,
          stripe_price_id: true,
          status: true,
          current_period_start: true,
          current_period_end: true,
          cancel_at_period_end: true,
          canceled_at: true,
          created_at: true,
          updated_at: true,
          user: {
            select: {
              id: true,
              email: true,
              created_at: true,
              profile: {
                select: { username: true, display_name: true, avatar_url: true },
              },
            },
          },
        },
        orderBy: [{ status: 'asc' }, { created_at: 'desc' }],
        skip,
        take: opts.limit,
      }),
      prisma.subscription.count({ where }),
    ]);

    return {
      items: items.map((s) => ({
        id: s.id,
        stripeSubscriptionId: s.stripe_subscription_id,
        stripeCustomerId: s.stripe_customer_id,
        stripePriceId: s.stripe_price_id,
        status: s.status,
        currentPeriodStart: s.current_period_start,
        currentPeriodEnd: s.current_period_end,
        cancelAtPeriodEnd: s.cancel_at_period_end,
        canceledAt: s.canceled_at,
        createdAt: s.created_at,
        updatedAt: s.updated_at,
        priceEur: PREMIUM_PRICE_EUR,
        user: {
          id: s.user.id,
          email: s.user.email,
          username: s.user.profile?.username ?? null,
          displayName: s.user.profile?.display_name ?? null,
          avatarUrl: s.user.profile?.avatar_url ?? null,
          memberSince: s.user.created_at,
        },
      })),
      pagination: {
        page: opts.page,
        limit: opts.limit,
        total,
        totalPages: Math.ceil(total / opts.limit) || 1,
        hasNextPage: skip + items.length < total,
        hasPrevPage: opts.page > 1,
      },
    };
  },

  async revenueGrowth(days = 30) {
    const start = new Date();
    start.setUTCHours(0, 0, 0, 0);
    start.setUTCDate(start.getUTCDate() - days);

    const subs = await prisma.subscription.findMany({
      where: {
        OR: [
          { created_at: { gte: start } },
          { canceled_at: { gte: start } },
        ],
      },
      select: {
        created_at: true,
        canceled_at: true,
        status: true,
      },
    });

    // Para cada día calculamos: nuevos premium ese día y nuevos cancelados ese día.
    const buckets: Array<{
      date: string;
      newSubs: number;
      canceled: number;
      revenueEur: number;
    }> = [];

    for (let i = 0; i < days; i++) {
      const d = new Date(start);
      d.setUTCDate(d.getUTCDate() + i);
      const next = new Date(d);
      next.setUTCDate(next.getUTCDate() + 1);

      const newSubs = subs.filter((s) => s.created_at >= d && s.created_at < next).length;
      const canceled = subs.filter(
        (s) => s.canceled_at && s.canceled_at >= d && s.canceled_at < next
      ).length;

      buckets.push({
        date: d.toISOString().slice(0, 10),
        newSubs,
        canceled,
        revenueEur: +(newSubs * PREMIUM_PRICE_EUR).toFixed(2),
      });
    }

    return { points: buckets };
  },

  async usersGrowth(days = 30) {
    const start = new Date();
    start.setUTCHours(0, 0, 0, 0);
    start.setUTCDate(start.getUTCDate() - days);

    const users = await prisma.user.findMany({
      where: { created_at: { gte: start } },
      select: { created_at: true },
      orderBy: { created_at: 'asc' },
    });

    const buckets: Array<{ date: string; count: number }> = [];
    for (let i = 0; i < days; i++) {
      const d = new Date(start);
      d.setUTCDate(d.getUTCDate() + i);
      const next = new Date(d);
      next.setUTCDate(next.getUTCDate() + 1);
      const count = users.filter((u) => u.created_at >= d && u.created_at < next).length;
      buckets.push({ date: d.toISOString().slice(0, 10), count });
    }
    return { points: buckets };
  },

  async workoutsStats(days = 30) {
    const start = new Date();
    start.setUTCHours(0, 0, 0, 0);
    start.setUTCDate(start.getUTCDate() - days);

    const [byMuscleRaw, byDay] = await Promise.all([
      prisma.$queryRaw<Array<{ muscle: string; count: bigint }>>`
        SELECT e.primary_muscle::text as muscle, COUNT(DISTINCT we.id)::bigint as count
        FROM workout_exercises we
        INNER JOIN exercises e ON e.id = we.exercise_id
        GROUP BY e.primary_muscle
        ORDER BY count DESC
        LIMIT 12
      `,
      prisma.workout.findMany({
        where: { created_at: { gte: start } },
        select: { created_at: true, duration_min: true, calories: true },
      }),
    ]);

    const buckets: Array<{ date: string; count: number; minutes: number; calories: number }> = [];
    for (let i = 0; i < days; i++) {
      const d = new Date(start);
      d.setUTCDate(d.getUTCDate() + i);
      const next = new Date(d);
      next.setUTCDate(next.getUTCDate() + 1);
      const matched = byDay.filter((w) => w.created_at >= d && w.created_at < next);
      buckets.push({
        date: d.toISOString().slice(0, 10),
        count: matched.length,
        minutes: matched.reduce((s, w) => s + w.duration_min, 0),
        calories: matched.reduce((s, w) => s + (w.calories ?? 0), 0),
      });
    }

    return {
      byMuscle: byMuscleRaw.map((m) => ({
        muscle: m.muscle,
        count: Number(m.count),
      })),
      byDay: buckets,
    };
  },

  // ─── Broadcasts ───────────────────────────────────────────────────────────

  /**
   * Cuántos usuarios recibirán el mensaje según el segmento elegido.
   * Se usa para mostrar el preview antes de confirmar el envío.
   */
  async previewBroadcast(segment: BroadcastSegment): Promise<{ count: number }> {
    const ids = await getUserIdsForSegment(segment);
    return { count: ids.length };
  },

  /**
   * Crea una notificación SYSTEM para cada usuario del segmento
   * usando createMany (una sola query, no N inserts).
   * Guarda el historial en BroadcastCampaign y lo loggea en AdminLog.
   */
  async sendBroadcast(
    adminId: string,
    input: { title: string; body: string; segment: BroadcastSegment; templateKey?: string },
    ip?: string
  ) {
    const userIds = await getUserIdsForSegment(input.segment);
    if (userIds.length === 0) return { recipients: 0, campaignId: null };

    await prisma.notification.createMany({
      data: userIds.map((userId) => ({
        user_id: userId,
        sender_id: null,
        type: 'SYSTEM' as const,
        title: input.title,
        body: input.body,
        entity_type: 'broadcast',
      })),
    });

    const campaign = await prisma.broadcastCampaign.create({
      data: {
        admin_id: adminId,
        title: input.title,
        body: input.body,
        segment: input.segment,
        recipients: userIds.length,
        template_key: input.templateKey ?? null,
      },
    });

    await prisma.adminLog.create({
      data: {
        admin_id: adminId,
        action: 'BROADCAST_NOTIFICATION',
        target_type: 'notification',
        target_id: campaign.id,
        metadata: {
          segment: input.segment,
          recipients: userIds.length,
          title: input.title,
          templateKey: input.templateKey ?? null,
        } as Prisma.InputJsonValue,
        ip_address: ip,
      },
    });

    return { recipients: userIds.length, campaignId: campaign.id };
  },

  /**
   * Envía un mensaje directo a un usuario específico.
   * Aparece como notificación SYSTEM en su campana.
   */
  async sendDirectMessage(
    adminId: string,
    targetUserId: string,
    input: { title: string; body: string },
    ip?: string
  ) {
    const user = await prisma.user.findUnique({ where: { id: targetUserId } });
    if (!user) return 'not-found' as const;

    await prisma.notification.create({
      data: {
        user_id: targetUserId,
        sender_id: null,
        type: 'SYSTEM',
        title: input.title,
        body: input.body,
        entity_type: 'direct_message',
      },
    });

    await prisma.adminLog.create({
      data: {
        admin_id: adminId,
        action: 'DIRECT_MESSAGE',
        target_type: 'user',
        target_id: targetUserId,
        metadata: { title: input.title } as Prisma.InputJsonValue,
        ip_address: ip,
      },
    });

    return true;
  },

  /**
   * Historial de campañas de broadcast enviadas.
   */
  async listCampaigns(opts: { page: number; limit: number }) {
    const skip = (opts.page - 1) * opts.limit;
    const [items, total] = await Promise.all([
      prisma.broadcastCampaign.findMany({
        select: {
          id: true,
          title: true,
          body: true,
          segment: true,
          recipients: true,
          template_key: true,
          created_at: true,
          admin: {
            select: {
              id: true,
              email: true,
              profile: { select: { username: true, display_name: true } },
            },
          },
        },
        orderBy: { created_at: 'desc' },
        skip,
        take: opts.limit,
      }),
      prisma.broadcastCampaign.count(),
    ]);

    return {
      items,
      pagination: {
        page: opts.page,
        limit: opts.limit,
        total,
        totalPages: Math.ceil(total / opts.limit) || 1,
        hasNextPage: skip + items.length < total,
        hasPrevPage: opts.page > 1,
      },
    };
  },

  async listAdminLogs(page = 1, limit = 50) {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      prisma.adminLog.findMany({
        select: {
          id: true,
          action: true,
          target_type: true,
          target_id: true,
          metadata: true,
          ip_address: true,
          created_at: true,
          admin: {
            select: {
              id: true,
              email: true,
              profile: {
                select: { username: true, display_name: true },
              },
            },
          },
        },
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
      }),
      prisma.adminLog.count(),
    ]);
    return { items, total, page, limit };
  },
};
