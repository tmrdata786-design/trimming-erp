import { describe, it, expect, beforeEach } from 'vitest';
import { getAuth, setAuth, clearAuth, isAuthenticated } from '../services/managerApi';

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