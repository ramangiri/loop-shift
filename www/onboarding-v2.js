/* How to Play 2.0: clearer colour language and first-run instructions only. */
(() => {
 const $id=id=>document.getElementById(id);
 const HOWTO_KEY='loop-shift-howto-clear-v3';
 const slides=[
  {title:'GREEN BALL = YOU',copy:'The green ball is your player. It moves around the circle automatically. You only choose which ring it uses.',kind:'player',tone:'YOU'},
  {title:'TAP = MOVE ONE RING',copy:'Tap anywhere once to move one ring. Do not keep tapping. Watch the blue guide, then make the move.',kind:'player',tone:'TAP'},
  {title:'BLUE = GO HERE',copy:'The blue arc marks the safe ring. Move early so the ball has time to land there before the barrier arrives.',kind:'barrier',tone:'GO'},
  {title:"HOLD = DON'T TAP",copy:'If the blue guide is already on your ring and the game says HOLD, do nothing. Stay there and let the barrier pass.',kind:'barrier',tone:'HOLD'},
  {title:'RED = AVOID',copy:'Red / coral bars are danger. Never touch them. Remember: GREEN = YOU · BLUE = GO · HOLD = STAY · RED = AVOID.',kind:'barrier',tone:'AVOID'}
 ];

 const style=document.createElement('style');
 style.textContent=`
  .howto-colour-key{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin:12px 0 4px}
  .howto-colour-key span{display:flex;align-items:center;gap:7px;padding:8px 10px;border:1px solid color-mix(in srgb,currentColor 16%,transparent);border-radius:12px;font-weight:800;font-size:.8rem}
  .howto-dot{width:11px;height:11px;border-radius:50%;display:inline-block;flex:0 0 auto}
  .howto-you .howto-dot{background:#b8d68f}.howto-go .howto-dot{background:#72e6ff}.howto-avoid .howto-dot{background:#e39a83}.howto-collect .howto-dot{background:#e4bf83}
  .howto-now{margin:.65rem 0 0;font-weight:900;letter-spacing:.07em;text-align:center}
  .advanced-howto{margin-top:.8rem;padding:.8rem;border:1px solid color-mix(in srgb,currentColor 16%,transparent);border-radius:14px;line-height:1.5}
  .advanced-howto strong{display:block;margin-bottom:.25rem}
 `;
 document.head.appendChild(style);

 function colourKey(){
  const key=document.createElement('div');key.className='howto-colour-key';
  key.innerHTML='<span class="howto-you"><i class="howto-dot"></i>GREEN = YOU</span><span class="howto-go"><i class="howto-dot"></i>BLUE = GO</span><span class="howto-avoid"><i class="howto-dot"></i>RED = AVOID</span><span class="howto-collect"><i class="howto-dot"></i>GOLD = COLLECT</span>';
  return key;
 }
 function ensurePreplayKey(){
  const dialog=$id('preplay-dialog');if(!dialog)return;
  let key=dialog.querySelector('.howto-colour-key');
  if(!key){key=colourKey();const copy=$id('preplay-copy');copy?.insertAdjacentElement('afterend',key);}
  let now=dialog.querySelector('.howto-now');
  if(!now){now=document.createElement('p');now.className='howto-now';key.insertAdjacentElement('afterend',now);}
  now.textContent=slides[Math.max(0,Math.min(slides.length-1,preplaySlide))].tone;
 }

 // Show the clearer guide once to everyone, including players who saw the older 3-slide guide.
 try{if(localStorage.getItem(HOWTO_KEY)!=='true')preplaySeen=false;}catch{preplaySeen=false;}
 const originalFinishPreplay=finishPreplay;
 finishPreplay=function(){try{localStorage.setItem(HOWTO_KEY,'true');}catch{}return originalFinishPreplay();};
 showPreplaySlide=function(){
  const slide=slides[Math.max(0,Math.min(slides.length-1,preplaySlide))];
  $id('preplay-title').textContent=slide.title;$id('preplay-copy').textContent=slide.copy;
  $id('preplay-step').textContent=`${preplaySlide+1} / ${slides.length}`;$id('preplay-picture').dataset.lesson=slide.kind;
  $id('preplay-picture').setAttribute('aria-label',slide.title+'. '+slide.copy);
  $id('preplay-go').textContent=preplaySlide===slides.length-1?'GOT IT — PLAY':'NEXT';ensurePreplayKey();
 };
 const go=$id('preplay-go');
 go?.addEventListener('click',event=>{
  event.preventDefault();event.stopImmediatePropagation();
  if(preplaySlide<slides.length-1){preplaySlide++;showPreplaySlide();return;}
  finishPreplay();
 },true);
 $id('preplay-skip')?.addEventListener('click',()=>{try{localStorage.setItem(HOWTO_KEY,'true');}catch{}},true);

 // Keep guided practice interactive, but make every message use the same language.
 if(typeof TRAINING!=='undefined'&&Array.isArray(TRAINING)){
  TRAINING.splice(0,TRAINING.length,
   ['Tap = move one ring','GREEN is you. The ball moves by itself. BLUE is your destination. Tap once now to move one ring.'],
   ['Gold = collect','GOLD sparks are rewards. Move to the gold spark. Six gold sparks charge one shield.'],
   ['Red = avoid','RED / coral is danger. Move to BLUE before the red barrier reaches your ball.'],
   ['Shield = one saved hit','The circle around your ball is a shield. It can absorb one red-bar hit. Try it once here.'],
   ['Remember the four rules','GREEN = YOU · BLUE = GO · HOLD = DON’T TAP · RED = AVOID. You can replay How to Play from Home anytime.']
  );
 }
 if(typeof TRAINING_HINTS!=='undefined'&&Array.isArray(TRAINING_HINTS)){
  TRAINING_HINTS.splice(0,TRAINING_HINTS.length,
   'BLUE = GO · Tap once to move one ring.',
   'GOLD = COLLECT · Tap to reach the gold spark.',
   'RED = AVOID · Move to blue before red reaches you.',
   'SHIELD = ONE SAVED HIT · Let red touch the shield once.',
   'GREEN = YOU · BLUE = GO · HOLD = STAY · RED = AVOID.'
  );
 }

 // Rewrite the Home guide so the rules can be understood at a glance.
 const guide=document.querySelector('.game-guide');
 if(guide){
  const intro=guide.querySelector('.guide-intro');if(intro)intro.textContent='Remember these four colours first.';
  const rules=guide.querySelector('.essential-rules');
  if(rules){rules.innerHTML='<li><strong>🟢 GREEN = YOU.</strong> Your ball moves around the loop automatically.</li><li><strong>🔵 BLUE = GO.</strong> Tap once to move one ring toward the blue arc.</li><li><strong>✋ HOLD = DON’T TAP.</strong> If blue is already on your ring, stay there.</li><li><strong>🔴 RED = AVOID.</strong> Move before a red / coral barrier reaches you.</li><li><strong>🟡 GOLD = COLLECT.</strong> Gold sparks charge shields. Purple, cyan and crown collectibles are optional bonus routes.</li>';}
  if(!guide.querySelector('.howto-colour-key'))guide.insertBefore(colourKey(),rules?.nextSibling||guide.firstChild);
  if(!guide.querySelector('.advanced-howto')){
   const advanced=document.createElement('div');advanced.className='advanced-howto';advanced.innerHTML='<strong>Later levels teach one new rule at a time</strong>DOUBLE SHIFT = two quick taps · SWITCH GATE = watch the safe gap move · ATTACK = follow the shown sequence. Fire Ball works the same as before.';
   rules?.insertAdjacentElement('afterend',advanced);
  }
 }

 // Keep the four rules visible during early play without changing gameplay.
 const hint=$id('tap-anywhere-hint');
 if(hint){const tap=hint.querySelector('.tap-copy'),click=hint.querySelector('.click-copy'),sub=hint.querySelector('span');if(tap)tap.textContent='TAP ONCE = MOVE ONE RING';if(click)click.textContent='CLICK / SPACE = MOVE ONE RING';if(sub)sub.textContent="BLUE = GO · HOLD = DON'T TAP · RED = AVOID";}
 const mobile=document.querySelector('.mobile-hint');if(mobile)mobile.innerHTML='<span class="legend-orb"></span> YOU &nbsp; <span style="color:#72e6ff">●</span> GO &nbsp; <span class="legend-barrier"></span> AVOID &nbsp; <span class="legend-spark">✦</span> COLLECT';
})();
