import request from 'supertest';
import app from '../app';

/**
 * Integration tests — Notifications endpoints.
 *
 * All notification routes are protected by requireAuth, so we can verify
 * the auth-guard behaviour without touching the database.
 */

describe('GET /api/notifications — auth guard', () => {
  it('returns 401 with no token', async () => {
    const res = await request(app).get('/api/notifications');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('returns 401 with an invalid Bearer token', async () => {
    const res = await request(app)
      .get('/api/notifications')
      .set('Authorization', 'Bearer this.is.invalid');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });
});

describe('GET /api/notifications/unread-count — auth guard', () => {
  it('returns 401 with no token', async () => {
    const res = await request(app).get('/api/notifications/unread-count');
    expect(res.status).toBe(401);
  });
});

describe('PATCH /api/notifications/:id/read — auth guard', () => {
  it('returns 401 for an unauthenticated request', async () => {
    const res = await request(app)
      .patch('/api/notifications/some-notification-id/read');

    expect(res.status).toBe(401);
  });
});

describe('POST /api/notifications/mark-all-read — auth guard', () => {
  it('returns 401 for an unauthenticated request', async () => {
    const res = await request(app)
      .post('/api/notifications/mark-all-read');

    expect(res.status).toBe(401);
  });
});

describe('DELETE /api/notifications/:id — auth guard', () => {
  it('returns 401 for an unauthenticated request', async () => {
    const res = await request(app)
      .delete('/api/notifications/some-notification-id');

    expect(res.status).toBe(401);
  });
});
