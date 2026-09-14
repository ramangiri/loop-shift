const $ = (id) => document.getElementById(id);
const canvas = $('game');
const ctx = canvas.getContext('2d');
const TAU = Math.PI * 2;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const C = {lime:'#d6ff62',coral:'#ff8a75',gold:'#f5dc88',line:'#354637'};
let size = 440, mode = 'ready', screen = 'home', lastTime = 0, totalTime = 0;
let angle = -Math.PI / 2, lane = 1, radius = .385, rows = [], particles = [], trail = [];
let score = 0, passes = 0, level = 1, sparks = 0, charge = 0, shield = false, invulnerable = 0;
let best = 0, soundOn = false, audioContext, toastTimer, startDelay = 0, lastShift = -1;
let installPrompt;
let selectedMode = 'arcade';
let gameTime=0, combo=0, feverCharge=0, feverTime=0, perfects=0, roundFevers=0, bestCombo=0;
let effectTime=0, effectText='', patternNoticeTime=0, nextRowIndex=0, shatters=[];
const PATTERNS=['classic','moving','pulse'];
const MODE_CONFIG={
  arcade:{label:'Arcade', speed:0.78, spawn:1.06, score:1, shield:1},
  challenge:{label:'Challenge', speed:0.92, spawn:0.96, score:1.35, shield:1.5},
  rush:{label:'Rush', speed:1.08, spawn:0.9, score:1.7, shield:1.8},
  score:{label:'Score', speed:1.02, spawn:0.94, score:2.2, shield:1.2}
};
const MODE_OBJECTIVES={
  arcade:'Objective: chain 3 perfects for Fever.',
  challenge:'Objective: hit 5 perfects before level 2.',
  rush:'Objective: stack two Fever windows in one run.',
  score:'Objective: chase a 200+ point burst from Fever and combos.'
};
const localStatsKey='loop-shift-local-stats-v1';
let localStats={bestScore:0,lastScore:0,bestCombo:0,bestFever:0};
const PATTERN_COPY={classic:'CLASSIC · Find your rhythm',moving:'MOVING BARRIERS · Watch them settle',pulse:'PULSE GATES · Watch for open gaps'};
const MISSIONS=[
  {id:'sparks20',key:'sparks',goal:20,title:'Collect 20 sparks',reward:'Unlock Cyan ball'},
  {id:'perfect5',key:'perfects',goal:5,title:'Make 5 perfect shifts',reward:'Unlock Comet trail'},
  {id:'fever3',key:'fevers',goal:3,title:'Activate Fever 3 times',reward:'Unlock Prism ball'},
  {id:'sparks60',key:'sparks',goal:60,title:'Collect 60 sparks',reward:'Unlock Stardust trail'}
];
const LOOKS={
  lime:{kind:'ball',label:'Lime',key:null,goal:0},
  cyan:{kind:'ball',label:'Cyan',key:'sparks',goal:20},
  prism:{kind:'ball',label:'Prism',key:'fevers',goal:3},
  glow:{kind:'trail',label:'Glow',key:null,goal:0},
  comet:{kind:'trail',label:'Comet',key:'perfects',goal:5},
  stardust:{kind:'trail',label:'Stardust',key:'sparks',goal:60}
};
let progress={sparks:0,perfects:0,fevers:0,ball:'lime',trail:'glow'};
const isUnlocked=id=>!LOOKS[id].key || progress[LOOKS[id].key]>=LOOKS[id].goal;
try{
  const saved=JSON.parse(localStorage.getItem('loop-shift-progress-v1'));
  if(saved && typeof saved==='object'){
    for(const key of ['sparks','perfects','fevers'])if(Number.isSafeInteger(saved[key])&&saved[key]>=0)progress[key]=saved[key];
    for(const kind of ['ball','trail'])if(LOOKS[saved[kind]]?.kind===kind&&isUnlocked(saved[kind]))progress[kind]=saved[kind];
  }
}catch{}
const saveProgress=()=>{try{localStorage.setItem('loop-shift-progress-v1',JSON.stringify(progress));}catch{}};
const saveLocalStats=()=>{try{localStorage.setItem(localStatsKey,JSON.stringify(localStats));}catch{}};
try{
  const saved=JSON.parse(localStorage.getItem(localStatsKey));
  if(saved && typeof saved==='object'){
    for(const key of ['bestScore','lastScore','bestCombo','bestFever'])if(Number.isFinite(saved[key])&&saved[key]>=0)localStats[key]=roundScore(saved[key]);
  }
}catch{}
const currentMode=()=>MODE_CONFIG[selectedMode]||MODE_CONFIG.arcade;
const speedNow=()=>Math.min(currentMode().speed+(level-1)*.085,1.8);
const multiplier=()=>combo>=5?5:combo>=3?3:combo>=2?2:1;
const scoreFactor=()=>multiplier()*(feverTime>0?2:1)*currentMode().score;
const roundScore = (value)=>Math.round(Number(value) || 0);
const sanitizeStoredBest = () => {
  try {
    const savedBest = localStorage.getItem('loop-shift-best');
    const cleanValue = roundScore(savedBest ?? 0);
    if (String(cleanValue) !== String(savedBest ?? '')) localStorage.setItem('loop-shift-best', String(cleanValue));
    return cleanValue;
  } catch {
    return 0;
  }
};
const ballColor=()=>progress.ball==='cyan'?'#72e6ff':progress.ball==='prism'?`hsl(${reducedMotion?285:(gameTime*65)%360} 95% 76%)`:C.lime;

try {
  best = sanitizeStoredBest();
  soundOn = localStorage.getItem('loop-shift-sound') === 'true';
} catch {}
const laneRadius = (n) => n ? .385 : .27;
const random = (min,max) => min + Math.random() * (max-min);
const point = (a,r) => ({x:size/2+Math.cos(a)*r*size,y:size/2+Math.sin(a)*r*size});
const pad = (n) => String(n).padStart(3,'0');

function resize(){
  const bounds=canvas.getBoundingClientRect(); if(bounds.width<=0)return; size=bounds.width;
  const scale=Math.min(window.devicePixelRatio || 1,2);
  canvas.width=Math.round(size*scale); canvas.height=Math.round(size*scale);
  ctx.setTransform(scale,0,0,scale,0,0);
}
new ResizeObserver(resize).observe(canvas);

function getModeSummary(){
  if (feverCharge >= 6) return 'Objective: Fever is primed, keep the chain alive.';
  if (combo >= 3) return `Objective: hold the ${multiplier()}x chain and push to Fever.`;
  if (selectedMode === 'score') return 'Objective: cash in high-value combo bursts before the run ends.';
  return MODE_OBJECTIVES[selectedMode] || MODE_OBJECTIVES.arcade;
}
function updateHome(){
  const objectiveText = MODE_OBJECTIVES[selectedMode] || MODE_OBJECTIVES.arcade;
  $('mode-goal').textContent = objectiveText;
  $('home-best').textContent=pad(best);
  $('home-best-chain').textContent=String(localStats.bestCombo || 0);
  $('home-last-run').textContent=pad(localStats.lastScore || 0);
  $('home-play-label').textContent=mode==='paused'?'Resume round':'Play now';
  $('home-new').hidden=mode!=='paused';
  const modeName=currentMode().label;
  $('home-status').textContent=mode==='paused'?`Round paused at ${score} points. Ready when you are.`:`${modeName} mode · chase perfect timing, longer chains, and Fever.`;
  const gameGoal = $('mode-goal-game'); if (gameGoal) gameGoal.textContent = getModeSummary();
}
function showScreen(next, moveFocus=true){
  if(next==='home' && mode==='playing')setPaused(true,false);
  screen=next;
  $('home-screen').hidden=next!=='home';$('game-screen').hidden=next!=='game';
  document.body.dataset.screen=next;$('pause').hidden=next!=='game';
  document.title=next==='home'?'Loop Shift — One-tap arcade':'Play — Loop Shift';
  updateHome();
  if(next==='game')resize();
  if(moveFocus){
    window.scrollTo({top:0,behavior:'instant'});
    $(next==='home'?'home-play':mode==='playing'?'shift':'play').focus({preventScroll:true});
  }
}
function enterGame(){
  if(location.hash!=='#play')history.pushState({loopShiftGame:true},'','#play');
  showScreen('game');
}
function goHome(){
  showScreen('home');
  if(location.hash==='#play' && history.state?.loopShiftGame)history.back();
  else history.replaceState(null,'','#home');
}
function homePlay(){
  if(mode==='paused'){enterGame();setPaused(false);}else start();
}
function syncRoute(){
  const next=location.hash==='#play'?'game':'home';
  if(next!==screen)showScreen(next);
}
function updateCountdown(){
  const counting=startDelay>0 && mode==='playing';
  $('orbit-center').classList.toggle('counting',counting);
  if(counting){
    $('center-top').textContent='GET READY';$('center-label').textContent=Math.max(1,Math.ceil(startDelay*2));$('center-bottom').textContent='PERFECT WINDOW 0.20-0.38s';
  }
}

function updateSound(){
  $('sound').setAttribute('aria-label',soundOn?'Turn sound off':'Turn sound on');
  $('sound').setAttribute('aria-pressed',String(soundOn));
  $('sound-lines').setAttribute('d',soundOn?'M15 8c2 2 2 6 0 8m3-11c4 4 4 10 0 14':'m16 9 6 6m0-6-6 6');
}
function unlockAudio(){
  if(!soundOn)return;
  try{audioContext ||= new (window.AudioContext || window.webkitAudioContext)();audioContext.resume().catch(()=>{});}catch{}
}
function tone(hz,duration=.08,type='sine',volume=.07){
  if(!soundOn || !audioContext)return;
  try { const o=audioContext.createOscillator(),g=audioContext.createGain();o.type=type;o.frequency.setValueAtTime(hz,audioContext.currentTime);g.gain.setValueAtTime(volume,audioContext.currentTime);g.gain.exponentialRampToValueAtTime(.001,audioContext.currentTime+duration);o.connect(g);g.connect(audioContext.destination);o.start();o.stop(audioContext.currentTime+duration); }catch{}
}
function vibrate(ms){try{if(window.LoopShiftNative?.isNative)window.LoopShiftNative.vibrate(ms);else navigator.vibrate?.(ms);}catch{}}
function toast(message){
  $('toast').textContent=message;$('toast').classList.add('show');
  clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('show'),1600);
}
function updateProgressUI(){
  for(const m of MISSIONS){
    const count=Math.min(progress[m.key],m.goal),done=count>=m.goal;
    $('mission-'+m.id).classList.toggle('complete',done);
    $('progress-'+m.id).value=count;
    $('count-'+m.id).textContent=done?'Unlocked':`${count} / ${m.goal}`;
  }
  for(const [id,look] of Object.entries(LOOKS)){
    const button=$('look-'+id),unlocked=isUnlocked(id),selected=progress[look.kind]===id;
    button.disabled=!unlocked;
    button.setAttribute('aria-pressed',String(selected));
    button.setAttribute('aria-label',`${look.label} ${look.kind}${unlocked?'':', locked'}`);
    $('state-'+id).textContent=!unlocked?'Locked':selected?'Selected':'Select';
  }
  $('look-summary').textContent=`${LOOKS[progress.ball].label} ball · ${LOOKS[progress.trail].label} trail`;
  const next=MISSIONS.find(m=>progress[m.key]<m.goal);
  $('mission-line').textContent=next?`${next.title} · ${Math.min(progress[next.key],next.goal)}/${next.goal}`:'All looks unlocked';
}
function advanceMission(key){
  const before=progress[key];progress[key]++;saveProgress();updateProgressUI();
  const unlocked=MISSIONS.filter(m=>m.key===key&&before<m.goal&&progress[key]>=m.goal);
  if(unlocked.length)toast(unlocked.map(m=>m.reward.replace('Unlock ','')+' unlocked!').join(' · '));
}
function selectLook(id){
  if(!LOOKS[id]||!isUnlocked(id))return;
  progress[LOOKS[id].kind]=id;trail=[];saveProgress();updateProgressUI();
}
function showEffect(text,kind='perfect'){
  effectText=text;effectTime=kind==='fever'?1.5:1;
  $('skill-effect').textContent=text;$('skill-effect').dataset.kind=kind;
  $('skill-effect').classList.add('visible');
}
function updateRhythm(){
  const fever=feverTime>0;
  document.body.classList.toggle('fever-active',fever);
  $('combo').textContent=`×${scoreFactor()}`;
  $('combo-caption').textContent=fever?'FEVER SCORE':combo?`${combo} PERFECT CHAIN`:'SCORE MULTIPLIER';
  $('fever-label').textContent=fever?`FEVER · ${feverTime.toFixed(1)}s`:'FEVER';
  $('fever-count').textContent=fever?'INVINCIBLE':`${feverCharge} / 6`;
  $('fever-fill').style.width=`${(fever?feverTime/5:feverCharge/6)*100}%`;
  $('fever-meter').setAttribute('aria-valuenow',String(fever?Math.round(feverTime/5*100):Math.round(feverCharge/6*100)));
  $('fever-meter').setAttribute('aria-valuetext',fever?`${feverTime.toFixed(1)} seconds of invincibility`:`${feverCharge} of 6 perfect dodges`);
  $('orbit-center').classList.toggle('fever-center',fever);
  $('center-top').textContent=fever?'INVINCIBLE':shield?'SHIELD READY':'FIND YOUR';
  $('center-label').textContent=fever?'FEVER':combo>=2?`×${multiplier()}`:shield?'SAFE':'FLOW';
  $('center-bottom').textContent=fever?'DOUBLE POINTS':combo>=2?'PERFECT CHAIN':shield?'ONE FREE HIT':'KEEP IT GOING';
  updateCountdown();
}
function resetCombo(){combo=0;feverCharge=0;}
function awardPerfect(row){
  if(row.perfectAwarded)return;
  row.perfectAwarded=true;perfects++;advanceMission('perfects');
  if(feverTime<=0){combo++;bestCombo=Math.max(bestCombo,combo);feverCharge=Math.min(6,feverCharge+1);}
  const bonus=Math.round(25*scoreFactor());score+=bonus;
  score=roundScore(score);showEffect(`PERFECT! +${bonus}`);burst(row.angle,laneRadius(lane),ballColor(),18);
  tone(760+Math.min(combo,6)*90,.16,'sine',.08);vibrate(12);
  if (combo >= 2 && combo < 5) toast(`Combo x${multiplier()} · keep it going`);
  if (combo >= 5) toast('Combo x5 · huge score window');
  if(feverCharge>=6 && feverTime<=0){
    feverTime=5;roundFevers++;advanceMission('fevers');showEffect('FEVER!','fever');
    $('announcement').textContent='Fever! Five seconds of invincibility and double points.';
    toast('FEVER! Double points and shield-free flow');
    tone(1320,.35,'sine',.09);
  }
}
function warnPattern(row){
  row.announced=true;
  $('pattern-notice').textContent=`NEXT: ${PATTERN_COPY[row.pattern]}`;
  $('pattern-notice').classList.add('warning');patternNoticeTime=2.5;
  $('announcement').textContent=PATTERN_COPY[row.pattern]+'. The next pattern is approaching.';
  tone(330,.13,'triangle',.035);
}
function updateHUD(){
  best = roundScore(best);score = roundScore(score);
  $('score').textContent=pad(score);$('best').textContent=pad(best);$('level').textContent=String(level).padStart(2,'0');
  $('charge-count').textContent=shield?'READY':`${charge} / 6`;
  $('charge-label').textContent=shield?'SHIELD ACTIVE':'SHIELD CHARGE';
  $('charge').classList.toggle('shield',shield);$('charge').setAttribute('aria-valuenow',shield?'6':String(charge));
  Array.from($('charge').children).forEach((el,i)=>el.classList.toggle('active',shield || i<charge));
  updateRhythm();updateHome();
}
function addRow(a,index=nextRowIndex++){
  nextRowIndex=Math.max(nextRowIndex,index+1);
  const previous=rows.at(-1);
  const hazardLane=index<3 ? (index%2?1:0) : (Math.random()<.75&&previous?1-previous.hazardLane:Math.round(Math.random()));
  const pattern=PATTERNS[Math.floor(index/12)%3];
  rows.push({angle:a,baseAngle:a,index,pattern,patternStart:index>0&&index%12===0,
    phase:random(0,TAU),locked:pattern==='classic',open:false,hazardLane,sparkLane:1-hazardLane,
    collected:false,hit:false,passed:false,perfectCandidate:false,attempted:false,
    spawnBias:(index % 3 === 0 ? 1 : -1)});
}
function updateRow(row){
  if(row.locked || row.pattern==='classic')return;
  // Every animated obstacle settles at least 0.75 seconds before its centre reaches the player.
  if(row.pattern==='moving')row.angle=row.baseAngle+Math.sin(gameTime*1.4+row.phase)*.13;
  if(row.pattern==='pulse')row.open=Math.sin(gameTime*2.4+row.phase)>.15;
  if(row.angle-angle<speedNow()*.75)row.locked=true;
}

function start(){
  unlockAudio();mode='playing';score=0;passes=0;level=1;sparks=0;charge=0;shield=false;invulnerable=0;
  angle=-Math.PI/2;lane=1;radius=laneRadius(lane);rows=[];trail=[];particles=[];startDelay=1.5;lastShift=-1;
  gameTime=0;combo=0;feverCharge=0;feverTime=0;perfects=0;roundFevers=0;bestCombo=0;nextRowIndex=0;shatters=[];
  effectTime=0;patternNoticeTime=0;$('skill-effect').classList.remove('visible');
  $('pattern-notice').textContent=`${PATTERN_COPY.classic} · ${currentMode().label.toUpperCase()} MODE`;$('pattern-notice').classList.remove('warning');
  if ($('mode-goal-game')) $('mode-goal-game').textContent = MODE_OBJECTIVES[selectedMode] || MODE_OBJECTIVES.arcade;
  for(let i=0;i<5;i++)addRow(angle+1.22+i*currentMode().spawn,i);
  $('overlay').hidden=true;$('shift').disabled=false;$('pause').disabled=false;$('restart').hidden=true;
  $('pause').setAttribute('aria-label','Pause game');$('pause-icon').setAttribute('d','M8 5v14M16 5v14');
  enterGame();
  $('toast').classList.remove('show');clearTimeout(toastTimer);updateHUD();lastTime=performance.now();
  $('announcement').textContent=`${currentMode().label} mode started. Perfect timing builds the chain and Fever.`;
  tone(440,.12);
}
function shift(){
  if(screen!=='game' || mode!=='playing' || startDelay>0 || gameTime-lastShift<.095)return;
  unlockAudio();lastShift=gameTime;
  for(const row of rows)if(!row.passed&&row.perfectCandidate)row.perfectCandidate=false;
  const next=rows.find(row=>!row.passed&&row.angle-angle>0);
  if(next && !next.attempted && !next.open && next.hazardLane===lane && Math.abs(radius-laneRadius(lane))<.015){
    const seconds=(next.angle-angle)/speedNow();
    if(seconds<.65){next.attempted=true;next.perfectCandidate=seconds>=.20&&seconds<=.38;}
  }
  lane=1-lane;tone(lane?520:390,.06,'sine',.045);
}
function setPaused(paused, moveFocus=true){
  if(paused && mode==='playing'){
    mode='paused';$('overlay').hidden=false;$('overlay-kicker').textContent='TAKE A BREATHER';$('overlay-title').textContent='Round paused.';
    $('overlay-copy').textContent=`${score} points. Pick up where you left off.`;$('result').hidden=true;
    $('play').innerHTML='Keep going <span aria-hidden="true">↗</span>';$('restart').hidden=false;$('shift').disabled=true;
    $('pause').setAttribute('aria-label','Resume game');$('announcement').textContent='Game paused.';
    $('pause-icon').setAttribute('d','m8 5 10 7-10 7Z');
    if(moveFocus && screen==='game')$('play').focus({preventScroll:true});
  }else if(!paused && mode==='paused'){
    if(screen!=='game')enterGame();
    unlockAudio();
    mode='playing';$('overlay').hidden=true;$('shift').disabled=false;startDelay=1.5;lastTime=performance.now();
    $('pause').setAttribute('aria-label','Pause game');$('announcement').textContent='Game resumed.';
    $('pause-icon').setAttribute('d','M8 5v14M16 5v14');
    if(moveFocus)$('shift').focus({preventScroll:true});
  }
  updateHUD();
}
function burst(a,r,color,n=14){
  if(reducedMotion)return;
  const p=point(a,r);
  for(let i=0;i<n;i++){const d=random(0,TAU),v=random(18,90);particles.push({x:p.x/size,y:p.y/size,vx:Math.cos(d)*v/440,vy:Math.sin(d)*v/440,life:1,color});}
}
function collect(row){
  row.collected=true;sparks++;score+=Math.round(10*scoreFactor()*currentMode().shield);advanceMission('sparks');burst(row.angle,laneRadius(row.sparkLane),C.gold,10);tone(620+(sparks%6)*75,.13,'sine',.07);
  if(!shield){
    const extra = combo >= 3 ? 2 : 1;
    charge += extra;
    if(charge>=6){charge=0;shield=true;toast('Shield ready · one free hit');tone(1040,.25);} 
  }
  score=roundScore(score);updateHUD();
}
function crash(){
  feverTime=0;resetCombo();
  mode='over';burst(angle,radius,C.coral,28);tone(130,.28,'triangle',.1);vibrate(65);
  score=roundScore(score);const isBest=score>best;best=roundScore(Math.max(best,score));localStats.bestCombo=roundScore(Math.max(localStats.bestCombo,bestCombo));
  localStats.lastScore=roundScore(score);localStats.bestScore=roundScore(Math.max(localStats.bestScore,score));localStats.bestFever=roundScore(Math.max(localStats.bestFever,roundFevers));
  saveLocalStats();try{localStorage.setItem('loop-shift-best',String(best));}catch{}
  $('overlay-kicker').textContent=isBest?'A NEW PERSONAL BEST':'ROUND COMPLETE';
  $('overlay-title').textContent=isBest?'A new best!':'One more loop?';
  const perfectGap = Math.max(0, 6 - feverCharge);
  const nextTarget = feverCharge >= 6 ? 'Fever is ready' : `${perfectGap} perfect${perfectGap === 1 ? '' : 's'} to Fever`;
  $('overlay-copy').textContent=score===0?'Try switching a little earlier.':`${nextTarget} · Best chain ${bestCombo} · ${roundFevers} Fever${roundFevers===1?'':'s'}`;
  $('result-score').textContent=score;$('result-sparks').textContent=sparks;$('result').hidden=false;
  $('play').innerHTML='Play again <span aria-hidden="true">↗</span>';$('restart').hidden=true;
  $('overlay').hidden=false;$('shift').disabled=true;$('pause').disabled=true;$('pause').setAttribute('aria-label','Pause game');
  clearTimeout(toastTimer);$('toast').classList.remove('show');updateHUD();
  $('play').focus({preventScroll:true});
  $('announcement').textContent=`Round over. Score ${score}. ${sparks} sparks collected. Personal best ${best}.`;
}
function update(dt){
  if(screen!=='game' || mode!=='playing')return;
  if(startDelay>0){startDelay=Math.max(0,startDelay-dt);updateCountdown();if(startDelay===0){updateHUD();tone(660,.1);}return;}
  gameTime+=dt;
  effectTime=Math.max(0,effectTime-dt);if(effectTime===0)$('skill-effect').classList.remove('visible');
  patternNoticeTime=Math.max(0,patternNoticeTime-dt);
  if(feverTime>0){
    feverTime=Math.max(0,feverTime-dt);
    if(feverTime===0){resetCombo();invulnerable=Math.max(invulnerable,.3);toast('Fever complete · build another chain');}
  }
  const speed=speedNow(),oldAngle=angle;
  const previousAngles=rows.map(row=>row.angle);
  for(const row of rows)updateRow(row);
  angle+=dt*speed;
  radius+=(laneRadius(lane)-radius)*(1-Math.exp(-dt*24));
  invulnerable=Math.max(0,invulnerable-dt);
  if(!reducedMotion){trail.push({a:angle,r:radius});if(trail.length>(progress.trail==='comet'?38:24))trail.shift();}
  for(let i=0;i<rows.length;i++){
    const row=rows[i],delta=row.angle-angle,previousDelta=previousAngles[i]-oldAngle;
    if(row.patternStart&&!row.announced&&delta<speed*3&&delta>0)warnPattern(row);
    const inHazard=delta<.108&&previousDelta>-.108;
    if(inHazard && !row.open && !row.hit && Math.abs(radius-laneRadius(row.hazardLane))<.038){
      row.hit=true;row.perfectCandidate=false;
      if(feverTime>0){burst(row.angle,laneRadius(row.hazardLane),'#72e6ff',18);}
      else if(shield || invulnerable>0){
        resetCombo();
        if(shield){
          shield=false;invulnerable=.65;shatterShield();burst(angle,radius,ballColor(),24);
          toast('Shield saved you · chain reset');tone(230,.18);vibrate(20);
        }
      }else{crash();return;}
    }
    if(delta<.105&&previousDelta>-.105&&!row.collected&&Math.abs(radius-laneRadius(row.sparkLane))<.032)collect(row);
    if(delta<-.16&&!row.passed){
      row.passed=true;passes++;
      if(row.perfectCandidate&&!row.hit&&!row.open)awardPerfect(row);
      else if(feverTime<=0)resetCombo();
      score+=Math.round(scoreFactor());
      score=roundScore(score);
      const nextLevel=1+Math.floor(passes/12);
      if(nextLevel>level)level=nextLevel;
      updateHUD();
    }
  }
  rows=rows.filter(row=>row.angle>angle-.45);
  while(rows.length<5){const last=rows.at(-1);addRow((last?.baseAngle??angle+1)+random(.98,currentMode().spawn));}
  if(patternNoticeTime===0){
    $('pattern-notice').classList.remove('warning');
    const next=rows.find(row=>row.angle>angle&&!row.passed);
    $('pattern-notice').textContent=`${PATTERN_COPY[next?.pattern??'classic']} · ${currentMode().label.toUpperCase()}`;
  }
  updateRhythm();
}
function shatterShield(){
  if(reducedMotion)return;
  const p=point(angle,radius);
  for(let i=0;i<10;i++){
    const a=i/10*TAU;
    shatters.push({x:p.x/size,y:p.y/size,a,life:1,color:ballColor()});
  }
}
function arc(r,start,end,color,width){ctx.beginPath();ctx.arc(size/2,size/2,r*size,start,end);ctx.strokeStyle=color;ctx.lineWidth=width;ctx.stroke();}
function drawSpark(a,r,alpha=1){
  const p=point(a,r),s=size*.012;ctx.save();ctx.globalAlpha=alpha;ctx.translate(p.x,p.y);ctx.rotate(Math.PI/4);ctx.fillStyle=C.gold;ctx.shadowColor=C.gold;ctx.shadowBlur=10;ctx.fillRect(-s,-s,s*2,s*2);ctx.restore();
}
function draw(time,dt){
  ctx.clearRect(0,0,size,size);ctx.lineCap='round';
  for(let i=0;i<60;i++){
    const a=i/60*TAU,p1=point(a,.462),p2=point(a,i%5===0?.451:.457);
    ctx.beginPath();ctx.moveTo(p1.x,p1.y);ctx.lineTo(p2.x,p2.y);ctx.strokeStyle=i%5===0?'#405042':'#2a392e';ctx.lineWidth=1;ctx.stroke();
  }
  ctx.setLineDash([2,7]);arc(.16,0,TAU,'#29392d',1);ctx.setLineDash([]);
  for(const r of [.27,.385]){
    arc(r+.006,0,TAU,'#070f0b',size*.053);
    arc(r,0,TAU,'#223b2e',size*.043);arc(r-.012,0,TAU,'#415a46',1);
    arc(r+.018,0,TAU,'#0a140e',2);arc(r,0,TAU,C.line,1);
    if(feverTime>0){
      ctx.save();ctx.shadowBlur=reducedMotion?0:12;
      for(let i=0;i<12;i++){
        const color=`hsl(${i*30} 95% 73%)`;ctx.shadowColor=color;
        const a=i/12*TAU+(reducedMotion?0:gameTime*.25);
        arc(r,a,a+TAU/12-.035,color,3);
      }
      ctx.restore();
    }
  }
  if(mode==='playing' && !reducedMotion){
    ctx.save();
    ctx.strokeStyle='rgba(245,220,136,.6)';
    ctx.lineWidth=1.5;
    ctx.setLineDash([2,8]);
    arc(laneRadius(lane),-0.08,0.08,'rgba(245,220,136,.8)',2.5);
    ctx.setLineDash([]);
    ctx.restore();
  }
  if(mode==='ready'){
    const demoTime=reducedMotion?0:time*.00015;
    for(const [a,l] of [[.2,1],[2.3,0],[4.4,1]]){
      arc(laneRadius(l),a-.073,a+.073,C.coral,size*.033);drawSpark(a,laneRadius(1-l));
    }
    drawOrb(-1.2+demoTime,.385,false);
  }else{
    for(const row of rows){
      const ahead=row.angle-angle;
      if(ahead>TAU-.45)continue;
      const opacity=Math.min(1,Math.max(0,(ahead+.45)/.3),Math.max(0,(TAU-.45-ahead)/.3));
      ctx.globalAlpha=opacity;
      if(!row.hit){
        const r=laneRadius(row.hazardLane);
        if(row.open){ctx.setLineDash([3,5]);arc(r,row.angle-.075,row.angle+.075,'#93b9a9',2);ctx.setLineDash([]);}
        else{
          ctx.save();ctx.shadowColor=C.coral;ctx.shadowBlur=6;
          arc(r,row.angle-.066,row.angle+.066,C.coral,size*.033);ctx.restore();
          arc(r-.01,row.angle-.05,row.angle+.05,'#ffc4ab',1.5);
        }
        if(row.pattern==='moving'&&!row.locked){
          const p=point(row.angle,r+.047);ctx.save();ctx.translate(p.x,p.y);ctx.rotate(row.angle+Math.PI/2);
          ctx.strokeStyle='#72e6ff';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(-7,0);ctx.lineTo(7,0);
          ctx.moveTo(3,-3);ctx.lineTo(7,0);ctx.lineTo(3,3);ctx.moveTo(-3,-3);ctx.lineTo(-7,0);ctx.lineTo(-3,3);ctx.stroke();ctx.restore();
        }
        if(row.pattern==='pulse'){
          for(const offset of [-.11,.11]){const p=point(row.angle+offset,r);ctx.fillStyle=C.gold;ctx.beginPath();ctx.arc(p.x,p.y,2.5,0,TAU);ctx.fill();}
        }
        // A quiet gold outline marks the timing window; no flashing is needed.
        const seconds=ahead/speedNow();
        if(mode==='playing'&&startDelay===0&&!row.open&&row.hazardLane===lane&&seconds>=.20&&seconds<=.38){
          arc(r,row.angle-.08,row.angle+.08,C.gold,size*.05);
          arc(r,row.angle-.06,row.angle+.06,C.coral,size*.027);
        }
      }
      if(!row.collected){drawSpark(row.angle,laneRadius(row.sparkLane),opacity);}
    }
    ctx.globalAlpha=1;
    ctx.save();
    for(let i=0;i<trail.length;i++){
      const p=point(trail[i].a,trail[i].r),fraction=(i+1)/trail.length;
      ctx.globalAlpha=fraction*(progress.trail==='comet'?.6:.4);
      ctx.fillStyle=feverTime>0?`hsl(${i*13} 95% 73%)`:ballColor();
      ctx.shadowColor=ctx.fillStyle;ctx.shadowBlur=progress.trail==='comet'?10:4;
      if(progress.trail==='stardust'&&i%2===0){
        ctx.save();ctx.translate(p.x,p.y);ctx.rotate(i);ctx.fillRect(-2*fraction,-2*fraction,4*fraction,4*fraction);ctx.restore();
      }else{ctx.beginPath();ctx.arc(p.x,p.y,size*.014*fraction,0,TAU);ctx.fill();}
    }
    ctx.restore();
    if(mode!=='over')drawOrb(angle,radius,shield);
  }
  for(const p of particles){
    if(mode!=='paused'){p.x+=p.vx*dt;p.y+=p.vy*dt;p.life-=dt*2;}
    ctx.globalAlpha=Math.max(0,p.life);ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(p.x*size,p.y*size,Math.max(.2,2.5*p.life),0,TAU);ctx.fill();
  }
  particles=particles.filter(p=>p.life>0);ctx.globalAlpha=1;
  for(const shard of shatters){
    if(mode!=='paused'){shard.life-=dt*1.8;shard.x+=Math.cos(shard.a)*dt*.1;shard.y+=Math.sin(shard.a)*dt*.1;}
    ctx.save();ctx.globalAlpha=Math.max(0,shard.life);ctx.translate(shard.x*size,shard.y*size);
    ctx.rotate(shard.a+(1-shard.life));ctx.strokeStyle=shard.color;ctx.lineWidth=2;
    ctx.beginPath();ctx.arc(0,0,size*.03,0,.4);ctx.stroke();ctx.restore();
  }
  shatters=shatters.filter(shard=>shard.life>0);
}
function drawOrb(a,r,safe){
  const p=point(a,r);ctx.save();
  if(invulnerable>0 && Math.floor(invulnerable*14)%2===0)ctx.globalAlpha=.5;
  if(safe){ctx.beginPath();ctx.arc(p.x,p.y,size*.03,0,TAU);ctx.strokeStyle=ballColor();ctx.lineWidth=1.5;ctx.stroke();}
  ctx.shadowColor=ballColor();ctx.shadowBlur=reducedMotion?0:24;ctx.fillStyle=ballColor();ctx.beginPath();ctx.arc(p.x,p.y,size*.018,0,TAU);ctx.fill();
  ctx.shadowBlur=0;ctx.fillStyle='#f3ffd8';ctx.beginPath();ctx.arc(p.x-size*.004,p.y-size*.005,size*.006,0,TAU);ctx.fill();ctx.restore();
}
function frame(time){const dt=Math.min((time-lastTime)/1000 || 0,.035);lastTime=time;totalTime+=dt;if(screen==='game'){update(dt);draw(time,dt);}requestAnimationFrame(frame);}
function setMode(modeName){
  selectedMode = MODE_CONFIG[modeName] ? modeName : 'arcade';
  try{localStorage.setItem('loop-shift-mode',selectedMode);}catch{}
  document.querySelectorAll('.mode-option').forEach(button=>button.classList.toggle('active',button.dataset.mode===selectedMode));
  updateHome();
  if(mode==='ready' || mode==='over' || mode==='paused'){updateHUD();}
}
$('home-play').addEventListener('click',homePlay);
$('home-new').addEventListener('click',start);
$('back-home').addEventListener('click',goHome);
$('result-home').addEventListener('click',goHome);
$('brand-home').addEventListener('click',event=>{event.preventDefault();goHome();});
window.addEventListener('loopshift:pause',()=>{if(mode==='playing')setPaused(true,false);});
window.addEventListener('loopshift:back',()=>{if(screen==='game')goHome();else window.LoopShiftNative?.minimize();});
window.addEventListener('popstate',syncRoute);
window.addEventListener('hashchange',syncRoute);
$('play').addEventListener('click',()=>{if(mode==='paused')setPaused(false);else start();});
$('restart').addEventListener('click',start);
$('pause').addEventListener('click',()=>setPaused(mode==='playing'));
$('shift').addEventListener('pointerdown',(event)=>{event.preventDefault();shift();});
$('shift').addEventListener('click',(event)=>{if(event.detail===0)shift();});
$('arena').addEventListener('pointerdown',(event)=>{if(mode==='playing' && !event.target.closest('button')){event.preventDefault();shift();}});
$('sound').addEventListener('click',()=>{soundOn=!soundOn;try{localStorage.setItem('loop-shift-sound',String(soundOn));}catch{}unlockAudio();updateSound();tone(680,.12);});
document.addEventListener('keydown',(event)=>{
  if(event.repeat)return;
  if(event.code==='Space'){
    if(event.target.closest?.('button, a') && event.target.id!=='shift')return;
    event.preventDefault();if(screen==='home')homePlay();else if(mode==='playing')shift();else if(mode==='ready'||mode==='over')start();else setPaused(false);
  }
  if(screen==='game' && (event.code==='KeyP'||event.code==='Escape')){if(mode==='playing')setPaused(true);else if(mode==='paused')setPaused(false);}
});
document.addEventListener('visibilitychange',()=>{if(document.hidden && mode==='playing')setPaused(true,false);});
window.addEventListener('blur',()=>{if(mode==='playing')setPaused(true,false);});
window.addEventListener('beforeinstallprompt',(event)=>{event.preventDefault();installPrompt=event;$('install').hidden=false;});
$('install').addEventListener('click',async()=>{if(!installPrompt)return;await installPrompt.prompt();installPrompt=null;$('install').hidden=true;});
window.addEventListener('appinstalled',()=>{$('install').hidden=true;});
if('serviceWorker' in navigator && !window.LoopShiftNative?.isNative && /^https?:$/.test(location.protocol)){window.addEventListener('load',()=>{navigator.serviceWorker.register('./sw.js').catch(()=>{});});}
for(const id of Object.keys(LOOKS))$('look-'+id).addEventListener('click',()=>selectLook(id));
for(const button of document.querySelectorAll('.mode-option')){
  button.addEventListener('click',()=>setMode(button.dataset.mode));
}
try{
  const savedMode=localStorage.getItem('loop-shift-mode');
  if(MODE_CONFIG[savedMode])selectedMode=savedMode;
}catch{}
updateProgressUI();
history.replaceState(null,'',location.hash==='#play'?'#play':'#home');
showScreen(location.hash==='#play'?'game':'home',false);
updateSound();setMode(selectedMode);updateHUD();resize();requestAnimationFrame(frame);
