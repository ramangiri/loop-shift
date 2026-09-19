/* Animated How to Play: watch first, then hands-on guided practice. */
(() => {
  const $id=id=>document.getElementById(id);
  const GREEN='#cfff4a',BLUE='#72e6ff',RED='#ff806e',GOLD='#f5dc88',LINE='#71877c';
  const reduced=()=>{try{return !!reducedMotion;}catch{return matchMedia('(prefers-reduced-motion: reduce)').matches;}};

  const guideTitle=$id('guide-title');
  if(guideTitle)guideTitle.textContent='Rules & tips';
  const guide=document.querySelector('.game-guide .guide-intro');
  if(guide)guide.textContent='Quick reference for the one-tap rules.';

  const style=document.createElement('style');
  style.textContent=`
    #howto-animation-dialog{box-sizing:border-box;width:min(94vw,520px);max-height:calc(100dvh - 24px);padding:0;border:1px solid #53655d;border-radius:22px;background:#101916;color:#f3f7f4;overflow:auto}
    #howto-animation-dialog::backdrop{background:#030806d9;backdrop-filter:blur(5px)}
    .howto-film-head{padding:18px 18px 10px;text-align:center}.howto-film-head p{margin:0 0 5px;font-size:.72rem;letter-spacing:.15em;color:#9fb0a7;font-weight:800}.howto-film-head h2{margin:0;font-size:clamp(1.35rem,5vw,2rem)}
    .howto-film-stage{position:relative;margin:0 auto;width:min(92vw,430px);aspect-ratio:1/1;background:radial-gradient(circle at 50% 50%,#182921 0,#0c1713 62%,#08110e 100%);overflow:hidden;border-block:1px solid #273a31}
    #howto-film{width:100%;height:100%;display:block}
    .howto-film-caption{position:absolute;left:14px;right:14px;bottom:14px;background:#0d1714e8;border:1px solid #4c6257;border-radius:16px;padding:11px 12px;text-align:center;box-shadow:0 10px 30px #0007}
    .howto-film-caption strong{display:block;font-size:1.02rem;letter-spacing:.04em}.howto-film-caption span{display:block;margin-top:3px;font-size:.82rem;color:#c2cec8;line-height:1.35}
    .film-green{color:${GREEN}}.film-blue{color:${BLUE}}.film-red{color:${RED}}.film-gold{color:${GOLD}}
    .howto-film-progress{display:flex;gap:7px;justify-content:center;padding:12px 12px 0}.howto-film-progress i{width:8px;height:8px;border-radius:50%;background:#33483e;transition:.2s}.howto-film-progress i.active{background:#e8f5ee;transform:scale(1.25)}
    .howto-film-actions{display:grid;grid-template-columns:1fr;gap:10px;padding:14px 16px 18px}.howto-film-actions button{box-sizing:border-box;width:100%;max-width:none;min-width:0;min-height:54px;margin:0;padding:12px 16px;display:flex;align-items:center;justify-content:center;text-align:center;line-height:1.25}.howto-film-actions .primary-button{grid-column:auto;justify-content:center}
    @media(max-width:420px){.howto-film-head{padding-top:14px}}
  `;
  document.head.appendChild(style);

  const dialog=document.createElement('dialog');
  dialog.id='howto-animation-dialog';dialog.className='menu-dialog';
  dialog.innerHTML=`
    <div class="howto-film-head"><p>WATCH FIRST · THEN TRY IT</p><h2>How to play Loop Shift</h2></div>
    <div class="howto-film-stage">
      <canvas id="howto-film" width="430" height="430" aria-label="Animated demonstration of Loop Shift controls"></canvas>
      <div class="howto-film-caption" aria-live="polite"><strong id="howto-film-title"></strong><span id="howto-film-copy"></span></div>
    </div>
    <div class="howto-film-progress" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div>
    <div class="howto-film-actions">
      <button id="howto-film-practice" class="primary-button" type="button">START HANDS-ON PRACTICE</button>
      <button id="howto-film-replay" class="secondary-button" type="button">Replay animation</button>
      <button id="howto-film-close" class="secondary-button" type="button">BACK TO HOME</button>
    </div>`;
  document.body.appendChild(dialog);

  const canvas=$id('howto-film'),ctx=canvas.getContext('2d'),dots=[...dialog.querySelectorAll('.howto-film-progress i')];
  const title=$id('howto-film-title'),copy=$id('howto-film-copy');
  const phases=[
    {name:'GREEN = YOU',cls:'film-green',copy:'The green ball moves around the loop automatically.'},
    {name:'TAP = MOVE ONE RING',cls:'',copy:'One tap moves exactly one ring. BLUE is always one reachable ring away.'},
    {name:'BLUE = GUIDE',cls:'film-blue',copy:'Move toward the blue safe ring before the barrier reaches you.'},
    {name:'RED = AVOID',cls:'film-red',copy:'Red barriers are danger. Keep your green ball away from them.'},
    {name:'GOLD = COLLECT',cls:'film-gold',copy:'Gold sparks are rewards. Collect them when they are safely on your route.'}
  ];
  let raf=0,startAt=0,active=false,lastPhase=-1;
  const total=12.5,phaseSeconds=total/phases.length;
  const point=(a,r)=>({x:215+Math.cos(a)*r,y:215+Math.sin(a)*r});
  function setPhase(n){
    n=Math.max(0,Math.min(phases.length-1,n));if(n===lastPhase)return;lastPhase=n;
    const p=phases[n];title.className=p.cls;title.textContent=p.name;copy.textContent=p.copy;dots.forEach((d,i)=>d.classList.toggle('active',i===n));
  }
  function ring(r,w=2,color=LINE,alpha=1){ctx.save();ctx.globalAlpha=alpha;ctx.strokeStyle=color;ctx.lineWidth=w;ctx.beginPath();ctx.arc(215,215,r,0,Math.PI*2);ctx.stroke();ctx.restore();}
  function arc(r,a1,a2,color,w){ctx.save();ctx.strokeStyle=color;ctx.lineWidth=w;ctx.lineCap='round';ctx.beginPath();ctx.arc(215,215,r,a1,a2);ctx.stroke();ctx.restore();}
  function orb(a,r){const p=point(a,r);ctx.save();ctx.shadowColor=GREEN;ctx.shadowBlur=18;ctx.fillStyle=GREEN;ctx.beginPath();ctx.arc(p.x,p.y,10,0,Math.PI*2);ctx.fill();ctx.restore();}
  function spark(a,r){const p=point(a,r);ctx.save();ctx.translate(p.x,p.y);ctx.rotate(Math.PI/4);ctx.fillStyle=GOLD;ctx.shadowColor=GOLD;ctx.shadowBlur=15;ctx.fillRect(-7,-7,14,14);ctx.restore();}
  function frame(now){
    if(!active)return;const elapsed=((now-startAt)/1000)%total,n=Math.min(4,Math.floor(elapsed/phaseSeconds)),local=(elapsed-n*phaseSeconds)/phaseSeconds;setPhase(n);
    ctx.clearRect(0,0,430,430);ring(142);ring(96);ring(54,1,LINE,.45);
    const base=-Math.PI/2+elapsed*.72;
    let playerR=142;
    if(n===1){const move=Math.min(1,Math.max(0,(local-.22)/.45));playerR=142-(142-96)*(move*move*(3-2*move));}
    else if(n>=2)playerR=96;
    if(n>=1){const target=n===1?96:n===2?96:n===3?142:96;arc(target,base-.18,base+.18,BLUE,8);}
    if(n===2||n===3){const redA=base+.66-(n===3?local*.43:local*.18);arc(n===3?96:142,redA-.10,redA+.10,RED,13);}
    if(n===1){const pulse=(local*2)%1;ctx.save();ctx.globalAlpha=1-pulse;ctx.strokeStyle='#fff';ctx.lineWidth=2;ctx.beginPath();ctx.arc(215,215,24+pulse*28,0,Math.PI*2);ctx.stroke();ctx.restore();ctx.fillStyle='#fff';ctx.font='800 15px system-ui';ctx.textAlign='center';ctx.fillText('TAP',215,221);}
    if(n===4){spark(base+.48,96);spark(base+1.25,142);}
    orb(base,playerR);
    if(!reduced())raf=requestAnimationFrame(frame);
  }
  function play(){cancelAnimationFrame(raf);lastPhase=-1;startAt=performance.now();active=true;if(reduced()){setPhase(0);ctx.clearRect(0,0,430,430);ring(142);ring(96);arc(96,-1.7,-1.3,BLUE,8);arc(142,.3,.52,RED,13);spark(1.7,96);orb(-1.5,142);}else raf=requestAnimationFrame(frame);}
  function stop(){active=false;cancelAnimationFrame(raf);}
  function openAnimation(){
    if(dialog.open)return;
    const other=[...document.querySelectorAll('dialog[open]')].find(d=>d!==dialog);
    if(other)other.close();
    dialog.showModal();play();$id('howto-film-practice').focus();
  }
  function closeAnimation(){stop();if(dialog.open)dialog.close();}
  window.LoopShiftHowTo={open:openAnimation,close:closeAnimation,replay:play};

  for(const id of ['tutorial-play','tutorial-start']){
    const old=$id(id);if(!old)continue;
    const button=old.cloneNode(true);old.replaceWith(button);
    button.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();openAnimation();});
    if(id==='tutorial-start')button.textContent='Watch tutorial & practise';
  }

  $id('howto-film-practice').addEventListener('click',event=>{event.preventDefault();event.stopPropagation();closeAnimation();setTimeout(()=>startTutorial(),120);});
  $id('howto-film-replay').addEventListener('click',play);
  $id('howto-film-close').addEventListener('click',closeAnimation);
  dialog.addEventListener('cancel',event=>{event.preventDefault();closeAnimation();});
})();
