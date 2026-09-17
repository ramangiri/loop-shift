/* Level-1 pause coach mark, clearer pause control, and complete reward explanations. */
(() => {
  const $id=id=>document.getElementById(id);
  const pause=$id('pause');
  if(!pause)return;

  const style=document.createElement('style');
  style.textContent=`
    #pause.pause-readable{display:flex;align-items:center;justify-content:center;gap:6px;min-width:74px;padding-inline:10px;background:#101a16f2!important;border:1px solid #8da99a!important;color:#f5faf7!important;box-shadow:0 6px 20px #0008,0 0 0 1px #ffffff0b;opacity:1!important}
    #pause.pause-readable svg{flex:0 0 auto;filter:drop-shadow(0 1px 2px #000)}
    #pause .pause-label{font-size:.67rem;line-height:1;font-weight:900;letter-spacing:.08em;color:inherit;white-space:nowrap}
    #level-one-pause-tip{position:fixed;z-index:95;width:min(245px,calc(100vw - 24px));padding:10px 12px;border:1px solid #89a99a;border-radius:13px;background:#101a16f7;color:#f5faf7;box-shadow:0 12px 34px #000a;pointer-events:none;opacity:0;transform:translateY(-4px);transition:opacity .18s ease,transform .18s ease;text-align:left}
    #level-one-pause-tip.show{opacity:1;transform:translateY(0)}
    #level-one-pause-tip::before{content:'';position:absolute;top:-6px;left:var(--tip-arrow,50%);width:10px;height:10px;background:#101a16;border-left:1px solid #89a99a;border-top:1px solid #89a99a;transform:translateX(-50%) rotate(45deg)}
    #level-one-pause-tip strong{display:block;font-size:.8rem;letter-spacing:.04em}
    #level-one-pause-tip span{display:block;margin-top:2px;color:#becdc5;font-size:.72rem;line-height:1.32}
    .tutorial-special-copy{display:block;margin-top:9px;padding:9px 10px;border:1px solid #42564d;border-radius:12px;background:#0c1512;font-size:.78rem;line-height:1.45;color:#d7e2dc}
    .tutorial-special-copy b{white-space:nowrap}.reward-violet{color:#c99cff}.reward-cyan{color:#72e6ff}.reward-gold{color:#ffd76a}
    @media(max-width:360px){#pause.pause-readable{min-width:66px;padding-inline:8px;gap:4px}#pause .pause-label{font-size:.61rem}#level-one-pause-tip{width:min(220px,calc(100vw - 20px))}}
  `;
  document.head.appendChild(style);

  // Keep Pause readable after the first-level coach mark disappears.
  pause.classList.add('pause-readable');
  if(!pause.querySelector('.pause-label')){
    const label=document.createElement('span');label.className='pause-label';label.textContent='PAUSE';label.setAttribute('aria-hidden','true');pause.appendChild(label);
  }

  // First-level coach mark. It follows the Pause button even if the user moves it left/right.
  const tip=document.createElement('aside');
  tip.id='level-one-pause-tip';
  tip.setAttribute('role','status');
  tip.innerHTML='<strong>Pause any time</strong><span>You can pause any time during gameplay. Tap ⏸ PAUSE whenever you need a break.</span>';
  document.body.appendChild(tip);
  let shownForRun=false,visible=false,hideAt=0,lastGameTime=0;

  function positionTip(){
    if(!visible)return;
    const r=pause.getBoundingClientRect(),vw=window.innerWidth||390;
    const width=Math.min(245,Math.max(180,vw-24));
    let left=r.left+r.width/2-width/2;
    left=Math.max(12,Math.min(vw-width-12,left));
    let top=r.bottom+11;
    if(top+78>(window.innerHeight||800))top=Math.max(12,r.top-88);
    tip.style.left=Math.round(left)+'px';tip.style.top=Math.round(top)+'px';
    const arrow=Math.max(18,Math.min(width-18,r.left+r.width/2-left));
    tip.style.setProperty('--tip-arrow',Math.round(arrow)+'px');
  }
  function showTip(){
    visible=true;shownForRun=true;hideAt=performance.now()+6500;positionTip();requestAnimationFrame(()=>tip.classList.add('show'));
  }
  function hideTip(){visible=false;tip.classList.remove('show');}
  pause.addEventListener('click',hideTip,true);
  window.addEventListener('resize',positionTip);
  window.visualViewport?.addEventListener('resize',positionTip);

  function coachFrame(){
    try{
      if(typeof gameTime==='number'&&gameTime+.25<lastGameTime)shownForRun=false;
      lastGameTime=typeof gameTime==='number'?gameTime:lastGameTime;
      if(typeof screen!=='undefined'&&screen==='home'){shownForRun=false;hideTip();}
      const eligible=typeof screen!=='undefined'&&screen==='game'&&typeof mode!=='undefined'&&mode==='playing'&&typeof level==='number'&&level===1&&typeof roundKind!=='undefined'&&!['tutorial','practice'].includes(roundKind)&&typeof startDelay==='number'&&startDelay<=0&&typeof gameTime==='number'&&gameTime>=1.1;
      if(eligible&&!shownForRun&&!document.querySelector('dialog[open]'))showTip();
      if(visible&&(!eligible||performance.now()>=hideAt))hideTip();
      if(visible)positionTip();
    }catch{}
    requestAnimationFrame(coachFrame);
  }
  requestAnimationFrame(coachFrame);

  const rewardHtml=`<span class="tutorial-special-copy"><b>Gold spark: +10 base points</b> · 6 sparks charge a shield.<br><b class="reward-violet">Violet Gem +100</b> · <b class="reward-cyan">Cyan Star +250</b> · <b class="reward-gold">Golden Crown +500</b>.<br>Star and Crown increase game speed for <b>10 seconds</b>.</span>`;

  // Add the missing point values to the final GOLD hands-on lesson without changing its gameplay logic.
  if(typeof showTrainingStep==='function'){
    const previousShowTrainingStep=showTrainingStep;
    showTrainingStep=function(step){
      previousShowTrainingStep(step);
      if(typeof TRAINING!=='undefined'&&step===TRAINING.length-1){
        const copy=$id('training-copy');if(copy&&!copy.querySelector?.('.tutorial-special-copy'))copy.insertAdjacentHTML('beforeend',rewardHtml);
      }
    };
  }

  // Expand the GOLD scene in the animated How to Play with the same reward details.
  const filmTitle=$id('howto-film-title'),filmCopy=$id('howto-film-copy');
  if(filmTitle&&filmCopy){
    const syncFilmReward=()=>{
      if(filmTitle.textContent.trim()==='GOLD = COLLECT'){
        filmCopy.innerHTML='Gold sparks: +10 base points; 6 charge a shield.<br><span class="reward-violet">Violet +100</span> · <span class="reward-cyan">Star +250</span> · <span class="reward-gold">Crown +500</span> · Star/Crown = 10s speed boost.';
      }
    };
    new MutationObserver(syncFilmReward).observe(filmTitle,{childList:true,subtree:true});syncFilmReward();
  }

  // Keep the Home rules reference complete too.
  const rules=document.querySelector('.game-guide .essential-rules');
  if(rules&&!$id('special-reward-rules')){
    const li=document.createElement('li');li.id='special-reward-rules';
    li.innerHTML='<strong>Rewards.</strong> Gold spark <b>+10 base</b> · Violet Gem <b>+100</b> · Cyan Star <b>+250</b> · Golden Crown <b>+500</b>. Star and Crown speed up play for 10 seconds.';
    rules.appendChild(li);
  }
})();
