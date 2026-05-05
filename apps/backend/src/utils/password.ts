import bcrypt from 'bcryptjs';
import { config } from '../config';

/**
 * Hash a plain-text password
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, config.BCRYPT_SALT_ROUNDS);
}

/**
 * Compare a plain-text password against a hash
 */
export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Validate password strength
 * Returns null if valid, or an error message if not
 */
export function validatePasswordStrength(password: string): string | null {
  if (password.length < 8) return 'La contraseña debe tener al menos 8 caracteres';
  if (!/[A-Z]/.test(password)) return 'La contraseña debe contener al menos una mayúscula';
  if (!/[a-z]/.test(password)) return 'La contraseña debe contener al menos una minúscula';
  if (!/\d/.test(password)) return 'La contraseña debe contener al menos un número';
  return null;
}
