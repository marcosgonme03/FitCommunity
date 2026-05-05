import request from 'supertest';
import app from '../app';

/**
 * Integration tests — Auth endpoints.
 *
 * These tests focus on:
 *  1. Input validation (422) — Zod validates before the controller touches the DB.
 *  2. Auth-guard rejections (401) on protected routes — no DB query needed.
 *
 * Register requires: email, password, username, displayName.
 * Login requires: email, password.
 *
 * Real register/login flows that need a DB are left to E2E tests
 * against a seeded test database.
 */

// ─── POST /api/auth/register — validation ─────────────────────────────────────

describe('POST /api/auth/register — input validation', () => {
  it('returns 422 when body is completely empty', async () => {
    const res = await request(app).post('/api/auth/register').send({});
    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  it('returns 422 for an invalid email format', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'not-an-email', password: 'ValidPass1', username: 'user1', displayName: 'User' });

    expect(res.status).toBe(422);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  it('returns 422 when password is too short', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'user@test.com', password: 'short', username: 'user1', displayName: 'User' });

    expect(res.status).toBe(422);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  it('returns 422 when username is missing', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'user@test.com', password: 'ValidPass1', displayName: 'User' });

    expect(res.status).toBe(422);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  it('returns 422 when displayName is missing', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'user@test.com', password: 'ValidPass1', username: 'user1' });

    expect(res.status).toBe(422);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  it('returns 422 when username contains invalid characters', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'user@test.com', password: 'ValidPass1', username: 'user name!', displayName: 'User' });

    expect(res.status).toBe(422);
  });
});

// ─── POST /api/auth/login — validation ───────────────────────────────────────

describe('POST /api/auth/login — input validation', () => {
  it('returns 422 when email is missing', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ password: 'ValidPass1' });

    expect(res.status).toBe(422);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  it('returns 422 when password is missing', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'user@test.com' });

    expect(res.status).toBe(422);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  it('returns 422 for an invalid email format', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'bad', password: 'ValidPass1' });

    expect(res.status).toBe(422);
  });
});

// ─── POST /api/auth/refresh-token — auth guard ───────────────────────────────

describe('POST /api/auth/refresh-token — without cookie', () => {
  it('returns 401 when no refresh token cookie is present', async () => {
    const res = await request(app).post('/api/auth/refresh-token');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });
});

// ─── 2FA routes — all require auth ───────────────────────────────────────────

describe('POST /api/auth/2fa/setup — auth guard', () => {
  it('returns 401 with no token', async () => {
    const res = await request(app).post('/api/auth/2fa/setup');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('returns 401 with a malformed Bearer token', async () => {
    const res = await request(app)
      .post('/api/auth/2fa/setup')
      .set('Authorization', 'Bearer not.a.valid.token');
    expect(res.status).toBe(401);
  });
});

describe('POST /api/auth/2fa/verify — auth guard', () => {
  it('returns 401 with no token', async () => {
    const res = await request(app).post('/api/auth/2fa/verify').send({ code: '123456' });
    expect(res.status).toBe(401);
  });
});

describe('POST /api/auth/2fa/disable — auth guard', () => {
  it('returns 401 with no token', async () => {
    const res = await request(app).post('/api/auth/2fa/disable').send({ password: 'ValidPass1' });
    expect(res.status).toBe(401);
  });
});

// ─── GET /api/users/me — auth guard (profile route) ──────────────────────────

describe('GET /api/users/me — auth guard', () => {
  it('returns 401 with no token', async () => {
    const res = await request(app).get('/api/users/me');
    expect(res.status).toBe(401);
  });

  it('returns 401 with an invalid token', async () => {
    const res = await request(app)
      .get('/api/users/me')
      .set('Authorization', 'Bearer invalid.token.here');
    expect(res.status).toBe(401);
  });
});
