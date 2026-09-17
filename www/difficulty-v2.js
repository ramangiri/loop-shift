/* Difficulty 2.0: progressive challenge without changing Fire Ball behavior. */
(() => {
 if(typeof addRow!=='function'||typeof updateRow!=='function'||typeof drawGuide!=='function'||typeof warnPattern!=='function'||typeof shift!=='function')return;
 const originalAddRow=addRow,originalUpdateRow=updateRow,originalDrawGuide=drawGuide,originalWarnPattern=warnPattern,previousShift=shift,originalGameUpdate=update;
 const completed=new WeakSet();
 let perfectStreak=0,cleanGateStreak=0,lastRoundHits=typeof roundHits==='number'?roundHits:0,tapDirection=1;
 const clampLane=n=>Math.max(0,Math.min(ringCount-1,n));
 const laneSet=(row,safe,extraSafe=null)=>{
   safe=clampLane(safe);row.sparkLane=safe;
   const open=new Set([safe]);if(Number.isInteger(extraSafe))open.add(clampLane(extraSafe));
   row.hazardLanes=Array.from({length:ringCount},(_,n)=>n).filter(n=>!open.has(n));
   row.hazardLane=row.hazardLanes[0]??Math.max(0,safe-1);
 };
 const twoAway=from=>[from-2,from+2].filter(n=>n>=0&&n<ringCount);
 const adjacent=from=>[from-1,from+1].filter(n=>n>=0&&n<ringCount);
 const safeStep=(from,step)=>{
   let next=clampLane(from+(step||1));
   if(next===from){const options=adjacent(from);next=options.length?options[0]:from;}
   return next;
 };
 const localIndex=row=>((row.index%12)+12)%12;
 const doubleShiftWanted=(lvl,local)=>lvl>=11&&lvl<=20?[2,6,9].includes(local):lvl>=41&&lvl<=60?[1,5,8,10].includes(local):lvl>=61&&(perfectStreak>=3?[1,3,5,8,10].includes(local):[3,8].includes(local));
 const guideWindow=()=>level<=10||focusRun||roundKind==='tutorial'||roundKind==='practice';
 const guideVisible=()=>{
   if(guideWindow())return true;
   const next=rows.find(r=>!r.passed&&r.angle>angle-.04);if(!next)return false;
   const seconds=(next.angle-angle)/Math.max(.01,speedNow());
   return seconds<=1.35&&seconds>=.24;
 };
 const speedBoost=()=>level<=5?1:level<=10?1.02:level<=20?1.035:level<=40?1.05:level<=60?1.065:level<=80?1.08:1.10;
 // Keep the one-tap rule unchanged; later difficulty comes from motion and speed.
 update=function(dt){
   if(roundKind==='endless'&&!focusRun&&roundKind!=='tutorial'&&roundKind!=='practice'&&rushTime<=0&&level>5){
     motionSpeed=Math.max(motionSpeed,targetSpeed()*speedBoost());
   }
   return originalGameUpdate(dt);
 };
 function markRisk(row){
   if(level<11||bossLevel()||row.switching||((row.index+1)%7)!==0)return;
   const candidates=Array.from({length:ringCount},(_,n)=>n).filter(n=>n!==row.sparkLane);
   if(!candidates.length)return;
   candidates.sort((a,b)=>Math.abs(b-row.entryLane)-Math.abs(a-row.entryLane)||Math.abs(b-row.sparkLane)-Math.abs(a-row.sparkLane));
   row.riskLane=candidates[0];laneSet(row,row.sparkLane,row.riskLane);row.riskReward=true;
 }
 function makeAttack(row,prevSafe){
   const local=localIndex(row),block=Math.floor(local/3),seq=block%2===0?[1,1,-1]:[-1,1,-1],labels=block%2===0?'OUT → OUT → IN':'IN → OUT → IN';
   const step=seq[local%3];laneSet(row,safeStep(prevSafe,step));row.attackName=labels;row.attackStep=step;row.pattern=(block+local)%2?'moving':'pulse';row.locked=false;row.patternStart=local%3===0;
 }
 function configureBoss(row,prevSafe){
   const local=localIndex(row),phase=Math.floor(local/4)+1;row.bossPhase=phase;row.bossPhaseStart=local%4===0;
   if(phase===1){row.pattern=bossType()===2?'pulse':'classic';}
   else if(phase===2){row.pattern=local%2?'moving':'pulse';row.locked=false;if([5,7].includes(local)){const options=twoAway(prevSafe);if(options.length)laneSet(row,options[(row.index+level)%options.length]);}}
   else {row.pattern=local%2?'pulse':'moving';row.locked=false;if([9,11].includes(local)){const options=twoAway(prevSafe);if(options.length)laneSet(row,options[(row.index+level)%options.length]);}if(local===10){row.switching=true;row.switchFromLane=row.sparkLane;const c=[row.sparkLane-1,row.sparkLane+1].filter(n=>n>=0&&n<ringCount);row.switchToLane=c[(row.index+level)%Math.max(1,c.length)]??safeStep(prevSafe,1);}}
   row.patternStart=row.patternStart||row.bossPhaseStart;
 }
 addRow=function(a,index=nextRowIndex++){
   const before=rows.at(-1),prevSafe=Math.max(0,Math.min(ringCount-1,before?.sparkLane??pathLane));
   const result=originalAddRow(a,index),row=rows.at(-1);if(!row)return result;
   const local=localIndex(row);
   if(level>=6&&level<=10){row.pattern=local%2?'moving':'pulse';row.locked=false;}
   if(level>=11&&level<=20&&doubleShiftWanted(level,local)){const opts=twoAway(prevSafe);if(opts.length){laneSet(row,opts[(row.index+level)%opts.length]);row.doubleShift=true;row.pattern=local%2?'moving':'classic';row.locked=row.pattern==='classic';}}
   if(level>=21&&level<=30&&[3,7,10].includes(local)){
     row.switching=true;row.switchFromLane=row.sparkLane;const c=[row.sparkLane-1,row.sparkLane+1].filter(n=>n>=0&&n<ringCount);row.switchToLane=c[(row.index+level)%Math.max(1,c.length)]??safeStep(prevSafe,1);row.pattern='moving';row.locked=false;row.patternStart=true;
   }
   if(level>=31&&level<=40)makeAttack(row,prevSafe);
   if(level>=41&&level<=60){
     row.pattern=local%3===0?'pulse':local%2?'moving':row.pattern;row.locked=row.pattern==='classic';
     if(doubleShiftWanted(level,local)){const opts=twoAway(prevSafe);if(opts.length){laneSet(row,opts[(row.index+level)%opts.length]);row.doubleShift=true;}}
     if([4,9].includes(local)){row.switching=true;row.switchFromLane=row.sparkLane;const c=[row.sparkLane-1,row.sparkLane+1].filter(n=>n>=0&&n<ringCount);row.switchToLane=c[(row.index+level)%Math.max(1,c.length)]??safeStep(prevSafe,1);row.pattern='moving';row.locked=false;}
   }
   if(level>=61){
     if(perfectStreak>=3)row.pattern=local%2?'pulse':'moving';
     if(doubleShiftWanted(level,local)){const opts=twoAway(prevSafe);if(opts.length){laneSet(row,opts[(row.index+level+perfectStreak)%opts.length]);row.doubleShift=true;}}
     if(perfectStreak>=5&&[4,9].includes(local)){row.switching=true;row.switchFromLane=row.sparkLane;const c=[row.sparkLane-1,row.sparkLane+1].filter(n=>n>=0&&n<ringCount);row.switchToLane=c[(row.index+perfectStreak)%Math.max(1,c.length)]??safeStep(prevSafe,1);row.pattern='moving';row.locked=false;}
   }
   if(bossLevel())configureBoss(row,prevSafe);
   // No HOLD rows: every new gate's primary safe lane differs from the previous gate.
   if(row.sparkLane===prevSafe){const options=adjacent(prevSafe);if(options.length)laneSet(row,options[(row.index+level)%options.length],Number.isInteger(row.riskLane)?row.riskLane:null);}
   markRisk(row);
   if(before&&before.bonusLane!==null&&before.bonusLane!==undefined)before.bonusLane=row.sparkLane;
   if(before){
     const gap=row.baseAngle-before.baseAngle;let scale=1;
     if(level>=6&&level<=10)scale=.90;
     else if(level>=11&&level<=20)scale=.96;
     else if(level>=21&&level<=40)scale=.94;
     else if(level>=41&&level<=60)scale=.90;
     else if(level>=61)scale=perfectStreak>=6?.80:perfectStreak>=3?.85:.91;
     if(row.bossPhase===3)scale=Math.min(scale,.84);
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
   if(row?.switching&&!row.switchDone&&seconds<=1.22){row.switchDone=true;let target=row.switchToLane;if(target===row.entryLane)target=safeStep(row.entryLane,(row.index+level)%2?1:-1);laneSet(row,target,Number.isInteger(row.riskLane)?row.riskLane:null);row.locked=true;row.angle=row.baseAngle;showEffect('GAP SWITCH · MOVE!','close');tone(360,.08,'triangle',.04,640);}
   return result;
 };
 warnPattern=function(row){
   if(row?.bossPhaseStart){row.announced=true;$('pattern-notice').textContent=`BOSS PHASE ${row.bossPhase}/3 · ${row.bossPhase===1?'READ':row.bossPhase===2?'PRESSURE':'FINAL'}`;$('pattern-notice').classList.add('warning');patternNoticeTime=2.2;tone(300+row.bossPhase*70,.13,'triangle',.04);return;}
   if(row?.attackName&&row.patternStart){row.announced=true;$('pattern-notice').textContent=`ATTACK · ${row.attackName}`;$('pattern-notice').classList.add('warning');patternNoticeTime=2;tone(360,.11,'triangle',.035);return;}
   if(row?.switching){row.announced=true;$('pattern-notice').textContent='SWITCH GATE · WATCH THE SAFE GAP';$('pattern-notice').classList.add('warning');patternNoticeTime=2;tone(330,.11,'triangle',.035);return;}
   return originalWarnPattern(row);
 };
 drawGuide=function(){
   if(guideVisible())originalDrawGuide();
   const next=rows.find(r=>!r.passed&&r.angle>angle-.04);if(!next?.riskLane)return;
   const seconds=(next.angle-angle)/Math.max(.01,speedNow());if(seconds>1.65||seconds<.2)return;
   ctx.save();ctx.lineCap='round';ctx.shadowColor='#c9a4e8';ctx.shadowBlur=(reducedMotion||softTheme)?0:6;arc(laneRadius(next.riskLane),angle-.11,angle+.11,'#c9a4e8',Math.max(2,size*.007));ctx.restore();
 };
 shift=function(direction=0){
   if(direction||guideWindow())return previousShift(direction);
   let step=tapDirection;
   const target=guidedTarget();
   if(guideVisible()){
     const delta=target-lane;
     if(delta!==0){step=Math.sign(delta);tapDirection=step;}
     else {if(lane<=0&&step<0)step=1;if(lane>=ringCount-1&&step>0)step=-1;}
   }else{if(lane<=0&&step<0)step=1;if(lane>=ringCount-1&&step>0)step=-1;}
   return previousShift(step);
 };
 function makeRecovery(){
   const future=rows.filter(row=>!row.passed&&(row.baseAngle-angle)/Math.max(.01,speedNow())>.9).slice(0,2);let safe=lane;
   for(const row of future){row.recovery=true;row.switching=false;row.switchDone=true;row.doubleShift=false;row.riskLane=null;row.riskReward=false;row.pattern='classic';row.locked=true;row.open=false;const options=adjacent(safe);safe=options.length?options[(row.index+level)%options.length]:safe;laneSet(row,safe);}
 }
 function frame(){
   if(typeof roundHits==='number'&&roundHits>lastRoundHits){lastRoundHits=roundHits;perfectStreak=0;cleanGateStreak=0;if(level>=61)makeRecovery();}
   for(const row of rows){
     if(row.passed&&!completed.has(row)){completed.add(row);if(row.hit){perfectStreak=0;cleanGateStreak=0;}else{cleanGateStreak++;perfectStreak=row.perfectAwarded?perfectStreak+1:0;}}
     if(row.riskLane!=null&&row.specialType&&!row.specialCollected&&!row.specialResolved)row.specialLane=row.riskLane;
   }
   const guide=$('guide-status');if(guide&&level>10&&!focusRun&&roundKind!=='tutorial'&&roundKind!=='practice'){
     const target=guidedTarget();guide.textContent=guideVisible()?(target===lane?'BLUE GUIDE · Safe ring':`BLUE FLASH · Ring ${target+1}`):'READ THE PATTERN · Guide hidden';
   }
   requestAnimationFrame(frame);
 }
 requestAnimationFrame(frame);
})();
