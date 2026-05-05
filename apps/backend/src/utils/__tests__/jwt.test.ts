import {
  signAccessToken,
  verifyAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  decodeToken,
  AccessTokenPayload,
  RefreshTokenPayload,
} from '../jwt';

const ACCESS_PAYLOAD: AccessTokenPayload = {
  userId: 'user-123',
  email: 'test@fitcommunity.app',
  role: 'USER',
};

const REFRESH_PAYLOAD: RefreshTokenPayload = {
  userId: 'user-123',
  tokenId: 'token-abc',
};

describe('jwt utils', () => {
  // ─── Access tokens ───────────────────────────────────────────────────────────

  describe('signAccessToken / verifyAccessToken', () => {
    it('signs a token and verifies it successfully', () => {
      const token = signAccessToken(ACCESS_PAYLOAD);
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT format: header.payload.sig
    });

    it('decoded payload contains the original fields', () => {
      const token = signAccessToken(ACCESS_PAYLOAD);
      const decoded = verifyAccessToken(token);

      expect(decoded.userId).toBe(ACCESS_PAYLOAD.userId);
      expect(decoded.email).toBe(ACCESS_PAYLOAD.email);
      expect(decoded.role).toBe(ACCESS_PAYLOAD.role);
    });

    it('throws when the token is tampered with', () => {
      const token = signAccessToken(ACCESS_PAYLOAD);
      const tampered = token.slice(0, -5) + 'XXXXX';
      expect(() => verifyAccessToken(tampered)).toThrow();
    });

    it('throws with a completely invalid string', () => {
      expect(() => verifyAccessToken('not.a.token')).toThrow();
    });
  });

  // ─── Refresh tokens ──────────────────────────────────────────────────────────

  describe('signRefreshToken / verifyRefreshToken', () => {
    it('signs a refresh token and verifies it successfully', () => {
      const token = signRefreshToken(REFRESH_PAYLOAD);
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3);
    });

    it('decoded refresh payload contains userId and tokenId', () => {
      const token = signRefreshToken(REFRESH_PAYLOAD);
      const decoded = verifyRefreshToken(token);

      expect(decoded.userId).toBe(REFRESH_PAYLOAD.userId);
      expect(decoded.tokenId).toBe(REFRESH_PAYLOAD.tokenId);
    });

    it('throws when a refresh token is verified as an access token', () => {
      // Using the wrong secret must throw
      const refresh = signRefreshToken(REFRESH_PAYLOAD);
      expect(() => verifyAccessToken(refresh)).toThrow();
    });
  });

  // ─── decodeToken (unsafe) ────────────────────────────────────────────────────

  describe('decodeToken', () => {
    it('decodes without verifying — does not throw on expired/invalid sig', () => {
      const token = signAccessToken(ACCESS_PAYLOAD);
      const decoded = decodeToken(token);
      expect(decoded).not.toBeNull();
      expect((decoded as Record<string, unknown>)['userId']).toBe(ACCESS_PAYLOAD.userId);
    });

    it('returns null for a completely invalid string', () => {
      expect(decodeToken('garbage')).toBeNull();
    });
  });
});
