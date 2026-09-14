import { createClient } from '@libsql/client/web';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

export function databaseConfig(url, authToken) {
  if (typeof url !== 'string' || typeof authToken !== 'string' || !url.trim() || !authToken.trim()) {
    throw new Error('Set both TURSO_DATABASE_URL and TURSO_AUTH_TOKEN in Render Environment.');
  }
  let parsed;
  try { parsed = new URL(url.trim().replace(/^libsql:/, 'https:')); } catch { throw new Error('TURSO_DATABASE_URL must be the libSQL database URL from Turso.'); }
  if (parsed.protocol !== 'https:' || !parsed.hostname.endsWith('.turso.io') || parsed.username || parsed.password || parsed.port || parsed.search || parsed.hash || parsed.pathname !== '/') {
    throw new Error('Use your Turso libSQL database URL (libsql://database-organisation.turso.io).');
  }
  return { url: parsed.origin, authToken: authToken.trim(), intMode: 'number' };
}

// Keep the migration ledger in the remote database, not on Render's temporary disk.
// The ledger insert and DDL commit together. A concurrent deploy cannot run the same migration twice.
export async function migrateDatabase(client, migrationDirectory) {
  const existing = await client.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'");
  const tables = new Set(existing.rows.map(row => row.name));
  if (tables.size && !tables.has('_loopshift_migrations')) {
    throw new Error('This database has tables but no Loop Shift migration history. Use an empty database or import a complete Loop Shift database backup.');
  }
  await client.execute('CREATE TABLE IF NOT EXISTS _loopshift_migrations (name TEXT PRIMARY KEY)');
  const applied = new Set((await client.execute('SELECT name FROM _loopshift_migrations')).rows.map(row => row.name));
  for (const name of (await readdir(migrationDirectory)).filter(name => name.endsWith('.sql')).sort()) {
    if (applied.has(name)) continue;
    if (name === '0003_fresh_start.sql' && tables.has('players')) {
      throw new Error('This backup predates the old score reset. Storage setup will not delete existing players. Import a current complete backup instead.');
    }
    const statements = (await readFile(join(migrationDirectory, name), 'utf8')).split('--> statement-breakpoint').map(sql => sql.trim()).filter(Boolean);
    try {
      await client.batch([
        { sql: 'INSERT INTO _loopshift_migrations (name) VALUES (?)', args: [name] },
        ...statements
      ], 'write');
    } catch {
      // The other deploy may have committed first, or the commit reply may have been interrupted.
      const committed = await client.execute({ sql: 'SELECT name FROM _loopshift_migrations WHERE name=?', args: [name] });
      if (!committed.rows.length) throw new Error(`Database migration ${name} failed; no partial migration was saved.`);
    }
  }
}

export function databaseAdapter(client) {
  return {
    prepare(sql) {
      const statement = args => ({
        bind(...values) { return statement(values); },
        async first() { return (await client.execute({sql, args})).rows[0] || null; },
        async all() { return { results: (await client.execute({sql, args})).rows }; },
        async run() { await client.execute({sql, args});return { success: true }; }
      });
      return statement([]);
    },
    close() { client.close(); }
  };
}

export async function openTursoDatabase(url, authToken, migrationDirectory) {
  const config = databaseConfig(url, authToken);
  const client = createClient({ ...config, fetch: (input, options = {}) => fetch(input, {
    ...options, signal: AbortSignal.any([...(options.signal ? [options.signal] : []), AbortSignal.timeout(7000)])
  }) });
  try {
    await migrateDatabase(client, migrationDirectory);
    return databaseAdapter(client);
  } catch (error) {
    client.close();
    // Provider errors can contain connection details. Keep URLs and tokens out of deployment logs.
    if (/^(This database|This backup|Database migration)/.test(error.message || '')) throw error;
    throw new Error('Could not initialise the Turso database. Check its URL, read/write token and availability. No local fallback was used.');
  }
}
