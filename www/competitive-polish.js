/* Competition card, Perfect Streak feedback and richer post-run summary. */
(() => {
  const $id=id=>document.getElementById(id);
  const RUN_KEY='loop-shift-run-summary-live-v1';
  const HOME_CACHE_KEY='loop-shift-home-competition-v1';
  let runActive=false,streak=0,bestStreak=0,runRushes=0,specialStart={gem:0,star:0,crown:0};
  let competitionBusy=false,lastCompetition=0;

  function specialTotals(){
    try{
      const raw=JSON.parse(localStorage.getItem('loop-shift-specials-v1')||'{}');
      return {gem:Number(raw.gem)||0,star:Number(raw.star)||0,crown:Number(raw.crown)||0};
    }catch{return {gem:0,star:0,crown:0};}
  }
  function saveRunState(){
    if(!runActive)return;
    try{localStorage.setItem(RUN_KEY,JSON.stringify({streak,bestStreak,runRushes,specialStart}));}catch{}
  }
  function resetRunState(resume=false){
    let restored=null;
    if(resume)try{restored=JSON.parse(localStorage.getItem(RUN_KEY)||'null');}catch{}
    runActive=true;
    if(restored){
      streak=Math.max(0,Number(restored.streak)||0);
      bestStreak=Math.max(streak,Number(restored.bestStreak)||0,Number(typeof bestCombo!=='undefined'?bestCombo:0)||0);
      runRushes=Math.max(0,Number(restored.runRushes)||0);
      specialStart={...specialTotals(),...(restored.specialStart||{})};
    }else{
      streak=Math.max(0,Number(typeof combo!=='undefined'?combo:0)||0);
      bestStreak=Math.max(streak,Number(typeof bestCombo!=='undefined'?bestCombo:0)||0);
      runRushes=0;specialStart=specialTotals();
    }
    saveRunState();updateStreakHUD();
    const summary=$id('run-summary');if(summary)summary.hidden=true;
  }
  function breakStreak(){
    if(!runActive||streak===0)return;
    streak=0;saveRunState();updateStreakHUD();
  }
  function updateStreakHUD(){
    const hud=$id('perfect-streak-hud');if(!hud)return;
    const playing=typeof mode!=='undefined'&&mode==='playing'&&typeof roundKind!=='undefined'&&roundKind!=='tutorial';
    hud.hidden=!playing||streak<2;
    if(!hud.hidden){
      hud.textContent=`PERFECT ×${streak}`;
      hud.classList.toggle('hot',streak>=5);
      hud.setAttribute('aria-label',`Perfect streak ${streak}`);
    }
  }
  function milestone(){
    if(streak<5)return false;
    return streak===5||streak===10||streak===20||(streak>20&&streak%10===0);
  }

  if(typeof start==='function'){
    const originalStart=start;
    start=function(options){
      const result=originalStart(options);
      if(typeof mode!=='undefined'&&mode==='playing'&&typeof gameTime!=='undefined'&&gameTime===0)resetRunState(!!options?.resumeCheckpoint);
      return result;
    };
  }
  if(typeof awardPerfect==='function'){
    const originalAwardPerfect=awardPerfect;
    awardPerfect=function(row){
      const before=typeof perfects==='number'?perfects:0;
      const result=originalAwardPerfect(row);
      if(runActive&&typeof perfects==='number'&&perfects>before){
        streak++;bestStreak=Math.max(bestStreak,streak);saveRunState();updateStreakHUD();
        if(milestone()){
          showEffect?.(`PERFECT STREAK ×${streak}`,'perfect');
          if($id('announcement'))$id('announcement').textContent=`Perfect streak ${streak}.`;
        }
      }
      return result;
    };
  }
  if(typeof markHit==='function'){
    const originalMarkHit=markHit;
    markHit=function(row){breakStreak();return originalMarkHit(row);};
  }
  if(typeof update==='function'){
    const originalUpdate=update;
    update=function(dt){
      const beforePass=typeof passes==='number'?passes:0,beforePerfect=typeof perfects==='number'?perfects:0,beforeMode=typeof mode!=='undefined'?mode:'';
      const result=originalUpdate(dt);
      if(runActive&&beforeMode==='playing'&&typeof passes==='number'&&passes>beforePass){
        const cleared=passes-beforePass,gained=(typeof perfects==='number'?perfects:0)-beforePerfect;
        if(gained<cleared)breakStreak();
      }
      updateStreakHUD();
      return result;
    };
  }
  if(typeof startRush==='function'){
    const originalStartRush=startRush;
    startRush=function(){
      if(runActive){runRushes++;saveRunState();}
      return originalStartRush();
    };
  }

  function runSpecialCount(){
    const now=specialTotals();
    return Math.max(0,now.gem-specialStart.gem)+Math.max(0,now.star-specialStart.star)+Math.max(0,now.crown-specialStart.crown);
  }
  function renderRunSummary(){
    const panel=$id('run-summary');if(!panel)return;
    const cleared=Math.max(0,Number(typeof passes!=='undefined'?passes:0)||0);
    const perfectCount=Math.max(0,Number(typeof perfects!=='undefined'?perfects:0)||0);
    const rate=cleared?Math.min(100,Math.round(perfectCount/cleared*100)):0;
    $id('summary-perfects').textContent=perfectCount.toLocaleString();
    $id('summary-streak').textContent='×'+Math.max(bestStreak,Number(typeof bestCombo!=='undefined'?bestCombo:0)||0);
    $id('summary-specials').textContent=runSpecialCount().toLocaleString();
    $id('summary-rushes').textContent=runRushes.toLocaleString();
    const note=$id('summary-note');
    if(note)note.textContent=cleared?`Perfect timing on ${rate}% of cleared gates · Level ${Math.max(1,Number(typeof level!=='undefined'?level:1)||1)}`:'Build a streak by timing shifts into the Perfect window.';
    panel.hidden=false;
    const gap=$id('result-gap');
    if(gap&&gap.textContent.trim())gap.hidden=false;
    runActive=false;updateStreakHUD();
  }
  if(typeof crash==='function'){
    const originalCrash=crash;
    crash=function(...args){
      const wasOver=typeof mode!=='undefined'&&mode==='over';
      const result=originalCrash(...args);
      if(!wasOver&&typeof mode!=='undefined'&&mode==='over')renderRunSummary();
      return result;
    };
  }

  function renderCompetition(data,fromCache=false){
    const card=$id('home-competition');if(!card)return;
    const entries=Array.isArray(data?.entries)?data.entries:[];
    const top=entries[0]||null,me=data?.me||null;
    const best=Number.isSafeInteger(me?.mainBest)?me.mainBest:Number.isSafeInteger(me?.best)?me.best:(Number.isSafeInteger(window.LoopShiftBoard?.best?.())?window.LoopShiftBoard.best():null);
    const rank=Number.isInteger(me?.rank)&&me.rank>0?me.rank:null;
    $id('competition-rank').textContent=rank?'#'+rank:'—';
    $id('competition-top-name').textContent=top?.name||'No leader yet';
    $id('competition-top-score').textContent=Number.isFinite(top?.score)?Number(top.score).toLocaleString():'—';

    let goal='Finish a ranked run to set your place.';
    if(rank===1)goal='You’re #1 · keep the lead.';
    else if(rank&&rank>10&&entries[9]&&Number.isFinite(best)){
      const gap=Math.max(0,Number(entries[9].score)+1-best);
      goal=gap?`${gap.toLocaleString()} points to TOP 10`:'You’re inside the Top 10.';
    }else if(top&&Number.isFinite(best)){
      const gap=Math.max(0,Number(top.score)+1-best);
      goal=gap?`${gap.toLocaleString()} points to #1`:'You’re level with the top score.';
    }else if(top&&!Number.isFinite(best))goal='Add your name and set a ranked score.';
    $id('competition-goal').textContent=goal;
    $id('competition-status').textContent=fromCache?'LAST SYNCED':'LIVE';
    card.setAttribute('aria-label',`Your rank ${rank?'number '+rank:'not ranked'}. Top score ${top?top.name+' '+top.score:'not set'}. ${goal} Open Stats and Rankings.`);
    if(!fromCache)try{localStorage.setItem(HOME_CACHE_KEY,JSON.stringify({entries:entries.slice(0,10),me,time:Date.now()}));}catch{}
  }
  function renderCachedCompetition(){
    try{
      const cached=JSON.parse(localStorage.getItem(HOME_CACHE_KEY)||'null');
      if(cached)renderCompetition(cached,true);
    }catch{}
  }
  async function refreshCompetition(force=false){
    if(competitionBusy||(!force&&Date.now()-lastCompetition<15000))return;
    competitionBusy=true;lastCompetition=Date.now();
    try{
      const data=await window.LoopShiftBoard?.request?.('leaderboard');
      if(data)renderCompetition(data,false);
    }catch{renderCachedCompetition();}
    finally{competitionBusy=false;}
  }
  $id('home-competition')?.addEventListener('click',()=>window.LoopShiftHome?.show?.('progress',true));
  $id('nav-play')?.addEventListener('click',()=>setTimeout(()=>refreshCompetition(true),0));
  window.addEventListener('pageshow',()=>refreshCompetition(true));
  document.addEventListener('visibilitychange',()=>{if(!document.hidden&&document.body?.dataset?.screen==='home')refreshCompetition(true);});
  const bodyObserver=new MutationObserver(()=>{if(document.body?.dataset?.screen==='home')refreshCompetition(false);});
  if(document.body)bodyObserver.observe(document.body,{attributes:true,attributeFilter:['data-screen']});
  renderCachedCompetition();setTimeout(()=>refreshCompetition(true),250);
})();