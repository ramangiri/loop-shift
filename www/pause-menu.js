/* Dedicated Pause popup for manual pause-button taps. */
(() => {
  const byId=id=>document.getElementById(id);
  const pauseButton=byId('pause');
  if(!pauseButton||typeof setPaused!=='function')return;

  const style=document.createElement('style');
  style.textContent=`
    #pause-menu-dialog,#pause-confirm-dialog{box-sizing:border-box;width:min(92vw,430px);max-height:calc(100dvh - 28px);padding:0;border:1px solid #52655b;border-radius:24px;background:#101a16;color:#f4f7f5;box-shadow:0 24px 70px #000b;overflow:auto}
    #pause-menu-dialog::backdrop,#pause-confirm-dialog::backdrop{background:#020705cc;backdrop-filter:blur(5px)}
    .pause-menu-head{padding:24px 22px 14px;text-align:center;border-bottom:1px solid #263a31}
    .pause-menu-head small{display:block;margin-bottom:7px;font-size:.72rem;font-weight:900;letter-spacing:.16em;color:#a3b2aa}
    .pause-menu-head h2{margin:0;font-size:clamp(1.7rem,7vw,2.3rem)}
    .pause-menu-stats{display:grid;grid-template-columns:1fr 1fr;gap:10px;padding:16px 18px 4px}
    .pause-menu-stat{padding:13px 12px;border:1px solid #30463b;border-radius:16px;background:#0c1512;text-align:center}
    .pause-menu-stat span{display:block;font-size:.7rem;letter-spacing:.12em;color:#98aaa1;font-weight:800}
    .pause-menu-stat strong{display:block;margin-top:4px;font-size:1.35rem}
    .pause-menu-copy,.pause-confirm-copy{margin:12px 22px 4px;text-align:center;color:#b6c3bc;font-size:.92rem;line-height:1.45}
    .pause-menu-actions,.pause-confirm-actions{display:grid;grid-template-columns:1fr;gap:10px;padding:16px 18px 20px}
    .pause-menu-actions button,.pause-confirm-actions button{box-sizing:border-box;width:100%;min-width:0;min-height:54px;margin:0;padding:12px 16px;display:flex;align-items:center;justify-content:center;text-align:center;line-height:1.25}
    #pause-menu-home,#pause-confirm-cancel{background:transparent;border:1px solid #40564b;color:#eef4f0;border-radius:14px;font:inherit;font-weight:800}
    .pause-menu-actions .primary-button,.pause-menu-actions .secondary-button,.pause-confirm-actions .primary-button,.pause-confirm-actions .secondary-button{width:100%;max-width:none;justify-content:center}
    #pause-menu-save[hidden]{display:none}
    #pause-confirm-yes{background:#3a1714;border:1px solid #ff8a75;color:#ffd0c8;border-radius:14px;font:inherit;font-weight:900}
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
      <button id="pause-menu-home" type="button">END GAME &amp; HOME</button>
    </div>`;
  document.body.appendChild(dialog);

  const confirm=document.createElement('dialog');
  confirm.id='pause-confirm-dialog';
  confirm.setAttribute('aria-labelledby','pause-confirm-title');
  confirm.innerHTML=`
    <div class="pause-menu-head"><small>ARE YOU SURE?</small><h2 id="pause-confirm-title">End this game?</h2></div>
    <p class="pause-confirm-copy">Return Home and end the current run? Unsaved progress since your last checkpoint will be lost.</p>
    <div class="pause-confirm-actions">
      <button id="pause-confirm-yes" type="button">YES · END GAME</button>
      <button id="pause-confirm-cancel" type="button">CANCEL</button>
    </div>`;
  document.body.appendChild(confirm);

  const resume=byId('pause-menu-resume'),save=byId('pause-menu-save'),home=byId('pause-menu-home');
  const confirmYes=byId('pause-confirm-yes'),confirmCancel=byId('pause-confirm-cancel');
  let overlayWasHidden=true;

  function refresh(){
    byId('pause-menu-level').textContent=String(typeof level==='number'?level:1);
    byId('pause-menu-score').textContent=(typeof score==='number'?score:0).toLocaleString();
    save.hidden=!(typeof checkpointEligible!=='undefined'&&checkpointEligible&&typeof roundKind!=='undefined'&&roundKind==='endless');
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

  pauseButton.addEventListener('click',openPause,true);
  resume.addEventListener('click',resumeGame);
  dialog.addEventListener('cancel',event=>{event.preventDefault();resumeGame();});

  save.addEventListener('click',()=>{
    closePause();restoreCoreOverlay();
    if(typeof saveCheckpoint==='function')saveCheckpoint(true);
  });

  home.addEventListener('click',()=>{
    closePause();
    setTimeout(()=>{if(!confirm.open)confirm.showModal();confirmCancel.focus({preventScroll:true});},40);
  });

  confirmCancel.addEventListener('click',reopenPause);
  confirm.addEventListener('cancel',event=>{event.preventDefault();reopenPause();});
  confirmYes.addEventListener('click',()=>{
    if(confirm.open)confirm.close();
    restoreCoreOverlay();
    if(typeof finishAndSave==='function')finishAndSave(true);else if(typeof goHome==='function')goHome();
  });
})();
