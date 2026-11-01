/**
 * Simple versioned migration runner.
 * Each migration is a .sql file in proxy/src/db/migrations/ with naming v{version}__{name}.sql.
 * Only unapplied migrations are run. Idempotent.
 */
import { query, getClient } from './pool.js';
import { readdir, readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const MIGRATIONS_DIR = join(__dirname, 'migrations');

interface Migration {
  version: string;
  name: string;
  filePath: string;
}

async function getAppliedMigrations(): Promise<string[]> {
  const result = await query('SELECT version FROM schema_migrations ORDER BY version');
  return result.rows.map((r: any) => r.version);
}

async function runMigration(m: Migration): Promise<void> {
  console.log(`Running migration ${m.version}: ${m.name}`);
  const sql = await readFile(m.filePath, 'utf-8');
  const statements = sql.split(';').filter(l => l.trim().length > 0);

  const client = await getClient();
  try {
    await client.query('BEGIN');
    for (const stmt of statements) {
      const trimmed = stmt.trim();
      if (trimmed) await client.query(trimmed);
    }
    await client.query('INSERT INTO schema_migrations (version, name) VALUES ($1, $2) ON CONFLICT (version) DO NOTHING', [m.version, m.name]);
    await client.query('COMMIT');
    console.log(`  ✓ ${m.version} applied`);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function migrate(): Promise<void> {
  let applied: string[] = [];
  try {
    applied = await getAppliedMigrations();
  } catch {
    // schema_migrations may not exist yet — initSchema must be called first
    applied = [];
  }

  try {
    const files = await readdir(MIGRATIONS_DIR);
    const migrations: Migration[] = files
      .filter(f => f.match(/^v\d+__/))
      .map(f => ({
        version: f.match(/^v(\d+)__/)![1],
        name: f.replace(/\.sql$/, ''),
        filePath: join(MIGRATIONS_DIR, f),
      }))
      .sort((a, b) => a.version.localeCompare(b.version));

    const pending = migrations.filter(m => !applied.includes(m.version));
    if (pending.length === 0) {
      console.log('No pending migrations');
      return;
    }
    console.log(`Found ${pending.length} pending migration(s)`);
    for (const m of pending) {
      await runMigration(m);
    }
    console.log('All migrations applied');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrate().catch(e => { console.error(e); process.exit(1); });