import { database } from './db.js';
import { dailyBoard, dailyAction } from './daily.js';

const COOKIE = 'loopshift_player';
const json = (data, status = 200, extra = {}) => new Response(JSON.stringify(data), {
  status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'private, no-store', ...extra }
});
export function cleanName(value) {
  if (typeof value !== 'string') return null;
  const name = value.normalize('NFC').trim().replace(/\s+/g, ' ');
  return Array.from(name).length >= 1 && Array.from(name).length <= 16 && /^[\p{L}\p{M}\p{N} ._'’-]+$/u.test(name) && /[\p{L}\p{N}]/u.test(name) ? name : null;
}
async function identity(request, create = false) {
  const account = request.headers.get('oai-authenticated-user-id');
  let token = request.headers.get('cookie')?.split(';').map(v => v.trim()).find(v => v.startsWith(COOKIE + '='))?.slice(COOKIE.length + 1);
  if (!/^[a-f0-9]{64}$/.test(token || '')) token = null;
  let cookie;
  if (!account && !token && create) {
    token = Array.from(crypto.getRandomValues(new Uint8Array(32)), n => n.toString(16).padStart(2, '0')).join('');
    cookie = `${COOKIE}=${token}; Path=/; Max-Age=31536000; HttpOnly; SameSite=Lax${new URL(request.url).protocol === 'https:' ? '; Secure' : ''}`;
  }
  if (!account && !token) return { id: null };
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(account ? 'account:' + account : 'guest:' + token));
  return { id: Array.from(new Uint8Array(bytes), n => n.toString(16).padStart(2, '0')).join(''), cookie };
}
async function board(db, id) {
  const { results } = await db.prepare('SELECT id, name, best FROM players WHERE best > 0 ORDER BY best DESC, achieved_at ASC, id ASC LIMIT 10').all();
  const me = id ? await db.prepare('SELECT name, best, achieved_at, highest_level, furthest_pass, achievements, best_chain, best_clean FROM players WHERE id = ?').bind(id).first() : null;
  let rank = null;
  if (me?.best > 0) {
    const row = await db.prepare('SELECT COUNT(*) + 1 AS rank FROM players WHERE best > ? OR (best = ? AND (achieved_at < ? OR (achieved_at = ? AND id < ?)))').bind(me.best, me.best, me.achieved_at, me.achieved_at, id).first();
    rank = row.rank;
  }
  return { entries: results.map((p, i) => ({ rank: i + 1, name: p.name, score: p.best, isYou: p.id === id })), me: me ? { name: me.name, best: me.best, rank, progress:{highest:me.highest_level,distance:me.furthest_pass,badges:me.achievements,chain:me.best_chain,clean:me.best_clean} } : null };
}
export async function api(request, env) {
  const path = new URL(request.url).pathname;
  if (!['/api/leaderboard', '/api/player', '/api/scores','/api/daily','/api/daily/start','/api/daily/score','/api/progress'].includes(path)) return json({ error: 'Not found.' }, 404);
  const method = request.method;
  if ((['/api/leaderboard','/api/daily'].includes(path) && method !== 'GET') || (!['/api/leaderboard','/api/daily'].includes(path) && method !== 'POST')) return json({ error: 'Method not allowed.' }, 405);
  if (method === 'POST') {
    if(request.headers.get('x-loopshift-season')!=='2')return json({error:'A fresh challenge has started. Reload the game before playing or saving.'},409);
    const origin = request.headers.get('origin');
    if ((origin && origin !== new URL(request.url).origin) || request.headers.get('sec-fetch-site') === 'cross-site') return json({ error: 'Please submit from the game website.' }, 403);
    if (!request.headers.get('content-type')?.startsWith('application/json')) return json({ error: 'JSON required.' }, 415);
  }
  try {
    const db = database(env);
    if (method === 'GET') {const id=(await identity(request)).id;return json(path==='/api/daily'?await dailyBoard(db,id):await board(db,id));}
    // Read at most 2 KB, including chunked requests.
    const reader = request.body?.getReader();
    if (!reader) return json({ error: 'Missing request.' }, 400);
    let size = 0, body = '';
    const decoder = new TextDecoder();
    while (true) {
      const { value, done } = await reader.read(); if (done) break;
      size += value.byteLength;
      if (size > 2048) { await reader.cancel(); return json({ error: 'Request too large.' }, 413); }
      body += decoder.decode(value, { stream: true });
    }
    let data;
    try { data = JSON.parse(body + decoder.decode()); } catch { return json({ error: 'Invalid request.' }, 400); }
    if (!data || typeof data !== 'object' || Array.isArray(data)) return json({ error: 'Invalid request.' }, 400);
    const who = await identity(request, path === '/api/player');
    const now = Date.now();
    if (path === '/api/player') {
      const name = cleanName(data.name);
      if (!name) return json({ error: 'Use 1–16 letters or numbers. Spaces, dots, apostrophes, hyphens and underscores are OK.' }, 400);
      await db.prepare('INSERT INTO players (id, name, best, achieved_at, last_submit_at) VALUES (?, ?, 0, ?, 0) ON CONFLICT(id) DO UPDATE SET name = excluded.name').bind(who.id, name, now).run();
      return json(await board(db, who.id), 200, who.cookie ? { 'Set-Cookie': who.cookie } : {});
    }
    if (!who.id) return json({ error: 'Enter your nickname to join the board.' }, 401);
    const player = await db.prepare('SELECT id FROM players WHERE id = ?').bind(who.id).first();
    if (!player) return json({ error: 'Enter your nickname to join the board.' }, 401);
    if(path==='/api/progress'){
      const {highest,distance,badges,chain=0,clean=0}=data;
      if(!Number.isInteger(chain)||chain<0||chain>1200||!Number.isInteger(clean)||clean<0||clean>100||!Number.isInteger(highest)||highest<1||highest>100||!Number.isInteger(distance)||distance<0||distance>1200||!Number.isInteger(badges)||badges<0||badges>31)return json({error:'Invalid progress.'},400);
      const saved=await db.prepare('UPDATE players SET highest_level=MAX(highest_level,?),furthest_pass=MAX(furthest_pass,?),achievements=achievements | ?,best_chain=MAX(best_chain,?),best_clean=MAX(best_clean,?) WHERE id=? RETURNING highest_level,furthest_pass,achievements,best_chain,best_clean').bind(highest,distance,badges,chain,clean,who.id).first();
      return json({highest:saved.highest_level,distance:saved.furthest_pass,badges:saved.achievements,chain:saved.best_chain,clean:saved.best_clean});
    }
    if(path.startsWith('/api/daily/'))return await dailyAction(path,db,who.id,data,now);
    if (!Number.isSafeInteger(data.score) || data.score < 0 || data.score > 10000000 || !Number.isFinite(data.duration) || data.duration < 0 || data.duration > 86400 || data.score > data.duration * 600 + 100) return json({ error: 'This score could not be accepted.' }, 400);
    // Atomic personal-best update: lower scores, repeats and concurrent tabs cannot overwrite a higher score.
    const result = await db.prepare('UPDATE players SET achieved_at = CASE WHEN ? > best THEN ? ELSE achieved_at END, best = MAX(best, ?), last_submit_at = ? WHERE id = ? AND last_submit_at <= ? RETURNING best').bind(data.score, now, data.score, now, who.id, now - 1000).first();
    if (!result) return json({ error: 'Please wait a moment, then retry your score.' }, 429, { 'Retry-After': '1' });
    return json(await board(db, who.id));
  } catch (error) {
    console.error('Leaderboard request failed:', error.message);
    return json({ error: 'The leaderboard is unavailable. Please try again shortly.' }, 503);
  }
}
