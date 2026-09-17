/* Dedicated Pause popup for manual pause-button taps. */
(() => {
  const byId=id=>document.getElementById(id);
  const pauseButton=byId('pause');
  if(!pauseButton||typeof setPaused!=='function')return;

  const style=document.createElement('style');
  style.textContent=`
    #pause-menu-dialog{width:min(92vw,430px);padding:0;border:1px solid #52655b;border-radius:24px;background:#101a16;color:#f4f7f5;box-shadow:0 24px 70px #000b;overflow:hidden}
    #pause-menu-dialog::backdrop{background:#020705cc;backdrop-filter:blur(5px)}
    .pause-menu-head{padding:24px 22px 14px;text-align:center;border-bottom:1px solid #263a31}
    .pause-menu-head small{display:block;margin-bottom:7px;font-size:.72rem;font-weight:900;letter-spacing:.16em;color:#a3b2aa}
    .pause-menu-head h2{margin:0;font-size:clamp(1.7rem,7vw,2.3rem)}
    .pause-menu-stats{display:grid;grid-template-columns:1fr 1fr;gap:10px;padding:16px 18px 4px}
    .pause-menu-stat{padding:13px 12px;border:1px solid #30463b;border-radius:16px;background:#0c1512;text-align:center}
    .pause-menu-stat span{display:block;font-size:.7rem;letter-spacing:.12em;color:#98aaa1;font-weight:800}
    .pause-menu-stat strong{display:block;margin-top:4px;font-size:1.35rem}
    .pause-menu-copy{margin:10px 22px 4px;text-align:center;color:#b6c3bc;font-size:.9rem;line-height:1.4}
    .pause-menu-actions{display:grid;gap:10px;padding:16px 18px 20px}
    .pause-menu-actions button{min-height:50px}
    #pause-menu-home,#pause-menu-restart{background:transparent;border:1px solid #40564b;color:#eef4f0;border-radius:14px;font:inherit;font-weight:800}
    #pause-menu-restart[data-confirm="true"]{border-color:#ff8a75;color:#ffb4a8}
    #pause-menu-save[hidden]{display:none}
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
      <button id="pause-menu-restart" type="button">RESTART RUN</button>
      <button id="pause-menu-home" type="button">HOME · KEEP PAUSED</button>
    </div>`;
  document.body.appendChild(dialog);

  const resume=byId('pause-menu-resume');
  const save=byId('pause-menu-save');
  const restart=byId('pause-menu-restart');
  const home=byId('pause-menu-home');
  let overlayWasHidden=true,restartTimer=0;

  function refresh(){
    byId('pause-menu-level').textContent=String(typeof level==='number'?level:1);
    byId('pause-menu-score').textContent=(typeof score==='number'?score:0).toLocaleString();
    save.hidden=!(typeof checkpointEligible!=='undefined'&&checkpointEligible&&typeof roundKind!=='undefined'&&roundKind==='endless');
    restart.dataset.confirm='false';restart.textContent='RESTART RUN';
  }
  function hideCoreOverlay(){const overlay=byId('overlay');if(!overlay)return;overlayWasHidden=overlay.hidden;overlay.hidden=true;}
  function restoreCoreOverlay(){const overlay=byId('overlay');if(overlay)overlay.hidden=overlayWasHidden;}
  function closeDialog(){clearTimeout(restartTimer);if(dialog.open)dialog.close();}
  function resumeGame(){closeDialog();restoreCoreOverlay();if(typeof mode!=='undefined'&&mode==='paused')setPaused(false,false);}

  function openPause(event){
    if(typeof screen==='undefined'||typeof mode==='undefined'||screen!=='game'||mode!=='playing')return;
    if(typeof breakPending!=='undefined'&&breakPending)return;
    if(typeof ringLessonPending!=='undefined'&&ringLessonPending)return;
    event?.preventDefault?.();event?.stopImmediatePropagation?.();
    setPaused(true,false);refresh();hideCoreOverlay();
    if(!dialog.open)dialog.showModal();resume.focus({preventScroll:true});
  }

  // Capture phase runs before the original pause button's bubble listener.
  pauseButton.addEventListener('click',openPause,true);

  resume.addEventListener('click',resumeGame);
  dialog.addEventListener('cancel',event=>{event.preventDefault();resumeGame();});

  save.addEventListener('click',()=>{
    closeDialog();restoreCoreOverlay();
    if(typeof saveCheckpoint==='function')saveCheckpoint(true);
  });

  home.addEventListener('click',()=>{
    closeDialog();restoreCoreOverlay();
    if(typeof goHome==='function')goHome();
  });

  restart.addEventListener('click',()=>{
    if(restart.dataset.confirm!=='true'){
      restart.dataset.confirm='true';restart.textContent='TAP AGAIN TO RESTART';
      clearTimeout(restartTimer);restartTimer=setTimeout(()=>{restart.dataset.confirm='false';restart.textContent='RESTART RUN';},2200);
      return;
    }
    closeDialog();restoreCoreOverlay();
    if(typeof start==='function')start();
  });
})();
