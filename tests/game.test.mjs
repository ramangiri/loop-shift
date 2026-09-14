import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const root = fileURLToPath(new URL('../', import.meta.url));
const web = join(root, 'www');
const html = readFileSync(join(web, 'index.html'), 'utf8');
const code = readFileSync(join(web, 'game.js'), 'utf8');
const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);
assert.equal(new Set(ids).size, ids.length, 'HTML IDs must be unique');
for (const match of code.matchAll(/\$\('([^']+)'\)/g)) assert.ok(ids.includes(match[1]), `Missing control: ${match[1]}`);
for (const match of html.matchAll(/(?:src|href)="(\.\/[^"#]+)"/g)) assert.ok(existsSync(resolve(web, match[1])), `Missing asset: ${match[1]}`);
for (const file of ['game.js', 'leaderboard.js', 'music.js', 'sw.js']) execFileSync(process.execPath, ['--check', join(web, file)]);
const manifest = JSON.parse(readFileSync(join(web, 'manifest.webmanifest'), 'utf8'));
for (const icon of manifest.icons) assert.ok(existsSync(resolve(web, icon.src)));

function game(native = false, saved = null, reduced = false) {
  const noop = () => {};
  const listeners = {}, nodes = new Map();
  const paint = new Proxy({}, { get: (o, k) => o[k] || noop, set: (o, k, v) => (o[k] = v, true) });
  let focus = '', minimized = false, vibration = 0;
  for (const id of ids) nodes.set(id, {
    id, hidden: false, disabled: false, textContent: '', innerHTML: '', attrs: {}, handlers: {}, style: {}, dataset: {},
    children: Array.from({ length: 6 }, () => ({ classList: { toggle: noop } })),
    classList: { toggle: noop, add: noop, remove: noop },
    setAttribute(k, v) { this.attrs[k] = v; }, addEventListener(k, fn) { this.handlers[k] = fn; },
    focus() { focus = id; }, getBoundingClientRect: () => ({ width: nodes.get('game-screen').hidden ? 0 : 390 }), getContext: () => paint
  });
  const location = { hash: '', protocol: native ? 'capacitor:' : 'https:' };
  const stack = [{ state: null, hash: '' }];
  const history = {
    index: 0, state: null,
    pushState(s, _, h) { stack.splice(++this.index); stack.push({ state: s, hash: h }); this.state = s; location.hash = h; },
    replaceState(s, _, h) { stack[this.index] = { state: s, hash: h }; this.state = s; location.hash = h; },
    back() { if (this.index > 0) { const e = stack[--this.index]; this.state = e.state; location.hash = e.hash; listeners.popstate?.(); } }
  };
  const store = saved || new Map([['loop-shift-best-v2', '143']]);
  let seed=42;const seededMath=Object.create(Math);seededMath.random=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);
  const sandbox = {
    console, Math: seededMath, location, history, performance: { now: () => 0 },
    document: { getElementById: id => nodes.get(id), body: { style: {setProperty(){}}, dataset: {}, classList: { toggle: noop } }, title: '', addEventListener: (t, fn) => listeners[t] = fn },
    window: {
      devicePixelRatio: 2, scrollTo: noop, addEventListener: (t, fn) => listeners[t] = fn,
      LoopShiftNative: { isNative: native, minimize: () => { minimized = true; }, vibrate: ms => { vibration = ms; } }
    },
    navigator: {}, localStorage: { getItem: k => store.get(k), setItem: (k, v) => store.set(k, v) },
    matchMedia: () => ({ matches: reduced }), ResizeObserver: class { observe() {} },
    requestAnimationFrame: noop, setTimeout: () => 1, clearTimeout: noop
  };
  vm.createContext(sandbox); vm.runInContext(code, sandbox);
  return { run: text => vm.runInContext(text, sandbox), nodes, listeners, history,
    store, click: id => nodes.get(id).handlers.click({ preventDefault: noop }),
    minimized: () => minimized, vibration: () => vibration, focus: () => focus };
}

const t = game();
assert.equal(t.run('screen'), 'home');
assert.equal(t.nodes.get('home-best').textContent, '—');
assert.equal(t.nodes.get('device-best').textContent, '143');
t.click('home-play'); assert.equal(t.run('screen'), 'game'); assert.equal(t.focus(), 'shift');
const angle = t.run('angle'); t.run('update(.1)'); assert.equal(t.run('angle'), angle, 'Countdown must freeze motion');
t.run('for(let i=0;i<120;i++){totalTime+=1/60;update(1/60)}');
const snapshot = t.run('JSON.stringify({angle,score,lane,sparks})');
t.click('back-home'); assert.equal(t.run('mode'), 'paused');
t.run('for(let i=0;i<60;i++)update(1/60)'); assert.equal(t.run('JSON.stringify({angle,score,lane,sparks})'), snapshot);
t.click('home-play'); assert.equal(t.run('JSON.stringify({angle,score,lane,sparks})'), snapshot);
t.history.back(); assert.equal(t.run('screen'), 'home'); assert.equal(t.run('mode'), 'paused');
t.click('home-new'); assert.equal(t.run('score'), 0);
for (let i = 0; i < 7200; i++) t.run('totalTime+=1/60;{const next=rows.find(r=>!r.passed);if(next&&next.angle-angle>0&&next.angle-angle<speedNow()*.65&&lane!==next.sparkLane)shift()}update(1/60)');
assert.equal(t.run('mode'), 'playing'); assert.ok(t.run('score') > 500); assert.ok(t.run('level') > 3); assert.ok(t.run('shield'));
t.run('rows=[{pattern:"classic",locked:true,angle:angle+.3,hazardLane:lane,sparkLane:1-lane,collected:false,hit:false,passed:false}];for(let i=0;i<60&&shield;i++)update(1/60)');
assert.equal(t.run('shield'), 0); assert.equal(t.run('mode'), 'playing');
t.run('invulnerable=0;rows=[{pattern:"classic",locked:true,angle:angle+.3,hazardLane:lane,sparkLane:1-lane,collected:false,hit:false,passed:false}];for(let i=0;i<60&&mode==="playing";i++)update(1/60)');
assert.equal(t.run('mode'), 'over'); assert.ok(t.run('best') > 500); t.run('draw(1000,.016)');

// Use the real input and update loop to verify timing rewards and their failure boundaries.
function timing(seconds=.29, doubleTap=false){
  return `startDelay=0;lastShift=-1;rows=[];addRow(angle+speedNow()*${seconds},0);
    rows[0].hazardLane=lane;rows[0].hazardLanes=[lane];rows[0].sparkLane=1-lane;radius=laneRadius(lane);
    globalThis.target=rows[0];shift();
    ${doubleTap?'for(let i=0;i<7;i++)update(1/60);shift();':''}
    for(let i=0;i<90&&!target.passed&&mode==='playing';i++)update(1/60);`;
}
const p=game();p.click('home-play');
p.run(timing());assert.equal(p.run('perfects'),1);assert.equal(p.run('score'),36);
assert.equal(p.run('combo'),1);assert.equal(p.run('feverCharge'),1);
p.run(timing());assert.equal(p.run('multiplier()'),2);assert.equal(p.run('perfects'),2);
p.run(timing());assert.equal(p.run('multiplier()'),3);
p.run(timing());p.run(timing());assert.equal(p.run('multiplier()'),5);
p.run(timing());assert.equal(p.run('feverTime'),5);assert.equal(p.run('scoreFactor()'),10);
assert.equal(p.run('roundFevers'),1);assert.equal(p.run('progress.perfects'),6);
const earned=p.run('score');p.run('awardPerfect(target)');assert.equal(p.run('score'),earned,'One perfect award per barrier');
p.run('rows=[];addRow(angle+.15,0);rows[0].hazardLane=lane;rows[0].hazardLanes=[lane];rows[0].sparkLane=1-lane;radius=laneRadius(lane);update(.035);update(.035)');
assert.equal(p.run('mode'),'playing','Fever absorbs hits');assert.equal(p.run('shield'),1,'Fever preserves shield');
const frozen=p.run('JSON.stringify({gameTime,feverTime,combo,rows})');p.click('back-home');p.run('update(.5)');
assert.equal(p.run('JSON.stringify({gameTime,feverTime,combo,rows})'),frozen,'Pause freezes Fever and patterns');
p.click('home-play');p.run('update(.5)');assert.equal(p.run('JSON.stringify({gameTime,feverTime,combo,rows})'),frozen,'Resume countdown freezes Fever');
p.run('startDelay=0;feverTime=.02;rows=[];update(.025)');assert.equal(p.run('feverTime'),0);assert.equal(p.run('combo'),0);assert.equal(p.run('feverCharge'),0);

const early=game();early.click('home-play');early.run(timing(.6));assert.equal(early.run('perfects'),0,'Early shifts earn no perfect');
const spam=game();spam.click('home-play');spam.run('shield=1');spam.run(timing(.29,true));assert.equal(spam.run('perfects'),0,'Switching back invalidates perfect');
const late=game();late.click('home-play');late.run(timing(.08));assert.equal(late.run('perfects'),0,'Too-late shifts earn no perfect');
const normal=game();normal.click('home-play');normal.run(timing());normal.run(timing(.6));assert.equal(normal.run('combo'),0,'Ordinary dodge breaks chain');
const fast=game();fast.click('home-play');fast.run('level=12');fast.run(timing());assert.equal(fast.run('perfects'),1,'Timing window works at maximum speed');

// Persistent unlocks survive reload, stay selectable, and reject invalid saved choices.
p.run("progress.sparks=19;advanceMission('sparks');selectLook('cyan');selectLook('comet')");
assert.equal(p.nodes.get('look-cyan').disabled,false);assert.equal(p.nodes.get('look-prism').disabled,true);
p.run("selectLook('prism')");assert.equal(p.run('progress.ball'),'cyan','Locked look cannot be equipped');
const reloaded=game(false,p.store);assert.equal(reloaded.run('progress.ball'),'cyan');assert.equal(reloaded.run('progress.trail'),'comet');
reloaded.run("progress.fevers=2;advanceMission('fevers');progress.sparks=59;advanceMission('sparks');selectLook('prism');selectLook('stardust')");
assert.equal(reloaded.run('progress.ball'),'prism');assert.equal(reloaded.run('progress.trail'),'stardust');
const corrupt=game(false,new Map([['loop-shift-progress-v2','{"sparks":-1,"ball":"missing","trail":"stardust"}']]));
assert.equal(corrupt.run('progress.sparks'),0);assert.equal(corrupt.run('progress.trail'),'glow');

// Pattern warnings, settled geometry and open/closed collision states.
const patterns=game();patterns.click('home-play');patterns.run("startDelay=0;rows=[];addRow(angle+2,12);globalThis.moving=rows[0];moving.phase=0;update(.01)");
assert.equal(patterns.run('moving.announced'),true);assert.ok(patterns.nodes.get('pattern-notice').textContent.includes('MOVING'));
const movingAngle=patterns.run('moving.angle');patterns.run('update(.035)');assert.notEqual(patterns.run('moving.angle'),movingAngle);
patterns.run('moving.baseAngle=angle+.45;moving.angle=angle+.45;update(.01)');assert.equal(patterns.run('moving.locked'),true);
const locked=patterns.run('moving.angle');patterns.run('update(.035)');assert.equal(patterns.run('moving.angle'),locked);
patterns.run("rows=[];addRow(angle+2,24);globalThis.gate=rows[0];gate.phase=Math.PI/2-gameTime*2.4;update(.01)");
assert.equal(patterns.run('gate.open'),true);assert.ok(patterns.nodes.get('pattern-notice').textContent.includes('PULSE'));
patterns.run('gate.phase=-Math.PI/2-gameTime*2.4;update(.01)');assert.equal(patterns.run('gate.open'),false);
patterns.run('gate.angle=angle+.05;gate.locked=true;gate.open=true;gate.hazardLane=lane;gate.hazardLanes=[lane];radius=laneRadius(lane);update(.035)');
assert.equal(patterns.run('mode'),'playing','Open gap is safe');assert.equal(patterns.run('gate.hit'),false);
patterns.run('gate.angle=angle+.03;gate.open=false;shield=1;combo=3;update(.035)');
assert.equal(patterns.run('shield'),0);assert.equal(patterns.run('combo'),0);assert.equal(patterns.run('shatters.length'),10);
patterns.run('draw(1000,.016)');
const reduced=game(false,null,true);reduced.click('home-play');reduced.run('shatterShield();burst(angle,radius,C.lime);draw(1000,.016)');
assert.equal(reduced.run('shatters.length'),0);assert.equal(reduced.run('particles.length'),0);

const n = game(true);
n.click('home-play'); n.listeners['loopshift:pause'](); assert.equal(n.run('mode'), 'paused');
n.click('play'); n.listeners['loopshift:back'](); assert.equal(n.run('screen'), 'home'); assert.equal(n.run('mode'), 'paused');
n.listeners['loopshift:back'](); assert.ok(n.minimized());
n.run('vibrate(65)'); assert.equal(n.vibration(), 65);

console.log('PASS: gameplay, timing, combos, Fever, missions and pause/resume regression checks.');

// Progress through every ring milestone using legal adjacent moves.
const six=game();six.click('home-play');
six.run(`for(let i=0;i<180000&&level<100&&mode==='playing';i++){
  const next=rows.find(r=>!r.passed);
  if(next&&next.angle-angle>0&&next.angle-angle<speedNow()*.65&&lane!==next.sparkLane)shift();
  update(1/60);
}`);
assert.equal(six.run('mode'),'playing','Reachable safe path through six-ring progression');
assert.equal(six.run('ringCount'),6);assert.ok(six.run('level')>=100);
assert.equal(six.run('shieldCapacity()'),2);
six.run(`for(let i=0;i<10000&&mode==='playing';i++){
 const next=rows.find(r=>!r.passed);
 if(next&&next.angle-angle>0&&next.angle-angle<speedNow()*.65&&lane!==next.sparkLane)shift();
 update(1/60);
}`);
assert.equal(six.run('passes'),1200,'Finish after the final obstacle of Level 100');
assert.equal(six.run('level'),100);assert.equal(six.run('mode'),'over');
assert.equal(six.run("$('overlay-title').textContent"),'🏆 Loop Champion!');
assert.equal(six.run("$('level').textContent"),'100 / 100');
six.run('update(1)');assert.equal(six.run('passes'),1200,'Finished games stop progressing');
six.click('play');assert.equal(six.run('level'),1,'Replay starts a new challenge');

for(const [lv,count,capacity] of [[1,2,1],[2,3,1],[5,4,1],[9,5,2],[13,6,2],[100,6,2]]){
  six.run(`levelUp(${lv});rows=[];for(let i=0;i<120;i++)addRow(angle+2+i,i);`);
  assert.equal(six.run('ringCount'),count);assert.equal(six.run('shieldCapacity()'),capacity);
  assert.equal(six.run('rows.every((r,i)=>r.sparkLane>=0&&r.sparkLane<ringCount&&!blocks(r,r.sparkLane)&&(ringCount===2||blockedLanes(r).length===ringCount-1)&&(!i||Math.abs(r.sparkLane-rows[i-1].sparkLane)<=1))'),true);
  six.run('draw(1000,.016)');
}
assert.ok(six.run('speedNow()')<=1.9);
six.run('levelUp(10);shield=0;charge=0;for(let i=0;i<12;i++)collect({angle,sparkLane:lane});');
assert.equal(six.run('shield'),2);assert.equal(six.run('charge'),0);
six.run('levelBannerTime=0;startDelay=0;invulnerable=0;feverTime=0;radius=laneRadius(lane);rows=[{angle:angle+.02,hazardLane:lane,hit:false,passed:false,collected:true,open:false,locked:true,pattern:"classic"}];update(.02);');
assert.equal(six.run('shield'),1,'One hit consumes exactly one shield');
six.run('rows=[{angle:angle+.02,hazardLane:lane,hit:false,passed:false,collected:true,open:false,locked:true,pattern:"classic"}];update(.02);');
assert.equal(six.run('shield'),1,'Brief immunity protects the remaining shield');
six.run('start()');assert.equal(six.run('ringCount'),2);assert.equal(six.run('shield'),0);
console.log('PASS: progression to six rings, bounded speed, adjacent safe paths, two shield charges and hit grace.');

// Actual Space and pointer events must select the same previewed adjacent ring.
const keys=game();keys.click('home-play');
function key(code,id='shift',repeat=false){let prevented=false;keys.listeners.keydown({code,repeat,target:{id,closest:selector=>selector==='button, a'?{}:null},preventDefault(){prevented=true;}});return prevented;}
function tap(id='shift',extra={}){keys.nodes.get(id).handlers.pointerdown({button:0,isPrimary:true,target:{closest:()=>null},preventDefault(){},...extra});}
for(let lv=1;lv<=100;lv++){
  keys.run(`levelUp(${lv});levelBannerTime=0;startDelay=0;rows=[];addRow(angle+2,passes);updateGuide();`);
  for(let i=0;i<keys.run('ringCount')*2;i++){
    keys.run('gameTime+=.1');const before=keys.run('lane'),expected=keys.run('guidedTarget()');
    assert.equal(key('Space'),true);
    assert.equal(keys.run('lane'),expected,`Space follows the preview at level ${lv}`);
    assert.equal(Math.abs(expected-before),1);
    assert.ok(expected>=0&&expected<keys.run('ringCount'));
    keys.run(`lane=${before};gameTime+=.1`);
    tap(i%2?'game-screen':'shift',{clientX:i%2?0:999});
    assert.equal(keys.run('lane'),expected,`Tap location does not choose direction at level ${lv}`);
  }
}
keys.run('gameTime+=1');const unchanged=keys.run('lane');
key('Space','shift',true);assert.equal(keys.run('lane'),unchanged,'Holding Space never repeats');
tap('shift',{isPrimary:false});tap('shift',{button:2});assert.equal(keys.run('lane'),unchanged,'Secondary touches and right click do not shift');
tap('game-screen',{target:{closest:()=>({})}});assert.equal(keys.run('lane'),unchanged,'Menus do not trigger shifts');
keys.run('startDelay=1');key('Space');tap();assert.equal(keys.run('lane'),unchanged,'Countdown blocks both controls');
keys.run('startDelay=0;setPaused(true)');tap();assert.equal(keys.run('lane'),unchanged,'Paused game does not move');
keys.run('setPaused(false);startDelay=0;gameTime+=1;');key('Space');const moved=keys.run('lane');key('Space');tap();assert.equal(keys.run('lane'),moved,'Duplicate input stays debounced');
console.log('PASS: identical Space/touch targets at all 100 levels, countdown, pause, held keys and multitouch.');

const guide=game();guide.click('home-play');
guide.run('ringCount=6;level=13;lane=1;radius=laneRadius(1);startDelay=0;gameTime=2;rows=[{entryLane:1,sparkLane:2,angle:angle+1,passed:false},{entryLane:2,sparkLane:3,angle:angle+2,passed:false}];updateGuide();');
assert.match(guide.nodes.get('shift').attrs['aria-label'],/ring 3/);
guide.run('shift()');assert.equal(guide.run('lane'),2);assert.equal(guide.run('guidedTarget()'),1,'Extra taps return before the current wall clears');
guide.run('gameTime+=.1;shift()');assert.equal(guide.run('lane'),1);
guide.run('gameTime+=.1;shift();rows[0].passed=true');assert.equal(guide.run('guidedTarget()'),3,'Passing the wall advances the route');

// Identical daily seeds produce identical courses even when visual RNG and player position differ.
const dailyA=game(),dailyB=game(false,null,true);
for(const d of [dailyA,dailyB])d.run('start({token:"test",day:"2026-09-14",seed:1234,best:0});startDelay=0;');
const course=d=>d.run('JSON.stringify(rows.map(({baseAngle,phase,sparkLane,pattern})=>({baseAngle,phase,sparkLane,pattern})))');
assert.equal(course(dailyA),course(dailyB));
dailyA.run('for(let i=0;i<20;i++)burst(angle,radius,C.lime);lane=0;pathLane=1;levelUp(4)');
dailyB.run('lane=1;pathLane=1;levelUp(4)');
assert.equal(course(dailyA),course(dailyB),'Effects and lane choices must not alter tomorrow-independent daily course');
dailyA.run('setPaused(true)');const frozenDaily=dailyA.run('gameTime');dailyA.run('update(2)');assert.equal(dailyA.run('gameTime'),frozenDaily);
dailyA.run('setPaused(false);levelBannerTime=0;startDelay=0;rows=[];gameTime=119.99;update(.02)');
assert.equal(dailyA.run('gameTime'),120);assert.equal(dailyA.run('mode'),'over');assert.equal(dailyA.nodes.get('overlay-title').textContent,'Daily complete!');
assert.equal(dailyA.store.get('loop-shift-best-v2'),'143','Daily results must not overwrite Endless best');
const otherDay=game();otherDay.run('start({token:"new",day:"2026-09-15",seed:5678});');assert.notEqual(course(otherDay),course(dailyB));
const coaching=game();coaching.click('home-play');coaching.run('gameTime=8;lane=1;lastShift=7.9;crash({angle,sparkLane:1});');
assert.match(coaching.nodes.get('result-coaching').textContent,/earlier/);
assert.match(coaching.nodes.get('result-gap').textContent,/144/);
coaching.run('start();gameTime=8;lane=0;lastShift=7.9;crash({angle,sparkLane:1});');assert.match(coaching.nodes.get('result-coaching').textContent,/blocked ring/);
console.log('PASS: deterministic daily courses, visual RNG isolation, daily timer/pause, separate bests and collision-based coaching.');

// Level banner must not freeze the ball, controls, run clock or Fever.
const celebration=game();celebration.click('home-play');
celebration.run('startDelay=0;passes=12;levelUp(2);feverTime=3');
const beforeBanner=celebration.run('angle');
celebration.run('shift();update(.5)');assert.ok(celebration.run('angle')>beforeBanner);assert.equal(celebration.run('lane'),0);assert.equal(celebration.run('gameTime'),.5);assert.equal(celebration.run('feverTime'),2.5);
celebration.run('update(.9)');assert.equal(celebration.run('levelBannerTime'),0);assert.equal(celebration.run('startDelay'),0,'No countdown between levels');
assert.ok(celebration.run('rows[0].angle-angle')>0,'Next wall starts after a safe grace period');

// Practice can only select unlocked levels, and cannot submit scores or save rewards.
const practice=game();practice.run("journey.highest=10;$('practice-level').value='11';startPractice()");assert.equal(practice.run('mode'),'ready');
practice.run("globalThis.submitted=0;globalThis.saved=0;window.LoopShiftBoard={ready:()=>true,beginRound(){},submit(){submitted++},saveProgress(){saved++}};$('practice-level').value='10';startPractice();");
assert.equal(practice.run('level'),10);assert.equal(practice.run('roundKind'),'practice');
const original=practice.run('JSON.stringify([journey,progress,best])');
practice.run("startDelay=0;levelBannerTime=0;collect({angle,sparkLane:lane});perfects=10;finishLevel();crash(null,true)");
assert.equal(practice.run('JSON.stringify([journey,progress,best])'),original);assert.equal(practice.run('submitted+saved'),0);
assert.equal(practice.run("$('overlay-title').textContent"),'Practice complete!');
practice.click('play');assert.equal(practice.run('level'),10);assert.equal(practice.run('score'),0);

// Bosses alternate moving/pulse gates while retaining adjacent safe paths.
const boss=game();boss.click('home-play');boss.run('level=10;ringCount=5;rows=[];for(let i=0;i<30;i++)addRow(angle+2+i*rowSpacing(),i)');
assert.equal(boss.run("rows.every(r=>r.pattern==='classic')"),true);
assert.equal(boss.run('rows.every((r,i)=>!i||Math.abs(r.sparkLane-rows[i-1].sparkLane)===1)'),true);
assert.equal(boss.run('rows.every(r=>!blocks(r,r.sparkLane))'),true);

// Risk bonuses are optional, between barriers, and pay once per diamond.
const risk=game();risk.click('home-play');risk.run('startDelay=0;level=5;ringCount=3;rows=[];addRow(angle-.39,1);rows[0].locked=true;rows[0].passed=true;rows[0].collected=true;lane=rows[0].bonusLane;radius=laneRadius(lane);update(.02)');
assert.equal(risk.run('score'),40);risk.run('update(.01)');assert.equal(risk.run('score'),40);
assert.equal(risk.run('mode'),'playing');

// A missing objective does not block advancement. Saved milestones unlock themes/practice.
const objectiveCase=game();objectiveCase.click('home-play');objectiveCase.run('passes=12;levelSparks=0;levelUp(2)');assert.equal(objectiveCase.run('level'),2);assert.equal(objectiveCase.run('score'),0);
objectiveCase.run('level=9;passes=108;levelSparks=3;levelHits=0;levelUp(10)');assert.equal(objectiveCase.run('journey.highest'),10);assert.equal(objectiveCase.nodes.get('theme-ion').disabled,false);
objectiveCase.run('ghostTarget=108;passes=12;updateHUD()');assert.match(objectiveCase.nodes.get('ghost-status').textContent,/96 obstacles ahead/);
const fresh=game(false,new Map([['loop-shift-best','9999'],['loop-shift-progress-v1','{"sparks":99,"ball":"cyan"}']]));assert.equal(fresh.run('best'),0);assert.equal(fresh.run('progress.sparks'),0);
console.log('PASS: continuous level banner timing, unranked practice isolation, bosses, optional bonuses, fresh progress and theme unlocks.');

// Sprint finishes after five levels without submitting or advancing ranked rewards.
const sprint=game();sprint.run('globalThis.sends=0;window.LoopShiftBoard={refresh(){},beginRound(){},submit(){sends++},saveProgress(){sends++}};startSprint();');
sprint.run(`for(let i=0;i<20000&&mode==='playing';i++){
 const next=rows.find(r=>!r.passed);
 if(next&&next.angle-angle>0&&next.angle-angle<speedNow()*.65&&lane!==next.sparkLane)shift();
 update(1/60);
}`);
assert.equal(sprint.run('passes'),60);assert.equal(sprint.run('level'),5);assert.equal(sprint.run('mode'),'over');assert.equal(sprint.run('sends'),0);assert.equal(sprint.run('journey.highest'),1);assert.equal(sprint.run('progress.sparks'),0);
assert.equal(sprint.nodes.get('overlay-title').textContent,'Sprint complete!');sprint.click('play');assert.equal(sprint.run('startDelay'),.45);

// Training is ten seconds of actual input, spark collection and shield demonstration.
const training=game();training.run('globalThis.sends=0;window.LoopShiftBoard={refresh(){},beginRound(){},submit(){sends++},saveProgress(){sends++}};startTutorial();shift();');
training.run('for(let i=0;i<301;i++)update(1/60)');assert.equal(training.run('tutorialShift'),true);assert.equal(training.run('sparks'),1);assert.equal(training.run('shield'),1);
training.run('for(let i=0;i<310;i++)update(1/60)');assert.equal(training.run('gameTime'),10);assert.equal(training.run('mode'),'over');assert.equal(training.run('tutorialStage'),3);assert.equal(training.run('shield'),0);assert.equal(training.run('sends'),0);assert.equal(training.run('progress.sparks'),0);
training.click('play');training.click('skip-tutorial');assert.equal(training.run('screen'),'home');assert.notEqual(training.run('mode'),'playing');

const closeCall=game();closeCall.click('home-play');closeCall.run(timing(.18));assert.equal(closeCall.run('target.closeAwarded'),true);assert.equal(closeCall.run('score'),16);assert.equal(closeCall.run('perfects'),0);closeCall.run('update(.01)');assert.equal(closeCall.run('score'),16);
const noClose=game();noClose.click('home-play');noClose.run('shield=1');noClose.run(timing(.08));assert.equal(noClose.run('target.closeAwarded'),undefined);

// A last-shield loss creates a collectible recovery spark and highlights the safe ring.
const recovery=game();recovery.click('home-play');recovery.run('startDelay=0;shield=1;rows=[];addRow(angle+.02,0);rows[0].hazardLanes=[lane];rows[0].sparkLane=1-lane;rows[0].locked=true;update(.02);');
assert.equal(recovery.run('shield'),0);assert.ok(recovery.run('comeback'));assert.equal(recovery.run('hitReview.safe'),0);assert.match(recovery.nodes.get('hit-feedback').textContent,/Safe gap: ring 1/);
recovery.run('rows=[];shift();for(let i=0;i<45;i++)update(1/60)');assert.ok(recovery.run('sparks')>=1);assert.equal(recovery.run('comeback'),null);

const varieties=game();varieties.click('home-play');
for(const [lv,pattern] of [[10,'classic'],[20,'moving'],[30,'pulse']]){
 varieties.run(`level=${lv};ringCount=6;rows=[];for(let i=0;i<30;i++)addRow(angle+2+i*rowSpacing(),i)`);
 assert.equal(varieties.run(`rows.every(r=>r.pattern==='${pattern}')`),true);
 assert.equal(varieties.run('rows.every((r,i)=>!i||Math.abs(r.sparkLane-rows[i-1].sparkLane)<=1)'),true);
 assert.ok(varieties.run('rowSpacing()-.26>=targetSpeed()*.68'));
}
varieties.run('level=11;rows=[];for(let i=0;i<4;i++)addRow(angle+2+i*rowSpacing(),120+i)');assert.equal(varieties.run('rows.slice(0,3).every(r=>r.recovery&&r.pattern==="classic")'),true);
const gradual=game();gradual.click('home-play');gradual.run('startDelay=0;level=18;rows=[];update(.02)');assert.ok(gradual.run('speedNow()')<.81,'No sudden jump to maximum speed');

const controls=game(true);controls.click('vibration-toggle');controls.run('vibrate(40)');assert.equal(controls.vibration(),0);controls.click('vibration-toggle');controls.run('vibrate(40)');assert.equal(controls.vibration(),40);
controls.nodes.get('challenge-choice').value='perfects';controls.click('home-play');controls.run('perfects=5;updateExtras()');assert.equal(controls.run('focusDone'),true);

const sharing=game();sharing.run('roundKind="daily";dailyRun={day:new Date().toISOString().slice(0,10)};mode="over";score=321;');
await sharing.run('shareDaily()');assert.equal(sharing.nodes.get('share-fallback').hidden,false);assert.match(sharing.nodes.get('share-fallback').value,/Can you beat my score/);assert.match(sharing.nodes.get('share-fallback').value,/321/);
sharing.run('globalThis.copied="";navigator.clipboard={writeText:async text=>{copied=text}}');await sharing.run('shareDaily()');assert.match(sharing.run('copied'),/same course/);
sharing.run('dailyRun.day="2020-01-01"');assert.match(sharing.run('dailyShareText()'),/course has ended/);
console.log('PASS: sprint/tutorial isolation, near misses, comeback sparks, boss variants, smooth speed, comfort and share fallback.');

const records=game();records.click('home-play');records.run('passes=12;levelSparks=3;finishLevel();passes=24;level=2;finishLevel();');assert.equal(records.run('journey.clean'),2);
records.run('levelShieldLost=true;passes=36;level=3;finishLevel();bestCombo=9;crash();');assert.equal(records.run('journey.clean'),2);assert.equal(records.run('journey.chain'),9);assert.match(records.nodes.get('overlay-copy').textContent,/New best perfect chain: 9/);
records.run('level=100;passes=1195;updateExtras()');assert.match(records.nodes.get('finish-line').textContent,/5 obstacles/);

// Native disclosure and settings keys must not start or move the game.
const menuKeys=game();
for(const tag of ['summary','select']) {
  let prevented=false;
  menuKeys.listeners.keydown({code:'Space',repeat:false,target:{closest:selector=>selector.split(',').includes(tag)?{}:null},preventDefault(){prevented=true;}});
  assert.equal(prevented,false,`${tag} keeps native Space behaviour`);
  assert.equal(menuKeys.run('screen'),'home');
}

// Fairness check: clear the full route at 30 fps using only guided taps,
// with shields, Fever and hit immunity removed so they cannot mask collisions.
const fair=game();fair.click('home-play');
fair.run(`startDelay=0;for(let i=0;i<100000&&mode==='playing';i++){
  shield=0;feverTime=0;feverCharge=0;invulnerable=0;
  const next=rows.find(row=>!row.passed);
  if(next&&lane!==next.sparkLane&&(next.angle-angle)/speedNow()<=.30)shift();
  update(1/30);
}`);
assert.equal(fair.run('passes'),1200,'A timed single-action route can finish all 100 levels');
assert.equal(fair.run('roundHits'),0,'No shields or Fever needed to mask an impossible wall');

// Early shifts reach optional bonuses on the following guided ring.
const guidedBonus=game();guidedBonus.click('home-play');
guidedBonus.run(`level=13;ringCount=6;motionSpeed=targetSpeed();startDelay=0;passes=148;rows=[];radius=laneRadius(lane);
  addRow(angle+speedNow()*.6,148);addRow(angle+speedNow()*.6+rowSpacing(),149);
  globalThis.bonusWall=rows[0];globalThis.nextWall=rows[1];shift();
  for(let i=0;i<120&&!bonusWall.passed&&mode==='playing';i++)update(1/120);
  shift();for(let i=0;i<100&&!bonusWall.bonusCollected&&mode==='playing';i++)update(1/120);
`);
assert.equal(guidedBonus.run('bonusWall.bonusLane===nextWall.sparkLane'),true);
assert.equal(guidedBonus.run('bonusWall.bonusCollected'),true,'Bonus is reachable with an early guided tap');
assert.equal(guidedBonus.run('roundHits'),0);

// Run an entire seeded daily course at its actual fixed simulation rate.
const fairDaily=game();fairDaily.run('start({token:"fair",day:"2026-09-15",seed:987654,best:0});startDelay=0;');
fairDaily.run(`for(let i=0;i<14500&&mode==='playing';i++){
  shield=0;feverTime=0;feverCharge=0;invulnerable=0;
  const next=rows.find(row=>!row.passed);
  if(next&&lane!==next.sparkLane&&(next.angle-angle)/speedNow()<=.30)shift();
  update(1/120);
}`);
assert.equal(fairDaily.run('gameTime'),120);
assert.equal(fairDaily.run('roundHits'),0);
console.log('PASS: all 100 levels and a seeded daily course cleared with guided shifts and no hit protection; optional bonus reachable.');

// A retry preserves every generated wall, including moving/pulse phases, even
// when input timing, visual effects, and the number of shields collected differ.
const replay=game();replay.click('home-play');
const runCourse=(g,early)=>g.run(`
  startDelay=0;globalThis.seen=new Set();globalThis.wallLog=[];globalThis.introTime=0;
  for(let i=0;i<60000&&mode==='playing'&&level<16;i++){
    for(const row of rows)if(!seen.has(row.index)){
      seen.add(row.index);wallLog.push([row.index,row.baseAngle,row.sparkLane,row.entryLane,row.pattern,row.phase,row.bonusLane]);
    }
    const next=rows.find(row=>!row.passed);
    if(next&&lane!==next.sparkLane&&(next.angle-angle)/speedNow()<=${early})shift();
    update(1/120);
    if(!introTime&&level===2)introTime=gameTime;
  }
  JSON.stringify(wallLog);
`);
const firstCourse=runCourse(replay,.29),firstSeed=replay.run('retryCourse.seed');
assert.ok(replay.run('introTime')>=10&&replay.run('introTime')<=15,'Two-ring introduction lasts 10–15 seconds of play');
assert.equal(replay.run('level'),16);assert.equal(replay.run('roundHits'),0);
replay.run('crash();for(let i=0;i<100;i++)burst(angle,radius,C.lime);');replay.click('play');
assert.equal(replay.run('startDelay'),.45,'Try again uses the shorter countdown');
assert.equal(runCourse(replay,.55),firstCourse,'Retry repeats the course through all six-ring milestones');
assert.equal(replay.run('retryCourse.seed'),firstSeed);
replay.run('setPaused(true)');replay.click('restart');
assert.equal(replay.run('retryCourse.seed'),firstSeed,'Pause → restart preserves the course too');
replay.run('crash()');replay.click('home-play');
assert.notEqual(replay.run('retryCourse.seed'),firstSeed,'Home → Play now chooses a fresh course');

const intro=game();intro.click('home-play');
assert.equal(intro.run('ringCount'),2);assert.match(intro.nodes.get('shift').attrs['aria-label'],/other ring/);
intro.run('globalThis.guidePaints=0;arc=()=>{guidePaints++};drawGuide();');
assert.equal(intro.run('guidePaints'),0,'The two-ring intro has no hollow marker or dotted destination');
intro.run('passes=12;levelUp(2);updateGuide();drawGuide();');
assert.match(intro.nodes.get('shift').attrs['aria-label'],/highlighted ring/);
assert.equal(intro.run('ringCount'),3);assert.ok(intro.run('guidePaints')>0,'Third-ring guidance starts at Level 2');
const landing=game();landing.click('home-play');
landing.run('startDelay=0;globalThis.landingTones=0;tone=()=>landingTones++;shift();');
assert.equal(landing.run('landingTime'),0,'Landing feedback waits for the ball to arrive');
landing.run('update(.1);update(.04)');
assert.equal(landing.run('landing'),null);assert.equal(landing.run('landingTime'),.28);assert.equal(landing.run('landingTones'),1);
landing.run('setPaused(true);update(1)');assert.equal(landing.run('landingTime'),.28,'Pause freezes the ripple');
landing.run('setPaused(false);update(.5)');assert.equal(landing.run('landingTime'),.28,'Resume countdown freezes the ripple');
landing.run('startDelay=0;update(.3)');assert.equal(landing.run('landingTime'),0);assert.equal(landing.run('landingTones'),1,'Arrival tone plays once');
const quietLanding=game(false,null,true);quietLanding.click('home-play');
quietLanding.run('startDelay=0;shift();update(.14);globalThis.ripples=0;ctx.arc=()=>ripples++;arc=()=>{};drawLanding();');
assert.equal(quietLanding.run('ripples'),0,'Reduced motion keeps the ring highlight but removes the expanding ripple');

// Every wall sits on a beat; the long gap is an intentional empty beat. Gates
// return to that exact angle before the player must commit to a shift.
const rhythm=game();rhythm.click('home-play');
assert.equal(rhythm.run('JSON.stringify(rows.map(r=>Math.round((r.baseAngle-rhythmOrigin)/rhythmUnit)))'),'[0,1,3,4,5]');
rhythm.run('globalThis.audioTransport=null;window.LoopShiftMusic={sync(value){audioTransport=value}};syncMusic();');
assert.equal(rhythm.run('audioTransport.running'),false);
rhythm.run('startDelay=0;angle=rows[0].baseAngle-speedNow()*.29;syncMusic();');
assert.ok(Math.abs(rhythm.run('audioTransport.phase'))<1e-8,'The beat cue coincides with the perfect-shift window');
rhythm.run('rows=[];addRow(angle+speedNow()*.84,12);rows[0].phase=1;updateRow(rows[0]);');
assert.equal(rhythm.run('rows[0].angle'),rhythm.run('rows[0].baseAngle'));assert.equal(rhythm.run('rows[0].locked'),true);
console.log('PASS: repeatable courses across six rings, short introduction, rhythm grid, synchronized cues and landing feedback.');

// Every level boundary must preserve the player's position and the music phase.
// All geometry uses the same transition, including collisions and a tap in flight.
for(const reduced of [false,true]){
  const flow=game(false,null,reduced);flow.click('home-play');flow.run('startDelay=0');
  flow.run(`
    for(let next=2;next<=100;next++){
      lane=Math.min(1,ringCount-1);radius=laneRadius(lane);passes=(next-1)*12;
      trail=[{a:angle-.01,r:radius},{a:angle,r:radius}];
      globalThis.beforeFlow={angle,radius,speed:motionSpeed,color:levelColor(),phase:rhythmPhase(),epoch:rhythmEpoch,rings:Array.from({length:ringCount},(_,n)=>laneRadius(n)),trail:JSON.stringify(trail)};
      levelUp(next);
      if(angle!==beforeFlow.angle||radius!==beforeFlow.radius||motionSpeed!==beforeFlow.speed)throw Error('Player jumped at level '+next);
      if(levelColor()!==beforeFlow.color||JSON.stringify(trail)!==beforeFlow.trail)throw Error('Visuals snapped at level '+next);
      if(beforeFlow.rings.some((r,n)=>Math.abs(r-laneRadius(n))>1e-12))throw Error('Ring jumped at level '+next);
      if(Math.abs(rhythmPhase()-beforeFlow.phase)>1e-8||rhythmEpoch!==beforeFlow.epoch)throw Error('Music restarted at level '+next);
      if(startDelay!==0||mode!=='playing')throw Error('Transition stopped play');
      if((rows[0].baseAngle-angle)/speedNow()<2.3-1e-8)throw Error('Missing safe gap');
      for(let step=0;step<144;step++){
        const oldR=radius,oldAngle=angle;update(1/120);
        if(angle<=oldAngle||Math.abs(radius-oldR)>.002)throw Error('Abrupt motion at level '+next);
        if(Math.abs(radius-laneRadius(lane))>1e-10)throw Error('Ball left its moving ring');
      }
      if(levelTransition!==null||Math.abs(radius-baseLaneRadius(lane,ringCount))>1e-10)throw Error('Incomplete morph');
      if(levelColor()!==THEMES[(next-1)%THEMES.length][0])throw Error('Wrong destination colour');
    }
  `);
}
const midShift=game();midShift.click('home-play');midShift.run(`startDelay=0;shift();update(.02);passes=12;
  globalThis.oldOffset=radius-laneRadius(lane);globalThis.oldLanding=landing;levelUp(2);
  globalThis.newOffset=radius-laneRadius(lane);
`);
assert.ok(Math.abs(midShift.run('newOffset-oldOffset'))<1e-12,'Transition keeps an in-flight shift');
assert.equal(midShift.run('landing'),midShift.run('oldLanding'));
midShift.run('setPaused(true);globalThis.frozenFlow=JSON.stringify([levelTransition,radius,angle,departingRows]);update(.5);');
assert.equal(midShift.run('JSON.stringify([levelTransition,radius,angle,departingRows])'),midShift.run('frozenFlow'),'Pause freezes ring morph');
midShift.run('setPaused(false);update(.1);');
assert.equal(midShift.run('JSON.stringify([levelTransition,radius,angle,departingRows])'),midShift.run('frozenFlow'),'Resume countdown freezes ring morph');
midShift.run('startDelay=0;update(.2);');assert.ok(midShift.run('levelTransition.elapsed')>0,'Morph resumes after countdown');

const previews=game();previews.click('home-play');
previews.run(`startDelay=0;for(let i=0;i<9000&&level<5&&mode==='playing';i++){
  if(rows.some(row=>row.index>=level*12))throw Error('Next-level wall previewed with old geometry');
  const next=rows.find(row=>!row.passed);if(next&&lane!==next.sparkLane&&(next.angle-angle)/speedNow()<=.3)shift();
  update(1/120);
}`);
assert.equal(previews.run('level'),5);
console.log('PASS: 99 smooth level boundaries, stable trails, continuous audio phase, safe ring morphs, pause/resume and no premature next-level walls.');

const guideHelp=game();guideHelp.click('tutorial-play');
assert.equal(guideHelp.nodes.get('game-guide').open,true,'How to play opens full instructions');
assert.equal(guideHelp.run('screen'),'home','Reading instructions does not start a run');
assert.equal(guideHelp.focus(),'guide-title');guideHelp.click('tutorial-start');
assert.equal(guideHelp.run('roundKind'),'tutorial');
const boardBest=game();boardBest.run('window.LoopShiftBoard={best:()=>72};updateHUD();');
assert.equal(boardBest.nodes.get('home-best').textContent,'072','Home matches server-confirmed score');
assert.equal(boardBest.nodes.get('home-best-label').textContent,'ONLINE BEST');
assert.equal(boardBest.nodes.get('best').textContent,'072');
boardBest.run('window.LoopShiftBoard.best=()=>null;updateHUD();');
assert.equal(boardBest.nodes.get('home-best').textContent,'—');assert.equal(boardBest.nodes.get('home-best-label').textContent,'ONLINE BEST');
assert.equal(boardBest.nodes.get('device-best').textContent,'143');
assert.equal(boardBest.nodes.get('best-label').textContent,'DEVICE BEST');

// Weekly rules change their advertised mechanic only, and retain a fair route.
for(const rule of ['no-fever','double-sparks','one-shield']){
  const w=game();w.run(`start({token:'weekly-test',kind:'weekly',week:'2026-09-14',seed:42,rule:{id:'${rule}',name:'Weekly test'},duration:120});startDelay=0;`);
  if(rule==='no-fever'){
    for(let i=0;i<7;i++)w.run(timing());
    assert.equal(w.run('feverTime'),0);assert.equal(w.run('feverCharge'),0);assert.equal(w.run('multiplier()'),5);
    assert.equal(w.nodes.get('fever-label').textContent,'NO FEVER');
  }
  if(rule==='double-sparks'){
    w.run('collect({angle,sparkLane:lane})');assert.equal(w.run('score'),20);assert.equal(w.run('sparks'),1);assert.equal(w.run('charge'),1);
  }
  if(rule==='one-shield'){
    w.run('ringCount=6;for(let i=0;i<12;i++)collect({angle,sparkLane:lane})');assert.equal(w.run('shieldCapacity()'),1);assert.equal(w.run('shield'),1);
  }
  const run=game();run.run(`start({token:'weekly-route',kind:'weekly',week:'2026-09-14',seed:12345,rule:{id:'${rule}',name:'Weekly test'}});startDelay=0;
    for(let i=0;i<15000&&mode==='playing';i++){shield=0;feverTime=0;invulnerable=0;const next=rows.find(row=>!row.passed);if(next&&lane!==next.sparkLane&&(next.angle-angle)/speedNow()<=.30)shift();update(1/120);}`);
  assert.equal(run.run('gameTime'),120);assert.equal(run.run('roundHits'),0);assert.equal(run.run('mode'),'over');assert.equal(run.run('best'),143,'Weekly points cannot replace main device best');
}
assert.equal(fair.run('runBosses'),1023,'The real full route earns all ten boss trophies');
assert.equal(fair.run('runCleanBest'),100,'The full clean run records its clean-level streak');
const recording=game();recording.run(`globalThis.recorded=0;window.LoopShiftResults={reset(){},capture(){recorded++;},finish(data,hit){globalThis.resultData=data;globalThis.resultHit=hit;}}`);recording.click('home-play');recording.run('startDelay=0;update(.1);crash({angle,hazardLane:lane,sparkLane:1-lane})');
assert.ok(recording.run('recorded')>0);assert.equal(recording.run('resultData.score'),recording.run('score'));assert.equal(recording.run('resultHit.safe'),recording.run('1-lane'));
console.log('PASS: three fair weekly courses, isolated weekly scores, boss collection, clean titles and replay capture.');
