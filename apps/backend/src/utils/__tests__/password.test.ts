import { hashPassword, comparePassword, validatePasswordStrength } from '../password';

describe('password utils', () => {
  // ─── hashPassword ────────────────────────────────────────────────────────────

  describe('hashPassword', () => {
    it('returns a bcrypt hash (starts with $2b$)', async () => {
      const hash = await hashPassword('MySecret1');
      expect(hash).toMatch(/^\$2[ab]\$/);
    });

    it('produces a different hash each call (random salt)', async () => {
      const h1 = await hashPassword('MySecret1');
      const h2 = await hashPassword('MySecret1');
      expect(h1).not.toBe(h2);
    });
  });

  // ─── comparePassword ─────────────────────────────────────────────────────────

  describe('comparePassword', () => {
    it('returns true for the correct password', async () => {
      const hash = await hashPassword('Correct1');
      expect(await comparePassword('Correct1', hash)).toBe(true);
    });

    it('returns false for an incorrect password', async () => {
      const hash = await hashPassword('Correct1');
      expect(await comparePassword('Wrong1', hash)).toBe(false);
    });

    it('returns false for an empty string', async () => {
      const hash = await hashPassword('Correct1');
      expect(await comparePassword('', hash)).toBe(false);
    });
  });

  // ─── validatePasswordStrength ────────────────────────────────────────────────

  describe('validatePasswordStrength', () => {
    it('returns null for a valid strong password', () => {
      expect(validatePasswordStrength('StrongPass1')).toBeNull();
    });

    it('rejects passwords shorter than 8 characters', () => {
      const result = validatePasswordStrength('Ab1');
      expect(result).toContain('8 caracteres');
    });

    it('rejects passwords without an uppercase letter', () => {
      const result = validatePasswordStrength('lowercase1');
      expect(result).toContain('mayúscula');
    });

    it('rejects passwords without a lowercase letter', () => {
      const result = validatePasswordStrength('UPPERCASE1');
      expect(result).toContain('minúscula');
    });

    it('rejects passwords without a number', () => {
      const result = validatePasswordStrength('NoNumbers!');
      expect(result).toContain('número');
    });

    it('accepts exactly 8 chars with all requirements met', () => {
      expect(validatePasswordStrength('Secure1!')).toBeNull();
    });
  });
});
