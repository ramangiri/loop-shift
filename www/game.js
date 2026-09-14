const $ = (id) => document.getElementById(id);
const canvas = $('game');
const ctx = canvas.getContext('2d');
const TAU = Math.PI * 2;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const C = {lime:'#d6ff62',coral:'#ff8a75',gold:'#f5dc88',line:'#354637'};
let size = 440, mode = 'ready', screen = 'home', lastTime = 0, totalTime = 0;
let angle = -Math.PI / 2, lane = 1, radius = .385, rows = [], particles = [], trail = [];
let score = 0, passes = 0, level = 1, sparks = 0, charge = 0, shield = 0, invulnerable = 0;
let best = 0, soundOn = false, audioContext, toastTimer, startDelay = 0, lastShift = -1;
let installPrompt;
let roundKind='endless',dailyRun=null,dailyBest=0,pathLane=1,gameSeed=1,frameCarry=0,impactTime=0,dailyRequestId=0,dailyStartPending=false;
const seededRandom=()=>{gameSeed=(Math.imul(gameSeed,1664525)+1013904223)>>>0;return gameSeed/4294967296;};
// Course randomness never shares the visual-effects stream. A retry reuses this seed.
let retryCourse=null;
let socialAttempt=null,runBosses=0,runCleanBest=0;
const timedRun=()=>roundKind==='daily'||roundKind==='weekly';
const weeklyRule=()=>roundKind==='weekly'?dailyRun?.rule?.id:'';
function captureReplay(force=false){
  if(!window.LoopShiftResults||(!force&&window.LoopShiftResults.wantsFrame&&!window.LoopShiftResults.wantsFrame(gameTime)))return;
  window.LoopShiftResults.capture({time:gameTime,angle,radius,color:ballColor(),shield,radii:Array.from({length:ringCount},(_,n)=>laneRadius(n)),rows:rows.map(row=>({angle:row.angle,hazards:[...blockedLanes(row)],safe:row.sparkLane,open:row.open,collected:row.collected}))},force);
}
function startWeekly(){
  unlockAudio();window.LoopShiftMusic?.unlock();if(dailyStartPending)return;dailyStartPending=true;const id=++dailyRequestId;
  Promise.resolve(window.LoopShiftBoard?.beginWeekly(challenge=>{if(id===dailyRequestId)start(challenge);})).finally(()=>{dailyStartPending=false;});
}
const courseRandom=()=>seededRandom();
function prepareCourse(fresh=false){
  const key=roundKind==='practice'?`practice:${practiceLevel}`:roundKind;
  if(timedRun()){gameSeed=dailyRun.seed>>>0;return;}
  if(fresh||!retryCourse||retryCourse.key!==key)retryCourse={key,seed:Math.floor(Math.random()*4294967296)>>>0};
  gameSeed=retryCourse.seed;
}
const courseRange=(min,max)=>min+courseRandom()*(max-min);
function startDaily(){unlockAudio();window.LoopShiftMusic?.unlock();if(dailyStartPending)return;dailyStartPending=true;const requestId=++dailyRequestId;Promise.resolve(window.LoopShiftBoard?.beginDaily(challenge=>{if(requestId===dailyRequestId)start(challenge);})).finally(()=>{dailyStartPending=false;});}
function startEndless(){dailyRequestId++;roundKind='endless';dailyRun=null;start({fresh:true});}
function shieldSound(kind){
  vibrate(kind==='gain1'?[15,45,15]:kind==='gain2'?[15,35,15,35,15]:[45,25,20]);
  if(kind==='gain1')tone(740,.24,'sine',.1);
  if(kind==='gain2'){tone(740,.16,'sine',.1);setTimeout(()=>tone(1040,.24,'sine',.1),140);}
  if(kind==='break'){tone(210,.18,'triangle',.11);setTimeout(()=>tone(125,.16,'triangle',.09),80);}
}

let ringCount=2, levelBannerTime=0, shiftDirection=1;
const LEVEL_MORPH_SECONDS=1.1;
let levelTransition=null,departingRows=[];
const ringLimit=l=>2+[2,5,9,13].filter(unlock=>l>=unlock).length;
const shieldCapacity=()=>weeklyRule()==='one-shield'?1:ringCount>=5?2:1;
const THEMES=[['#d6ff62','ORBIT'],['#72e6ff','ION'],['#c8a4ff','NEBULA'],['#ffcc78','SOLAR'],['#83f5c0','AURORA'],['#ffa8da','NOVA']];
let journey={highest:1,distance:0,badges:0,chain:0,clean:0},practiceLevel=1,ghostTarget=0;
let levelSparks=0,levelPerfects=0,levelHits=0,roundHits=0,objectiveAwarded=false;
const BADGES=[['No Shield Needed','Clear a level without taking a hit',1],['Perfect 10','Make 10 perfect shifts in one round',2],['Six-Ring Master','Clear Level 13',4],['Boss Breaker','Clear a boss level',8],['Loop Champion','Complete all 100 levels',16]];
const COSMETICS=[['forest','Forest',1],['ion','Ion night',10],['nebula','Nebula',25],['solar','Solar eclipse',50]];
let selectedTheme='forest';try{selectedTheme=localStorage.getItem('loop-shift-theme-v2')||'forest';}catch{}
const bossLevel=()=>level%10===0;
const BOSS_TYPES=[['ALTERNATOR','Alternate between two neighbouring gaps'],['SWEEPER','Follow the gap across the rings'],['PULSE KEEPER','Read the gate before it settles']];
const bossType=()=>Math.floor(level/10-1)%3;
let motionSpeed=.78,hitReview=null,comeback=null,cleanStreak=0,levelShieldLost=false;
let previousRecords={chain:0,clean:0,distance:0},runFocus='survive',focusDone=false,tutorialStage=0,tutorialShift=false;
let vibrationOn=true,shareText='',lastGuideTarget=-1;
let landing=null,landingTime=0,landingLane=1;
try{vibrationOn=localStorage.getItem('loop-shift-vibration')!=='false';}catch{}
const isRankedMode=()=>roundKind==='endless'||timedRun();
const targetSpeed=()=>Math.min(.78+(level-1)*.065,1.9);
function startSprint(){dailyRequestId++;roundKind='sprint';dailyRun=null;start({fresh:true});}
function startTutorial(){dailyRequestId++;roundKind='tutorial';dailyRun=null;start({fresh:true});}
function feedback(kind){
  if(kind==='bonus'){tone(1040,.08,'triangle',.07);setTimeout(()=>tone(1560,.13,'sine',.06),80);}
  if(kind==='close')tone(520,.06,'triangle',.045);
  if(kind==='comeback'){tone(520,.12);setTimeout(()=>tone(780,.18),100);}
}
function markHit(row){
  const hitLane=blockedLanes(row).reduce((a,b)=>Math.abs(radius-laneRadius(a))<Math.abs(radius-laneRadius(b))?a:b,lane);
  hitReview={angle:row.angle,lane:hitLane,safe:row.sparkLane,life:1.3};impactTime=1.3;
  const danger=point(row.angle,laneRadius(hitLane)),safe=point(row.angle,laneRadius(row.sparkLane));
  $('collision-pin').style.left=`${danger.x}px`;$('collision-pin').style.top=`${danger.y}px`;$('collision-pin').classList.add('show');
  $('safe-pin').style.left=`${safe.x}px`;$('safe-pin').style.top=`${safe.y}px`;$('safe-pin').hidden=false;
  $('hit-feedback').textContent=`Hit on ring ${hitLane+1} · Safe gap: ring ${row.sparkLane+1} (centre = 1)`;
}
function resultFact(){
  if(roundKind==='tutorial')return tutorialShift?'You made your first switch. You’re ready to play.':'Try a tap or Space next time to switch rings.';
  if(roundKind==='practice')return 'Practice complete. Ranked scores and unlocks stay unchanged.';
  if(roundKind==='sprint')return passes>=60?'Five levels cleared—sprint complete!':`${Math.floor(passes/12)} of 5 levels cleared. Try to go one further.`;
  if(roundKind==='endless'&&bestCombo>previousRecords.chain)return `New best perfect chain: ${bestCombo}!`;
  if(roundKind==='endless'&&journey.clean>previousRecords.clean)return `New record: ${journey.clean} levels without losing a shield!`;
  if(roundKind==='endless'&&Math.floor(passes/12)>Math.floor(previousRecords.distance/12))return `You cleared ${Math.floor(passes/12)-Math.floor(previousRecords.distance/12)} more levels than your previous best run!`;
  if(focusDone)return 'Your chosen challenge is complete. Nicely played.';
  return perfects?`${perfects} perfect shifts this run. Build on that next time.`:`${sparks} sparks collected. Keep following the golden gap.`;
}
function updateExtras(){
  for(const id of ['run-goal','level-objective','pattern-notice','mission-line'])$(id).hidden=roundKind==='tutorial';
  const remaining=roundKind==='sprint'?Math.max(0,60-passes):Math.max(0,1200-passes);
  $('finish-line').hidden=!(roundKind==='sprint'||level===100);
  $('finish-line').textContent=`${roundKind==='sprint'?'SPRINT':'FINAL LEVEL'} · ${remaining} obstacles to the finish`;
  const reward=COSMETICS.find(x=>x[2]>journey.highest);
  $('next-reward').textContent=reward?`${Math.max(1,reward[2]-level)} level${reward[2]-level===1?'':'s'} until ${reward[1]} theme`:'All milestone themes unlocked';
  if(roundKind!=='endless')$('next-reward').textContent=roundKind==='weekly'?`Weekly twist · ${dailyRun.rule.name}`:roundKind==='daily'?'Daily course · Same challenge for everyone':roundKind==='tutorial'?'Training · No scores saved':'Unranked · No scores or unlocks saved';
  const goal=runFocus==='sparks'?20:runFocus==='perfects'?5:timedRun()?120:60;
  const current=runFocus==='sparks'?sparks:runFocus==='perfects'?perfects:timedRun()?gameTime:passes;
  focusDone=current>=goal;
  const levelGoal=runFocus==='survive'&&!timedRun();
  const displayCurrent=levelGoal?Math.floor(current/12):Math.floor(current);
  const displayGoal=levelGoal?5:goal;
  $('run-goal').textContent=`${runFocus==='sparks'?'Sparks':runFocus==='perfects'?'Perfects':'Survive'} · ${Math.min(displayGoal,displayCurrent)}/${displayGoal}${runFocus==='survive'?(levelGoal?' levels':' sec'):''}${focusDone?' ✓':''}`;
}
function updateTutorial(dt){
  gameTime=Math.min(10,gameTime+dt);angle+=dt*.78;radius+=(laneRadius(lane)-radius)*(1-Math.exp(-dt*24));updateLanding(dt);
  const prompts=['Tap or press Space to switch rings.','Follow the golden spark.','Demo shield: stay on a ring and watch it absorb a hit.','Shield absorbed the hit. Six sparks earn a new shield.'];
  if(gameTime>=2.5&&tutorialStage===0){tutorialStage=1;rows=[{angle:angle+.7,sparkLane:lane,hazardLanes:[],hit:true,collected:false,passed:false,open:true,pattern:'classic',locked:true}];}
  if(gameTime>=5&&tutorialStage===1){tutorialStage=2;shield=1;shieldSound('gain1');rows=[{angle:angle+.9,sparkLane:1-lane,hazardLanes:[0,1],hit:false,collected:true,passed:false,open:false,pattern:'classic',locked:true}];}
  for(const row of rows){const delta=row.angle-angle;if(!row.collected&&Math.abs(delta)<.1&&Math.abs(radius-laneRadius(row.sparkLane))<.032){row.collected=true;sparks++;tone(720,.15);}
    if(!row.hit&&delta<.108){row.hit=true;shield=0;shieldSound('break');shatterShield();tutorialStage=3;}}
  $('tutorial-instruction').textContent=prompts[tutorialStage];
  updateHUD();
  if(gameTime>=10)crash(null,true);
}
function dailyShareText(){
  const current=new Date().toISOString().slice(0,10)===dailyRun.day;
  return `Can you beat my score? I scored ${score} in Loop Shift’s daily challenge (${dailyRun.day}). ${current?'Play the same course before 00:00 UTC':'That course has ended; today has a new challenge'}: ${location.origin||''}${location.pathname||'/'}#daily`;
}
async function shareDaily(){
  if(roundKind!=='daily'||mode!=='over')return;
  shareText=dailyShareText();
  try{if(navigator.share){await navigator.share({title:'Loop Shift daily challenge',text:shareText});return;}if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(shareText);$('share-status').textContent='Challenge copied. Send it to a friend.';return;}}catch(error){if(error.name==='AbortError')return;}
  $('share-fallback').hidden=false;$('share-fallback').value=shareText;$('share-status').textContent='Copy this challenge text and send it to a friend.';
}

function objective(){return level%3===1?{label:'Collect 3 sparks',count:levelSparks,goal:3}:level%3===2?{label:'Make 2 perfect shifts',count:levelPerfects,goal:2}:{label:'Clear without a hit',count:levelHits===0?Math.min(12,passes%12):0,goal:12};}
function updateAdventureUI(){
  $('personal-records').textContent=`Best perfect chain: ${journey.chain||0} · Levels without losing a shield: ${journey.clean||0}`;
  $('practice-level').max=String(journey.highest);
  $('practice-unlocked').textContent=`Levels 1–${journey.highest} unlocked · Practice never saves scores or rewards.`;
  $('achievement-list').innerHTML=BADGES.map(([name,rule,bit])=>`<li class="${journey.badges&bit?'earned':''}"><strong>${journey.badges&bit?'🏆':'◇'} ${name}</strong><span>${rule}</span><small>${journey.badges&bit?'Earned':'Locked'}</small></li>`).join('');
  for(const [id,name,minimum] of COSMETICS){const b=$('theme-'+id);b.disabled=journey.highest<minimum;b.setAttribute('aria-pressed',String(selectedTheme===id));b.textContent=`${name}${journey.highest<minimum?' · Level '+minimum:selectedTheme===id?' · Selected':''}`;}
  const theme=COSMETICS.find(x=>x[0]===selectedTheme&&journey.highest>=x[2]);
  let communityTheme=false;try{communityTheme=localStorage.getItem('loop-shift-community-theme')==='true';}catch{}
  if(!theme&&!(selectedTheme==='convergence'&&(communityTheme||window.LoopShiftSocial?.unlockedTheme())))selectedTheme='forest';document.body.dataset.theme=selectedTheme;
}
function saveJourney(){if(roundKind!=='endless')return;window.LoopShiftBoard?.saveProgress({...journey});updateAdventureUI();}
function awardBadge(bit){if(roundKind!=='endless'||journey.badges&bit)return;journey.badges|=bit;}
function finishLevel(){
  cleanStreak=levelShieldLost?0:cleanStreak+1;runCleanBest=Math.max(runCleanBest,cleanStreak);
  if(roundKind==='endless'){
    if(bossLevel())runBosses|=1<<(Math.floor(level/10)-1);
    journey.clean=Math.max(journey.clean||0,cleanStreak);
    if(levelHits===0)awardBadge(1);if(level===13)awardBadge(4);if(bossLevel())awardBadge(8);if(level===100)awardBadge(16);
    journey.highest=Math.max(journey.highest,Math.min(100,level+1));journey.distance=Math.max(journey.distance,passes);
  }
  const goal=objective();const success=level%3===0?levelHits===0:goal.count>=goal.goal;
  if(success&&!objectiveAwarded){score+=100;objectiveAwarded=true;}
  saveJourney();return success?'Goal complete · +100 points':'Next level, fresh goal';
}
function startPractice(){
  const n=Number($('practice-level').value);if(!Number.isInteger(n)||n<1||n>journey.highest){$('practice-unlocked').textContent=`Choose a whole level from 1 to ${journey.highest}.`;return;}
  dailyRequestId++;roundKind='practice';dailyRun=null;practiceLevel=n;start({fresh:true});
}

const blockedLanes=row=>row.hazardLanes || [row.hazardLane];
const blocks=(row,n)=>blockedLanes(row).includes(n);
// The nearest wall owns the route until it has passed. Moving early never
// advances the guide to a later wall; another tap returns toward its entry ring.
function guidedTarget(){
  if(ringCount===2)return 1-lane;
  const next=rows.find(row=>!row.passed);
  let destination=next?.sparkLane;
  if(comeback&&comeback.angle>angle&&comeback.lane!==lane&&(!next||next.angle-angle<-.108))destination=comeback.lane;
  if(Number.isInteger(destination)&&destination!==lane)return lane+Math.sign(destination-lane);
  if(next&&Number.isInteger(next.entryLane)&&Math.abs(next.entryLane-lane)===1)return next.entryLane;
  const following=rows.find(row=>row!==next&&!row.passed&&Number.isInteger(row.sparkLane)&&Math.abs(row.sparkLane-lane)===1);
  if(following)return following.sparkLane;
  let step=shiftDirection;
  if(lane+step<0||lane+step>=ringCount)step=-step;
  return lane+step;
}
function updateGuide(){
  const target=guidedTarget();
  if(target===lastGuideTarget)return;
  lastGuideTarget=target;
  $('shift').setAttribute('aria-label',ringCount===2?'Switch to the other ring':`Shift to highlighted ring ${target+1}`);
}
function applyTheme(){
  const [color,name]=THEMES[(level-1)%THEMES.length];
  document.body.style.setProperty('--sector',color);document.body.dataset.rings=String(ringCount);
  $('sector-name').textContent=`${name} · ${ringCount} RINGS`;
  window.LoopShiftMusic?.setLevel(level);
}
function levelUp(next){
  const completed=level,oldRings=ringCount;
  const fromRadii=Array.from({length:oldRings},(_,n)=>laneRadius(n)),fromColor=levelColor();
  const goalResult=finishLevel();level=Math.min(100,next);ringCount=ringLimit(level);
  levelTransition={elapsed:0,oldRings,fromRadii,fromColor};
  lane=Math.min(lane,ringCount-1);lastGuideTarget=-1;
  // Keep the ball, its trail and departing walls in place at the boundary.
  departingRows=rows.filter(row=>row.passed).map(row=>({...row,radii:fromRadii,leavingAt:gameTime}));
  rows=[];nextRowIndex=passes;if(comeback)comeback={angle:angle+.65,lane};
  prepareRhythm(2.3,true);
  levelBannerTime=1.35;
  levelSparks=0;levelPerfects=0;levelHits=0;levelShieldLost=false;objectiveAwarded=false;

  $('level-banner').textContent=`LEVEL ${completed} COMPLETE! ✓`;
  $('level-detail').textContent=bossLevel()?`BOSS ${level} · ${BOSS_TYPES[bossType()][0]}: ${BOSS_TYPES[bossType()][1]}`:ringCount>oldRings?`${ringCount} rings unlocked${ringCount===5?' · 2 shield slots':''}`:`Level ${level} · ${speedNow()<1.9?'Faster orbit':'Maximum speed'}`;
  document.body.style.setProperty('--completed-sector',THEMES[(completed-1)%THEMES.length][0]);
  const banner=$('level-banner-wrap');
  banner.classList.remove('show');
  // Successive levels outlast this animation; no forced layout read is needed.
  banner.classList.add('show');
  $('level-reward').textContent=goalResult;
  $('announcement').textContent=$('level-banner').textContent+' '+$('level-detail').textContent;
  applyTheme();tone(660,.13);setTimeout(()=>tone(880,.16),110);setTimeout(()=>tone(1100,.22),230);
}
// Three walls over four beats form a learnable 'tap, tap, wait, tap' phrase. No random spacing jitter.
const RHYTHM_GAPS=[1,2,1];
let rhythmOrigin=0,rhythmUnit=.6552,rhythmEpoch=0,rhythmPhaseOffset=0;
const rhythmPhase=()=>rhythmPhaseOffset+4*(angle-rhythmOrigin+speedNow()*.29)/rhythmUnit;
const rhythmDistance=()=>level===1?targetSpeed()*.84:Math.max(targetSpeed()*(bossLevel()?1.05:.9),targetSpeed()*.68+.26);
const rowSpacing=(index=nextRowIndex)=>rhythmDistance()*RHYTHM_GAPS[((index-1)%3+3)%3];
function prepareRhythm(lead,continuous=false){
  const phase=continuous?rhythmPhase():0;
  rhythmUnit=rhythmDistance();
  if(continuous){
    // Put the next wall on a future beat without restarting the soundtrack.
    rhythmPhaseOffset=Math.ceil(phase+4*speedNow()*(lead-.29)/rhythmUnit);
    rhythmOrigin=angle+speedNow()*.29+(rhythmPhaseOffset-phase)*rhythmUnit/4;
  }else{rhythmPhaseOffset=0;rhythmOrigin=angle+speedNow()*lead;rhythmEpoch++;}
  let position=rhythmOrigin;
  for(let i=0;i<5;i++){if(i)position+=rowSpacing(passes+i);addRow(position,passes+i);}
}
function syncMusic(){
  // Grid beats lead wall centres by the middle of the perfect window. The music
  // follows actual orbit speed, including easing, and freezes during countdowns.
  window.LoopShiftMusic?.sync?.({
    phase:roundKind==='tutorial'?gameTime*4/.9:rhythmPhase(),
    rate:roundKind==='tutorial'?4/.9:4*speedNow()/rhythmUnit,
    accents:rows.filter(row=>!row.passed&&!row.open).map(row=>rhythmPhaseOffset+4*(row.baseAngle-rhythmOrigin)/rhythmUnit),
    epoch:rhythmEpoch,running:mode==='playing'&&startDelay===0
  });
}
function updateLanding(dt){
  landingTime=Math.max(0,landingTime-dt);
  if(landing!==null&&lane===landing&&Math.abs(radius-laneRadius(landing))<.008){
    landingLane=landing;landing=null;landingTime=.28;
    tone(560+landingLane*75,.055,'triangle',.035);
  }
}


let gameTime=0, combo=0, feverCharge=0, feverTime=0, perfects=0, roundFevers=0, bestCombo=0;
let effectTime=0, effectText='', patternNoticeTime=0, nextRowIndex=0, shatters=[];
const PATTERNS=['classic','moving','pulse'];
const PATTERN_COPY={classic:'RHYTHM · Tap, tap, wait, tap',moving:'MOVING BARRIERS · Watch them settle',pulse:'PULSE GATES · Watch for open gaps'};
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
  const saved=JSON.parse(localStorage.getItem('loop-shift-progress-v2'));
  if(saved && typeof saved==='object'){
    for(const key of ['sparks','perfects','fevers'])if(Number.isSafeInteger(saved[key])&&saved[key]>=0)progress[key]=saved[key];
    for(const kind of ['ball','trail'])if(LOOKS[saved[kind]]?.kind===kind&&isUnlocked(saved[kind]))progress[kind]=saved[kind];
  }
}catch{}
const saveProgress=()=>{try{localStorage.setItem('loop-shift-progress-v2',JSON.stringify(progress));}catch{}};
const speedNow=()=>motionSpeed;
const personalBest=()=>window.LoopShiftBoard?.best?.()??best;
const multiplier=()=>combo>=5?5:combo>=3?3:combo>=2?2:1;
const scoreFactor=()=>multiplier()*(feverTime>0?2:1);
const ballColor=()=>progress.ball==='cyan'?'#72e6ff':progress.ball==='prism'?`hsl(${reducedMotion?285:(gameTime*65)%360} 95% 76%)`:C.lime;

try { best = Number(localStorage.getItem('loop-shift-best-v2')) || 0; soundOn = localStorage.getItem('loop-shift-sound') !== 'false'; } catch {}
const baseLaneRadius=(n,count)=>count===2?(n ? .385 : .27):.14+n*(.275/(count-1));
const morphProgress=()=>{const t=Math.min(1,(levelTransition?.elapsed??LEVEL_MORPH_SECONDS)/LEVEL_MORPH_SECONDS);return t*t*(3-2*t);};
function laneRadius(n){
  const target=baseLaneRadius(n,ringCount);
  if(!levelTransition)return target;
  const from=levelTransition.fromRadii[n]??levelTransition.fromRadii.at(-1)+.035*(n-levelTransition.oldRings+1);
  return from+(target-from)*morphProgress();
}
function ringSize(wide,narrow){
  const target=ringCount>3?narrow:wide;
  const from=levelTransition?(levelTransition.oldRings>3?narrow:wide):target;
  return from+(target-from)*morphProgress();
}
function levelColor(){
  const target=THEMES[(level-1)%THEMES.length][0];
  if(!levelTransition)return target;
  const from=levelTransition.fromColor,t=morphProgress();
  return '#'+[1,3,5].map(i=>Math.round(parseInt(from.slice(i,i+2),16)*(1-t)+parseInt(target.slice(i,i+2),16)*t).toString(16).padStart(2,'0')).join('');
}
function updateLevelTransition(dt){
  if(levelTransition){
    const previous=laneRadius(lane);
    levelTransition.elapsed=Math.min(LEVEL_MORPH_SECONDS,levelTransition.elapsed+dt);
    // Carry the player with its ring while preserving any active tap's offset.
    radius+=laneRadius(lane)-previous;
    if(levelTransition.elapsed>=LEVEL_MORPH_SECONDS)levelTransition=null;
  }
  departingRows=departingRows.filter(row=>gameTime-row.leavingAt<.4);
}
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

function updateHome(){
  const onlineBest=window.LoopShiftBoard?.best?.(),record=window.LoopShiftBoard?.record?.();
  const hasOnlineBest=Number.isSafeInteger(onlineBest);
  $('home-best').textContent=hasOnlineBest?pad(onlineBest):'—';
  $('home-best-label').textContent='ONLINE BEST';
  $('home-best-note').textContent=record?.pending>0?`100 levels · ${record.pending.toLocaleString()} points waiting to save.`:
    hasOnlineBest?`100 levels · ${record?.connection==='offline'?'Last synced · Offline':'Saved online'}`:
    record?.connection==='connecting'?'Connecting to your saved score…':
    record?.connection==='offline'?'Offline · Online scores unavailable.':'Add a name to save ranked scores.';
  if(!record?.pending)$('retry-home-score').hidden=true;
  $('device-best').textContent=best.toLocaleString();
  $('device-record').hidden=best<=0||(hasOnlineBest&&best===onlineBest);
  $('home-play-label').textContent=mode==='paused'?'Resume round':'Play now';
  $('home-new').hidden=mode!=='paused';
  $('home-status').hidden=mode!=='paused';
  $('home-status').textContent=mode==='paused'?`Paused · ${score} points`:'';
}
function showScreen(next, moveFocus=true){
  if(next==='home' && mode==='playing')setPaused(true,false);
  screen=next;
  if(next==='home'){window.LoopShiftResults?.stop();window.LoopShiftBoard?.refresh();window.LoopShiftSocial?.refresh();}
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
  if(mode==='paused'){enterGame();setPaused(false);}else startEndless();
}
function syncRoute(){
  const next=location.hash==='#play'?'game':'home';
  if(next!==screen)showScreen(next);
}
function updateCountdown(){
  const counting=startDelay>0 && mode==='playing';
  $('orbit-center').classList.toggle('counting',counting);
  if(counting){
    $('center-top').textContent='GET READY';$('center-label').textContent=Math.max(1,Math.ceil(startDelay*2));$('center-bottom').textContent='FIND YOUR ORBIT';
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
  window.LoopShiftMusic?.duck?.(duration);
  try { const o=audioContext.createOscillator(),g=audioContext.createGain();o.type=type;o.frequency.setValueAtTime(hz,audioContext.currentTime);g.gain.setValueAtTime(volume,audioContext.currentTime);g.gain.exponentialRampToValueAtTime(.001,audioContext.currentTime+duration);o.connect(g);g.connect(audioContext.destination);o.start();o.stop(audioContext.currentTime+duration); }catch{}
}
function vibrate(ms){
  if(!vibrationOn)return;
  try{if(window.LoopShiftNative?.isNative){if(Array.isArray(ms)){let delay=0;ms.forEach((v,i)=>{if(i%2===0)setTimeout(()=>{if(vibrationOn)window.LoopShiftNative.vibrate(v);},delay);delay+=v;});}else window.LoopShiftNative.vibrate(ms);}else navigator.vibrate?.(ms);}catch{}
}
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
  if(!isRankedMode())return;
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
  window.LoopShiftMusic?.setFever(fever);window.LoopShiftMusic?.setCombo?.(combo);
  $('daily-timer').hidden=!timedRun();
  if(timedRun())$('daily-timer').textContent=`${roundKind==='weekly'?'WEEKLY':'DAILY'} · ${Math.ceil(Math.max(0,120-gameTime))}s left`;

  document.body.classList.toggle('fever-active',fever);
  $('combo').textContent=`×${scoreFactor()}`;
  $('combo-caption').textContent=fever?'FEVER SCORE':combo?`${combo} PERFECT CHAIN`:'SCORE MULTIPLIER';
  $('fever-label').textContent=weeklyRule()==='no-fever'?'NO FEVER':fever?`FEVER · ${feverTime.toFixed(1)}s`:'FEVER';
  $('fever-count').textContent=weeklyRule()==='no-fever'?'WEEKLY RULE':fever?'INVINCIBLE':`${feverCharge} / 6`;
  $('fever-fill').style.width=`${(fever?feverTime/5:feverCharge/6)*100}%`;
  $('fever-meter').setAttribute('aria-valuenow',String(fever?Math.round(feverTime/5*100):Math.round(feverCharge/6*100)));
  $('fever-meter').setAttribute('aria-valuetext',fever?`${feverTime.toFixed(1)} seconds of invincibility`:`${feverCharge} of 6 perfect dodges`);
  $('orbit-center').classList.toggle('fever-center',fever);
  $('center-top').textContent=fever?'INVINCIBLE':shield?'SHIELD READY':'FIND YOUR';
  $('center-label').textContent=fever?'FEVER':combo>=2?`×${multiplier()}`:shield?'SAFE':'FLOW';
  $('center-bottom').textContent=fever?'DOUBLE POINTS':combo>=2?'PERFECT CHAIN':shield?`${shield} HIT${shield>1?'S':''} BLOCKED`:'KEEP IT GOING';
  updateCountdown();
}
function resetCombo(){combo=0;feverCharge=0;}
function awardPerfect(row){
  if(row.perfectAwarded)return;
  row.perfectAwarded=true;perfects++;levelPerfects++;if(perfects>=10&&!(journey.badges&2)){awardBadge(2);saveJourney();}advanceMission('perfects');
  if(feverTime<=0){combo++;bestCombo=Math.max(bestCombo,combo);feverCharge=weeklyRule()==='no-fever'?0:Math.min(6,feverCharge+1);}
  const bonus=25*scoreFactor();score+=bonus;
  showEffect(`PERFECT! +${bonus}`);burst(row.angle,laneRadius(lane),ballColor(),18);
  tone(760+Math.min(combo,6)*90,.16,'sine',.08);vibrate(12);
  if(weeklyRule()!=='no-fever' && feverCharge>=6 && feverTime<=0){
    feverTime=5;roundFevers++;advanceMission('fevers');showEffect('FEVER!','fever');
    $('announcement').textContent='Fever! Five seconds of invincibility and double points.';
    tone(1320,.35,'sine',.09);
  }
}
function warnPattern(row){
  row.announced=true;
  $('pattern-notice').textContent=bossLevel()?`BOSS ${level} · ${BOSS_TYPES[bossType()][0]} · ${BOSS_TYPES[bossType()][1]}`:`NEXT: ${PATTERN_COPY[row.pattern]}`;
  $('pattern-notice').classList.add('warning');patternNoticeTime=2.5;
  $('announcement').textContent=PATTERN_COPY[row.pattern]+'. The next pattern is approaching.';
  tone(330,.13,'triangle',.035);
}
function updateHUD(){
  $('score').textContent=pad(score);$('best').textContent=pad(timedRun()?dailyBest:personalBest());$('level').textContent=roundKind==='tutorial'?'LEARN':`${String(level).padStart(2,'0')} / ${roundKind==='sprint'?5:100}`;
  $('best-label').textContent=timedRun()?(roundKind==='weekly'?'WEEKLY BEST':'DAILY BEST'):Number.isSafeInteger(window.LoopShiftBoard?.best?.())?'ONLINE BEST':'DEVICE BEST';
  $('rival-target').hidden=!isRankedMode();$('ghost-status').hidden=roundKind==='tutorial'||roundKind==='sprint';
  const full=shield>=shieldCapacity();
  $('shield-icons').textContent='◉'.repeat(shield)+'○'.repeat(shieldCapacity()-shield);
  $('charge-count').textContent=full?'FULL':`${charge} / 6`;
  $('charge-label').textContent=`SHIELDS ${shield} / ${shieldCapacity()}`;
  $('charge').classList.toggle('shield',full);$('charge').setAttribute('aria-valuenow',full?'6':String(charge));
  Array.from($('charge').children).forEach((el,i)=>el.classList.toggle('active',full || i<charge));
  $('shift').disabled=mode!=='playing';updateGuide();
  $('level-progress').style.width=`${Math.min(12,passes>=1200?12:passes%12)/12*100}%`;
  $('level-progress-label').textContent=`${passes>=1200?12:passes%12} / 12 obstacles`;
  $('rival-target').textContent=window.LoopShiftBoard?.target?.(score,roundKind) || `Next personal best: ${Math.max(1,(timedRun()?dailyBest:personalBest())+1-score)} points away`;
  const goal=objective();$('level-objective').textContent=`${roundKind==='practice'?'PRACTICE · ':''}${bossLevel()?'BOSS · ':''}${goal.label} · ${Math.min(goal.count,goal.goal)}/${goal.goal} · Bonus +100`;
  $('ghost-status').textContent=roundKind==='endless'&&ghostTarget>0?(passes>=ghostTarget?'👻 Past your best distance!':`👻 Best run: Level ${Math.min(100,1+Math.floor(ghostTarget/12))} · ${ghostTarget-passes} obstacles ahead`):roundKind==='practice'?'Practice · No ranking or unlocks':'New run. Set your distance record.';
  updateExtras();updateRhythm();updateHome();
}
function addRow(a,index=nextRowIndex++){
  nextRowIndex=Math.max(nextRowIndex,index+1);
  const previous=rows.at(-1);
  const previousSafe=Math.max(0,Math.min(ringCount-1,previous?.sparkLane??pathLane));
  const safeOptions=[previousSafe-1,previousSafe+1].filter(n=>n>=0&&n<ringCount);
  const recovery=level>1&&!bossLevel()&&(level%10===1?index%12<3:level%3===1&&index%12<2);
  const direction=previous?.sweepDirection||1;
  const sweepDirection=previousSafe<=0?1:previousSafe>=ringCount-1?-1:direction;
  let safeLane=safeOptions[Math.floor(courseRandom()*safeOptions.length)];
  if(recovery)safeLane=previousSafe;
  else if(bossLevel()&&bossType()===0){const step=index%2?1:-1;safeLane=Math.max(0,Math.min(ringCount-1,previousSafe+step));if(safeLane===previousSafe)safeLane=previousSafe-step;}
  else if(bossLevel()&&bossType()===1)safeLane=previousSafe+sweepDirection;
  const hazardLane=ringCount===2?1-safeLane:previousSafe;
  const hazardLanes=ringCount===2?[hazardLane]:Array.from({length:ringCount},(_,n)=>n).filter(n=>n!==safeLane);
  const pattern=recovery?'classic':bossLevel()?(bossType()===0?'classic':bossType()===1?'moving':'pulse'):PATTERNS[Math.floor(index/12)%3];
  // A bonus between walls sits on the next guided ring, reachable with an early
  // shift. Its destination is fixed before it comes into view.
  if(previous&&previous.bonusLane!==null&&previous.bonusLane!==undefined)previous.bonusLane=safeLane;
  rows.push({angle:a,baseAngle:a,index,bornAt:gameTime,entryLane:previousSafe,pattern,recovery,sweepDirection,patternStart:index>0&&index%12===0,
    bonusLane:!recovery&&level>=4&&index%3===1?hazardLane:null,bonusCollected:false,
    phase:courseRange(0,TAU),locked:pattern==='classic',open:false,hazardLane,hazardLanes,sparkLane:safeLane,
    collected:false,hit:false,passed:false,perfectCandidate:false,attempted:false});
}
function updateRow(row){
  if(row.locked || row.pattern==='classic')return;
  // Drift eases back onto the music grid, then settles 0.85 s before impact.
  const seconds=(row.baseAngle-angle)/speedNow();
  if(row.pattern==='moving')row.angle=row.baseAngle+Math.sin(gameTime*1.4+row.phase)*.13*Math.min(1,Math.max(0,(seconds-.85)/.8));
  if(row.pattern==='pulse')row.open=Math.sin(gameTime*2.4+row.phase)>.15;
  if(seconds<=.85){row.angle=row.baseAngle;row.locked=true;}
}

function start(options){
  const quickRetry=mode==='over';
  unlockAudio();window.LoopShiftMusic?.unlock();
  if(options?.token){roundKind=options.kind==='weekly'?'weekly':'daily';dailyRun=options;dailyBest=options.best||0;}
  else if(roundKind==='daily'){startDaily();return;}
  else if(roundKind==='weekly'){startWeekly();return;}

  if(isRankedMode()&&window.LoopShiftBoard && !window.LoopShiftBoard.ready()){window.LoopShiftBoard.askName(()=>start(options));return;}
  window.LoopShiftResults?.reset();window.LoopShiftBoard?.beginRound();
  socialAttempt=window.LoopShiftSocial?.begin(roundKind);runBosses=0;runCleanBest=0;
  previousRecords={...journey};cleanStreak=0;levelShieldLost=false;hitReview=null;comeback=null;tutorialStage=0;tutorialShift=false;
  runFocus=timedRun()?'survive':(['survive','sparks','perfects'].includes($('challenge-choice').value)?$('challenge-choice').value:'survive');
  $('safe-pin').hidden=true;$('hit-feedback').textContent='';$('share-daily').hidden=true;$('share-fallback').hidden=true;$('share-status').textContent='';
  $('tutorial-instruction').hidden=roundKind!=='tutorial';$('skip-tutorial').hidden=roundKind!=='tutorial';
  ghostTarget=journey.distance;levelSparks=0;levelPerfects=0;levelHits=0;roundHits=0;objectiveAwarded=false;
  pathLane=1;prepareCourse(options?.fresh===true);frameCarry=0;impactTime=0;lastGuideTarget=-1;landing=null;landingTime=0;
  $('collision-pin').classList.remove('show');$('result-coaching').hidden=true;$('result-gap').hidden=true;
  unlockAudio();mode='playing';score=0;passes=0;level=1;ringCount=2;shiftDirection=1;sparks=0;charge=0;shield=0;invulnerable=0;levelBannerTime=0;
  $('level-banner-wrap').classList.remove('show');$('arena').classList.remove('celebrating');
  if(roundKind==='practice'){level=practiceLevel;passes=(level-1)*12;ringCount=ringLimit(level);}
  levelTransition=null;departingRows=[];motionSpeed=targetSpeed();applyTheme();
  angle=-Math.PI/2;lane=1;radius=laneRadius(lane);rows=[];trail=[];particles=[];startDelay=roundKind==='tutorial'?0:quickRetry ? .45 : 1.5;lastShift=-1;
  gameTime=0;combo=0;feverCharge=0;feverTime=0;perfects=0;roundFevers=0;bestCombo=0;nextRowIndex=0;shatters=[];
  effectTime=0;patternNoticeTime=0;$('skill-effect').classList.remove('visible');
  $('pattern-notice').textContent=PATTERN_COPY.classic;$('pattern-notice').classList.remove('warning');
  prepareRhythm(level===1?1.65:2.3);
  if(roundKind==='tutorial'){rows=[];$('tutorial-instruction').textContent='Tap or press Space to switch rings.';}
  $('overlay').hidden=true;$('shift').disabled=false;$('pause').disabled=false;$('restart').hidden=true;
  $('pause').setAttribute('aria-label','Pause game');$('pause-icon').setAttribute('d','M8 5v14M16 5v14');
  enterGame();syncMusic();window.LoopShiftMusic?.play();
  $('toast').classList.remove('show');clearTimeout(toastTimer);updateHUD();lastTime=performance.now();
  $('announcement').textContent='Round started. Tap to switch rings. Dodge barriers and collect six sparks for a shield.';
  tone(440,.12);
}
function shift(){
  if(screen!=='game' || mode!=='playing' || startDelay>0 || gameTime-lastShift<.095)return;
  const target=guidedTarget(),movement=target-lane;
  if(target===lane)return;
  unlockAudio();lastShift=gameTime;
  for(const row of rows)if(!row.passed){row.perfectCandidate=false;row.closeCandidate=false;}
  const next=rows.find(row=>!row.passed&&row.angle-angle>0);
  if(next && !next.attempted && !next.open && blocks(next,lane) && Math.abs(radius-laneRadius(lane))<.015){
    const seconds=(next.angle-angle)/speedNow();
    if(seconds<.65){next.attempted=true;next.perfectCandidate=seconds>=.20&&seconds<=.38;next.closeCandidate=seconds>=.14&&seconds<.20;}
  }
  if(roundKind==='tutorial')tutorialShift=true;
  shiftDirection=movement;lane=target;landing=target;landingTime=0;updateGuide();
}
function setPaused(paused, moveFocus=true){
  if(paused && mode==='playing'){
    $('result-extras').hidden=true;$('result-coaching').hidden=true;$('result-gap').hidden=true;
    $('score-save-status').hidden=true;$('retry-score').hidden=true;
    window.LoopShiftMusic?.pause();mode='paused';$('overlay').hidden=false;$('overlay-kicker').textContent='TAKE A BREATHER';$('overlay-title').textContent='Round paused.';
    $('overlay-copy').textContent=`${score} points. Pick up where you left off.`;$('result').hidden=true;
    $('play').innerHTML='Keep going <span aria-hidden="true">↗</span>';$('restart').hidden=false;$('shift').disabled=true;
    $('pause').setAttribute('aria-label','Resume game');$('announcement').textContent='Game paused.';
    $('pause-icon').setAttribute('d','m8 5 10 7-10 7Z');
    if(moveFocus && screen==='game')$('play').focus({preventScroll:true});
  }else if(!paused && mode==='paused'){
    if(screen!=='game')enterGame();
    unlockAudio();
    mode='playing';$('overlay').hidden=true;$('shift').disabled=false;startDelay=1.5;frameCarry=0;lastTime=performance.now();syncMusic();window.LoopShiftMusic?.play();
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
  row.collected=true;sparks++;levelSparks++;score+=10*(weeklyRule()==='double-sparks'?2:1)*scoreFactor();advanceMission('sparks');burst(row.angle,laneRadius(row.sparkLane),C.gold,10);tone(620+(sparks%6)*75,.13,'sine',.07);
  if(shield<shieldCapacity()){charge++;if(charge>=6){charge=0;shield++;toast(`Shield ready · ${shield} / ${shieldCapacity()}`);shieldSound(shield===2?'gain2':'gain1');}}
  updateHUD();
}
function crash(hitRow=null,completed=false){
  captureReplay(true);
  window.LoopShiftResults?.finish({name:window.LoopShiftBoard?.player?.()?.name||'Orbit player',title:window.LoopShiftSocial?.title()||'',score,level,chain:bestCombo,ranked:isRankedMode()&&!!window.LoopShiftBoard?.player?.(),mode:roundKind==='weekly'?`Weekly · ${dailyRun.rule.name}`:roundKind==='daily'?'Daily challenge':roundKind==='endless'?'100-level run':roundKind,url:`${location.origin||''}${location.pathname||'/'}${roundKind==='daily'?'#daily':roundKind==='weekly'?'#weekly':'#home'}`},hitRow?{angle:hitRow.angle,lane:hitReview?.lane??lane,safe:hitRow.sparkLane}:null);
  window.LoopShiftSocial?.finish(socialAttempt,{kind:roundKind,sparks,chain:bestCombo,clean:runCleanBest,cleared:Math.floor(passes/12),bosses:runBosses,duration:gameTime});
  const previousBest=timedRun()?dailyBest:personalBest();
  const champion=completed&&roundKind==='endless';
  if(roundKind==='endless')journey.chain=Math.max(journey.chain||0,bestCombo);
  if(roundKind==='endless'){journey.distance=Math.max(journey.distance,passes);saveJourney();}
  const message=roundKind==='tutorial'?'Training finished. Tap Try again to practise or return Home.':roundKind==='sprint'?'A short challenge, a fresh start. Five levels is the finish line.':roundKind==='practice'?'Practice finished. Your ranked scores and unlocks are unchanged. Try this level again.':champion?'All 100 levels conquered! You mastered six rings. Play again to chase a higher score.':completed?`You completed the two-minute course. Try again to improve your ${roundKind==='weekly'?'weekly':'daily'} best.`:
    hitRow ? (lane===hitRow.sparkLane ? 'Your move had not reached the safe ring yet. Switch a little earlier.' :
      gameTime-lastShift<.3&&lastShift>=0 ? 'That move led into a blocked ring. Follow the glowing golden gap.' :
      `The safe gap was on ring ${hitRow.sparkLane+1} (counting from the centre). Follow its golden glow.`) : 'Watch for the golden gap and move one ring at a time.';
  $('result-coaching').textContent=message;$('result-coaching').hidden=false;
  $('result-gap').textContent=score>previousBest?'New personal best!':previousBest>0?`Only ${previousBest-score+1} more points to beat your ${roundKind==='daily'?'daily ':''}best.`:'Your first score is the one to beat.';
  $('result-gap').hidden=true;
  if(hitRow){impactTime=1.4;const p=point(hitRow.angle,radius);$('collision-pin').style.left=`${p.x}px`;$('collision-pin').style.top=`${p.y}px`;$('collision-pin').classList.add('show');}

  window.LoopShiftMusic?.pause();feverTime=0;resetCombo();
  mode='over';burst(angle,radius,completed?({forest:C.gold,ion:'#72e6ff',nebula:'#c8a4ff',solar:'#ffcc78'}[selectedTheme]||C.gold):C.coral,completed&&bossLevel()?40:28);
  if(completed){tone(660,.2);setTimeout(()=>tone(880,.2),140);setTimeout(()=>tone(1320,.35),280);}else{tone(130,.28,'triangle',.1);vibrate(65);}
  const isBest=score>previousBest;
  if(timedRun())dailyBest=Math.max(dailyBest,score);
  else if(roundKind==='endless') {best=Math.max(best,score);try{localStorage.setItem('loop-shift-best-v2',String(best));}catch{}}
  $('overlay-kicker').textContent=!isRankedMode()?'UNRANKED':roundKind==='practice'?'UNRANKED PRACTICE':champion?'100 / 100 LEVELS COMPLETE':isBest?'A NEW PERSONAL BEST':'ROUND COMPLETE';
  $('overlay-title').textContent=roundKind==='tutorial'?'Ready for the orbit!':roundKind==='sprint'?(completed?'Sprint complete!':'One more sprint?'):roundKind==='practice'?(completed?'Practice complete!':'Try this level again'):champion?'🏆 Loop Champion!':completed?(roundKind==='weekly'?'Weekly complete!':'Daily complete!'):isBest?'A new best!':'One more loop?';
  updateExtras();$('overlay-copy').textContent=resultFact();
  $('share-daily').hidden=roundKind!=='daily';
  $('result-score').textContent=score;$('result-sparks').textContent=sparks;$('result').hidden=false;
  $('play').innerHTML='Try again <span aria-hidden="true">↗</span>';$('restart').hidden=true;
  $('overlay').hidden=false;$('shift').disabled=true;$('pause').disabled=true;$('pause').setAttribute('aria-label','Pause game');
  clearTimeout(toastTimer);$('toast').classList.remove('show');updateHUD();
  $('play').focus({preventScroll:true});
  $('announcement').textContent=`${champion?'All 100 levels complete. Loop Champion!':'Round over.'} Score ${score}. ${sparks} sparks collected.`;
  if(isRankedMode())window.LoopShiftBoard?.submit(score,gameTime,timedRun()?dailyRun:null);
}
function update(dt){
  if(screen!=='game' || mode!=='playing')return;
  levelBannerTime=Math.max(0,levelBannerTime-dt);if(!levelBannerTime)$('level-banner-wrap').classList.remove('show');
  if(startDelay>0){startDelay=Math.max(0,startDelay-dt);updateCountdown();if(startDelay===0){updateHUD();tone(660,.1);}return;}
  if(timedRun())dt=Math.min(dt,Math.max(0,120-gameTime));
  if(roundKind==='tutorial'){updateTutorial(dt);return;}
  motionSpeed+=(targetSpeed()-motionSpeed)*(1-Math.exp(-dt*.8));
  gameTime+=dt;updateLevelTransition(dt);
  if(timedRun()&&gameTime>=120){gameTime=120;crash(null,true);return;}
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
  radius+=(laneRadius(lane)-radius)*(1-Math.exp(-dt*24));updateLanding(dt);
  invulnerable=Math.max(0,invulnerable-dt);
  if(!reducedMotion){trail.push({a:angle,r:radius});if(trail.length>(progress.trail==='comet'?38:24))trail.shift();}
  for(let i=0;i<rows.length;i++){
    const row=rows[i],delta=row.angle-angle,previousDelta=previousAngles[i]-oldAngle;
    if(row.patternStart&&!row.announced&&delta<speed*3&&delta>0)warnPattern(row);
    const inHazard=delta<.108&&previousDelta>-.108;
    if(inHazard && !row.open && !row.hit && blockedLanes(row).some(n=>Math.abs(radius-laneRadius(n))<(ringCount>2?.021:.038))){
      if(feverTime<=0)markHit(row);
      row.hit=true;row.perfectCandidate=false;row.closeCandidate=false;if(feverTime<=0){levelHits++;roundHits++;}
      if(feverTime>0){burst(row.angle,laneRadius(row.hazardLane),'#72e6ff',18);}
      else if(shield || invulnerable>0){
        resetCombo();
        if(shield && invulnerable<=0){
          shield--;levelShieldLost=true;cleanStreak=0;invulnerable=.65;if(!shield)comeback={angle:angle+.43,lane:lane+Math.sign(row.sparkLane-lane)};shatterShield();burst(angle,radius,ballColor(),24);
          toast(`Shield broken · ${shield} remaining`);shieldSound('break');
        }
      }else{crash(row);return;}
    }
    if(delta<.105&&previousDelta>-.105&&!row.collected&&Math.abs(radius-laneRadius(row.sparkLane))<.032)collect(row);
    if(row.bonusLane!==null&&row.bonusLane!==undefined&&!row.bonusCollected&&delta+.40<.055&&previousDelta+.40>-.055&&Math.abs(radius-laneRadius(row.bonusLane))<.018){row.bonusCollected=true;const reward=40*scoreFactor();score+=reward;showEffect(`BONUS! +${reward}`);burst(row.angle+.40,laneRadius(row.bonusLane),'#ffa8da',14);feedback('bonus');}
    if(delta<-.16&&!row.passed){
      row.passed=true;passes++;pathLane=row.sparkLane;
      if(row.perfectCandidate&&!row.hit&&!row.open)awardPerfect(row);
      else if(feverTime<=0)resetCombo();
      if(row.closeCandidate&&!row.closeAwarded&&!row.hit&&!row.open&&feverTime<=0&&!row.perfectAwarded){row.closeAwarded=true;score+=5;showEffect('CLOSE! +5','close');feedback('close');}
      score+=scoreFactor();
      if(roundKind==='sprint'&&passes>=60){crash(null,true);return;}
      if(roundKind==='practice'&&passes%12===0){finishLevel();crash(null,true);return;}
      if(!timedRun()&&passes>=1200){finishLevel();crash(null,true);return;}
      const nextLevel=Math.min(100,1+Math.floor(passes/12));
      if(nextLevel>level){captureReplay();levelUp(nextLevel);updateHUD();return;}
      updateHUD();
    }
  }
  if(comeback){const d=comeback.angle-angle;if(Math.abs(d)<.09&&Math.abs(radius-laneRadius(comeback.lane))<.032){collect({angle:comeback.angle,sparkLane:comeback.lane});feedback('comeback');comeback=null;}else if(d<-.12)comeback=null;}
  rows=rows.filter(row=>row.angle>angle-.65);
  // Do not preview the next level using this level's geometry and then replace it.
  const levelEnd=level*12;
  while(rows.length<5&&nextRowIndex<levelEnd){const last=rows.at(-1);addRow((last?.baseAngle??angle+1)+rowSpacing());}
  if(patternNoticeTime===0){
    $('pattern-notice').classList.remove('warning');
    const next=rows.find(row=>row.angle>angle&&!row.passed);
    $('pattern-notice').textContent=next?.recovery?'BREATHE · Easy gaps and golden sparks':bossLevel()?`BOSS ${level} · ${BOSS_TYPES[bossType()][0]}`:PATTERN_COPY[next?.pattern??'classic'];
  }
  updateExtras();updateRhythm();updateGuide();captureReplay();
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
function drawSpark(a,r,alpha=1,color=C.gold){
  const p=point(a,r),s=size*.012;ctx.save();ctx.globalAlpha=alpha;ctx.translate(p.x,p.y);ctx.rotate(Math.PI/4);ctx.fillStyle=color;ctx.shadowColor=color;ctx.shadowBlur=reducedMotion?0:10;ctx.fillRect(-s,-s,s*2,s*2);ctx.restore();
}
function drawGuide(){
  if(ringCount===2)return;
  const targetRadius=laneRadius(guidedTarget()),from=point(angle,radius),to=point(angle,targetRadius);
  ctx.save();ctx.strokeStyle='#b6dfff';ctx.lineWidth=1.5;ctx.setLineDash([3,6]);
  arc(targetRadius,0,TAU,'#b6dfff66',1.5);
  ctx.beginPath();ctx.moveTo(from.x,from.y);ctx.lineTo(to.x,to.y);ctx.stroke();ctx.setLineDash([]);
  ctx.fillStyle='#0c1922';ctx.beginPath();ctx.arc(to.x,to.y,Math.max(5,size*.018),0,TAU);ctx.fill();
  ctx.strokeStyle='#b6dfff';ctx.lineWidth=2;ctx.stroke();ctx.restore();
}
function drawLanding(){
  if(landingTime<=0)return;
  const fade=landingTime/.28,r=laneRadius(landingLane),p=point(angle,r);
  ctx.save();ctx.globalAlpha=fade*.8;
  arc(r,0,TAU,levelColor(),2.5);
  if(!reducedMotion){
    ctx.beginPath();ctx.arc(p.x,p.y,size*(.021+(1-fade)*.045),0,TAU);
    ctx.strokeStyle='#f4ffd9';ctx.lineWidth=1.8;ctx.stroke();
  }
  ctx.restore();
}
function draw(time,dt){
  if(hitReview){if(mode!=='paused')hitReview.life=Math.max(0,hitReview.life-dt);if(!hitReview.life){hitReview=null;$('safe-pin').hidden=true;$('hit-feedback').textContent='';}}
  impactTime=Math.max(0,impactTime-dt);if(!impactTime)$('collision-pin').classList.remove('show');
  ctx.clearRect(0,0,size,size);ctx.lineCap='round';
  // Faint orbit ticks and crosshairs provide a stable frame of reference.
  for(let i=0;i<60;i++){
    const a=i/60*TAU,p1=point(a,.462),p2=point(a,i%5===0?.451:.457);
    ctx.beginPath();ctx.moveTo(p1.x,p1.y);ctx.lineTo(p2.x,p2.y);ctx.strokeStyle=i%5===0?'#405042':'#2a392e';ctx.lineWidth=1;ctx.stroke();
  }
  if(roundKind==='endless'&&ghostTarget>0){const ghostLevel=Math.min(100,1+Math.floor(ghostTarget/12));if(level===ghostLevel){ctx.save();ctx.setLineDash([3,3]);arc(.46,-Math.PI/2,-Math.PI/2+TAU*(ghostTarget===1200?12:ghostTarget%12)/12,'#b5c5ee',3);const g=point(-Math.PI/2+TAU*(ghostTarget===1200?12:ghostTarget%12)/12,.46);ctx.fillStyle='#b5c5ee';ctx.beginPath();ctx.arc(g.x,g.y,4,0,TAU);ctx.fill();ctx.restore();}}
  ctx.setLineDash([2,7]);arc(.16,0,TAU,'#29392d',1);ctx.setLineDash([]);
  for(let ring=0;ring<ringCount;ring++){
    const r=laneRadius(ring);
    ctx.save();ctx.globalAlpha=levelTransition&&ring>=levelTransition.oldRings?morphProgress():1;
    arc(r+.006,0,TAU,'#070f0b',size*ringSize(.053,.035));
    arc(r,0,TAU,'#223b2e',size*ringSize(.043,.026));arc(r-.012,0,TAU,'#415a46',1);
    arc(r+.018,0,TAU,'#0a140e',2);arc(r,0,TAU,levelColor()+'88',1.5);
    if(feverTime>0){
      ctx.save();ctx.shadowBlur=reducedMotion?0:12;
      for(let i=0;i<12;i++){
        const color=`hsl(${i*30} 95% 73%)`;ctx.shadowColor=color;
        const a=i/12*TAU+(reducedMotion?0:gameTime*.25);
        arc(r,a,a+TAU/12-.035,color,3);
      }
      ctx.restore();
    }
  ctx.restore();}
  if(mode==='ready'){
    const demoTime=reducedMotion?0:time*.00015;
    for(const [a,l] of [[.2,1],[2.3,0],[4.4,1]]){
      arc(laneRadius(l),a-.073,a+.073,C.coral,size*.033);drawSpark(a,laneRadius(1-l));
    }
    drawOrb(-1.2+demoTime,.385,false);
  }else{
    const nearest=rows.find(row=>!row.passed&&row.angle>angle);
    for(const row of [...departingRows,...rows]){
      const rowRadius=n=>row.radii?.[n]??laneRadius(n);
      const arrival=Math.min(1,Math.max(0,(gameTime-(row.bornAt??gameTime-1))/.35));
      const fade=row.radii?Math.max(0,1-(gameTime-row.leavingAt)/.4):arrival*arrival*(3-2*arrival);
      const ahead=row.angle-angle;
      if(ahead>TAU-.45)continue;
      const opacity=fade*Math.min(1,Math.max(0,(ahead+.45)/.3),Math.max(0,(TAU-.45-ahead)/.3));
      ctx.globalAlpha=opacity;
      if(!row.hit){
        for(const hazard of blockedLanes(row)){
        const r=rowRadius(hazard);
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
        if(mode==='playing'&&startDelay===0&&!row.open&&hazard===lane&&seconds>=.20&&seconds<=.38){
          arc(r,row.angle-.08,row.angle+.08,C.gold,size*.05);
          arc(r,row.angle-.06,row.angle+.06,C.coral,size*.027);
        }
      }
      }
      if(row===nearest&&ahead>0&&!row.open&&!row.hit){for(const n of blockedLanes(row))arc(rowRadius(n),row.angle-.085,row.angle+.085,'#ffe7d9',2);}
      if(row===nearest&&ahead>0){ctx.save();ctx.globalAlpha=.8*opacity;ctx.shadowColor=C.gold;ctx.shadowBlur=reducedMotion?0:12;arc(rowRadius(row.sparkLane),row.angle-.13,row.angle+.13,C.gold,3);ctx.restore();}
      if(row.bonusLane!==null&&row.bonusLane!==undefined&&!row.bonusCollected&&ahead+.4>-.1){drawSpark(row.angle+.4,rowRadius(row.bonusLane),opacity,'#ffa8da');}
      if(!row.collected){drawSpark(row.angle,rowRadius(row.sparkLane),opacity);}
    }
    ctx.globalAlpha=1;
    if(comeback)drawSpark(comeback.angle,laneRadius(comeback.lane),1,'#83f5c0');
    if(hitReview){ctx.save();arc(laneRadius(hitReview.lane),hitReview.angle-.11,hitReview.angle+.11,'#ffffff',7);arc(laneRadius(hitReview.safe),0,TAU,'#83f5c0',2);ctx.restore();}
    ctx.save();
    for(let i=0;i<trail.length;i++){
      const p=point(trail[i].a,trail[i].r),fraction=(i+1)/trail.length;
      ctx.globalAlpha=fraction*(progress.trail==='comet'?.6:.4);
      ctx.fillStyle=feverTime>0?`hsl(${i*13} 95% 73%)`:selectedTheme==='ion'?'#72e6ff':selectedTheme==='nebula'?'#c8a4ff':selectedTheme==='solar'?'#ffcc78':selectedTheme==='convergence'?(i%2?'#83f5c0':'#ed9fff'):ballColor();
      ctx.shadowColor=ctx.fillStyle;ctx.shadowBlur=progress.trail==='comet'?10:4;
      if(progress.trail==='stardust'&&i%2===0){
        ctx.save();ctx.translate(p.x,p.y);ctx.rotate(i);ctx.fillRect(-2*fraction,-2*fraction,4*fraction,4*fraction);ctx.restore();
      }else{ctx.beginPath();ctx.arc(p.x,p.y,size*.014*fraction,0,TAU);ctx.fill();}
    }
    ctx.restore();
    if(mode==='playing'){drawGuide();drawLanding();}
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
  if(invulnerable>0)ctx.globalAlpha=.65;
  if(safe){for(let i=0;i<shield;i++){ctx.beginPath();ctx.arc(p.x,p.y,size*(.024+i*.008),0,TAU);ctx.strokeStyle=C.lime;ctx.shadowColor=C.lime;ctx.shadowBlur=reducedMotion?0:7;ctx.lineWidth=2;ctx.stroke();}}
  ctx.shadowColor=ballColor();ctx.shadowBlur=reducedMotion?0:24;ctx.fillStyle=ballColor();ctx.beginPath();ctx.arc(p.x,p.y,size*ringSize(.018,.012),0,TAU);ctx.fill();
  ctx.shadowBlur=0;ctx.fillStyle='#f3ffd8';ctx.beginPath();ctx.arc(p.x-size*.004,p.y-size*.005,size*.006,0,TAU);ctx.fill();ctx.restore();
}
function frame(time){const dt=Math.min((time-lastTime)/1000 || 0,.035);lastTime=time;totalTime+=dt;if(screen==='game'){frameCarry+=dt;while(frameCarry>=1/120){update(1/120);frameCarry-=1/120;}syncMusic();draw(time,dt);}else frameCarry=0;requestAnimationFrame(frame);}
$('sprint-play').addEventListener('click',startSprint);
$('tutorial-play').addEventListener('click',()=>{const guide=$('game-guide');guide.open=true;guide.scrollIntoView?.({behavior:reducedMotion?'auto':'smooth',block:'start'});$('guide-title').focus();});
$('tutorial-start').addEventListener('click',startTutorial);
$('skip-tutorial').addEventListener('click',()=>{if(roundKind==='tutorial'){mode='over';window.LoopShiftMusic?.pause();goHome();}});
$('share-daily').addEventListener('click',shareDaily);
$('vibration-toggle').setAttribute('aria-pressed',String(vibrationOn));
$('vibration-toggle').textContent=vibrationOn?'Vibration on':'Vibration off';
$('vibration-toggle').addEventListener('click',()=>{vibrationOn=!vibrationOn;try{localStorage.setItem('loop-shift-vibration',String(vibrationOn));}catch{}$('vibration-toggle').setAttribute('aria-pressed',String(vibrationOn));$('vibration-toggle').textContent=vibrationOn?'Vibration on':'Vibration off';});
$('daily-play').addEventListener('click',startDaily);
$('weekly-play').addEventListener('click',startWeekly);
$('community-reward').addEventListener('click',()=>{if(!window.LoopShiftSocial?.unlockedTheme())return;selectedTheme='convergence';try{localStorage.setItem('loop-shift-theme-v2',selectedTheme);}catch{}updateAdventureUI();$('community-reward').textContent='Convergence theme · Selected';});
$('home-play').addEventListener('click',homePlay);
$('home-new').addEventListener('click',startEndless);
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
function tapShift(event){
  if(event.isPrimary===false||(event.button!==undefined&&event.button!==0))return;
  event.preventDefault();shift();$('shift').focus({preventScroll:true});
}
$('shift').addEventListener('pointerdown',tapShift);
$('shift').addEventListener('click',event=>{if(event.detail===0)shift();});
$('game-screen').addEventListener('pointerdown',event=>{
  if(mode==='playing'&&!event.target.closest?.('button,a,input,textarea,select,details'))tapShift(event);
});
$('sound').addEventListener('click',()=>{soundOn=!soundOn;try{localStorage.setItem('loop-shift-sound',String(soundOn));}catch{}unlockAudio();updateSound();tone(680,.12);});
document.addEventListener('keydown',(event)=>{
  if($('name-dialog').open || event.target.closest?.('input,textarea,select,summary,[role="option"],[contenteditable="true"]'))return;
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
window.LoopShiftBoard?.onBest?.(()=>updateHUD());
updateProgressUI();
$('practice-play').addEventListener('click',startPractice);
for(const [id,,minimum] of COSMETICS)$('theme-'+id).addEventListener('click',()=>{if(journey.highest<minimum)return;selectedTheme=id;try{localStorage.setItem('loop-shift-theme-v2',id);}catch{}updateAdventureUI();});
window.LoopShiftBoard?.onProgress(data=>{journey={highest:Math.max(journey.highest,data.highest),distance:Math.max(journey.distance,data.distance),badges:journey.badges|data.badges,chain:Math.max(journey.chain||0,data.chain||0),clean:Math.max(journey.clean||0,data.clean||0)};try{selectedTheme=localStorage.getItem('loop-shift-theme-v2')||selectedTheme;}catch{}updateAdventureUI();});
updateAdventureUI();
history.replaceState(null,'',location.hash==='#play'?'#play':location.hash==='#daily'?'#daily':location.hash==='#weekly'?'#weekly':'#home');
showScreen(location.hash==='#play'?'game':'home',false);
applyTheme();updateSound();updateHUD();resize();requestAnimationFrame(frame);
