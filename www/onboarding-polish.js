/* Pre-game pause coach, icon-only pause control, and complete reward explanations. */
(() => {
  const $id=id=>document.getElementById(id);
  const pause=$id('pause');
  if(!pause)return;

  const style=document.createElement('style');
  style.textContent=`
    #pause.pause-readable{display:flex;align-items:center;justify-content:center;width:46px;min-width:46px;height:46px;padding:0!important;background:#101a16f2!important;border:1px solid #9ab7a8!important;color:#f7fbf8!important;box-shadow:0 6px 20px #0008,0 0 0 1px #ffffff12;opacity:1!important}
    #pause.pause-readable svg{width:22px;height:22px;flex:0 0 auto;filter:drop-shadow(0 1px 2px #000)}
    #pause .pause-label{display:none!important}
    #level-one-pause-coach{position:fixed;inset:0;z-index:94;background:#02070555;backdrop-filter:blur(1.5px);touch-action:manipulation;cursor:pointer}
    #level-one-pause-tip{position:fixed;width:min(255px,calc(100vw - 24px));padding:12px 13px;border:1px solid #9ab7a8;border-radius:14px;background:#101a16f8;color:#f5faf7;box-shadow:0 14px 38px #000b;text-align:left}
    #level-one-pause-tip::before{content:'';position:absolute;top:-6px;left:var(--tip-arrow,50%);width:10px;height:10px;background:#101a16;border-left:1px solid #9ab7a8;border-top:1px solid #9ab7a8;transform:translateX(-50%) rotate(45deg)}
    #level-one-pause-tip strong{display:block;font-size:.86rem;letter-spacing:.035em}
    #level-one-pause-tip span{display:block;margin-top:3px;color:#c5d2cb;font-size:.74rem;line-height:1.35}
    #level-one-pause-tip em{display:block;margin-top:9px;color:#e6f0eb;font-size:.65rem;font-style:normal;font-weight:900;letter-spacing:.12em}
    .tutorial-special-copy{display:block;margin-top:9px;padding:9px 10px;border:1px solid #42564d;border-radius:12px;background:#0c1512;font-size:.78rem;line-height:1.45;color:#d7e2dc}
    .tutorial-special-copy b{white-space:nowrap}.reward-violet{color:#c99cff}.reward-cyan{color:#72e6ff}.reward-gold{color:#ffd76a}
    @media(max-width:360px){#pause.pause-readable{width:44px;min-width:44px;height:44px}#level-one-pause-tip{width:min(225px,calc(100vw - 20px))}}
  `;
  document.head.appendChild(style);

  // Icon only, but keep it high contrast and easy to tap.
  pause.classList.add('pause-readable');
  pause.querySelector('.pause-label')?.remove();

  const coach=document.createElement('div');
  coach.id='level-one-pause-coach';
  coach.hidden=true;
  coach.innerHTML='<aside id="level-one-pause-tip" role="status"><strong>You can pause any time</strong><span>Use the ⏸ button whenever you need a break during gameplay.</span><em>TAP ANYWHERE TO CONTINUE</em></aside>';
  document.body.appendChild(coach);
  const tip=$id('level-one-pause-tip');
  let coachActive=false;

  function positionTip(){
    if(!coachActive)return;
    const r=pause.getBoundingClientRect(),vw=window.innerWidth||390;
    const width=Math.min(255,Math.max(190,vw-24));
    let left=r.left+r.width/2-width/2;
    left=Math.max(12,Math.min(vw-width-12,left));
    let top=r.bottom+12;
    if(top+92>(window.innerHeight||800))top=Math.max(12,r.top-102);
    tip.style.left=Math.round(left)+'px';tip.style.top=Math.round(top)+'px';
    const arrow=Math.max(18,Math.min(width-18,r.left+r.width/2-left));
    tip.style.setProperty('--tip-arrow',Math.round(arrow)+'px');
  }

  function showCoach(){
    if(coachActive)return;
    coachActive=true;
    // Freeze the normal countdown until the player acknowledges the Pause tip.
    startDelay=1.5;
    const center=$id('orbit-center');center?.classList.remove('counting');
    if($id('center-top'))$id('center-top').textContent='';
    if($id('center-label'))$id('center-label').textContent='';
    if($id('center-bottom'))$id('center-bottom').textContent='';
    window.LoopShiftMusic?.pause?.();
    coach.hidden=false;positionTip();
  }

  function dismissCoach(event){
    if(!coachActive)return;
    event?.preventDefault?.();event?.stopPropagation?.();
    coachActive=false;coach.hidden=true;
    // Existing countdown logic displays 3 → 2 → 1 from a 1.5 second start delay.
    startDelay=1.5;updateCountdown?.();lastTime=performance.now();
    window.LoopShiftMusic?.play?.();
  }
  coach.addEventListener('click',dismissCoach);
  window.addEventListener('resize',positionTip);
  window.visualViewport?.addEventListener('resize',positionTip);

  // Start Level 1 with the Pause tip first. Gameplay and countdown stay frozen behind it.
  if(typeof start==='function'){
    const previousStart=start;
    start=function(options){
      const result=previousStart(options);
      try{
        if(mode==='playing'&&screen==='game'&&level===1&&roundKind==='endless'&&!options?.resumeCheckpoint)showCoach();
      }catch{}
      return result;
    };
  }

  // Do not let the game or 3-2-1 countdown advance while the coach mark is open.
  if(typeof update==='function'){
    const previousUpdate=update;
    update=function(dt){if(coachActive)return;return previousUpdate(dt);};
  }

  // If navigation changes while the coach is open, clean it up safely.
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
