/* One-time gameplay guide for special rewards. */
(() => {
  const GUIDE_KEY='loop-shift-special-reward-guide-v1';
  let guideSeen=false,guideActive=false;
  try{guideSeen=localStorage.getItem(GUIDE_KEY)==='true';}catch{}

  const style=document.createElement('style');
  style.textContent=`
    #special-reward-guide[hidden]{display:none!important}
    #special-reward-guide{position:fixed;inset:0;z-index:120;display:grid;place-items:center;padding:max(16px,env(safe-area-inset-top)) max(14px,env(safe-area-inset-right)) max(16px,env(safe-area-inset-bottom)) max(14px,env(safe-area-inset-left));background:#020705d9;backdrop-filter:blur(5px);touch-action:manipulation;cursor:pointer}
    .reward-guide-card{width:min(92vw,420px);max-height:min(88dvh,680px);overflow:auto;padding:18px;border:1px solid #587064;border-radius:22px;background:#101916;color:#f5faf7;box-shadow:0 24px 70px #000c}
    .reward-guide-kicker{margin:0 0 5px;text-align:center;color:#a9bab1;font-size:.67rem;font-weight:900;letter-spacing:.16em}
    .reward-guide-card h2{margin:0;text-align:center;font-size:clamp(1.35rem,6vw,1.8rem)}
    .reward-guide-intro{margin:6px auto 14px;max-width:330px;text-align:center;color:#c4d0ca;font-size:.8rem;line-height:1.38}
    .reward-guide-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}
    .reward-guide-item{min-width:0;padding:11px 10px;border:1px solid #31473c;border-radius:15px;background:#0b1411;text-align:center}
    .reward-guide-icon{display:grid;place-items:center;width:46px;height:46px;margin:0 auto 7px;border-radius:14px;background:#ffffff08}
    .reward-guide-icon svg{width:36px;height:36px;overflow:visible;filter:drop-shadow(0 0 8px var(--reward-color))}
    .reward-guide-item strong{display:block;color:var(--reward-color);font-size:.77rem;letter-spacing:.035em}
    .reward-guide-points{display:block;margin-top:3px;font-size:1.05rem;font-weight:950}
    .reward-guide-extra{display:block;margin-top:3px;color:#aebdb5;font-size:.66rem;line-height:1.28}
    .reward-guide-continue{margin:14px 0 0;text-align:center;color:#eef7f2;font-size:.68rem;font-weight:950;letter-spacing:.12em}
    @media(max-width:360px){.reward-guide-card{padding:14px}.reward-guide-grid{gap:7px}.reward-guide-item{padding:9px 7px}.reward-guide-icon{width:40px;height:40px}.reward-guide-icon svg{width:31px;height:31px}.reward-guide-item strong{font-size:.69rem}.reward-guide-extra{font-size:.61rem}}
  `;
  document.head.appendChild(style);

  const overlay=document.createElement('div');
  overlay.id='special-reward-guide';
  overlay.hidden=true;
  overlay.setAttribute('role','dialog');
  overlay.setAttribute('aria-modal','true');
  overlay.setAttribute('aria-labelledby','special-reward-guide-title');
  overlay.innerHTML=`
    <section class="reward-guide-card">
      <p class="reward-guide-kicker">GAME PAUSED · SPECIAL REWARDS</p>
      <h2 id="special-reward-guide-title">Know what to catch</h2>
      <p class="reward-guide-intro">Special rewards appear briefly during the run. Recognise the shape, grab it, then keep following BLUE.</p>
      <div class="reward-guide-grid">
        <div class="reward-guide-item" style="--reward-color:#b77cff">
          <span class="reward-guide-icon" aria-hidden="true"><svg viewBox="0 0 48 48"><path d="M24 4 40 24 24 44 8 24Z" fill="#b77cff" stroke="#f4eaff" stroke-width="2"/><path d="M24 4 30 24 24 44 18 24Z" fill="#d7b8ff" opacity=".65"/></svg></span>
          <strong>PURPLE GEM</strong><span class="reward-guide-points">+100</span><span class="reward-guide-extra">Available from Level 1</span>
        </div>
        <div class="reward-guide-item" style="--reward-color:#61e9ff">
          <span class="reward-guide-icon" aria-hidden="true"><svg viewBox="0 0 48 48"><path d="m24 4 5.2 12.6L43 18l-10.5 9 3.2 13.5L24 33.3l-11.7 7.2L15.5 27 5 18l13.8-1.4Z" fill="#61e9ff" stroke="#e9fdff" stroke-width="2"/></svg></span>
          <strong>CYAN STAR</strong><span class="reward-guide-points">+250</span><span class="reward-guide-extra">Level 11+ · 10s speed ×1.3</span>
        </div>
        <div class="reward-guide-item" style="--reward-color:#ffd76a">
          <span class="reward-guide-icon" aria-hidden="true"><svg viewBox="0 0 48 48"><path d="M7 17 15 25 24 11l9 14 8-8-4 22H11Z" fill="#ffd76a" stroke="#fff4cb" stroke-width="2"/><path d="M12 34h24" stroke="#b78321" stroke-width="3"/></svg></span>
          <strong>GOLDEN CROWN</strong><span class="reward-guide-points">+500</span><span class="reward-guide-extra">Level 21+ · 10s speed ×1.3</span>
        </div>
        <div class="reward-guide-item" style="--reward-color:#f5dc88">
          <span class="reward-guide-icon" aria-hidden="true"><svg viewBox="0 0 48 48"><path d="m24 7 12 17-12 17L12 24Z" fill="#f5dc88" stroke="#fff8d8" stroke-width="2"/><circle cx="24" cy="24" r="18" fill="none" stroke="#f5dc88" stroke-width="2" opacity=".55"/></svg></span>
          <strong>GOLD SPARK</strong><span class="reward-guide-points">+10 base</span><span class="reward-guide-extra">Collect 6 to charge a shield</span>
        </div>
      </div>
      <p class="reward-guide-continue">TAP ANYWHERE TO CONTINUE</p>
    </section>`;
  document.body.appendChild(overlay);

  function markSeen(){guideSeen=true;try{localStorage.setItem(GUIDE_KEY,'true');}catch{}}
  function otherCoachOpen(){return !!document.querySelector('dialog[open],#level-one-pause-coach:not([hidden])');}
  function upcomingSpecial(){
    if(typeof rows==='undefined'||typeof angle!=='number'||typeof speedNow!=='function')return null;
    const speed=Math.max(.01,speedNow());let best=null,bestSeconds=Infinity;
    for(const row of rows||[]){
      if(!row||row.passed||!row.specialType||row.specialCollected||row.specialResolved)continue;
      const rowAngle=Number.isFinite(row.angle)?row.angle:row.baseAngle;
      if(!Number.isFinite(rowAngle))continue;
      const seconds=(rowAngle-.24-angle)/speed;
      if(seconds<=.18||seconds>=bestSeconds)continue;
      best={row,seconds};bestSeconds=seconds;
    }
    return best;
  }
  function showGuide(){
    if(guideSeen||guideActive)return;
    guideActive=true;overlay.hidden=false;
    window.LoopShiftMusic?.pause?.();
  }
  function hideGuide(mark=true){
    if(!guideActive)return;
    guideActive=false;overlay.hidden=true;
    if(mark)markSeen();
    try{lastTime=performance.now();frameCarry=0;syncMusic?.();}catch{}
    if(mark)window.LoopShiftMusic?.play?.('game');
  }
  overlay.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();hideGuide(true);});

  if(typeof update==='function'){
    const previousUpdate=update;
    update=function(dt){if(guideActive)return;return previousUpdate(dt);};
  }

  function frame(){
    try{
      if(guideActive&&(screen!=='game'||mode!=='playing'))hideGuide(false);
      if(!guideSeen&&!guideActive&&screen==='game'&&mode==='playing'&&roundKind==='endless'&&startDelay<=0&&rushTime<=0&&!otherCoachOpen()){
        const special=upcomingSpecial();
        if(special&&special.seconds<=1.55)showGuide();
      }
    }catch{}
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();