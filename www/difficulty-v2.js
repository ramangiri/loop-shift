/* Difficulty 2.2: reaction-first shuffled levels, one-tap routes and fair pressure. */
(() => {
 if(typeof addRow!=='function'||typeof updateRow!=='function'||typeof drawGuide!=='function'||typeof warnPattern!=='function'||typeof shift!=='function')return;
 const originalAddRow=addRow,originalUpdateRow=updateRow,originalDrawGuide=drawGuide,originalWarnPattern=warnPattern,previousShift=shift,originalGameUpdate=update;
 const completed=new WeakSet(),planCache=new Map();
 let perfectStreak=0,cleanGateStreak=0,lastRoundHits=typeof roundHits==='number'?roundHits:0;
 const clampLane=n=>Math.max(0,Math.min(ringCount-1,n));
 const laneSet=(row,safe,extraSafe=null)=>{
   safe=clampLane(safe);row.sparkLane=safe;
   const open=new Set([safe]);if(Number.isInteger(extraSafe))open.add(clampLane(extraSafe));
   row.hazardLanes=Array.from({length:ringCount},(_,n)=>n).filter(n=>!open.has(n));
   row.hazardLane=row.hazardLanes[0]??Math.max(0,safe-1);
 };
 const adjacent=from=>[from-1,from+1].filter(n=>n>=0&&n<ringCount);
 const safeStep=(from,step)=>{
   let next=clampLane(from+(step||1));
   if(next===from){const options=adjacent(from);next=options.length?options[0]:from;}
   return next;
 };
 const localIndex=row=>((row.index%12)+12)%12;
 const guideWindow=()=>true;
 const guideVisible=()=>true;
 const speedBoost=()=>level<=5?1:level<=10?1.025:level<=20?1.055:level<=40?1.08:level<=60?1.105:level<=80?1.125:1.14;
 const currentRunSeed=()=>{
   try{if(typeof retryCourse!=='undefined'&&retryCourse&&Number.isInteger(retryCourse.seed))return retryCourse.seed>>>0;}catch{}
   try{if(Number.isInteger(gameSeed))return gameSeed>>>0;}catch{}
   return 1;
 };
 const seededRandom=seed=>()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 const hardToken=token=>token==='switch'||token==='attack';
 function mixForLevel(lvl){
   if(lvl===1)return ['classic','classic','classic','classic','classic','classic','classic','classic','moving','moving','moving','moving'];
   if(lvl<=3)return ['classic','classic','classic','classic','classic','moving','moving','moving','moving','pulse','pulse','classic'];
   if(lvl<=5)return ['classic','classic','classic','classic','moving','moving','moving','moving','moving','pulse','pulse','pulse'];
   if(lvl<=10)return ['classic','classic','classic','moving','moving','moving','moving','moving','pulse','pulse','pulse','pulse'];
   if(lvl<=20)return ['classic','classic','moving','moving','moving','moving','moving','pulse','pulse','pulse','pulse','pulse'];
   if(lvl<=30)return ['classic','classic','moving','moving','moving','moving','pulse','pulse','pulse','pulse','switch','switch'];
   if(lvl<=40)return ['classic','moving','moving','moving','moving','pulse','pulse','pulse','pulse','attack','attack','attack'];
   return ['moving','moving','moving','moving','pulse','pulse','pulse','pulse','switch','switch','attack','attack'];
 }
 function buildPlan(lvl){
   const seed=(currentRunSeed()^Math.imul(lvl,2654435761)^0x9e3779b9)>>>0;
   const key=`${seed}:${lvl}:${ringCount}`;
   if(planCache.has(key))return planCache.get(key);
   const rand=seededRandom(seed),remaining=mixForLevel(lvl).slice(),tokens=[];
   while(tokens.length<12&&remaining.length){
     const prev=tokens.at(-1),prev2=tokens.at(-2);
     let candidates=remaining.map((token,index)=>({token,index})).filter(({token})=>{
       if(prev===token&&prev2===token)return false;
       if(hardToken(prev)&&hardToken(token))return false;
       return true;
     });
     if(!candidates.length)candidates=remaining.map((token,index)=>({token,index}));
     const choice=candidates[Math.floor(rand()*candidates.length)];
     tokens.push(choice.token);remaining.splice(choice.index,1);
   }
   const closeCalls=new Set(),wanted=lvl<6?0:lvl<=10?1:lvl<=20?2:lvl<=40?3:4;
   const slots=Array.from({length:12},(_,i)=>i).filter(i=>!hardToken(tokens[i])&&tokens[i]!=='pulse');
   for(let i=slots.length-1;i>0;i--){const j=Math.floor(rand()*(i+1));[slots[i],slots[j]]=[slots[j],slots[i]];}
   for(const slot of slots){
     if(closeCalls.size>=wanted)break;
     if([...closeCalls].some(n=>Math.abs(n-slot)<=1))continue;
     closeCalls.add(slot);
   }
   const plan={tokens,closeCalls};planCache.set(key,plan);return plan;
 }
 update=function(dt){
   if(roundKind==='endless'&&!focusRun&&roundKind!=='tutorial'&&roundKind!=='practice'&&rushTime<=0&&level>5){
     motionSpeed=Math.max(motionSpeed,targetSpeed()*speedBoost());
   }
   return originalGameUpdate(dt);
 };
 function makeAttack(row,prevSafe,local){
   const plan=buildPlan(level),seed=(currentRunSeed()^Math.imul(row.index+1,2246822519)^Math.imul(level,3266489917))>>>0,rand=seededRandom(seed);
   const step=rand()<.5?-1:1;
   laneSet(row,safeStep(prevSafe,step));row.attackName='READ BLUE';row.attackStep=step;
   row.pattern=rand()<.5?'moving':'pulse';row.locked=false;row.patternStart=true;
   // Never let attacks repeat in a fixed left/right rhythm across the level.
   if(local>0&&plan.tokens[local-1]==='attack'&&row.attackStep===rows.at(-2)?.attackStep)row.attackStep*=-1;
 }
 function configureBoss(row,prevSafe,token){
   const local=localIndex(row),phase=Math.floor(local/4)+1;row.bossPhase=phase;row.bossPhaseStart=local%4===0;
   if(phase===1){row.pattern=token==='pulse'?'pulse':token==='moving'?'moving':bossType()===2?'pulse':'classic';row.locked=row.pattern==='classic';}
   else if(phase===2){row.pattern=token==='classic'?'moving':hardToken(token)?'pulse':token;row.locked=false;}
   else {
     row.pattern=token==='classic'?'moving':hardToken(token)?(local%2?'pulse':'moving'):token;row.locked=false;
     if(token==='switch'||local===10){row.switching=true;row.switchFromLane=row.sparkLane;const c=adjacent(prevSafe);row.switchToLane=c[(row.index+currentRunSeed())%Math.max(1,c.length)]??safeStep(prevSafe,1);}
   }
   row.patternStart=row.patternStart||row.bossPhaseStart;
 }
 function closeCallWanted(row,plan){
   if(roundKind!=='endless'||focusRun||level<6||bossLevel()||row.recovery||row.switching||row.attackName||row.pattern==='pulse')return false;
   return plan.closeCalls.has(localIndex(row));
 }
 function configureCloseCall(row,plan){
   if(!closeCallWanted(row,plan))return;
   row.closeCallGold=true;row.closeCallGoldLane=row.entryLane;
   row.closeCallGoldSeconds=level<=10?.45:level<=20?.42:level<=40?.39:level<=60?.36:level<=80?.34:.32;
   row.closeCallGoldCollected=false;row.closeCallGoldResolved=false;
   row.bonusLane=null;row.shieldBonus=false;row.patternStart=true;
 }
 const closeCallAngle=row=>row.angle-Math.max(.22,targetSpeed()*(row.closeCallGoldSeconds||.36));
 function collectCloseCall(row){
   if(row.closeCallGoldCollected||row.closeCallGoldResolved)return;
   row.closeCallGoldCollected=true;row.closeCallGoldResolved=true;
   sparks++;levelSparks++;advanceMission('sparks');
   if(shield<shieldCapacity()){
     charge++;
     if(charge>=6){charge=0;shield++;toast(`Shield ready · ${shield} / ${shieldCapacity()}`);shieldSound(shield===2?'gain2':'gain1');}
   }
   const reward=40*scoreFactor();score+=reward;
   showEffect(`CLOSE CALL GOLD! +${reward}`,'close');
   burst(closeCallAngle(row),laneRadius(row.closeCallGoldLane),C.gold,14);tone(900,.1,'sine',.055);vibrate(10);updateHUD();
 }
 addRow=function(a,index=nextRowIndex++){
   const before=rows.at(-1),prevSafe=Math.max(0,Math.min(ringCount-1,before?.sparkLane??pathLane));
   const result=originalAddRow(a,index),row=rows.at(-1);if(!row)return result;
   const local=localIndex(row),plan=buildPlan(level),token=plan.tokens[local]||'classic';
   // Every level, including Level 1, uses a shuffled but fair pattern order.
   // Recovery rows stay simple; all other rows follow this run's reaction plan.
   if(!row.recovery&&!bossLevel()){
     if(token==='switch'){
       row.pattern='moving';row.locked=false;row.switching=true;row.switchFromLane=row.sparkLane;
       const c=adjacent(prevSafe);row.switchToLane=c[(row.index+currentRunSeed())%Math.max(1,c.length)]??safeStep(prevSafe,1);
     }else if(token==='attack')makeAttack(row,prevSafe,local);
     else {row.pattern=token;row.locked=token==='classic';}
   }
   if(bossLevel())configureBoss(row,prevSafe,token);
   // BLUE always remains exactly one neighbouring ring away.
   if(row.sparkLane===prevSafe||Math.abs(row.sparkLane-prevSafe)>1){const options=adjacent(prevSafe);if(options.length)laneSet(row,options[(row.index+level+currentRunSeed())%options.length]);}
   row.doubleShift=false;row.riskLane=null;row.riskReward=false;
   row.patternStart=!before||before.pattern!==row.pattern||row.switching||!!row.attackName;
   configureCloseCall(row,plan);
   if(before&&before.bonusLane!==null&&before.bonusLane!==undefined)before.bonusLane=row.sparkLane;
   if(before){
     const gap=row.baseAngle-before.baseAngle;let scale=1;
     if(level<=2)scale=.99;
     else if(level<=5)scale=.97;
     else if(level<=10)scale=.92;
     else if(level<=20)scale=.96;
     else if(level<=40)scale=.94;
     else if(level<=60)scale=.91;
     else scale=perfectStreak>=6?.84:perfectStreak>=3?.88:.92;
     if(row.bossPhase===3)scale=Math.min(scale,.87);
     row.baseAngle=before.baseAngle+gap*scale;row.angle=row.baseAngle;
   }
   return result;
 };
 updateRow=function(row){
   const result=originalUpdateRow(row);
   const seconds=(row?.baseAngle-angle)/Math.max(.01,speedNow());
   if(row?.pattern==='moving'&&!row.locked&&seconds>.85&&level>=6){
     const intensity=Math.min(1,Math.max(.18,(level-5)/45));
     row.angle+=Math.sin(gameTime*(1.75+level*.004)+row.phase*1.7)*(.012+.018*intensity);
     if(level>=41)row.angle+=Math.sin(gameTime*3.15+row.phase*.63)*.014*intensity;
   }
   if(row?.pattern==='pulse'&&!row.locked&&seconds>.85&&level>=4){
     const rate=2.2+Math.min(1.1,level*.012);row.open=Math.sin(gameTime*rate+row.phase)>(level>=61?.24:.15);
   }
   if(row?.switching&&!row.switchDone&&seconds<=1.22){
     row.switchDone=true;let target=row.switchToLane;
     if(target===row.entryLane||Math.abs(target-row.entryLane)>1)target=safeStep(row.entryLane,(row.index+level)%2?1:-1);
     laneSet(row,target);row.locked=true;row.angle=row.baseAngle;showEffect('GAP SWITCH · MOVE!','close');tone(360,.08,'triangle',.04,640);
   }
   return result;
 };
 warnPattern=function(row){
   if(row?.closeCallGold){row.announced=true;$('pattern-notice').textContent='CLOSE CALL GOLD · OPTIONAL · WAIT, THEN TAP BLUE';$('pattern-notice').classList.add('warning');patternNoticeTime=2;tone(520,.1,'triangle',.035,760);return;}
   if(row?.bossPhaseStart){row.announced=true;$('pattern-notice').textContent=`BOSS PHASE ${row.bossPhase}/3 · ${row.bossPhase===1?'READ':row.bossPhase===2?'PRESSURE':'FINAL'}`;$('pattern-notice').classList.add('warning');patternNoticeTime=2.2;tone(300+row.bossPhase*70,.13,'triangle',.04);return;}
   if(row?.attackName&&row.patternStart){row.announced=true;$('pattern-notice').textContent='ATTACK · READ BLUE';$('pattern-notice').classList.add('warning');patternNoticeTime=1.7;tone(360,.11,'triangle',.035);return;}
   if(row?.switching){row.announced=true;$('pattern-notice').textContent='SWITCH GATE · WATCH THE SAFE GAP';$('pattern-notice').classList.add('warning');patternNoticeTime=2;tone(330,.11,'triangle',.035);return;}
   return originalWarnPattern(row);
 };
 drawGuide=function(){
   if(guideVisible())originalDrawGuide();
   const next=rows.find(r=>!r.passed&&r.angle>angle-.04);
   if(!next?.closeCallGold||next.closeCallGoldResolved)return;
   const coinAngle=closeCallAngle(next),seconds=(coinAngle-angle)/Math.max(.01,speedNow());
   if(seconds>1.25||seconds<-.14)return;
   const alpha=Math.max(.35,Math.min(1,(seconds+.14)/.38));
   drawSpark(coinAngle,laneRadius(next.closeCallGoldLane),alpha,C.gold);
   ctx.save();ctx.globalAlpha=alpha*.85;ctx.shadowColor=C.gold;ctx.shadowBlur=(reducedMotion||softTheme)?0:10;arc(laneRadius(next.closeCallGoldLane),coinAngle-.055,coinAngle+.055,C.gold,2.5);ctx.restore();
 };
 shift=function(direction=0){return previousShift(direction);};
 function makeRecovery(){
   const future=rows.filter(row=>!row.passed&&(row.baseAngle-angle)/Math.max(.01,speedNow())>.9).slice(0,2);let safe=lane;
   for(const row of future){row.recovery=true;row.switching=false;row.switchDone=true;row.doubleShift=false;row.riskLane=null;row.riskReward=false;row.closeCallGold=false;row.closeCallGoldResolved=true;row.pattern='classic';row.locked=true;row.open=false;const options=adjacent(safe);safe=options.length?options[(row.index+level)%options.length]:safe;laneSet(row,safe);}
 }
 function resolveCloseCall(beforeAngle){
   if(mode!=='playing'||roundKind!=='endless'||focusRun||rushTime>0)return;
   for(const row of rows){
     if(!row.closeCallGold||row.closeCallGoldResolved)continue;
     const coinAngle=closeCallAngle(row);
     if(beforeAngle<=coinAngle+.07&&angle>=coinAngle-.07&&Math.abs(radius-laneRadius(row.closeCallGoldLane))<.034){collectCloseCall(row);continue;}
     if(angle>coinAngle+.11)row.closeCallGoldResolved=true;
   }
 }
 const difficultyUpdate=update;
 update=function(dt){
   const beforeAngle=angle;
   const result=difficultyUpdate(dt);
   resolveCloseCall(beforeAngle);
   return result;
 };
 function frame(){
   if(typeof roundHits==='number'&&roundHits>lastRoundHits){lastRoundHits=roundHits;perfectStreak=0;cleanGateStreak=0;if(level>=61)makeRecovery();}
   for(const row of rows){
     if(row.passed&&!completed.has(row)){completed.add(row);if(row.hit){perfectStreak=0;cleanGateStreak=0;}else{cleanGateStreak++;perfectStreak=row.perfectAwarded?perfectStreak+1:0;}}
   }
   const guide=$('guide-status');if(guide&&roundKind!=='tutorial'&&roundKind!=='practice'){
     const target=guidedTarget();guide.textContent=target===lane?'BLUE GUIDE · Safe ring':`BLUE GUIDE · Ring ${target+1}`;
   }
   requestAnimationFrame(frame);
 }
 requestAnimationFrame(frame);
})();
