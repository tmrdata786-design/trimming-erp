import dotenv from 'dotenv';
dotenv.config();

// Parse comma-separated values safely
function parseCommaList(value: string | undefined): string[] {
  if (!value) return [];
  return value.split(',').map(s => s.trim()).filter(Boolean);
}

function parseAccessCodes(): Record<string, string[]> | undefined {
  const raw = process.env.LAUNCH_ACCESS_CODES;
  if (!raw) return undefined;
  // Format: "code1:role1,role2;code2:role3"
  const result: Record<string, string[]> = {};
  for (const entry of raw.split(';')) {
    const [code, roles] = entry.split(':');
    if (code && roles) {
      result[code.trim()] = roles.split(',').map(r => r.trim());
    }
  }
  return Object.keys(result).length > 0 ? result : undefined;
}

export const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/trimming_erp';

export const config = {
  manager: {
    apiUrl: process.env.MANAGER_API_URL || 'http://promoerp.promoerp.it/api2',
    apiKey: process.env.MANAGER_API_KEY || '',
  },
  database: {
    url: DATABASE_URL,
  },
  jwt: {
    secret: process.env.JWT_SECRET || '',
    expiresIn: process.env.JWT_EXPIRES_IN || '8h',
    issuer: process.env.JWT_ISSUER || undefined,
    audience: process.env.JWT_AUDIENCE || undefined,
  },
  frontend: {
    url: process.env.FRONTEND_URL || 'http://localhost:3000',
  },
  allowedBusinesses: parseCommaList(process.env.ALLOWED_BUSINESSES) || ['KEEL'],
  launchAccessCodes: parseAccessCodes(),
  server: {
    port: parseInt(process.env.PORT || '3001', 10),
    nodeEnv: process.env.NODE_ENV || 'development',
  },
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  },
  // Flag: enables posting to Manager.io (inventory movements, payments, etc.)
  postingEnabled: process.env.MANAGER_POSTING_ENABLED === 'true',
  // Rate limits for auth endpoints (stricter)
  authRateLimit: {
    windowMs: 60000,
    maxRequests: 10,
  },
};

// Validate required secrets fail-safe in production
if (config.server.nodeEnv === 'production') {
  const issues: string[] = [];
  if (!config.manager.apiKey) issues.push('MANAGER_API_KEY not set');
  if (!config.jwt.secret || config.jwt.secret.length < 32) issues.push('JWT_SECRET missing or too short (<32 chars)');
  if (issues.length > 0) {
    console.error(`FATAL: ${issues.join(', ')}. Refusing to start in production.`);
    process.exit(1);
  }
}

if (!config.manager.apiKey) {
  console.warn('WARNING: MANAGER_API_KEY not set — Manager.io calls will fail');
}

if (!config.jwt.secret) {
  console.warn('WARNING: JWT_SECRET not set — tokens will be rejected');
}

if (!config.launchAccessCodes) {
  console.warn('WARNING: LAUNCH_ACCESS_CODES not configured — operators cannot elevate to privileged roles');
}