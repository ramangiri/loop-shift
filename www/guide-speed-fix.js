/* Keep BLUE aligned with the real safe lane and add 10s speed bursts for Star/Crown catches. */
(() => {
  if(typeof guidedTarget!=='function'||typeof updateRow!=='function'||typeof update!=='function'||typeof showEffect!=='function')return;

  const clampLane=n=>Math.max(0,Math.min(ringCount-1,n));
  const previousGuidedTarget=guidedTarget;
  const previousUpdateRow=updateRow;
  const previousUpdate=update;
  const previousShowEffect=showEffect;

  function predictedSafeLane(row){
    if(!row||!Number.isInteger(row.sparkLane))return lane;
    let safe=row.sparkLane;
    // Switching gates should guide to the lane that will actually be open at impact,
    // not the temporary pre-switch gap shown while the gate is still preparing.
    if(row.switching&&!row.switchDone&&Number.isInteger(row.switchToLane)){
      safe=row.switchToLane;
      if(Number.isInteger(row.entryLane)&&safe===row.entryLane){
        const step=((row.index+level)%2)?1:-1;
        let candidate=clampLane(row.entryLane+step);
        if(candidate===row.entryLane)candidate=clampLane(row.entryLane-step);
        safe=candidate;
      }
    }
    return clampLane(safe);
  }

  function nearestActiveRow(){
    let best=null,bestDelta=Infinity;
    for(const row of rows||[]){
      if(!row||row.passed||!Number.isInteger(row.sparkLane))continue;
      const collisionAngle=Number.isFinite(row.angle)?row.angle:row.baseAngle;
      if(!Number.isFinite(collisionAngle))continue;
      const delta=collisionAngle-angle;
      if(delta<-.108||delta>=bestDelta)continue;
      best=row;bestDelta=delta;
    }
    return best;
  }

  guidedTarget=function(){
    // Fire Ball, tutorial and non-hazard fallback behavior stay exactly as before.
    if(rushTime>0||roundKind==='tutorial')return previousGuidedTarget();
    const row=nearestActiveRow();
    if(row){
      const safe=predictedSafeLane(row);
      return lane+Math.sign(safe-lane);
    }
    return previousGuidedTarget();
  };

  // When a Switch Gate changes its safe lane, force guide text/accessibility to refresh too.
  updateRow=function(row){
    const beforeLane=row?.sparkLane,beforeSwitch=row?.switchDone;
    const result=previousUpdateRow(row);
    if(row&&(row.sparkLane!==beforeLane||row.switchDone!==beforeSwitch)){
      lastGuideTarget=-1;
      try{updateGuide();}catch{}
    }
    return result;
  };

  // Temporary speed reward for CYAN STAR and GOLDEN CROWN.
  const SPEED_FACTOR=1.30;
  const SPEED_SECONDS=10;
  let speedTime=0,speedLabel='';
  const status=document.createElement('p');
  status.id='special-speed-status';status.hidden=true;status.setAttribute('role','status');
  const messages=document.querySelector('.arena-messages');
  if(messages)messages.appendChild(status);
  const style=document.createElement('style');
  style.textContent=`#special-speed-status{margin:.2rem auto .35rem;width:max-content;max-width:92%;padding:.38rem .68rem;border:1px solid currentColor;border-radius:999px;font-weight:900;letter-spacing:.06em;font-size:.76rem;background:#10201ae8;box-shadow:0 7px 22px #0005}#special-speed-status[hidden]{display:none!important}`;
  document.head.appendChild(style);

  function syncSpeedStatus(){
    if(!status)return;
    const active=speedTime>0&&mode==='playing'&&roundKind==='endless';
    status.hidden=!active;
    if(active)status.textContent=`${speedLabel} SPEED ×${SPEED_FACTOR.toFixed(1)} · ${Math.ceil(speedTime)}s`;
  }

  function startSpeed(label){
    if(roundKind!=='endless'||focusRun)return;
    speedLabel=label;speedTime=SPEED_SECONDS;
    motionSpeed=Math.max(motionSpeed,targetSpeed()*SPEED_FACTOR);
    syncSpeedStatus();
    tone(920,.10,'triangle',.045,1320);
    vibrate([12,24,12]);
  }

  showEffect=function(text,kind='perfect'){
    const result=previousShowEffect(text,kind);
    if(typeof text==='string'){
      if(text.includes('CYAN STAR'))startSpeed('STAR');
      else if(text.includes('GOLDEN CROWN'))startSpeed('GOLD');
    }
    return result;
  };

  update=function(dt){
    const boosting=speedTime>0&&mode==='playing'&&roundKind==='endless'&&!focusRun&&rushTime<=0;
    if(boosting)motionSpeed=Math.max(motionSpeed,targetSpeed()*SPEED_FACTOR);
    const result=previousUpdate(dt);
    if(boosting){
      speedTime=Math.max(0,speedTime-dt);
      if(speedTime>0)motionSpeed=Math.max(motionSpeed,targetSpeed()*SPEED_FACTOR);
    }
    if((mode==='over'||mode==='ready'||screen==='home')&&speedTime>0)speedTime=0;
    syncSpeedStatus();
    return result;
  };

  function frame(){
    // Keep text accurate even when Difficulty 2.0 changes the guide between taps.
    if(mode==='playing'&&screen==='game'&&roundKind!=='tutorial'){
      const target=guidedTarget();
      const guide=$('guide-status');
      if(guide&&level<=10)guide.textContent=target===lane?'BLUE GUIDE · Safe ring':`BLUE GUIDE · Ring ${target+1}`;
    }
    syncSpeedStatus();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
