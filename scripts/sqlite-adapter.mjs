import { DatabaseSync } from 'node:sqlite';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
export function openDatabase(filename, migrationDirectory) {
  const sqlite = new DatabaseSync(filename);
  sqlite.exec('PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000; CREATE TABLE IF NOT EXISTS _loopshift_migrations (name TEXT PRIMARY KEY)');
  for (const name of readdirSync(migrationDirectory).filter(n => n.endsWith('.sql')).sort()) {
    if (sqlite.prepare('SELECT name FROM _loopshift_migrations WHERE name = ?').get(name)) continue;
    sqlite.exec('BEGIN');
    try {
      sqlite.exec(readFileSync(join(migrationDirectory, name), 'utf8'));
      sqlite.prepare('INSERT INTO _loopshift_migrations (name) VALUES (?)').run(name);
      sqlite.exec('COMMIT');
    } catch (error) { sqlite.exec('ROLLBACK');throw error; }
  }
  function prepare(sql) {
    const stmt = sqlite.prepare(sql);let values = [];
    return {
      bind(...args) { values = args;return this; },
      async first() { return stmt.get(...values) || null; },
      async all() { return {results:stmt.all(...values)}; },
      async run() { stmt.run(...values);return {success:true}; }
    };
  }
  return { prepare, close:() => sqlite.close(), sqlite };
}
