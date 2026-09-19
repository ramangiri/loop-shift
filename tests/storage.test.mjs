import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, mkdir, writeFile, cp, readdir, access } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawn } from 'node:child_process';
import { createClient } from '@libsql/client';
import { databaseConfig, databaseAdapter, migrateDatabase } from '../scripts/turso-adapter.mjs';
import { openStorage, storageHealth } from '../scripts/storage.mjs';
import { api } from '../server/api.js';
const migrations = new URL('../drizzle/', import.meta.url).pathname;
const call = async (DB, path, data, user='giri') => {
  const response = await api(new Request('https://game.test/api/'+path, {method:data?'POST':'GET', headers:{'Content-Type':'application/json','x-loopshift-season':'2','oai-authenticated-user-id':user}, body:data?JSON.stringify(data):undefined}), {DB});
  return {status:response.status,data:await response.json()};
};

test('libSQL adapter keeps scores, player IDs, rewards and all boards across fresh client starts', async () => {
  const dir=await mkdtemp(join(tmpdir(),'loop-durable-')),url=pathToFileURL(join(dir,'remote.sqlite')).href;
  let client=createClient({url}),DB;
  try {
    await migrateDatabase(client,migrations);DB=databaseAdapter(client);
    const player=(await call(DB,'player',{name:'Giri'})).data.me;
    assert.equal((await call(DB,'scores',{score:612,duration:10,playerKey:player.key})).status,200);
    await call(DB,'progress',{highest:14,distance:156,badges:3,chain:5,clean:5});
    const daily=(await call(DB,'daily/start',{})).data;
    const weekly=(await call(DB,'weekly/start',{})).data;
    await client.execute('UPDATE daily_runs SET started_at=started_at-10000');
    await client.execute('UPDATE weekly_runs SET started_at=started_at-10000');
    assert.equal((await call(DB,'daily/score',{token:daily.token,score:80,duration:3,playerKey:player.key})).status,200);
    assert.equal((await call(DB,'weekly/score',{token:weekly.token,score:90,duration:3,playerKey:player.key})).status,200);
    await call(DB,'groups/create',{name:'Orbit crew'});
    const run=(await call(DB,'social/start',{kind:'endless'})).data;
    await client.execute('UPDATE social_runs SET started_at=started_at-10000');
    assert.equal((await call(DB,'social/finish',{token:run.token,kind:'endless',sparks:3,chain:0,clean:0,cleared:0,bosses:0,duration:3})).status,200);
    const ledger=(await client.execute('SELECT name FROM _loopshift_migrations ORDER BY name')).rows;
    for(let i=0;i<3;i++){
      DB.close();client=createClient({url});await migrateDatabase(client,migrations);DB=databaseAdapter(client);
      const main=(await call(DB,'leaderboard')).data;
      assert.equal(main.me.best,612);assert.equal(main.me.key,player.key);assert.equal(main.me.name,'Giri');
      assert.equal(main.me.progress.highest,14);assert.equal(main.entries[0].score,612);
      assert.equal((await call(DB,'daily')).data.me.best,80);
      assert.equal((await call(DB,'weekly')).data.me.best,90);
      assert.equal((await call(DB,'social')).data.community.mine,3);
      assert.equal((await call(DB,'groups')).data.groups[0].name,'Orbit crew');
      assert.deepEqual((await client.execute('SELECT name FROM _loopshift_migrations ORDER BY name')).rows,ledger);
      await client.execute('UPDATE players SET last_submit_at=0');
      await call(DB,'scores',{score:20,duration:2});assert.equal((await call(DB,'leaderboard')).data.me.best,612);
    }
  } finally {client.close();await rm(dir,{recursive:true,force:true});}
});

test('remote migration batches roll back their ledger and schema together on failure', async () => {
  const dir=await mkdtemp(join(tmpdir(),'loop-migration-')),client=createClient({url:'file::memory:'});
  try {
    const file=join(dir,'0000_test.sql');
    await writeFile(file,'CREATE TABLE test_score (score INTEGER);\n--> statement-breakpoint\nINVALID SQL');
    await assert.rejects(migrateDatabase(client,dir),/no partial migration/);
    assert.equal((await client.execute("SELECT name FROM sqlite_master WHERE name='test_score'")).rows.length,0);
    assert.equal((await client.execute('SELECT name FROM _loopshift_migrations')).rows.length,0);
    await writeFile(file,'CREATE TABLE test_score (score INTEGER);');await migrateDatabase(client,dir);
    await client.execute('INSERT INTO test_score VALUES (612)');await migrateDatabase(client,dir);
    assert.equal((await client.execute('SELECT score FROM test_score')).rows[0].score,612);
  } finally {client.close();await rm(dir,{recursive:true,force:true});}
});

test('remote storage refuses untracked databases and refuses to rerun the historical reset on old player data',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'loop-legacy-'));let client=createClient({url:'file::memory:'});
  try{
    await client.execute('CREATE TABLE players (score INTEGER)');await client.execute('INSERT INTO players VALUES(612)');
    await assert.rejects(migrateDatabase(client,migrations),/no Loop Shift migration history/);
    assert.equal((await client.execute('SELECT score FROM players')).rows[0].score,612);
    client.close();client=createClient({url:'file::memory:'});
    for(const name of (await readdir(migrations)).filter(name=>name.endsWith('.sql')&&name<'0003'))await cp(join(migrations,name),join(dir,name));
    await migrateDatabase(client,dir);
    await client.execute("INSERT INTO players(id,name,best,achieved_at) VALUES('old','Giri',612,1)");
    await assert.rejects(migrateDatabase(client,migrations),/will not delete existing players/);
    assert.equal((await client.execute('SELECT best FROM players')).rows[0].best,612);
  }finally{client.close();await rm(dir,{recursive:true,force:true});}
});

test('overlapping starts commit each migration only once',async()=>{
  const client=createClient({url:'file::memory:'});
  try{
    const migrationCount=(await readdir(migrations)).filter(name=>name.endsWith('.sql')).length;
    await Promise.all([migrateDatabase(client,migrations),migrateDatabase(client,migrations)]);
    assert.equal((await client.execute('SELECT COUNT(*) AS n FROM _loopshift_migrations')).rows[0].n,migrationCount);
    await client.execute("INSERT INTO players(id,name,best,achieved_at) VALUES('giri','Giri',612,1)");
    await Promise.all([migrateDatabase(client,migrations),migrateDatabase(client,migrations)]);
    assert.equal((await client.execute('SELECT best FROM players')).rows[0].best,612);
  }finally{client.close();}
});

test('remote credentials, URLs and failures cannot silently create a local replacement database',async t=>{
  const dir=await mkdtemp(join(tmpdir(),'loop-storage-')),local=join(dir,'must-not-exist');
  try{
    const config=databaseConfig('libsql://scores-player.turso.io','fake-private-token');
    assert.equal(config.url,'https://scores-player.turso.io');
    for(const url of ['http://scores-player.turso.io','file:/tmp/a','https://turso.io.evil.test','https://evil.test','https://user:password@scores-player.turso.io','https://scores-player.turso.io/?token=x']){
      assert.throws(()=>databaseConfig(url,'fake-private-token'),/Turso/);
    }
    await assert.rejects(openStorage({LOOPSHIFT_DATA_DIR:local,TURSO_DATABASE_URL:config.url}),/both TURSO/);
    await assert.rejects(openStorage({LOOPSHIFT_DATA_DIR:local,TURSO_AUTH_TOKEN:'fake-private-token'}),/both TURSO/);
    await assert.rejects(openStorage({LOOPSHIFT_DATA_DIR:local,LOOPSHIFT_REQUIRE_REMOTE_DB:'true'}),/Remote database required/);
    const fetchMock=t.mock.method(globalThis,'fetch',async()=>new Response('fake-private-token',{status:401}));
    await assert.rejects(openStorage({LOOPSHIFT_DATA_DIR:local,TURSO_DATABASE_URL:config.url,TURSO_AUTH_TOKEN:'fake-private-token'}),error=>/No local fallback/.test(error.message)&&!error.message.includes('fake-private-token'));
    assert.ok(fetchMock.mock.calls.length>0);fetchMock.mock.restore();
    await assert.rejects(access(local),{code:'ENOENT'});
    const response=await storageHealth({kind:'turso',DB:{prepare(){throw Error('fake-private-token');}}});
    assert.equal(response.status,503);assert.equal((await response.text()).includes('fake-private-token'),false);
  }finally{await rm(dir,{recursive:true,force:true});}
});

test('a configured disk directory preserves local scores and health reports storage type honestly',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'loop-disk-'));let storage;
  try{
    storage=await openStorage({LOOPSHIFT_DATA_DIR:dir,RENDER:'true'});
    assert.match(storage.description,/persistent disk/);
    await call(storage.DB,'player',{name:'Giri'});await call(storage.DB,'scores',{score:612,duration:10});storage.DB.close();
    storage=await openStorage({LOOPSHIFT_DATA_DIR:dir});
    assert.equal((await call(storage.DB,'leaderboard')).data.me.best,612);
    assert.deepEqual(await (await storageHealth(storage)).json(),{ok:true,storage:'local-sqlite'});
    await assert.rejects(openStorage({LOOPSHIFT_DATA_DIR:'relative/path'}),/absolute/);
  }finally{storage?.DB.close();await rm(dir,{recursive:true,force:true});}
});

test('the actual Node server saves with its cookie and keeps the score after a process restart on the same disk',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'loop-server-'));let running;
  async function start(){
    const child=spawn(process.execPath,[new URL('../scripts/serve.mjs',import.meta.url).pathname],{env:{PORT:'0',LOOPSHIFT_HOST:'127.0.0.1',LOOPSHIFT_DATA_DIR:dir,NODE_NO_WARNINGS:'1'},stdio:['ignore','pipe','pipe']});
    let output='';
    const url=await new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>{child.kill();reject(Error('Server did not become ready'));},5000);
      child.on('error',error=>{clearTimeout(timer);reject(error);});
      child.on('exit',()=>{clearTimeout(timer);reject(Error('Server exited before startup'));});
      child.stdout.on('data',chunk=>{output+=chunk;const found=output.match(/Loop Shift: (http:\/\/127\.0\.0\.1:\d+)/);if(found){clearTimeout(timer);resolve(found[1]);}});
    });
    return {url,async stop(){await new Promise(resolve=>{child.once('exit',resolve);child.kill();});}};
  }
  try{
    running=await start();
    const request=(path,body,cookie='')=>fetch(running.url+'/api/'+path,{method:body?'POST':'GET',headers:{'Content-Type':'application/json','x-loopshift-season':'2',Cookie:cookie},body:body?JSON.stringify(body):undefined});
    const created=await request('player',{name:'Giri'});assert.equal(created.status,200);
    const cookie=created.headers.get('set-cookie').split(';')[0];
    assert.equal((await request('scores',{score:612,duration:10},cookie)).status,200);
    assert.deepEqual(await (await request('health')).json(),{ok:true,storage:'local-sqlite'});
    await running.stop();running=await start();
    const board=await (await request('leaderboard',null,cookie)).json();
    assert.equal(board.me.best,612);assert.equal(board.me.name,'Giri');assert.equal(board.entries[0].score,612);
    assert.equal((await request('health',{})).status,404,'Health is read-only');
  }finally{await running?.stop();await rm(dir,{recursive:true,force:true});}
});
