import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {api} from '../server/api.js';
import {openDatabase} from '../scripts/sqlite-adapter.mjs';
import {uiHarness,settle,waitFor} from './ui-harness.mjs';

function fixture(){
  const DB=openDatabase(':memory:',new URL('../drizzle/',import.meta.url).pathname);
  const call=async(path,data,user)=>{
    const response=await api(new Request('https://game.test/api/'+path,{method:data?'POST':'GET',headers:{'Content-Type':'application/json','x-loopshift-season':'2',...(user?{'oai-authenticated-user-id':user}:{})},body:data?JSON.stringify(data):undefined}),{DB});
    return {response,data:await response.json()};
  };
  const save=async(user,score)=>{DB.sqlite.exec('UPDATE players SET last_submit_at=0');return call('scores',{score,duration:10},user);};
  return {DB,call,save};
}
function client(call,state,storage=new Map([['loop-shift-best-v2','612']])){
  const h=uiHarness({storage,window:{scrollTo(){},devicePixelRatio:1}});
  Object.assign(h.scope,{AbortController,TypeError,matchMedia:()=>({matches:false}),ResizeObserver:class{observe(){}}});
  h.scope.document.body={style:{setProperty(){}},dataset:{},classList:{toggle(){}}};
  h.scope.location.hash='#home';h.scope.history={state:null,pushState(){},replaceState(){},back(){}};
  h.scope.fetch=async(url,opts)=>{
    if(state.offline)throw new TypeError('offline');
    const result=await call(url.replace('./api/',''),opts.body?JSON.parse(opts.body):null,state.user);
    return new Response(JSON.stringify(result.data),{status:result.response.status,headers:result.response.headers});
  };
  for(const node of h.nodes.values()){
    node.getBoundingClientRect=()=>({width:390});node.showModal=()=>{node.open=true;};node.close=()=>{node.open=false;};
  }
  h.nodes.get('charge').children=Array.from({length:6},()=>({classList:{toggle(){}}}));
  storage.set('loop-shift-preplay-v2','true');h.load('leaderboard.js');h.load('game.js');
  h.board=h.scope.window.LoopShiftBoard;
  h.ready=()=>waitFor(()=>h.board.record().connection!=='connecting');
  h.run=code=>vm.runInContext(code,h.scope);
  h.value=id=>h.nodes.get(id).textContent;
  return h;
}

test('device 612 never becomes an anonymous online record or another player’s ranked score',async()=>{
  const {DB,call,save}=fixture();
  try{
    await call('player',{name:'Giri'},'giri');await save('giri',32);
    await call('player',{name:'Leader'},'leader');await save('leader',800);
    const state={user:null},h=client(call,state);await h.ready();
    assert.equal(h.value('home-best'),'—');assert.equal(h.value('device-best'),'612');
    assert.equal(h.value('player-label'),'Ready to play?');assert.equal(h.board.ready(),false);
    assert.match(h.value('board-you'),/Add a name/);
    assert.equal(h.nodes.get('board-add-name').hidden,false);
    assert.equal((await call('leaderboard',null,'giri')).data.me.best,32,'Legacy local score is never fabricated into a submission');
    state.user='giri';await h.board.refresh(true);
    assert.equal(h.value('home-best'),'032');assert.equal(h.value('home-best-label'),'ONLINE BEST');
    assert.equal(h.value('player-label'),'Giri');assert.match(h.value('board-you'),/rank: #2 · Best: 32/);
    assert.equal(h.nodes.get('board-rows').children[1].children[1].textContent,'Giri · You');
    assert.equal(h.nodes.get('board-rows').children[1].children[2].textContent,'32');
    assert.equal(h.value('device-best'),'612');assert.equal(h.nodes.get('device-record').hidden,false);
    assert.equal(h.value('home-best-note'),'100 levels · Saved online');
  }finally{DB.close();}
});

test('a completed 612-point round stays pending until saved, then Home and the own row both show 612',async()=>{
  const {DB,call,save}=fixture();
  try{
    await call('player',{name:'Giri'},'giri');await save('giri',32);
    const state={user:'giri'},h=client(call,state);await h.ready();
    h.run('start();startDelay=0;score=612;gameTime=10;');
    state.offline=true;h.run('crash();');await settle();
    assert.equal(h.value('home-best'),'032');assert.match(h.value('home-best-note'),/612 points waiting to save/);
    assert.equal(h.nodes.get('retry-home-score').hidden,false);
    assert.equal((await call('leaderboard',null,'giri')).data.me.best,32);
    state.offline=false;DB.sqlite.exec('UPDATE players SET last_submit_at=0');
    await h.click('retry-home-score');await settle();
    assert.equal(h.value('home-best'),'612');assert.equal(h.value('best'),'612');
    assert.equal(h.value('best-label'),'ONLINE BEST');
    assert.equal(h.nodes.get('board-rows').children[0].children[2].textContent,'612');
    assert.equal(h.nodes.get('retry-home-score').hidden,true);assert.equal(h.nodes.get('device-record').hidden,true);
    DB.sqlite.exec('UPDATE players SET last_submit_at=0');await h.board.submit(25,2);
    assert.equal(h.value('home-best'),'612','A later low score cannot lower either record');
    const reload=client(call,state,h.storage);await reload.ready();
    assert.equal(reload.value('home-best'),'612');assert.match(reload.value('board-you'),/Best: 612/);
    state.offline=true;await reload.board.refresh(true);
    assert.equal(reload.value('home-best'),'612');assert.match(reload.value('home-best-note'),/Last synced · Offline/);
  }finally{DB.close();}
});

test('lost identity clears stale nickname; queued results cannot transfer to another profile',async()=>{
  const {DB,call,save}=fixture();
  try{
    const original=(await call('player',{name:'Giri'},'giri')).data.me;
    await save('giri',32);await call('player',{name:'Other'},'other');
    const state={user:'giri'},h=client(call,state);await h.ready();
    state.offline=true;await h.board.submit(612,10);
    state.offline=false;state.user=null;await h.board.refresh(true);
    assert.equal(h.value('home-best'),'—');assert.equal(h.value('player-label'),'Ready to play?');assert.equal(h.board.ready(),false);
    assert.equal(h.board.player(),null);assert.equal(h.nodes.get('retry-home-score').hidden,true);
    state.user='other';await h.board.refresh(true);await settle();
    assert.equal(h.value('home-best'),'000');assert.equal(h.board.record().pending,0);
    assert.equal((await call('leaderboard',null,'other')).data.me.best,0);
    for(const path of ['scores','daily/score','weekly/score']){
      const result=await call(path,{playerKey:original.key,score:612,duration:10},'other');
      assert.equal(result.response.status,401,'A cookie change cannot assign a pending result to its new owner');
    }
    state.user='giri';DB.sqlite.exec('UPDATE players SET last_submit_at=0');await h.board.refresh(true);await waitFor(()=>h.value('home-best')==='612');
    assert.equal(h.value('home-best'),'612','The original identity can retry its retained queue');
    assert.equal((await call('leaderboard',null,'other')).data.me.best,0);
    // The cookie can also change between a round starting and the score POST, without a refresh first.
    state.user='other';await h.board.submit(900,10);await settle();
    assert.equal(h.value('home-best'),'000');assert.equal((await call('leaderboard',null,'other')).data.me.best,0);
    assert.equal(JSON.parse(h.storage.get('loop-shift-score-queue-v3:'+original.key))[0].score,900);
  }finally{DB.close();}
});

test('Daily and Weekly refreshes keep Home on the current player’s latest 100-level best',async()=>{
  const {DB,call,save}=fixture();
  try{
    await call('player',{name:'Giri'},'giri');await save('giri',32);
    await call('player',{name:'New player'},'new');await save('new',75);
    const state={user:'giri'},h=client(call,state);await h.ready();
    await h.click('board-daily');await h.board.refresh(true);
    await save('giri',200);await h.board.refresh(true);
    assert.equal(h.value('home-best'),'200');assert.equal(h.value('board-title'),'🏆 Daily Top 10');
    assert.match(h.value('board-you'),/first score/,'Daily has no score, while main still has 200');
    state.user='new';await h.board.refresh(true);
    assert.equal(h.value('home-best'),'075');assert.equal(h.value('player-label'),'New player');
    await h.click('board-weekly');await h.board.refresh(true);await save('new',280);await h.board.refresh(true);
    assert.equal(h.value('home-best'),'280');assert.equal(h.value('board-title'),'🏆 Weekly Top 10');
    assert.match(h.value('board-you'),/first score/);
    await h.click('board-endless');await h.board.refresh(true);
    assert.equal(h.nodes.get('board-rows').children[0].children[2].textContent,'280');
  }finally{DB.close();}
});
