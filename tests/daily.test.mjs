import test from 'node:test';
import assert from 'node:assert/strict';
import {api} from '../server/api.js';
import {dailyInfo,dailyAction,dailyBoard} from '../server/daily.js';
import {openDatabase} from '../scripts/sqlite-adapter.mjs';
const migrations=new URL('../drizzle/',import.meta.url).pathname;
test('daily seed and reset time change only at UTC midnight',()=>{
 const a=dailyInfo(Date.parse('2026-09-14T00:00:00Z')),b=dailyInfo(Date.parse('2026-09-14T23:59:59Z')),c=dailyInfo(Date.parse('2026-09-15T00:00:00Z'));
 assert.deepEqual(a,b);assert.notEqual(a.seed,c.seed);assert.equal(a.resetsAt,'2026-09-15T00:00:00.000Z');
});
test('daily attempts enforce ownership, replay identity, expiry and separate daily bests',async()=>{
 const DB=openDatabase(':memory:',migrations),now=Date.parse('2026-09-14T23:59:00Z');
 try{
  for(const id of ['a','b'])await DB.prepare('INSERT INTO players (id,name,best,achieved_at) VALUES (?,?,999,?)').bind(id,'Player '+id,now).run();
  const begin=async(id,time)=>{const r=await dailyAction('/api/daily/start',DB,id,{},time);assert.equal(r.status,200);return r.json();};
  const a=await begin('a',now),b=await begin('b',now);assert.equal(a.seed,b.seed);
  const finish=(id,token,score,time=now+120000)=>dailyAction('/api/daily/score',DB,id,{token,score,duration:120},time);
  assert.equal((await finish('b',a.token,500)).status,409);
  assert.equal((await finish('a',a.token,500)).status,200,'Attempt started before midnight saves to its original day');
  assert.equal((await finish('a',a.token,500)).status,200,'Same-result retry is safe');
  assert.equal((await finish('a',a.token,600)).status,409,'A finished attempt cannot change score');
  const fresh=await begin('a',now+121000);assert.notEqual(fresh.day,a.day);
  assert.equal((await finish('a',fresh.token,200,now+242000)).status,200);
  assert.equal((await dailyBoard(DB,'a',a.day)).me.best,500);assert.equal((await dailyBoard(DB,'a',fresh.day)).me.best,200);
  assert.equal((await DB.prepare('SELECT best FROM players WHERE id=?').bind('a').first()).best,999,'Endless best preserved');
  const another=await begin('a',now+250000);
  assert.equal((await finish('a',another.token,150,now+371000)).status,200);
  assert.equal((await dailyBoard(DB,'a',fresh.day)).me.best,200,'Lower daily score cannot replace best');
  const expired=await begin('a',now+380000);assert.equal((await finish('a',expired.token,0,now+2200000)).status,410);
 }finally{DB.close();}
});
test('daily API is routed and requires a saved player for writes',async()=>{
 const DB=openDatabase(':memory:',migrations);
 try{
  const publicRead=await api(new Request('https://game.test/api/daily'),{DB});assert.equal(publicRead.status,200);assert.ok((await publicRead.json()).challenge.seed);
  const denied=await api(new Request('https://game.test/api/daily/start',{method:'POST',headers:{'Content-Type':'application/json','x-loopshift-season':'2'},body:'{}'}),{DB});assert.equal(denied.status,401);
 }finally{DB.close();}
});
