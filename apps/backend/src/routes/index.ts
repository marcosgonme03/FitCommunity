import { Router } from 'express';
import { generalRateLimiter } from '../middleware/rateLimiter';
import authRoutes from './auth.routes';
import usersRoutes from './users.routes';
import workoutsRoutes from './workouts.routes';
import exercisesRoutes from './exercises.routes';
import feedRoutes from './feed.routes';
import adminRoutes from './admin.routes';
import billingRoutes from './billing.routes';
import aiRoutes from './ai.routes';
import notificationsRoutes from './notifications.routes';

export const apiRouter = Router();

// Apply general rate limiter to all API routes
apiRouter.use(generalRateLimiter);

// Mount route modules
apiRouter.use('/auth', authRoutes);
apiRouter.use('/users', usersRoutes);
apiRouter.use('/workouts', workoutsRoutes);
apiRouter.use('/exercises', exercisesRoutes);
apiRouter.use('/feed', feedRoutes);
apiRouter.use('/admin', adminRoutes);
apiRouter.use('/billing', billingRoutes);
apiRouter.use('/ai', aiRoutes);
apiRouter.use('/notifications', notificationsRoutes);
