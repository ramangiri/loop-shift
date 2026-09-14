import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,readdirSync,copyFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {api} from '../server/api.js';
import {weeklyInfo,weeklyAction,weeklyBoard} from '../server/weekly.js';
import {socialAction,socialState,friendGroups,groupAction} from '../server/social.js';
import {openDatabase} from '../scripts/sqlite-adapter.mjs';
const migrations=new URL('../drizzle/',import.meta.url).pathname;
const fixture=async()=>{const DB=openDatabase(':memory:',migrations);for(const id of ['a','b','c'])await DB.prepare('INSERT INTO players (id,name,best,achieved_at) VALUES (?,?,?,?)').bind(id,'Player '+id,id==='a'?100:200,1).run();return DB;};
test('weekly course and rule are stable through Sunday and rotate at Monday UTC',()=>{
  const a=weeklyInfo(Date.parse('2026-09-14T00:00:00Z')),b=weeklyInfo(Date.parse('2026-09-20T23:59:59Z'));
  assert.deepEqual(a,b);assert.equal(a.rule.id,'no-fever');assert.equal(a.resetsAt,'2026-09-21T00:00:00.000Z');
  const c=weeklyInfo(Date.parse('2026-09-21T00:00:00Z'));assert.equal(c.rule.id,'double-sparks');assert.notEqual(a.seed,c.seed);
  assert.equal(weeklyInfo(Date.parse('2026-09-28')).rule.id,'one-shield');assert.equal(weeklyInfo(Date.parse('2026-10-05')).rule.id,'no-fever');
});
test('weekly scores are separate, ownership-bound, idempotent and save to the week started',async()=>{
  const DB=await fixture(),now=Date.parse('2026-09-20T23:59:00Z');
  try{
    const start=await (await weeklyAction('/api/weekly/start',DB,'a',{},now)).json();
    const submit=(id,score,time=now+120000)=>weeklyAction('/api/weekly/score',DB,id,{token:start.token,score,duration:120},time);
    assert.equal((await submit('b',300)).status,410);assert.equal((await submit('a',300,now+1000)).status,400);
    assert.equal((await submit('a',300)).status,200);assert.equal((await submit('a',300)).status,200);assert.equal((await submit('a',301)).status,409);
    assert.equal((await weeklyBoard(DB,'a',start.week)).me.best,300);assert.equal((await weeklyBoard(DB,'a','2026-09-21')).me.best,0);
    assert.equal(DB.sqlite.prepare('SELECT best FROM players WHERE id=?').get('a').best,100);assert.equal(DB.sqlite.prepare('SELECT COUNT(*) n FROM daily_scores').get().n,0);
    const newer=await (await weeklyAction('/api/weekly/start',DB,'a',{},now+10000)).json();
    assert.equal((await weeklyAction('/api/weekly/score',DB,'a',{token:newer.token,score:20,duration:10},now+22000)).status,200);
    assert.equal((await weeklyBoard(DB,'a',start.week)).me.best,300);
  }finally{DB.close();}
});
test('community contributions count once; trophies and titles remain earned across retries',async()=>{
  const DB=await fixture(),now=Date.now();
  try{
    assert.equal((await socialAction('/api/social/start',DB,'a',{kind:'practice'},now)).status,400);
    const attempt=await (await socialAction('/api/social/start',DB,'a',{kind:'endless'},now)).json();
    const stats={token:attempt.token,sparks:60,chain:5,clean:5,cleared:20,bosses:3,duration:120};
    assert.equal((await socialAction('/api/social/finish',DB,'b',stats,now+120000)).status,410);
    assert.equal((await socialAction('/api/social/finish',DB,'a',stats,now+1000)).status,400);
    assert.equal((await socialAction('/api/social/finish',DB,'a',{...stats,bosses:8},now+120000)).status,400);
    const results=await Promise.all([socialAction('/api/social/finish',DB,'a',stats,now+120000),socialAction('/api/social/finish',DB,'a',stats,now+120000)]);
    assert.ok(results.every(r=>r.status===200));const state=await socialState(DB,'a');assert.equal(state.community.total,60);assert.equal(state.community.mine,60);assert.deepEqual(state.collection,{bosses:3,titles:7,title:''});
    assert.equal((await socialAction('/api/social/finish',DB,'a',{...stats,sparks:61},now+120000)).status,409);
    assert.equal((await socialAction('/api/social/title',DB,'b',{title:'perfect-pilot'},now)).status,403);
    assert.equal((await socialAction('/api/social/title',DB,'a',{title:'perfect-pilot'},now)).status,200);
    assert.equal((await socialState(DB,'a')).collection.title,'perfect-pilot');
    const bad=await socialAction('/api/social/title',DB,'a',{title:'<img onerror=evil>'},now);assert.equal(bad.status,400);
  }finally{DB.close();}
});
test('community goal unlocks for everyone and remains unlocked after the week ends',async()=>{
  const DB=await fixture();
  try{
    const week=weeklyInfo().week;
    for(let i=0;i<50;i++)DB.sqlite.prepare('INSERT INTO social_runs(token,player_id,kind,week,started_at,finished_at,sparks) VALUES(?,?,?,?,?,?,?)').run('goal-'+i,'a','endless',week,1,2,2000);
    const state=await socialState(DB,'b');assert.equal(state.community.total,100000);assert.equal(state.community.mine,0);assert.equal(state.community.unlocked,true);
    DB.sqlite.prepare('UPDATE social_runs SET week=?').run('2026-08-31');
    const next=await socialState(DB,null);assert.equal(next.community.total,0);assert.equal(next.community.unlocked,true);
  }finally{DB.close();}
});
test('private groups reveal only joined boards, validate invites and support safe leaving',async()=>{
  const DB=await fixture(),now=Date.now();
  try{
    assert.equal((await friendGroups(DB,null)).status,401);
    assert.equal((await groupAction('/api/groups/create',DB,'a',{name:'<script>'},now)).status,400);
    const created=await (await groupAction('/api/groups/create',DB,'a',{name:'Orbit crew'},now)).json(),group=created.groups[0];assert.match(group.invite,/^[A-F0-9]{12}$/);
    assert.deepEqual((await (await friendGroups(DB,'b')).json()).groups,[]);
    assert.equal((await groupAction('/api/groups/join',DB,'b',{code:'000000000000'},now)).status,404);
    const joined=await (await groupAction('/api/groups/join',DB,'b',{code:group.invite.toLowerCase()},now)).json();assert.equal(joined.groups[0].members,2);assert.equal(joined.groups[0].entries[0].name,'Player b');
    assert.equal(joined.groups[0].entries[0].isYou,true);assert.equal(joined.groups[0].entries[1].isYou,false);
    await groupAction('/api/groups/leave',DB,'c',{group:group.id},now);assert.equal((await (await friendGroups(DB,'a')).json()).groups[0].members,2,'An outsider cannot remove another member');
    await groupAction('/api/groups/leave',DB,'a',{group:group.id},now);assert.equal((await (await friendGroups(DB,'b')).json()).groups[0].members,1);
    await groupAction('/api/groups/leave',DB,'b',{group:group.id},now);assert.equal(DB.sqlite.prepare('SELECT COUNT(*) n FROM friend_groups').get().n,0);
  }finally{DB.close();}
});
test('group sizes and membership limits hold under concurrent requests',async()=>{
  const DB=await fixture(),now=Date.now();
  try{
    const results=await Promise.all(Array.from({length:6},(_,i)=>groupAction('/api/groups/create',DB,'a',{name:'Group '+i},now)));
    assert.equal(results.filter(r=>r.status===200).length,5);assert.equal(DB.sqlite.prepare('SELECT COUNT(*) n FROM friend_groups').get().n,5);
    const group=DB.sqlite.prepare('SELECT * FROM friend_groups LIMIT 1').get();
    for(let i=0;i<29;i++){DB.sqlite.prepare('INSERT INTO players(id,name,achieved_at) VALUES(?,?,?)').run('guest'+i,'Guest '+i,1);DB.sqlite.prepare('INSERT INTO friend_members(group_id,player_id) VALUES(?,?)').run(group.id,'guest'+i);}
    assert.equal((await groupAction('/api/groups/join',DB,'b',{code:group.invite},now)).status,400);
  }finally{DB.close();}
});
test('new endpoints preserve origin, authentication, method and request-size checks',async()=>{
  const DB=await fixture();
  try{
    for(const path of ['weekly/start','social/start','social/finish','social/title','groups/create','groups/join','groups/leave']){
      const headers={'Content-Type':'application/json','x-loopshift-season':'2'};
      assert.equal((await api(new Request('https://game.test/api/'+path,{method:'POST',headers,body:'{}'}),{DB})).status,401);
      assert.equal((await api(new Request('https://game.test/api/'+path,{method:'POST',headers:{...headers,origin:'https://evil.test'},body:'{}'}),{DB})).status,403);
      assert.equal((await api(new Request('https://game.test/api/'+path),{DB})).status,405);
    }
    assert.equal((await api(new Request('https://game.test/api/weekly'),{DB})).status,200);
    assert.equal((await api(new Request('https://game.test/api/groups'),{DB})).status,401);
  }finally{DB.close();}
});
test('events migration preserves existing scores, awards earlier bosses once, and survives reopening',()=>{
  const dir=mkdtempSync(join(tmpdir(),'loop-events-')),old=join(dir,'old'),file=join(dir,'scores.sqlite');mkdirSync(old);
  for(const name of readdirSync(migrations).filter(n=>n.endsWith('.sql')&&n<'0005'))copyFileSync(join(migrations,name),join(old,name));
  let DB=openDatabase(file,old);
  try{
    DB.sqlite.exec("INSERT INTO players(id,name,best,achieved_at,furthest_pass,best_chain,best_clean) VALUES('veteran','Toby',9876,1,360,9,5)");DB.close();DB=null;
    DB=openDatabase(file,migrations);let p=DB.sqlite.prepare('SELECT * FROM players').get();assert.equal(p.best,9876);assert.equal(p.boss_trophies,7);assert.equal(p.player_titles,7);
    DB.sqlite.exec('UPDATE players SET boss_trophies=15');DB.close();DB=null;DB=openDatabase(file,migrations);
    p=DB.sqlite.prepare('SELECT * FROM players').get();assert.equal(p.boss_trophies,15);assert.equal(p.best,9876);
  }finally{DB?.close();rmSync(dir,{recursive:true,force:true});}
});
