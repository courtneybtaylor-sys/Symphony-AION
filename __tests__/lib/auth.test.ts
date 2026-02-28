/**
 * Phase 4a/5b: Authentication Tests
 */

import bcrypt from 'bcryptjs';

describe('Authentication', () => {
  describe('Password Hashing', () => {
    it('hashes passwords with bcrypt', async () => {
      const password = 'securepassword123';
      const hash = await bcrypt.hash(password, 12);

      expect(hash).not.toBe(password);
      expect(hash.startsWith('$2a$') || hash.startsWith('$2b$')).toBe(true);
    });

    it('verifies correct passwords', async () => {
      const password = 'securepassword123';
      const hash = await bcrypt.hash(password, 12);
      const isValid = await bcrypt.compare(password, hash);

      expect(isValid).toBe(true);
    });

    it('rejects incorrect passwords', async () => {
      const hash = await bcrypt.hash('correctpassword', 12);
      const isValid = await bcrypt.compare('wrongpassword', hash);

      expect(isValid).toBe(false);
    });

    it('produces different hashes for same password', async () => {
      const password = 'samepassword';
      const hash1 = await bcrypt.hash(password, 12);
      const hash2 = await bcrypt.hash(password, 12);

      expect(hash1).not.toBe(hash2);
      // But both should validate
      expect(await bcrypt.compare(password, hash1)).toBe(true);
      expect(await bcrypt.compare(password, hash2)).toBe(true);
    });
  });

  describe('Signup Validation', () => {
    it('requires email', () => {
      const { z } = require('zod');
      const schema = z.object({
        email: z.string().email(),
        password: z.string().min(8),
      });

      const result = schema.safeParse({ password: 'password123' });
      expect(result.success).toBe(false);
    });

    it('requires password >= 8 characters', () => {
      const { z } = require('zod');
      const schema = z.object({
        email: z.string().email(),
        password: z.string().min(8),
      });

      const result = schema.safeParse({
        email: 'test@example.com',
        password: 'short',
      });
      expect(result.success).toBe(false);
    });

    it('accepts valid signup data', () => {
      const { z } = require('zod');
      const schema = z.object({
        email: z.string().email(),
        password: z.string().min(8),
        name: z.string().optional(),
      });

      const result = schema.safeParse({
        email: 'test@example.com',
        password: 'securepassword123',
        name: 'Test User',
      });
      expect(result.success).toBe(true);
    });
  });
});
