import { mkdir } from 'node:fs/promises';
import { isAbsolute, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { openDatabase } from './sqlite-adapter.mjs';
import { openTursoDatabase } from './turso-adapter.mjs';

export async function openStorage(env = process.env) {
  const migrations = fileURLToPath(new URL('../drizzle/', import.meta.url));
  const url = env.TURSO_DATABASE_URL?.trim(), token = env.TURSO_AUTH_TOKEN?.trim();
  if (url || token) {
    const DB = await openTursoDatabase(url, token, migrations);
    const removed = await DB.prepare('SELECT COUNT(*) AS count FROM board_removals').first();
    console.log(`Board cleanup: ${removed.count} screenshot entries archived from the main board; player scores retained.`);
    return { DB, kind: 'turso', description: 'Storage: Turso connected. Scores and migration history are stored outside this server.' };
  }
  if (env.LOOPSHIFT_REQUIRE_REMOTE_DB === 'true') {
    throw new Error('Remote database required. Set TURSO_DATABASE_URL and TURSO_AUTH_TOKEN; temporary local storage is disabled.');
  }
  const dataDirectory = env.LOOPSHIFT_DATA_DIR || fileURLToPath(new URL('../data/', import.meta.url));
  if (!isAbsolute(dataDirectory)) throw new Error('LOOPSHIFT_DATA_DIR must be an absolute directory path.');
  await mkdir(dataDirectory, {recursive:true});
  const filename = join(dataDirectory, 'leaderboard.sqlite');
  const DB = openDatabase(filename, migrations);
  return { DB, kind: 'local-sqlite', description: `Storage: local SQLite at ${filename}.${env.RENDER ? '\nRender local files require a persistent disk. Connect Turso or mount this data directory to preserve scores across deploys and restarts.' : ''}` };
}

export async function storageHealth(storage) {
  try {
    await storage.DB.prepare('SELECT 1 AS ok').first();
    return new Response(JSON.stringify({ok:true, storage:storage.kind}), {headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
  } catch {
    return new Response(JSON.stringify({ok:false, storage:storage.kind, error:'Database unavailable.'}), {status:503,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
  }
}
