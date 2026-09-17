/* Fix iOS tutorial handoff and make the final GOLD lesson truly hands-on. */
(() => {
  const $id=id=>document.getElementById(id);
  const practice=$id('howto-film-practice');
  const filmDialog=$id('howto-animation-dialog');
  let launching=false,goldActive=false,goldDone=false;

  function startHandsOn(){
    if(launching)return;
    launching=true;
    if(practice){practice.disabled=true;practice.textContent='OPENING PRACTICE…';}
    const launch=()=>setTimeout(()=>{
      try{startTutorial();}
      finally{
        setTimeout(()=>{
          launching=false;
          if(practice){practice.disabled=false;practice.textContent='START HANDS-ON PRACTICE';}
          const training=$id('training-dialog');
          if(roundKind==='tutorial'&&screen==='game'&&training&&!training.open)showTrainingStep(0);
        },120);
      }
    },90);
    if(filmDialog?.open){
      filmDialog.addEventListener('close',launch,{once:true});
      const close=$id('howto-film-close');
      if(close)close.click();else filmDialog.close();
    }else launch();
  }

  // Capture before the original animation button handler so Safari gets a clean dialog handoff.
  practice?.addEventListener('click',event=>{
    event.preventDefault();event.stopImmediatePropagation();startHandsOn();
  },true);

  const previousShowTrainingStep=showTrainingStep;
  showTrainingStep=function(step){
    previousShowTrainingStep(step);
    if(step===TRAINING.length-1){
      const go=$id('training-go');if(go)go.textContent='TRY IT';
    }
  };

  function beginGoldLesson(){
    const dialog=$id('training-dialog');if(dialog?.open)dialog.close();
    trainingWaiting=false;trainingElapsed=0;tutorialShift=false;lastShift=-1;
    if(mode==='paused'){setPaused(false);startDelay=0;}
    ringCount=2;lane=1;radius=laneRadius(lane);shield=0;charge=0;rushChain=0;
    const sparkLane=(lane+1)%ringCount;
    rows=[{angle:angle+1.4,baseAngle:angle+1.4,sparkLane,hazardLanes:[],hit:true,collected:false,passed:false,open:true,pattern:'classic',locked:true}];
    goldActive=true;goldDone=false;
    const instruction=$id('tutorial-instruction');
    if(instruction){instruction.hidden=false;instruction.textContent='GOLD = COLLECT · Tap once to move onto the gold spark.';}
    $id('shift')?.focus({preventScroll:true});
  }

  // The core final lesson used to exit immediately. Intercept it and run the gold exercise instead.
  $id('training-go')?.addEventListener('click',event=>{
    if(roundKind!=='tutorial'||tutorialStage!==TRAINING.length-1)return;
    event.preventDefault();event.stopImmediatePropagation();beginGoldLesson();
  },true);

  const previousUpdateTutorial=updateTutorial;
  updateTutorial=function(dt){
    if(!(roundKind==='tutorial'&&tutorialStage===TRAINING.length-1&&goldActive&&!trainingWaiting))return previousUpdateTutorial(dt);
    gameTime+=dt;trainingElapsed+=dt;angle+=dt*.6;
    radius+=(laneRadius(lane)-radius)*(1-Math.exp(-dt*24));updateLanding(dt);
    const row=rows[0];
    if(row&&!row.collected){
      const delta=row.angle-angle;
      if(Math.abs(delta)<.1&&Math.abs(radius-laneRadius(row.sparkLane))<.032){
        row.collected=true;sparks++;goldActive=false;goldDone=true;tone(720,.15);
        if(typeof burst==='function')burst(row.angle,laneRadius(row.sparkLane),C.gold,8);
        const instruction=$id('tutorial-instruction');if(instruction)instruction.textContent='PRACTICE COMPLETE ✓';
        if(typeof showEffect==='function')showEffect('PRACTICE COMPLETE ✓');
        updateHUD();
        setTimeout(()=>{if(roundKind==='tutorial'&&goldDone)exitTraining();},900);
        return;
      }
      if(delta<-.2){row.angle=angle+1.4;row.baseAngle=row.angle;}
    }
    updateHUD();
  };
})();
