/* Dedicated Pause popup for manual pause-button taps. */
(() => {
  const byId=id=>document.getElementById(id);
  const pauseButton=byId('pause');
  if(!pauseButton||typeof setPaused!=='function')return;

  const style=document.createElement('style');
  style.textContent=`
    #pause-menu-dialog,#pause-confirm-dialog{width:min(92vw,430px);padding:0;border:1px solid #52655b;border-radius:24px;background:#101a16;color:#f4f7f5;box-shadow:0 24px 70px #000b;overflow:hidden}
    #pause-menu-dialog::backdrop,#pause-confirm-dialog::backdrop{background:#020705cc;backdrop-filter:blur(5px)}
    .pause-menu-head{padding:24px 22px 14px;text-align:center;border-bottom:1px solid #263a31}
    .pause-menu-head small{display:block;margin-bottom:7px;font-size:.72rem;font-weight:900;letter-spacing:.16em;color:#a3b2aa}
    .pause-menu-head h2{margin:0;font-size:clamp(1.7rem,7vw,2.3rem)}
    .pause-menu-stats{display:grid;grid-template-columns:1fr 1fr;gap:10px;padding:16px 18px 4px}
    .pause-menu-stat{padding:13px 12px;border:1px solid #30463b;border-radius:16px;background:#0c1512;text-align:center}
    .pause-menu-stat span{display:block;font-size:.7rem;letter-spacing:.12em;color:#98aaa1;font-weight:800}
    .pause-menu-stat strong{display:block;margin-top:4px;font-size:1.35rem}
    .pause-menu-copy,.pause-confirm-copy{margin:12px 22px 4px;text-align:center;color:#b6c3bc;font-size:.92rem;line-height:1.45}
    .pause-menu-actions,.pause-confirm-actions{display:grid;gap:10px;padding:16px 18px 20px}
    .pause-menu-actions button,.pause-confirm-actions button{min-height:50px}
    #pause-menu-home,#pause-menu-restart,#pause-confirm-cancel{background:transparent;border:1px solid #40564b;color:#eef4f0;border-radius:14px;font:inherit;font-weight:800}
    #pause-menu-save[hidden]{display:none}
    #pause-confirm-yes.danger{background:#3a1714;border:1px solid #ff8a75;color:#ffd0c8}
  `;
  document.head.appendChild(style);

  const dialog=document.createElement('dialog');
  dialog.id='pause-menu-dialog';
  dialog.setAttribute('aria-labelledby','pause-menu-title');
  dialog.innerHTML=`
    <div class="pause-menu-head">
      <small>GAME PAUSED</small>
      <h2 id="pause-menu-title">Take a break</h2>
    </div>
    <div class="pause-menu-stats">
      <div class="pause-menu-stat"><span>LEVEL</span><strong id="pause-menu-level">1</strong></div>
      <div class="pause-menu-stat"><span>SCORE</span><strong id="pause-menu-score">0</strong></div>
    </div>
    <p class="pause-menu-copy">Your run is frozen exactly where you paused it.</p>
    <div class="pause-menu-actions">
      <button id="pause-menu-resume" class="primary-button" type="button">RESUME GAME</button>
      <button id="pause-menu-save" class="secondary-button" type="button" hidden>SAVE &amp; EXIT</button>
      <button id="pause-menu-restart" type="button">RESTART LEVEL</button>
      <button id="pause-menu-home" type="button">END GAME &amp; HOME</button>
    </div>`;
  document.body.appendChild(dialog);

  const confirm=document.createElement('dialog');
  confirm.id='pause-confirm-dialog';
  confirm.setAttribute('aria-labelledby','pause-confirm-title');
  confirm.innerHTML=`
    <div class="pause-menu-head"><small>ARE YOU SURE?</small><h2 id="pause-confirm-title">Confirm</h2></div>
    <p id="pause-confirm-copy" class="pause-confirm-copy"></p>
    <div class="pause-confirm-actions">
      <button id="pause-confirm-yes" class="secondary-button danger" type="button">YES</button>
      <button id="pause-confirm-cancel" type="button">CANCEL · KEEP PLAYING</button>
    </div>`;
  document.body.appendChild(confirm);

  const resume=byId('pause-menu-resume'),save=byId('pause-menu-save'),restart=byId('pause-menu-restart'),home=byId('pause-menu-home');
  const confirmTitle=byId('pause-confirm-title'),confirmCopy=byId('pause-confirm-copy'),confirmYes=byId('pause-confirm-yes'),confirmCancel=byId('pause-confirm-cancel');
  let overlayWasHidden=true,confirmAction='',levelStart=null;

  const clone=value=>{try{return structuredClone(value);}catch{return JSON.parse(JSON.stringify(value));}};
  function captureLevelStart(){
    if(typeof level==='undefined'||typeof rows==='undefined')return;
    levelStart=clone({
      score,passes,level,sparks,charge,shield,gameTime,combo,feverCharge,feverTime,perfects,roundFevers,bestCombo,roundHits,
      ringCount,lane,radius,angle,motionSpeed,shiftDirection,gameSeed,nextRowIndex,rhythmOrigin,rhythmUnit,rhythmEpoch,rhythmPhaseOffset,pathLane,sectionChoice,
      focusGoal,focusCount,focusSparkBase,runFocus,levelSparks,levelPerfects,levelHits,levelShieldLost,objectiveAwarded,
      rushTime,rushChain,rushQueued,rushStartAngle,rushGlow,rushBaseSpeed,rushBoost,patternHits,runBosses,runCleanBest,cleanStreak,activeSinceBreak,
      sectionStartSparks,sectionStartPerfects,sectionStartPasses,rows,rushCoins,phrasePatterns:[...phrasePatterns],retryCourse,levelTransition,departingRows,comeback
    });
  }
  function restoreLevelStart(){
    const s=levelStart;if(!s||s.level!==level)return false;
    score=s.score;passes=s.passes;level=s.level;sparks=s.sparks;charge=s.charge;shield=s.shield;gameTime=s.gameTime;combo=s.combo;feverCharge=s.feverCharge;feverTime=s.feverTime;perfects=s.perfects;roundFevers=s.roundFevers;bestCombo=s.bestCombo;roundHits=s.roundHits;
    ringCount=s.ringCount;lane=s.lane;radius=s.radius;angle=s.angle;motionSpeed=s.motionSpeed;shiftDirection=s.shiftDirection;gameSeed=s.gameSeed;nextRowIndex=s.nextRowIndex;rhythmOrigin=s.rhythmOrigin;rhythmUnit=s.rhythmUnit;rhythmEpoch=s.rhythmEpoch;rhythmPhaseOffset=s.rhythmPhaseOffset;pathLane=s.pathLane;sectionChoice=s.sectionChoice;
    focusGoal=s.focusGoal;focusCount=s.focusCount;focusSparkBase=s.focusSparkBase;runFocus=s.runFocus;levelSparks=s.levelSparks;levelPerfects=s.levelPerfects;levelHits=s.levelHits;levelShieldLost=s.levelShieldLost;objectiveAwarded=s.objectiveAwarded;
    rushTime=s.rushTime;rushChain=s.rushChain;rushQueued=s.rushQueued;rushStartAngle=s.rushStartAngle;rushGlow=s.rushGlow;rushBaseSpeed=s.rushBaseSpeed;rushBoost=s.rushBoost;patternHits=s.patternHits;runBosses=s.runBosses;runCleanBest=s.runCleanBest;cleanStreak=s.cleanStreak;activeSinceBreak=s.activeSinceBreak;
    sectionStartSparks=s.sectionStartSparks;sectionStartPerfects=s.sectionStartPerfects;sectionStartPasses=s.sectionStartPasses;rows=clone(s.rows);rushCoins=clone(s.rushCoins);phrasePatterns=new Map(clone(s.phrasePatterns));retryCourse=clone(s.retryCourse);levelTransition=clone(s.levelTransition);departingRows=clone(s.departingRows);comeback=clone(s.comeback);
    trail=[];particles=[];shatters=[];landing=null;landingTime=0;lastShift=-1;frameCarry=0;invulnerable=Math.max(invulnerable,1.2);
    applyTheme();updateHUD();updateGuide();rememberSegment();
    return true;
  }

  // Keep an exact level-start snapshot so Restart Level does not wipe the full run.
  const previousStart=start;
  start=function(options){const result=previousStart(options);requestAnimationFrame(()=>{if(typeof mode!=='undefined'&&mode==='playing'&&roundKind!=='tutorial')captureLevelStart();});return result;};
  const previousLevelUp=levelUp;
  levelUp=function(next){const result=previousLevelUp(next);requestAnimationFrame(()=>{if(roundKind!=='tutorial')captureLevelStart();});return result;};
  function watchLevel(){
    if(typeof mode!=='undefined'&&mode==='playing'&&typeof level!=='undefined'&&roundKind!=='tutorial'&&(!levelStart||levelStart.level!==level))captureLevelStart();
    requestAnimationFrame(watchLevel);
  }
  requestAnimationFrame(watchLevel);

  function refresh(){
    byId('pause-menu-level').textContent=String(typeof level==='number'?level:1);
    byId('pause-menu-score').textContent=(typeof score==='number'?score:0).toLocaleString();
    save.hidden=!(typeof checkpointEligible!=='undefined'&&checkpointEligible&&typeof roundKind!=='undefined'&&roundKind==='endless');
    restart.hidden=typeof roundKind!=='undefined'&&roundKind==='tutorial';
  }
  function hideCoreOverlay(){const overlay=byId('overlay');if(!overlay)return;overlayWasHidden=overlay.hidden;overlay.hidden=true;}
  function restoreCoreOverlay(){const overlay=byId('overlay');if(overlay)overlay.hidden=overlayWasHidden;}
  function closePause(){if(dialog.open)dialog.close();}
  function resumeGame(){closePause();restoreCoreOverlay();if(typeof mode!=='undefined'&&mode==='paused')setPaused(false,false);}
  function reopenPause(){if(confirm.open)confirm.close();setTimeout(()=>{refresh();if(!dialog.open)dialog.showModal();resume.focus({preventScroll:true});},40);}

  function openPause(event){
    if(typeof screen==='undefined'||typeof mode==='undefined'||screen!=='game'||mode!=='playing')return;
    if(typeof breakPending!=='undefined'&&breakPending)return;
    if(typeof ringLessonPending!=='undefined'&&ringLessonPending)return;
    event?.preventDefault?.();event?.stopImmediatePropagation?.();
    setPaused(true,false);refresh();hideCoreOverlay();
    if(!dialog.open)dialog.showModal();resume.focus({preventScroll:true});
  }
  function ask(action){
    confirmAction=action;closePause();
    if(action==='restart'){
      confirmTitle.textContent='Restart Level '+level+'?';
      confirmCopy.textContent='Progress made in this level will be lost. Your earlier completed levels and score from before this level stay safe.';
      confirmYes.textContent='YES · RESTART LEVEL';
    }else{
      confirmTitle.textContent='End this game?';
      confirmCopy.textContent='Return Home and end the current run? Unsaved progress since your last checkpoint will be lost.';
      confirmYes.textContent='YES · END GAME';
    }
    setTimeout(()=>{if(!confirm.open)confirm.showModal();confirmCancel.focus({preventScroll:true});},40);
  }

  // Capture phase runs before the original pause button's bubble listener.
  pauseButton.addEventListener('click',openPause,true);
  resume.addEventListener('click',resumeGame);
  dialog.addEventListener('cancel',event=>{event.preventDefault();resumeGame();});
  save.addEventListener('click',()=>{closePause();restoreCoreOverlay();if(typeof saveCheckpoint==='function')saveCheckpoint(true);});
  restart.addEventListener('click',()=>ask('restart'));
  home.addEventListener('click',()=>ask('home'));

  confirmCancel.addEventListener('click',reopenPause);
  confirm.addEventListener('cancel',event=>{event.preventDefault();reopenPause();});
  confirmYes.addEventListener('click',()=>{
    const action=confirmAction;confirmAction='';if(confirm.open)confirm.close();
    if(action==='restart'){
      const restored=restoreLevelStart();restoreCoreOverlay();
      if(restored&&typeof mode!=='undefined'&&mode==='paused'){setPaused(false,false);startDelay=Math.max(startDelay,1.15);}
      else if(typeof start==='function'){start();}
      return;
    }
    restoreCoreOverlay();
    if(typeof finishAndSave==='function')finishAndSave(true);else if(typeof goHome==='function')goHome();
  });
})();
