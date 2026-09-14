import test from 'node:test';
import assert from 'node:assert/strict';
import {uiHarness} from './ui-harness.mjs';
const snapshot=time=>({time,angle:time,radius:.385,color:'#d6ff62',shield:1,radii:[.27,.385],rows:[{angle:time+.08,hazards:[1],safe:0,open:false,collected:false}]});
const result={name:'Giri',title:'Perfect Pilot',score:1234,level:13,chain:7,ranked:true,mode:'100-level run',url:'https://game.test/loop-shift/#home'};
test('replay keeps only the last three seconds, ends at collision, and resets without touching game state',()=>{
  const h=uiHarness();h.load('result-tools.js');const tools=h.scope.window.LoopShiftResults;tools.reset();
  for(let i=0;i<1200;i++)tools.capture(snapshot(i/120));
  tools.capture(snapshot(10),true);tools.finish(result,{angle:10.08,lane:1,safe:0});
  assert.equal(h.nodes.get('result-extras').hidden,false);assert.equal(h.nodes.get('replay-panel').hidden,false);assert.match(h.nodes.get('replay-caption').textContent,/3\.0 seconds/);
  const frozen=JSON.stringify(result);h.click('replay-play');h.frame(0);h.frame(3000);assert.ok(h.raf.size);h.frame(6100);assert.equal(h.raf.size,0);
  assert.ok(h.painted.some(p=>p[0]==='SAFE: RING 1'));assert.equal(JSON.stringify(result),frozen);
  h.click('replay-play');assert.ok(h.raf.size);tools.reset();assert.equal(h.raf.size,0);assert.equal(h.nodes.get('result-extras').hidden,true);
  tools.finish(result,null);assert.equal(h.nodes.get('replay-panel').hidden,true,'Completed courses have no fake collision replay');
});
test('closing a replay or leaving the tab cancels its animation',()=>{
  const h=uiHarness();h.load('result-tools.js');const tools=h.scope.window.LoopShiftResults;
  tools.capture(snapshot(0));tools.capture(snapshot(1));tools.finish(result,{angle:1,lane:1,safe:0});
  h.click('replay-play');h.nodes.get('replay-panel').open=false;h.nodes.get('replay-panel').events.toggle();assert.equal(h.raf.size,0);
  h.click('replay-play');h.scope.document.hidden=true;h.events.visibilitychange();assert.equal(h.raf.size,0);
});
test('result cards use the finished score/name/level/chain and provide PNG and text fallbacks',async()=>{
  let copied='';const h=uiHarness({navigator:{clipboard:{writeText:async text=>copied=text}}});h.load('result-tools.js');const tools=h.scope.window.LoopShiftResults;
  tools.finish(result,null);await h.click('card-create');
  assert.ok(h.painted.some(p=>p[0]==='Giri'));assert.ok(h.painted.some(p=>p[0]==='1,234'));assert.ok(h.painted.some(p=>p[0]==='13'));assert.ok(h.painted.some(p=>p[0]==='7'));
  assert.equal(h.nodes.get('card-preview').hidden,false);assert.match(h.nodes.get('card-download').href,/^blob:/);assert.equal(h.nodes.get('card-game-link').href,result.url);
  await h.click('card-share');assert.match(copied,/1234/);assert.match(copied,/https:\/\/game.test\/loop-shift\/#home/);
  tools.reset();assert.equal(h.nodes.get('card-preview').hidden,true);
});
test('file sharing is user-triggered and a stale card cannot appear after retry',async()=>{
  const sent=[];const h=uiHarness({navigator:{canShare:()=>true,share:async value=>sent.push(value)}});h.load('result-tools.js');const tools=h.scope.window.LoopShiftResults;
  tools.finish(result,null);const pending=h.click('card-create');tools.reset();await pending;assert.equal(h.nodes.get('card-preview').hidden,true);assert.equal(sent.length,0);
  tools.finish(result,null);await h.click('card-create');assert.equal(sent.length,0);await h.click('card-share');assert.equal(sent[0].files[0].type,'image/png');assert.equal(sent[0].url,result.url);tools.reset();
});
