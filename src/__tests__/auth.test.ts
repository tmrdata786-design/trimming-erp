import { describe, it, expect, beforeEach } from 'vitest';
import { getAuth, setAuth, clearAuth, isAuthenticated, readLaunchContext } from '../services/managerApi';

describe('Frontend auth utilities', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('getAuth returns null when no auth stored', () => {
    expect(getAuth()).toBeNull();
  });

  it('setAuth and getAuth round-trip', () => {
    setAuth({ token: 'test-token', business: 'KEEL', roles: ['admin'] });
    const auth = getAuth();
    expect(auth).not.toBeNull();
    expect(auth!.token).toBe('test-token');
    expect(auth!.business).toBe('KEEL');
  });

  it('clearAuth removes stored auth', () => {
    setAuth({ token: 'test', business: 'KEEL', roles: ['admin'] });
    clearAuth();
    expect(getAuth()).toBeNull();
  });

  it('isAuthenticated returns false when no auth', () => {
    expect(isAuthenticated()).toBe(false);
  });

  it('isAuthenticated returns true when auth stored', () => {
    setAuth({ token: 'test', business: 'KEEL', roles: ['admin'] });
    expect(isAuthenticated()).toBe(true);
  });
});

describe('readLaunchContext', () => {
  it('returns empty object when no query string', () => {
    expect(readLaunchContext('')).toEqual({
      business: undefined,
      entity: undefined,
      key: undefined,
      userEmail: undefined,
    });
  });

  it('parses Manager.io Custom Button params', () => {
    const ctx = readLaunchContext('?business=KEEL&entity=ProductionOrder&key=abc-123&userEmail=ops%40keel.pk');
    expect(ctx.business).toBe('KEEL');
    expect(ctx.entity).toBe('ProductionOrder');
    expect(ctx.key).toBe('abc-123');
    expect(ctx.userEmail).toBe('ops@keel.pk');
  });

  it('accepts alternate casings', () => {
    const ctx = readLaunchContext('?Business=KEEL&Entity=Item&Key=xyz');
    expect(ctx.business).toBe('KEEL');
    expect(ctx.entity).toBe('Item');
    expect(ctx.key).toBe('xyz');
  });
});