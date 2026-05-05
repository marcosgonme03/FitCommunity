import swaggerJsdoc from 'swagger-jsdoc';
import { config } from '../config';

/**
 * OpenAPI 3.0 spec autogenerada desde anotaciones JSDoc en los routers.
 *
 * Para añadir un endpoint a la documentación, anota la ruta con un bloque
 * `@openapi` en el router correspondiente.
 */
const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'FitCommunity API',
      version: '1.0.0',
      description: `
API REST de FitCommunity — app de gimnasio con seguimiento de entrenamientos,
comunidad social, panel admin y plan Premium con IA.

**Stack:** Node.js + Express + TypeScript + Prisma + PostgreSQL.

### Autenticación
La mayoría de endpoints requieren JWT en el header \`Authorization: Bearer <token>\`.
El refresh token se gestiona con cookie httpOnly. Endpoints de auth no requieren token.

### Convenciones de respuesta
- **Éxito:** \`{ success: true, data: {...}, meta?: {...} }\`
- **Error:** \`{ success: false, error: 'mensaje', code: 'CODE' }\`
- **Paginación:** \`{ data: [...], meta: { pagination: { page, limit, total, totalPages, hasNextPage, hasPrevPage } } }\`

### Rate limiting
- Endpoints generales: 100 req / 15 min
- Endpoints de auth: 20 req / 15 min
- Endpoints sensibles (reset password, 2FA): 5 req / 1 hora
      `.trim(),
      contact: {
        name: 'Marcos González',
        email: 'marcos@fitcommunity.com',
      },
      license: {
        name: 'MIT',
      },
    },
    servers: [
      {
        url: config.API_URL + '/api',
        description: 'Servidor actual',
      },
      {
        url: 'http://localhost:3001/api',
        description: 'Desarrollo local',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT obtenido en POST /auth/login. Caduca en 15 min.',
        },
        cookieAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'refreshToken',
          description: 'Refresh token httpOnly, se setea automáticamente al hacer login.',
        },
      },
      schemas: {
        ApiResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            data: { type: 'object' },
            message: { type: 'string', example: 'Operación realizada' },
          },
        },
        ApiError: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: { type: 'string', example: 'No autenticado' },
            code: { type: 'string', example: 'UNAUTHORIZED' },
          },
        },
        Pagination: {
          type: 'object',
          properties: {
            page: { type: 'integer', example: 1 },
            limit: { type: 'integer', example: 20 },
            total: { type: 'integer', example: 137 },
            totalPages: { type: 'integer', example: 7 },
            hasNextPage: { type: 'boolean', example: true },
            hasPrevPage: { type: 'boolean', example: false },
          },
        },
        User: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            email: { type: 'string', format: 'email' },
            role: { type: 'string', enum: ['USER', 'ADMIN'] },
            isPremium: { type: 'boolean' },
            isEmailVerified: { type: 'boolean' },
            twoFaEnabled: { type: 'boolean' },
            createdAt: { type: 'string', format: 'date-time' },
            profile: { $ref: '#/components/schemas/UserProfile' },
          },
        },
        UserProfile: {
          type: 'object',
          properties: {
            username: { type: 'string', example: 'alex_lifts' },
            displayName: { type: 'string', example: 'Alex Hernández' },
            bio: { type: 'string', nullable: true },
            avatarUrl: { type: 'string', format: 'uri', nullable: true },
            heightCm: { type: 'integer', nullable: true, example: 178 },
            weightKg: { type: 'number', nullable: true, example: 85 },
            fitnessGoal: {
              type: 'string',
              enum: ['LOSE_WEIGHT', 'GAIN_MUSCLE', 'IMPROVE_STRENGTH', 'STAY_HEALTHY', 'RECOMP', 'POWERLIFTING', 'HYPERTROPHY'],
            },
            experienceLevel: {
              type: 'string',
              enum: ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'PROFESSIONAL'],
            },
            location: { type: 'string', nullable: true },
            onboardingCompleted: { type: 'boolean' },
          },
        },
        Workout: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            userId: { type: 'string', format: 'uuid' },
            title: { type: 'string', example: 'Push Day · Pecho y hombros' },
            notes: { type: 'string', nullable: true },
            durationMin: { type: 'integer', example: 60 },
            intensity: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH', 'MAX'] },
            calories: { type: 'integer', nullable: true },
            workoutDate: { type: 'string', format: 'date-time' },
            isPublic: { type: 'boolean' },
            exercises: {
              type: 'array',
              items: { $ref: '#/components/schemas/WorkoutExercise' },
            },
          },
        },
        WorkoutExercise: {
          type: 'object',
          properties: {
            exerciseId: { type: 'string', format: 'uuid' },
            orderIdx: { type: 'integer' },
            notes: { type: 'string', nullable: true },
            sets: {
              type: 'array',
              items: { $ref: '#/components/schemas/WorkoutSet' },
            },
          },
        },
        WorkoutSet: {
          type: 'object',
          properties: {
            setNumber: { type: 'integer', example: 1 },
            reps: { type: 'integer', example: 8 },
            weightKg: { type: 'number', nullable: true, example: 80 },
            rpe: { type: 'integer', nullable: true, minimum: 1, maximum: 10 },
            isWarmup: { type: 'boolean' },
            isFailure: { type: 'boolean' },
            restSec: { type: 'integer', nullable: true },
          },
        },
        Notification: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            type: {
              type: 'string',
              enum: ['LIKE', 'COMMENT', 'FOLLOW', 'PR_ACHIEVED', 'BADGE_EARNED', 'SYSTEM'],
            },
            title: { type: 'string' },
            body: { type: 'string', nullable: true },
            entity_id: { type: 'string', nullable: true },
            entity_type: { type: 'string', nullable: true },
            is_read: { type: 'boolean' },
            created_at: { type: 'string', format: 'date-time' },
          },
        },
        PersonalRecord: {
          type: 'object',
          properties: {
            exerciseId: { type: 'string', format: 'uuid' },
            exerciseName: { type: 'string', example: 'Press banca con barra' },
            primaryMuscle: { type: 'string', example: 'CHEST' },
            equipment: { type: 'string', example: 'BARBELL' },
            maxWeight: { type: 'number', example: 100 },
            repsAtMax: { type: 'integer', example: 5 },
            estimatedOneRm: { type: 'number', example: 116.7 },
            achievedAt: { type: 'string', format: 'date-time' },
            timesPerformed: { type: 'integer', example: 18 },
          },
        },
      },
      responses: {
        Unauthorized: {
          description: 'No autenticado o token inválido',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ApiError' },
              example: { success: false, error: 'No autenticado', code: 'UNAUTHORIZED' },
            },
          },
        },
        Forbidden: {
          description: 'Sin permisos para esta operación',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ApiError' },
              example: { success: false, error: 'Sin permisos', code: 'FORBIDDEN' },
            },
          },
        },
        NotFound: {
          description: 'Recurso no encontrado',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ApiError' },
              example: { success: false, error: 'Recurso no encontrado', code: 'NOT_FOUND' },
            },
          },
        },
        ValidationError: {
          description: 'Datos de entrada inválidos',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ApiError' },
              example: { success: false, error: 'Email inválido', code: 'VALIDATION_ERROR' },
            },
          },
        },
        RateLimit: {
          description: 'Límite de peticiones excedido',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ApiError' },
              example: { success: false, error: 'Demasiadas peticiones', code: 'RATE_LIMIT' },
            },
          },
        },
      },
    },
    security: [{ bearerAuth: [] }],
    tags: [
      { name: 'Auth', description: 'Registro, login, refresh, logout, 2FA, password reset, verificación email' },
      { name: 'Users', description: 'Gestión de perfil propio y consulta de perfiles públicos' },
      { name: 'Workouts', description: 'CRUD de entrenamientos, series, ejercicios, calendario, PRs' },
      { name: 'Exercises', description: 'Catálogo de ejercicios oficiales y personalizados' },
      { name: 'Social', description: 'Feed, likes, comentarios, follows, sugerencias' },
      { name: 'Notifications', description: 'Notificaciones del usuario (likes, follows, comments, system)' },
      { name: 'Billing', description: 'Stripe Checkout, suscripciones Premium, webhooks' },
      { name: 'AI', description: 'Coach IA, generación de rutinas y planes nutricionales con Groq + Llama 3.3' },
      { name: 'Admin', description: 'Endpoints exclusivos para administradores' },
      { name: 'Health', description: 'Health checks y monitorización' },
    ],
  },
  apis: [
    './src/routes/*.ts',
    './src/controllers/*.ts',
  ],
};

export const swaggerSpec = swaggerJsdoc(options);
