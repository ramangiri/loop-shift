/* First-time pre-game Pause coach plus complete reward explanations. */
(() => {
  const $id=id=>document.getElementById(id);
  const pause=$id('pause');
  if(!pause)return;
  const COACH_KEY='loop-shift-pause-coach-seen-v1';
  let coachSeen=false;
  try{coachSeen=localStorage.getItem(COACH_KEY)==='true';}catch{}

  const style=document.createElement('style');
  style.textContent=`
    #pause.pause-readable{display:flex;align-items:center;justify-content:center;width:46px;min-width:46px;height:46px;padding:0!important;background:#101a16f2!important;border:1px solid #9ab7a8!important;color:#f7fbf8!important;box-shadow:0 6px 20px #0008,0 0 0 1px #ffffff12;opacity:1!important}
    #pause.pause-readable svg{width:22px;height:22px;flex:0 0 auto;filter:drop-shadow(0 1px 2px #000)}
    #pause .pause-label{display:none!important}
    #level-one-pause-coach{position:fixed;inset:0;z-index:94;touch-action:manipulation;cursor:pointer;background:radial-gradient(circle 37px at var(--pause-x,90%) var(--pause-y,40px),transparent 0 30px,#0207054f 33px,#020705a6 43px,#020705a6 100%)}
    #pause-coach-spotlight{position:fixed;z-index:95;width:58px;height:58px;border:2px solid #d8ffea;border-radius:50%;pointer-events:none;box-shadow:0 0 0 5px #d8ffea18,0 0 25px #a6ffd06b;animation:pauseCoachPulse 1.15s ease-in-out infinite}
    #pause-coach-arrow{position:fixed;inset:0;z-index:95;width:100vw;height:100vh;overflow:visible;pointer-events:none}
    #pause-coach-arrow path{fill:none;stroke:#d8ffea;stroke-width:3;stroke-linecap:round;filter:drop-shadow(0 2px 3px #000)}
    #level-one-pause-tip{position:fixed;z-index:96;width:min(255px,calc(100vw - 24px));padding:13px 14px;border:1px solid #9ab7a8;border-radius:14px;background:#101a16fa;color:#f5faf7;box-shadow:0 14px 38px #000b;text-align:left}
    #level-one-pause-tip strong{display:block;font-size:.9rem;letter-spacing:.04em}
    #level-one-pause-tip span{display:block;margin-top:4px;color:#c5d2cb;font-size:.76rem;line-height:1.38}
    #level-one-pause-tip em{display:block;margin-top:10px;color:#e8f5ee;font-size:.66rem;font-style:normal;font-weight:900;letter-spacing:.12em}
    .tutorial-special-copy{display:block;margin-top:9px;padding:9px 10px;border:1px solid #42564d;border-radius:12px;background:#0c1512;font-size:.78rem;line-height:1.45;color:#d7e2dc}
    .tutorial-special-copy b{white-space:nowrap}.reward-violet{color:#c99cff}.reward-cyan{color:#72e6ff}.reward-gold{color:#ffd76a}
    @keyframes pauseCoachPulse{0%,100%{transform:scale(.94);opacity:.72}50%{transform:scale(1.08);opacity:1}}
    @media(prefers-reduced-motion:reduce){#pause-coach-spotlight{animation:none}}
    @media(max-width:360px){#pause.pause-readable{width:44px;min-width:44px;height:44px}#level-one-pause-tip{width:min(225px,calc(100vw - 20px))}}
  `;
  document.head.appendChild(style);

  // Keep Pause icon-only, but high contrast and easy to tap.
  pause.classList.add('pause-readable');
  pause.querySelector('.pause-label')?.remove();

  const coach=document.createElement('div');
  coach.id='level-one-pause-coach';
  coach.hidden=true;
  coach.innerHTML=`
    <div id="pause-coach-spotlight" aria-hidden="true"></div>
    <svg id="pause-coach-arrow" aria-hidden="true"><defs><marker id="pause-coach-head" markerWidth="8" markerHeight="8" refX="6" refY="3.5" orient="auto" markerUnits="strokeWidth"><path d="M0,0 L0,7 L7,3.5 z" fill="#d8ffea" stroke="none"></path></marker></defs><path id="pause-coach-path" marker-end="url(#pause-coach-head)"></path></svg>
    <aside id="level-one-pause-tip" role="status"><strong>Pause any time</strong><span>Need a break? Tap the ⏸ button whenever you want during gameplay.</span><em>TAP ANYWHERE TO CONTINUE</em></aside>`;
  document.body.appendChild(coach);
  const tip=$id('level-one-pause-tip'),spotlight=$id('pause-coach-spotlight'),arrow=$id('pause-coach-arrow'),arrowPath=$id('pause-coach-path');
  let coachActive=false;

  function markSeen(){coachSeen=true;try{localStorage.setItem(COACH_KEY,'true');}catch{}}

  function positionCoach(){
    if(!coachActive)return;
    const r=pause.getBoundingClientRect(),vw=window.innerWidth||390,vh=window.innerHeight||800;
    const targetX=r.left+r.width/2,targetY=r.top+r.height/2;
    coach.style.setProperty('--pause-x',Math.round(targetX)+'px');
    coach.style.setProperty('--pause-y',Math.round(targetY)+'px');
    spotlight.style.left=Math.round(targetX-29)+'px';spotlight.style.top=Math.round(targetY-29)+'px';

    const width=Math.min(255,Math.max(190,vw-24));
    let left=targetX-width/2;
    left=Math.max(12,Math.min(vw-width-12,left));
    let top=r.bottom+72;
    let tipAbove=false;
    if(top+115>vh){top=Math.max(12,r.top-142);tipAbove=true;}
    tip.style.left=Math.round(left)+'px';tip.style.top=Math.round(top)+'px';

    const tipRect=tip.getBoundingClientRect();
    const startX=Math.max(tipRect.left+28,Math.min(tipRect.right-28,targetX+(targetX<vw/2?34:-34)));
    const startY=tipAbove?tipRect.bottom-3:tipRect.top+3;
    const endY=tipAbove?targetY-30:targetY+30;
    const bend=tipAbove?34:-34;
    arrow.setAttribute('viewBox',`0 0 ${vw} ${vh}`);
    arrowPath.setAttribute('d',`M ${startX.toFixed(1)} ${startY.toFixed(1)} C ${startX.toFixed(1)} ${(startY+bend).toFixed(1)}, ${(targetX+(targetX<vw/2?30:-30)).toFixed(1)} ${(endY-bend*.45).toFixed(1)}, ${targetX.toFixed(1)} ${endY.toFixed(1)}`);
  }

  function showCoach(){
    if(coachActive||coachSeen)return;
    coachActive=true;
    // Freeze normal 3-2-1 until the player acknowledges this first-time coach mark.
    startDelay=1.5;
    const center=$id('orbit-center');center?.classList.remove('counting');
    if($id('center-top'))$id('center-top').textContent='';
    if($id('center-label'))$id('center-label').textContent='';
    if($id('center-bottom'))$id('center-bottom').textContent='';
    window.LoopShiftMusic?.pause?.();
    coach.hidden=false;requestAnimationFrame(positionCoach);
  }

  function dismissCoach(event){
    if(!coachActive)return;
    event?.preventDefault?.();event?.stopPropagation?.();
    coachActive=false;coach.hidden=true;markSeen();
    // Resume the existing countdown: 3 -> 2 -> 1 -> gameplay.
    startDelay=1.5;updateCountdown?.();lastTime=performance.now();
    window.LoopShiftMusic?.play?.();
  }
  coach.addEventListener('click',dismissCoach);
  // Tapping the highlighted Pause icon should acknowledge the coach, not open Pause yet.
  pause.addEventListener('click',event=>{if(coachActive){event.preventDefault();event.stopImmediatePropagation();dismissCoach(event);}},true);
  window.addEventListener('resize',positionCoach);
  window.visualViewport?.addEventListener('resize',positionCoach);

  // Show only once, before the very first Level 1 Classic gameplay on this device.
  if(typeof start==='function'){
    const previousStart=start;
    start=function(options){
      const result=previousStart(options);
      try{
        if(!coachSeen&&mode==='playing'&&screen==='game'&&level===1&&roundKind==='endless'&&!options?.resumeCheckpoint)showCoach();
      }catch{}
      return result;
    };
  }

  // Neither gameplay nor the 3-2-1 countdown advances behind the coach mark.
  if(typeof update==='function'){
    const previousUpdate=update;
    update=function(dt){if(coachActive)return;return previousUpdate(dt);};
  }

  function coachWatch(){
    try{if(coachActive&&(screen!=='game'||mode!=='playing')){coachActive=false;coach.hidden=true;}}
    catch{}
    requestAnimationFrame(coachWatch);
  }
  requestAnimationFrame(coachWatch);

  const rewardHtml=`<span class="tutorial-special-copy"><b>Gold spark: +10 base points</b> · 6 sparks charge a shield.<br><b class="reward-violet">Violet Gem +100</b> · <b class="reward-cyan">Cyan Star +250</b> · <b class="reward-gold">Golden Crown +500</b>.<br>Star and Crown increase game speed for <b>10 seconds</b>.</span>`;

  if(typeof showTrainingStep==='function'){
    const previousShowTrainingStep=showTrainingStep;
    showTrainingStep=function(step){
      previousShowTrainingStep(step);
      if(typeof TRAINING!=='undefined'&&step===TRAINING.length-1){
        const copy=$id('training-copy');if(copy&&!copy.querySelector?.('.tutorial-special-copy'))copy.insertAdjacentHTML('beforeend',rewardHtml);
      }
    };
  }

  const filmTitle=$id('howto-film-title'),filmCopy=$id('howto-film-copy');
  if(filmTitle&&filmCopy){
    const syncFilmReward=()=>{
      if(filmTitle.textContent.trim()==='GOLD = COLLECT'){
        filmCopy.innerHTML='Gold sparks: +10 base points; 6 charge a shield.<br><span class="reward-violet">Violet +100</span> · <span class="reward-cyan">Star +250</span> · <span class="reward-gold">Crown +500</span> · Star/Crown = 10s speed boost.';
      }
    };
    new MutationObserver(syncFilmReward).observe(filmTitle,{childList:true,subtree:true});syncFilmReward();
  }

  const rules=document.querySelector('.game-guide .essential-rules');
  if(rules&&!$id('special-reward-rules')){
    const li=document.createElement('li');li.id='special-reward-rules';
    li.innerHTML='<strong>Rewards.</strong> Gold spark <b>+10 base</b> · Violet Gem <b>+100</b> · Cyan Star <b>+250</b> · Golden Crown <b>+500</b>. Star and Crown speed up play for 10 seconds.';
    rules.appendChild(li);
  }
})();
