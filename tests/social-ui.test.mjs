import test from 'node:test';
import assert from 'node:assert/strict';
import {uiHarness,settle} from './ui-harness.mjs';
import {openDatabase} from '../scripts/sqlite-adapter.mjs';
import {api} from '../server/api.js';
const migrations=new URL('../drizzle/',import.meta.url).pathname;
async function fixture(){
  const DB=openDatabase(':memory:',migrations);let user='alice',offline=false;const calls=[];
  const request=async(path,data)=>{
    calls.push(path);if(offline)throw new Error('Offline');
    const response=await api(new Request('https://game.test/api/'+path,{method:data?'POST':'GET',headers:{'Content-Type':'application/json','x-loopshift-season':'2','oai-authenticated-user-id':user},body:data?JSON.stringify(data):undefined}),{DB});
    const result=await response.json();if(!response.ok){const error=new Error(result.error);error.status=response.status;throw error;}return result;
  };
  const alice=(await request('player',{name:'Alice'})).me;user='bob';const bob=(await request('player',{name:'Bob'})).me;user='alice';
  const load=(storage=new Map())=>{const h=uiHarness({storage,window:{LoopShiftBoard:{request,player:()=>user==='alice'?alice:bob,refresh:async()=>{},askName(){}}}});h.load('social.js');return h;};
  return {DB,request,alice,bob,load,calls,offline(value){offline=value;},user(value){user=value;}};
}
test('community retry survives a reload, never double-counts and reveals earned trophies/titles',async()=>{
  const f=await fixture();
  try{
    const h=f.load();await settle();const social=h.scope.window.LoopShiftSocial;
    const attempt=social.begin('endless');const started=await attempt.started;
    f.DB.sqlite.prepare('UPDATE social_runs SET started_at=? WHERE token=?').run(Date.now()-120000,started.token);
    f.offline(true);await social.finish(attempt,{kind:'endless',sparks:20,chain:5,clean:5,cleared:10,bosses:1,duration:120});assert.equal(h.nodes.get('retry-social').hidden,false);
    f.offline(false);const reload=f.load(h.storage);await settle();await reload.scope.window.LoopShiftSocial.refresh();
    assert.equal((await f.request('social')).community.total,20);assert.equal(reload.nodes.get('boss-collection').children[0].className,'boss-trophy earned');
    assert.equal(reload.nodes.get('title-options').children[1].disabled,false);assert.equal(reload.nodes.get('title-options').children[3].disabled,true);
    await reload.nodes.get('title-options').children[1].events.click();assert.equal((await f.request('social')).collection.title,'perfect-pilot');
    await reload.click('retry-social');assert.equal((await f.request('social')).community.total,20);
  }finally{f.DB.close();}
});
test('an interrupted reward queue cannot be submitted for another player',async()=>{
  const f=await fixture();
  try{
    const h=f.load();await settle();const social=h.scope.window.LoopShiftSocial,attempt=social.begin('endless');await attempt.started;
    f.offline(true);await social.finish(attempt,{kind:'endless',sparks:1,chain:0,clean:0,cleared:0,bosses:0,duration:1});
    f.offline(false);f.user('bob');social.identity(f.bob);await settle();await h.click('retry-social');
    assert.equal((await f.request('social')).community.total,0);assert.equal((await f.request('social')).collection.bosses,0);
    f.user('alice');social.identity(f.alice);await settle();assert.equal((await f.request('social')).community.total,1);
  }finally{f.DB.close();}
});
test('private group UI creates, displays codes, joins and renders member names as text',async()=>{
  const f=await fixture();
  try{
    const h=f.load();await settle();h.nodes.get('new-group-name').value='Orbit crew';h.nodes.get('group-create-form').events.submit({preventDefault(){}});await settle();
    assert.equal(h.nodes.get('group-name').textContent,'Orbit crew');const code=h.nodes.get('group-invite').textContent;assert.match(code,/^[A-F0-9]{12}$/);
    f.user('bob');h.scope.window.LoopShiftSocial.identity(f.bob);await settle();h.nodes.get('join-group-code').value=code;h.nodes.get('group-join-form').events.submit({preventDefault(){}});await settle();
    assert.equal(h.nodes.get('friend-rows').children.length,2);assert.ok(h.nodes.get('friend-rows').children.some(row=>row.children[1].textContent==='Bob · You'));
    await h.click('group-copy');assert.equal(h.nodes.get('group-copy-text').hidden,false);assert.match(h.nodes.get('group-copy-text').value,/Invite code:/);
    h.scope.window.LoopShiftSocial.identity(null);assert.equal(h.nodes.get('group-view').hidden,true);assert.equal(h.nodes.get('group-copy-text').hidden,true);
  }finally{f.DB.close();}
});
