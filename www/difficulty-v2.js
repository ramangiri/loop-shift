/* Difficulty 2.1: one-tap routes, progressive speed and optional close-call gold. */
(() => {
 if(typeof addRow!=='function'||typeof updateRow!=='function'||typeof drawGuide!=='function'||typeof warnPattern!=='function'||typeof shift!=='function')return;
 const originalAddRow=addRow,originalUpdateRow=updateRow,originalDrawGuide=drawGuide,originalWarnPattern=warnPattern,previousShift=shift,originalGameUpdate=update;
 const completed=new WeakSet();
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
 // BLUE stays visible and always represents one reachable tap. Difficulty now comes
 // from speed, motion, switching gates and optional timing rewards instead of double taps.
 const guideWindow=()=>true;
 const guideVisible=()=>true;
 const speedBoost=()=>level<=5?1:level<=10?1.025:level<=20?1.055:level<=40?1.08:level<=60?1.105:level<=80?1.125:1.14;
 update=function(dt){
   if(roundKind==='endless'&&!focusRun&&roundKind!=='tutorial'&&roundKind!=='practice'&&rushTime<=0&&level>5){
     motionSpeed=Math.max(motionSpeed,targetSpeed()*speedBoost());
   }
   return originalGameUpdate(dt);
 };
 function makeAttack(row,prevSafe){
   const local=localIndex(row),block=Math.floor(local/3),seq=block%2===0?[1,1,-1]:[-1,1,-1],labels=block%2===0?'OUT → OUT → IN':'IN → OUT → IN';
   const step=seq[local%3];laneSet(row,safeStep(prevSafe,step));row.attackName=labels;row.attackStep=step;row.pattern=(block+local)%2?'moving':'pulse';row.locked=false;row.patternStart=local%3===0;
 }
 function configureBoss(row,prevSafe){
   const local=localIndex(row),phase=Math.floor(local/4)+1;row.bossPhase=phase;row.bossPhaseStart=local%4===0;
   if(phase===1){row.pattern=bossType()===2?'pulse':'classic';}
   else if(phase===2){row.pattern=local%2?'moving':'pulse';row.locked=false;}
   else {
     row.pattern=local%2?'pulse':'moving';row.locked=false;
     if(local===10){row.switching=true;row.switchFromLane=row.sparkLane;const c=adjacent(prevSafe);row.switchToLane=c[(row.index+level)%Math.max(1,c.length)]??safeStep(prevSafe,1);}
   }
   row.patternStart=row.patternStart||row.bossPhaseStart;
 }
 function closeCallWanted(row){
   if(roundKind!=='endless'||focusRun||level<11||bossLevel()||row.recovery||row.switching||row.attackName||row.pattern==='pulse')return false;
   const local=localIndex(row);
   if(level<=20)return [4,10].includes(local);
   if(level<=40)return [3,7,10].includes(local);
   if(level<=60)return [2,6,10].includes(local);
   return [2,5,8,11].includes(local);
 }
 function configureCloseCall(row){
   if(!closeCallWanted(row))return;
   // The optional coin sits on the lane the player is already using, shortly before
   // that lane's red blocker. Grab it, then make one normal tap to BLUE.
   row.closeCallGold=true;row.closeCallGoldLane=row.entryLane;
   row.closeCallGoldSeconds=level<=20?.42:level<=40?.39:level<=60?.36:level<=80?.34:.32;
   row.closeCallGoldCollected=false;row.closeCallGoldResolved=false;
   row.patternStart=true;
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
   const local=localIndex(row);
   if(level>=6&&level<=10){row.pattern=local%2?'moving':'pulse';row.locked=false;}
   // Levels 11+ no longer create two-ring destinations. Core generation already
   // chooses a neighbouring ring, so every BLUE destination stays one tap away.
   if(level>=21&&level<=30&&[3,7,10].includes(local)){
     row.switching=true;row.switchFromLane=row.sparkLane;const c=adjacent(prevSafe);row.switchToLane=c[(row.index+level)%Math.max(1,c.length)]??safeStep(prevSafe,1);row.pattern='moving';row.locked=false;row.patternStart=true;
   }
   if(level>=31&&level<=40)makeAttack(row,prevSafe);
   if(level>=41&&level<=60){
     row.pattern=local%3===0?'pulse':local%2?'moving':row.pattern;row.locked=row.pattern==='classic';
     if([4,9].includes(local)){row.switching=true;row.switchFromLane=row.sparkLane;const c=adjacent(prevSafe);row.switchToLane=c[(row.index+level)%Math.max(1,c.length)]??safeStep(prevSafe,1);row.pattern='moving';row.locked=false;}
   }
   if(level>=61){
     if(perfectStreak>=3)row.pattern=local%2?'pulse':'moving';
     if(perfectStreak>=5&&[4,9].includes(local)){row.switching=true;row.switchFromLane=row.sparkLane;const c=adjacent(prevSafe);row.switchToLane=c[(row.index+perfectStreak)%Math.max(1,c.length)]??safeStep(prevSafe,1);row.pattern='moving';row.locked=false;}
   }
   if(bossLevel())configureBoss(row,prevSafe);
   // No HOLD and no DOUBLE SHIFT: exactly one neighbouring safe lane per gate.
   if(row.sparkLane===prevSafe||Math.abs(row.sparkLane-prevSafe)>1){const options=adjacent(prevSafe);if(options.length)laneSet(row,options[(row.index+level)%options.length]);}
   row.doubleShift=false;row.riskLane=null;row.riskReward=false;
   configureCloseCall(row);
   if(before&&before.bonusLane!==null&&before.bonusLane!==undefined)before.bonusLane=row.sparkLane;
   if(before){
     const gap=row.baseAngle-before.baseAngle;let scale=1;
     if(level>=6&&level<=10)scale=.90;
     else if(level>=11&&level<=20)scale=.96;
     else if(level>=21&&level<=40)scale=.94;
     else if(level>=41&&level<=60)scale=.91;
     else if(level>=61)scale=perfectStreak>=6?.84:perfectStreak>=3?.88:.92;
     if(row.bossPhase===3)scale=Math.min(scale,.87);
     row.baseAngle=before.baseAngle+gap*scale;row.angle=row.baseAngle;
   }
   return result;
 };
 updateRow=function(row){
   const result=originalUpdateRow(row);
   const seconds=(row?.baseAngle-angle)/Math.max(.01,speedNow());
   if(row?.pattern==='moving'&&!row.locked&&seconds>.85&&level>=21){
     const intensity=Math.min(1,(level-20)/45);
     row.angle+=Math.sin(gameTime*(1.9+level*.004)+row.phase*1.7)*(.018+.018*intensity);
     if(level>=41)row.angle+=Math.sin(gameTime*3.15+row.phase*.63)*.014*intensity;
   }
   if(row?.pattern==='pulse'&&!row.locked&&seconds>.85&&level>=31){
     const rate=2.4+Math.min(.9,(level-30)*.014);row.open=Math.sin(gameTime*rate+row.phase)>(level>=61?.24:.18);
   }
   if(row?.switching&&!row.switchDone&&seconds<=1.22){
     row.switchDone=true;let target=row.switchToLane;
     if(target===row.entryLane||Math.abs(target-row.entryLane)>1)target=safeStep(row.entryLane,(row.index+level)%2?1:-1);
     laneSet(row,target);row.locked=true;row.angle=row.baseAngle;showEffect('GAP SWITCH · MOVE!','close');tone(360,.08,'triangle',.04,640);
   }
   return result;
 };
 warnPattern=function(row){
   if(row?.closeCallGold){row.announced=true;$('pattern-notice').textContent='CLOSE CALL GOLD · WAIT, THEN TAP BLUE';$('pattern-notice').classList.add('warning');patternNoticeTime=2;tone(520,.1,'triangle',.035,760);return;}
   if(row?.bossPhaseStart){row.announced=true;$('pattern-notice').textContent=`BOSS PHASE ${row.bossPhase}/3 · ${row.bossPhase===1?'READ':row.bossPhase===2?'PRESSURE':'FINAL'}`;$('pattern-notice').classList.add('warning');patternNoticeTime=2.2;tone(300+row.bossPhase*70,.13,'triangle',.04);return;}
   if(row?.attackName&&row.patternStart){row.announced=true;$('pattern-notice').textContent=`ATTACK · ${row.attackName}`;$('pattern-notice').classList.add('warning');patternNoticeTime=2;tone(360,.11,'triangle',.035);return;}
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
