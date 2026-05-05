import request from 'supertest';
import app from '../app';

/**
 * Integration test — GET /api/health
 * No database or Redis connection needed; the endpoint is a pure in-memory check.
 */
describe('GET /api/health', () => {
  it('returns 200 with success: true and status: "ok"', async () => {
    const res = await request(app).get('/api/health');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('ok');
  });

  it('response body includes env and timestamp fields', async () => {
    const res = await request(app).get('/api/health');

    expect(res.body.data).toHaveProperty('env');
    expect(res.body.data).toHaveProperty('timestamp');
    // timestamp should be a valid ISO-8601 string
    expect(() => new Date(res.body.data.timestamp)).not.toThrow();
  });

  it('sets NODE_ENV to "test" in the test environment', async () => {
    const res = await request(app).get('/api/health');
    expect(res.body.data.env).toBe('test');
  });
});

describe('GET /api/nonexistent-route', () => {
  it('returns 404 with NOT_FOUND code for unknown routes', async () => {
    const res = await request(app).get('/api/this-route-does-not-exist');

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('NOT_FOUND');
  });
});
