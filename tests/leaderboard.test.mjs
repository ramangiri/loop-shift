import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import vm from 'node:vm';
import { api, cleanName } from '../server/api.js';
import { openDatabase } from '../scripts/sqlite-adapter.mjs';
const migrations = new URL('../drizzle/', import.meta.url).pathname;
function fixture(filename = ':memory:') {
  const DB = openDatabase(filename, migrations);
  const call = async (path, data, user = 'test-player', extra = {}) => {
    const request = new Request('https://game.test/api/' + path, { method:data ? 'POST' : 'GET', headers:{'Content-Type':'application/json','x-loopshift-season':'2', ...(user ? {'oai-authenticated-user-id':user} : {}), ...extra}, body:data ? JSON.stringify(data) : undefined });
    const response = await api(request, {DB});
    return {response, data:await response.json()};
  };
  return {DB, call};
}
test('nicknames accept Unicode and reject markup, empty and overlong names', () => {
  assert.equal(cleanName('  Giri   Raman '), 'Giri Raman');
  assert.equal(cleanName('கிரி'), 'கிரி');
  for (const name of ['', '    ', '<script>', 'a'.repeat(17), '---', null]) assert.equal(cleanName(name), null);
});
test('top ten, personal best, stable ties, rename, idempotent submissions and account isolation', async () => {
  const {DB, call} = fixture();
  try {
    assert.deepEqual((await call('leaderboard')).data.entries, []);
    assert.equal((await call('scores', {score:10,duration:2})).response.status, 401);
    for (let i = 0; i < 12; i++) {
      await call('player', {name:'Player ' + i}, 'p' + i);
      assert.equal((await call('scores', {score:100 + i * 10,duration:30}, 'p' + i)).response.status, 200);
    }
    const list = (await call('leaderboard', null, 'p0')).data;
    assert.equal(list.entries.length, 10);assert.equal(list.entries[0].score, 210);assert.equal(list.me.rank, 12);
    DB.sqlite.exec('UPDATE players SET last_submit_at=0');
    const lower = (await call('scores', {score:1,duration:2}, 'p11')).data;
    assert.equal(lower.me.best, 210);
    assert.equal((await call('scores', {score:9,duration:2}, 'p11')).response.status, 429);
    DB.sqlite.exec('UPDATE players SET last_submit_at=0');
    await call('scores', {score:210,duration:30}, 'p11');
    const renamed = (await call('player', {name:'New Orbit'}, 'p11')).data;
    assert.equal(renamed.entries[0].name, 'New Orbit');assert.equal(renamed.me.best, 210);
    assert.equal((await call('leaderboard', null, 'p10')).data.me.name, 'Player 10');
    // Explicit tied timestamps verify deterministic tie break and rank consistency.
    DB.sqlite.exec('UPDATE players SET best=500, achieved_at=123');
    const ties = (await call('leaderboard', null, 'p11')).data;
    assert.equal(ties.me.rank, DB.sqlite.prepare('SELECT COUNT(*)+1 rank FROM players WHERE id < (SELECT id FROM players WHERE name=?)').get('New Orbit').rank);
    assert.ok(DB.sqlite.prepare('EXPLAIN QUERY PLAN SELECT id,name,best FROM players WHERE best>0 ORDER BY best DESC,achieved_at,id LIMIT 10').all().some(x=>x.detail.includes('idx_players_ranking')));
  } finally { DB.close(); }
});
test('guest identity is cookie-bound; hostile, malformed and unavailable requests fail safely', async () => {
  const {DB, call} = fixture();
  try {
    const created = await call('player', {name:'Guest'}, null);
    const cookie = created.response.headers.get('set-cookie');assert.ok(cookie.includes('HttpOnly'));assert.ok(cookie.includes('Secure'));
    const header = {cookie:cookie.split(';')[0]};
    assert.equal((await call('leaderboard', null, null, header)).data.me.name, 'Guest');
    assert.equal((await call('leaderboard', null, null)).data.me, null);
    assert.equal((await call('player', {name:'Bad'}, null, {origin:'https://evil.test'})).response.status, 403);
    assert.equal((await call('scores', {score:-1,duration:3}, null, header)).response.status, 400);
    assert.equal((await call('scores', {score:999999,duration:1}, null, header)).response.status, 400);
    assert.equal((await call('player', {name:'x'.repeat(3000)}, null)).response.status, 413);
    assert.equal((await api(new Request('https://game.test/api/leaderboard'), {})).status, 503);
  } finally { DB.close(); }
});
test('scores survive a server restart and schema migrations do not rerun', async () => {
  const folder = mkdtempSync(join(tmpdir(), 'loopshift-'));
  try {
    let f = fixture(join(folder,'scores.sqlite'));
    await f.call('player',{name:'Persistent'});await f.call('scores',{score:345,duration:30});f.DB.close();
    f = fixture(join(folder,'scores.sqlite'));
    assert.equal((await f.call('leaderboard')).data.me.best,345);f.DB.close();
  } finally {rmSync(folder,{recursive:true,force:true});}
});
test('name dialog, safe text rendering, score saving and offline retry use the real API', async () => {
  const {DB, call} = fixture();const nodes=new Map();
  function node(id='') {
    return {id, children:[], value:'', textContent:'', hidden:false, disabled:false, open:false, events:{}, classList:{add(){}},
      setAttribute(){}, addEventListener(type,fn){this.events[type]=fn;}, append(...children){this.children.push(...children);}, replaceChildren(){this.children=[];},
      showModal(){this.open=true;},close(){this.open=false;},focus(){}};
  }
  const html=readFileSync(new URL('../www/index.html',import.meta.url),'utf8');
  for(const [,id] of html.matchAll(/id="([^"]+)"/g)) nodes.set(id,node(id));
  let fail=false;const store=new Map();
  const sandbox={console, setTimeout, clearTimeout, AbortController, TypeError, localStorage:{getItem:k=>store.get(k),setItem:(k,v)=>store.set(k,v)},
    document:{getElementById:id=>nodes.get(id),createElement:()=>node()},window:{},
    fetch:async(url,opts)=>{if(fail)throw new TypeError('offline');const r=await call(url.replace('./api/',''),opts.body?JSON.parse(opts.body):null);return new Response(JSON.stringify(r.data),{status:r.response.status,headers:{'Content-Type':'application/json','x-loopshift-season':'2'}});}};
  try {
    vm.runInNewContext(readFileSync(new URL('../www/leaderboard.js',import.meta.url),'utf8'),sandbox);
    const ui=sandbox.window.LoopShiftBoard;await ui.refresh();assert.equal(ui.ready(),false);
    let started=false;ui.askName(()=>{started=true;});assert.equal(nodes.get('name-dialog').open,true);
    nodes.get('player-name').value='Orbit Giri';await nodes.get('name-form').events.submit({preventDefault(){}});
    assert.equal(started,true);assert.equal(ui.ready(),true);assert.equal(nodes.get('name-dialog').open,false);
    ui.beginRound();ui.submit(99,3);await new Promise(r=>setTimeout(r,30));assert.match(nodes.get('score-save-status').textContent,/#1/);
    assert.equal(nodes.get('board-rows').children[0].children[1].textContent,'Orbit Giri · You');
    fail=true;ui.beginRound();ui.submit(120,3);await new Promise(r=>setTimeout(r,30));assert.equal(nodes.get('retry-score').hidden,false);
    assert.match(nodes.get('score-save-status').textContent,/not saved/);
    fail=false;DB.sqlite.exec('UPDATE players SET last_submit_at=0');
    await nodes.get('retry-board-score').events.click();
    assert.equal(ui.best(),120,'Failed best is retained and retried from Home');
    let challenge;
    await ui.beginDaily(data=>{challenge=data;});assert.equal(challenge.duration,120);assert.ok(challenge.token);
    DB.sqlite.exec('UPDATE daily_runs SET started_at=started_at-10000');
    ui.beginRound();ui.submit(90,3,challenge);await new Promise(r=>setTimeout(r,30));
    assert.match(nodes.get('score-save-status').textContent,/Daily best saved/);
    assert.equal(nodes.get('board-title').textContent,'🏆 Daily Top 10');
  } finally { DB.close(); }
});

test('progress persists monotonically and old-season submissions are rejected',async()=>{
 const {DB,call}=fixture();
 try{
  assert.equal((await call('player',{name:'Orbit'})).response.status,200);
  assert.equal((await call('scores',{score:500,duration:10},'test-player',{'x-loopshift-season':'1'})).response.status,409);
  assert.equal((await call('progress',{highest:10,distance:108,badges:3,chain:8,clean:3})).response.status,200);
  await call('progress',{highest:2,distance:12,badges:4,chain:4,clean:1});
  const data=(await call('leaderboard')).data;
  assert.deepEqual(data.me.progress,{highest:10,distance:108,badges:7,chain:8,clean:3});
  assert.equal((await call('progress',{highest:101,distance:9999,badges:32})).response.status,400);
  assert.equal(data.entries.length,0,'Saving rewards must not create a leaderboard score');
 }finally{DB.close();}
});

test('fresh-start migration removes old boards once and retains subsequent scores',()=>{
 const dir=mkdtempSync(join(tmpdir(),'loop-reset-')),file=join(dir,'reset.sqlite');
 let DB=openDatabase(file,migrations);
 try{
  DB.sqlite.exec("DELETE FROM _loopshift_migrations WHERE name>='0003_fresh_start.sql';INSERT INTO players(id,name,best,achieved_at) VALUES('old','Old',500,1);INSERT INTO daily_scores(day,player_id,best,achieved_at) VALUES('2026-09-14','old',50,1);INSERT INTO daily_runs(player_id,token,day,started_at) VALUES('old','token','2026-09-14',1)");
  DB.close();DB=openDatabase(file,migrations);
  for(const table of ['players','daily_scores','daily_runs'])assert.equal(DB.sqlite.prepare('SELECT COUNT(*) count FROM '+table).get().count,0);
  DB.sqlite.exec("INSERT INTO players(id,name,best,achieved_at) VALUES('new','New',200,2)");DB.close();DB=openDatabase(file,migrations);
  assert.equal(DB.sqlite.prepare('SELECT best FROM players').get().best,200);
 }finally{DB.close();rmSync(dir,{recursive:true,force:true});}
});

function browserBoard(call,store=new Map(),state={}){
 const nodes=new Map(),listeners={},timers=new Set();
 const node=(id='')=>({id,children:[],value:'',textContent:'',hidden:false,disabled:false,open:false,events:{},attrs:{},classList:{add(){}},
   setAttribute(k,v){this.attrs[k]=v;},addEventListener(t,f){this.events[t]=f;},append(...items){this.children.push(...items);},replaceChildren(){this.children=[];},showModal(){this.open=true;},close(){this.open=false;},focus(){}});
 for(const [,id] of readFileSync(new URL('../www/index.html',import.meta.url),'utf8').matchAll(/id="([^"]+)"/g))nodes.set(id,node(id));
 const sandbox={console,AbortController,TypeError,
   setTimeout(fn,ms){const timer=setTimeout(()=>{timers.delete(timer);fn();},ms);timers.add(timer);return timer;},clearTimeout(t){clearTimeout(t);timers.delete(t);},
   localStorage:{getItem:k=>store.get(k),setItem:(k,v)=>store.set(k,v)},document:{getElementById:id=>nodes.get(id),createElement:()=>node()},window:{addEventListener:(name,fn)=>{listeners[name]=fn;}},
   fetch:async(url,opts)=>{
     if(state.offline)throw new TypeError('offline');
     const path=url.replace('./api/','');
     if(state.beforeRequest)await state.beforeRequest(path,opts);
     const {response,data}=await call(path,opts.body?JSON.parse(opts.body):null,state.user||'test-player');
     if(state.afterRequest)await state.afterRequest(path,data);
     return new Response(JSON.stringify(data),{status:response.status,headers:response.headers});
   }};
 vm.runInNewContext(readFileSync(new URL('../www/leaderboard.js',import.meta.url),'utf8'),sandbox);
 return {ui:sandbox.window.LoopShiftBoard,nodes,listeners,store,close(){for(const t of timers)clearTimeout(t);}};
}

test('failed best survives immediate retry, a lower round and page reload for the same player',async()=>{
 const {DB,call}=fixture();let a,b;
 try{
  await call('player',{name:'Orbit Giri'});
  const state={offline:false};a=browserBoard(call,new Map(),state);await a.ui.refresh();
  state.offline=true;a.ui.beginRound();await a.ui.submit(500,10);
  a.ui.beginRound();await a.ui.submit(40,2);
  assert.equal(a.nodes.get('retry-board-score').hidden,false);
  const queue=JSON.parse([...a.store.entries()].find(([key])=>key.startsWith('loop-shift-score-queue-v3:'))[1]);
  assert.equal(queue.length,1);assert.equal(queue[0].score,500);assert.equal(queue[0].duration,10);
  a.close();state.offline=false;b=browserBoard(call,a.store,state);await b.ui.refresh();
  await new Promise(r=>setTimeout(r,30));
  assert.equal((await call('leaderboard')).data.me.best,500);
  assert.equal(b.ui.best(),500);assert.match(b.nodes.get('board-save-status').textContent,/Best saved/);
  assert.equal(b.nodes.get('board-rows').children[0].children[1].textContent,'Orbit Giri · You');
  assert.equal(JSON.parse([...b.store.entries()].find(([key])=>key.startsWith('loop-shift-score-queue-v3:'))[1]).length,0);
 }finally{a?.close();b?.close();DB.close();}
});

test('queued scores stay with their player identity, never another nickname or cookie',async()=>{
 const {DB,call}=fixture();let a,b;
 try{
  await call('player',{name:'First'},'first');await call('player',{name:'Second'},'second');
  const state={user:'first'};a=browserBoard(call,new Map(),state);await a.ui.refresh();
  state.offline=true;await a.ui.submit(900,15);a.close();
  b=browserBoard(call,a.store,{user:'second'});await b.ui.refresh();await new Promise(r=>setTimeout(r,20));
  assert.equal(b.ui.best(),0);assert.equal((await call('leaderboard',null,'second')).data.me.best,0);
  assert.match(b.nodes.get('board-you').textContent,/Second/);
 }finally{a?.close();b?.close();DB.close();}
});

test('slow saves and refreshes cannot replace a newer higher score; lower scores keep the best',async()=>{
 const {DB,call}=fixture();let client,release;
 try{
  await call('player',{name:'Fast Retry'});
  let held=true;const gate=new Promise(r=>{release=r;});
  client=browserBoard(call,new Map(),{beforeRequest:async path=>{
    if(path==='scores'){if(held){held=false;await gate;}DB.sqlite.exec('UPDATE players SET last_submit_at=0');}
  }});
  await client.ui.refresh();client.ui.beginRound();const first=client.ui.submit(100,3);
  client.ui.beginRound();const higher=client.ui.submit(700,12);const refresh=client.ui.refresh(true);
  release();await Promise.all([first,higher,refresh]);
  assert.equal(client.ui.best(),700);assert.equal(client.nodes.get('board-rows').children[0].children[2].textContent,'700');
  client.ui.beginRound();await client.ui.submit(50,3);assert.equal(client.ui.best(),700);
 }finally{release?.();client?.close();DB.close();}
});

test('rate-limited score retries automatically and daily scores remain separate',async()=>{
 const {DB,call}=fixture();let client;
 try{
  await call('player',{name:'Daily Orbit'});client=browserBoard(call);await client.ui.refresh();
  await client.ui.submit(80,3);client.ui.beginRound();await client.ui.submit(180,4);
  assert.match(client.nodes.get('board-save-status').textContent,/not saved yet/);
  await new Promise(r=>setTimeout(r,1250));assert.equal(client.ui.best(),180);
  let daily;await client.ui.beginDaily(value=>{daily=value;});DB.sqlite.exec('UPDATE daily_runs SET started_at=started_at-10000');
  client.ui.beginRound();await client.ui.submit(50,3,daily);
  assert.equal(client.ui.best(),180,'Daily result cannot overwrite main personal best');
  assert.equal(client.nodes.get('board-title').textContent,'🏆 Daily Top 10');
  assert.equal(client.nodes.get('board-rows').children[0].children[2].textContent,'50');
 }finally{client?.close();DB.close();}
});
