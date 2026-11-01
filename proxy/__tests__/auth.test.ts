import { describe, it, expect, beforeEach, vi } from 'vitest';
import { generateToken, verifyToken, hasPermission, rolesForAccessCode, ROLE_PRIVILEGE_ORDER } from '../src/middleware/auth.js';
import { config } from '../src/utils/config.js';

vi.mock('../src/utils/config.js', () => ({
  config: {
    jwt: { secret: 'test-secret-that-is-long-enough-32chars!!!', expiresIn: '1h' },
    allowedBusinesses: ['KEEL', 'TEST'],
    launchAccessCodes: { 'supersecret1': ['admin'] },
    postingEnabled: false,
  },
}));

describe('Auth middleware', () => {
  it('generates a valid JWT token', () => {
    const payload = { business: 'KEEL', userEmail: 'test@keel.com', roles: ['readonly_management'] };
    const token = generateToken(payload);
    expect(token).toBeDefined();
    expect(typeof token).toBe('string');
  });

  it('verifies a valid token', () => {
    const payload = { business: 'KEEL', userEmail: 'test@keel.com', roles: ['admin'] };
    const token = generateToken(payload);
    const verified = verifyToken(token);
    expect(verified).not.toBeNull();
    expect(verified!.business).toBe('KEEL');
    expect(verified!.roles).toContain('admin');
  });

  it('rejects a tampered token', () => {
    const token = generateToken({ business: 'KEEL', userEmail: 'a@b.c', roles: ['admin'] });
    const tampered = token.slice(0, -5) + 'XXXXX';
    expect(verifyToken(tampered)).toBeNull();
  });

  it('rejects an expired token', async () => {
    // Token with 1ms expiry is too short; use a very short expiresIn via config override
    const original = config.jwt.expiresIn;
    (config as any).jwt.expiresIn = '0.0001s';
    const payload = { business: 'KEEL', userEmail: 'a@b.c', roles: ['admin'] };
    const token = generateToken(payload);
    await new Promise(r => setTimeout(r, 50));
    (config as any).jwt.expiresIn = original;
    expect(verifyToken(token)).toBeNull();
  });

  it('ROLE_PRIVILEGE_ORDER has all expected roles', () => {
    const expected: Array<keyof typeof ROLE_PRIVILEGE_ORDER> = [
      'readonly_management', 'store_operator', 'accounts_user',
      'production_planner', 'production_supervisor', 'qc_inspector',
      'manager_approver', 'admin'
    ];
    for (const role of expected) {
      expect(ROLE_PRIVILEGE_ORDER[role]).toBeGreaterThanOrEqual(0);
    }
    expect(ROLE_PRIVILEGE_ORDER.admin).toBe(7);
    expect(ROLE_PRIVILEGE_ORDER.readonly_management).toBe(0);
  });

  it('hasPermission allows * wildcard', () => {
    expect(hasPermission(['admin'], 'anything')).toBe(true);
  });

  it('hasPermission denies missing role', () => {
    expect(hasPermission(['readonly_management'], 'transfers:create')).toBe(false);
  });

  it('rolesForAccessCode returns roles for valid code', () => {
    const roles = rolesForAccessCode('supersecret1');
    expect(roles).toContain('admin');
  });

  it('rolesForAccessCode returns empty for unknown code', () => {
    expect(rolesForAccessCode('unknown-code-999')).toEqual([]);
  });
});