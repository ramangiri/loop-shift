import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {uiHarness,settle} from './ui-harness.mjs';
test('game boot, weekly start, loss tools, reward submission and instant retry work together',async()=>{
  const writes=[],player={key:'alice',name:'Alice'},state={collection:{bosses:0,titles:0,title:''},community:{week:'2026-09-14',total:0,mine:0,goal:100000,unlocked:false}};
  const challenge={kind:'weekly',token:'weekly',seed:42,week:'2026-09-14',rule:{id:'one-shield',name:'One Shield Maximum'}};
  const board={player:()=>player,ready:()=>true,best:()=>100,beginRound(){},onBest(){},onProgress(){},saveProgress(){},target:()=>null,refresh:async()=>{},
    beginWeekly:async callback=>callback(challenge),submit:(...args)=>writes.push(['score',...args]),
    request:async(path,data)=>{writes.push([path,data]);if(path==='weekly')return {challenge};if(path==='social/start')return {token:'community'};if(path==='groups')return {groups:[]};return state;}};
  const h=uiHarness({window:{LoopShiftBoard:board,scrollTo(){},devicePixelRatio:1}}),noop=()=>{};
  h.scope.document.body={style:{setProperty(){}},dataset:{},classList:{toggle(){}}};h.scope.location.hash='#home';
  h.scope.history={state:null,pushState(state,_,hash){this.state=state;h.scope.location.hash=hash;},replaceState(state,_,hash){this.state=state;h.scope.location.hash=hash;},back(){h.scope.location.hash='#home';}};
  h.scope.matchMedia=()=>({matches:false});h.scope.ResizeObserver=class{observe(){}};
  for(const node of h.nodes.values())node.getBoundingClientRect=()=>({width:390});
  h.nodes.get('charge').children=Array.from({length:6},()=>({classList:{toggle:noop}}));
  for(const file of ['social.js','result-tools.js','music.js','game.js'])h.load(file);
  await settle();assert.equal(h.nodes.get('game-screen').hidden,true);
  await h.click('weekly-play');await settle();assert.equal(h.nodes.get('preplay-dialog').open,true);await h.click('preplay-go');await settle();assert.equal(h.nodes.get('game-screen').hidden,false);
  assert.equal(vm.runInContext('roundKind',h.scope),'weekly');assert.equal(vm.runInContext('shieldCapacity()',h.scope),1);
  vm.runInContext(`startDelay=0;for(let i=0;i<120;i++)update(1/120);crash({angle,hazardLane:lane,sparkLane:1-lane})`,h.scope);await settle();
  assert.equal(h.nodes.get('result-extras').hidden,false);assert.equal(h.nodes.get('replay-panel').hidden,false);
  assert.ok(writes.some(x=>x[0]==='social/finish'));assert.equal(writes.find(x=>x[0]==='score')[3].kind,'weekly');
  h.click('replay-play');const count=writes.length;await h.click('card-create');assert.equal(h.nodes.get('card-preview').hidden,false);assert.equal(writes.length,count,'Viewing and generating a card cannot submit another run');
  await h.click('play');await settle();assert.equal(h.nodes.get('result-extras').hidden,true);assert.equal(h.nodes.get('replay-panel').open,false);assert.equal(vm.runInContext('mode',h.scope),'playing');
  assert.equal(vm.runInContext('roundKind',h.scope),'weekly');assert.equal(vm.runInContext('startDelay',h.scope),.45);
  h.scope.window.LoopShiftResults.reset();
});
