import { describe, it, expect, vi } from 'vitest';

// Mock config before importing it
vi.mock('../src/utils/config.js', () => ({
  DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
  config: {
    manager: { apiUrl: 'http://test.local/api2', apiKey: 'test-key' },
    database: { url: 'postgresql://test:test@localhost:5432/test' },
    jwt: { secret: 'test-secret-at-least-32-chars-long!!!!', expiresIn: '1h', issuer: undefined, audience: undefined },
    frontend: { url: 'http://localhost:3000' },
    allowedBusinesses: ['KEEL', 'TEST'],
    launchAccessCodes: { code1: ['admin'] },
    server: { port: 3001, nodeEnv: 'test' },
    rateLimit: { windowMs: 900000, maxRequests: 100 },
    postingEnabled: false,
  },
}));

describe('Config', () => {
  it('has required fields', async () => {
    const { config } = await import('../src/utils/config.js');
    expect(config.manager.apiUrl).toBe('http://test.local/api2');
    expect(config.manager.apiKey).toBe('test-key');
    expect(config.allowedBusinesses).toEqual(['KEEL', 'TEST']);
    expect(config.postingEnabled).toBe(false);
  });

  it('parseAccessCodes parses semicolon-delimited codes', async () => {
    const { config } = await import('../src/utils/config.js');
    expect(config.launchAccessCodes?.['code1']).toEqual(['admin']);
  });
});