/* How to Play 2.1: clearer five-step visual language. Tutorial only. */
(() => {
 const $id=id=>document.getElementById(id);
 const HOWTO_KEY='loop-shift-howto-clear-v4';
 const GREEN='#cfff4a',BLUE='#72e6ff',RED='#ff806e',GOLD='#f5dc88',LINE='#71877c',BG='#10201a';
 const kw=(word,cls)=>`<strong class="kw-${cls}">${word}</strong>`;
 const slides=[
  {
   title:`${kw('GREEN','green')} = YOU`,
   plainTitle:'GREEN = YOU',kind:'green',tone:'THIS BALL IS YOU',
   copy:`${kw('GREEN','green')} is your ball. It travels around the loop automatically. You do not steer around the circle — you only choose which ring the ball should use.`
  },
  {
   title:'TAP = MOVE ONE RING',plainTitle:'TAP = MOVE ONE RING',kind:'tap',tone:'ONE TAP = ONE RING',
   copy:`Tap anywhere once to move exactly <strong>one ring</strong>. If a later challenge needs two rings, tap twice. Do not keep tapping randomly — first read where you need to go.`
  },
  {
   title:`${kw('BLUE','blue')} = GO HERE`,plainTitle:'BLUE = GO HERE',kind:'blue',tone:'MOVE TO BLUE',
   copy:`${kw('BLUE','blue')} marks the safe destination. Move early enough for ${kw('GREEN','green')} to land on that ring before the barrier arrives. Blue tells you <strong>where</strong> to go, not when to tap.`
  },
  {
   title:`HOLD = DON'T TAP`,plainTitle:"HOLD = DON'T TAP",kind:'hold',tone:'STAY ON YOUR RING',
   copy:`Sometimes ${kw('BLUE','blue')} is already on the same ring as ${kw('GREEN','green')}. When the game says <strong>HOLD</strong>, do nothing. Stay on that ring and let the danger pass.`
  },
  {
   title:`${kw('RED','red')} = AVOID · ${kw('GOLD','gold')} = COLLECT`,plainTitle:'RED = AVOID · GOLD = COLLECT',kind:'redgold',tone:'AVOID RED · COLLECT GOLD',
   copy:`${kw('RED','red')} / coral bars are danger — touching one can cost a shield or end the run. ${kw('GOLD','gold')} sparks are rewards. Collect six gold sparks to build shield charge.`
  }
 ];

 const trainingCards=[
  {
   title:`${kw('GREEN','green')} = YOU`,plain:'GREEN = YOU',kind:'green',
   copy:`The ${kw('GREEN','green')} ball is you and it moves around the loop by itself. Tap once now so you can see how your ball changes rings.`,
   hint:'GREEN = YOU · TAP ANYWHERE TO SWITCH RINGS.'
  },
  {
   title:'TAP = MOVE ONE RING',plain:'TAP = MOVE ONE RING',kind:'tap',
   copy:`One tap moves ${kw('GREEN','green')} exactly one ring. Use one controlled tap to reach the ${kw('GOLD','gold')} spark. Later, a double shift simply means two quick taps.`,
   hint:'TAP ANYWHERE · ONE TAP = ONE RING · Reach the GOLD spark.'
  },
  {
   title:`${kw('BLUE','blue')} = GO HERE`,plain:'BLUE = GO HERE',kind:'blue',
   copy:`The ${kw('BLUE','blue')} arc shows the safe ring. The ${kw('RED','red')} barrier is coming on your current ring, so tap early and finish the move before red reaches you.`,
   hint:'TAP ANYWHERE TO BLUE · RED = AVOID · Move before RED reaches you.'
  },
  {
   title:`HOLD = DON'T TAP`,plain:"HOLD = DON'T TAP",kind:'hold',
   copy:`Here ${kw('BLUE','blue')} is already on your ${kw('GREEN','green')} ring. That means you are safe where you are. <strong>Do not tap.</strong> Let the ${kw('RED','red')} barrier pass on the other ring.`,
   hint:"HOLD = STAY · Don't tap. Let RED pass on the other ring."
  },
  {
   title:`${kw('RED','red')} = AVOID · ${kw('GOLD','gold')} = COLLECT`,plain:'RED = AVOID · GOLD = COLLECT',kind:'redgold',
   copy:`Remember the full language: ${kw('GREEN','green')} = you · ${kw('BLUE','blue')} = go · <strong>HOLD</strong> = stay · ${kw('RED','red')} = avoid · ${kw('GOLD','gold')} = collect. Later levels build on these same rules.`,
   hint:'TAP ANYWHERE TO COLLECT · GOLD = COLLECT · RED = AVOID.'
  }
 ];

 const style=document.createElement('style');
 style.textContent=`
  .kw-green{color:${GREEN}!important}.kw-blue{color:${BLUE}!important}.kw-red{color:${RED}!important}.kw-gold{color:${GOLD}!important}
  #training-copy .kw-green,#training-copy .kw-blue,#training-copy .kw-red,#training-copy .kw-gold,
  #preplay-copy .kw-green,#preplay-copy .kw-blue,#preplay-copy .kw-red,#preplay-copy .kw-gold{font-weight:900}
  #training-picture,#preplay-picture{display:block;width:min(100%,340px);height:auto;max-height:205px;margin:.55rem auto .75rem;overflow:visible}
  .howto-colour-key{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin:12px 0 4px}
  .howto-colour-key span{display:flex;align-items:center;gap:7px;padding:8px 10px;border:1px solid color-mix(in srgb,currentColor 16%,transparent);border-radius:12px;font-weight:800;font-size:.8rem}
  .howto-dot{width:11px;height:11px;border-radius:50%;display:inline-block;flex:0 0 auto}
  .howto-you .howto-dot{background:${GREEN}}.howto-go .howto-dot{background:${BLUE}}.howto-avoid .howto-dot{background:${RED}}.howto-collect .howto-dot{background:${GOLD}}
  .howto-now{margin:.65rem 0 0;font-weight:900;letter-spacing:.07em;text-align:center}
  .advanced-howto{margin-top:.8rem;padding:.8rem;border:1px solid color-mix(in srgb,currentColor 16%,transparent);border-radius:14px;line-height:1.5}
  .advanced-howto strong{display:block;margin-bottom:.25rem}
 `;
 document.head.appendChild(style);

 function visual(kind){
  const rings=`<g fill="none" stroke="${LINE}" stroke-width="2"><circle cx="150" cy="94" r="68"/><circle cx="150" cy="94" r="43"/></g>`;
  if(kind==='green')return `${rings}
   <circle cx="218" cy="94" r="17" fill="${GREEN}" opacity=".16"/><circle cx="218" cy="94" r="9" fill="${GREEN}"/>
   <path d="M222 78 L246 52 H278" fill="none" stroke="${GREEN}" stroke-width="2"/>
   <text x="278" y="46" text-anchor="end" fill="${GREEN}" font-size="15" font-weight="800">YOU</text>
   <text x="150" y="181" text-anchor="middle" fill="#b9c8bd" font-size="13">The ball moves around automatically</text>`;
  if(kind==='tap')return `${rings}
   <circle cx="218" cy="94" r="8" fill="${GREEN}" opacity=".25"/><circle cx="193" cy="94" r="9" fill="${GREEN}"/>
   <path d="M211 84 Q203 70 194 72" fill="none" stroke="#fff" stroke-width="2" stroke-dasharray="4 4"/>
   <path d="M211 94 H199" stroke="${BLUE}" stroke-width="4" stroke-linecap="round"/><path d="M203 88 l-7 6 7 6" fill="none" stroke="${BLUE}" stroke-width="3"/>
   <text x="150" y="178" text-anchor="middle" fill="#fff" font-size="16" font-weight="850">1 TAP = 1 RING</text>`;
  if(kind==='blue')return `${rings}
   <circle cx="218" cy="94" r="9" fill="${GREEN}"/>
   <path d="M188 57 A43 43 0 0 1 193 72" fill="none" stroke="${BLUE}" stroke-width="8" stroke-linecap="round"/>
   <path d="M213 81 Q205 62 193 62" fill="none" stroke="${BLUE}" stroke-width="3"/><path d="M199 57 l-8 5 7 6" fill="none" stroke="${BLUE}" stroke-width="3"/>
   <path d="M207 117 A68 68 0 0 1 214 130" fill="none" stroke="${RED}" stroke-width="11" stroke-linecap="round"/>
   <text x="150" y="181" text-anchor="middle" fill="${BLUE}" font-size="15" font-weight="850">BLUE = SAFE DESTINATION</text>`;
  if(kind==='hold')return `${rings}
   <circle cx="218" cy="94" r="9" fill="${GREEN}"/><path d="M214 77 A68 68 0 0 1 218 94" fill="none" stroke="${BLUE}" stroke-width="8" stroke-linecap="round"/>
   <path d="M190 121 A43 43 0 0 1 181 129" fill="none" stroke="${RED}" stroke-width="11" stroke-linecap="round"/>
   <g transform="translate(150 86)"><rect x="-33" y="-18" width="66" height="36" rx="12" fill="${BG}" stroke="${BLUE}"/><text x="0" y="6" text-anchor="middle" fill="${BLUE}" font-size="16" font-weight="900">HOLD</text></g>
   <text x="150" y="181" text-anchor="middle" fill="#fff" font-size="14" font-weight="800">BLUE IS ALREADY ON YOUR RING → STAY</text>`;
  return `${rings}
   <circle cx="218" cy="94" r="9" fill="${GREEN}"/>
   <path d="M207 117 A68 68 0 0 1 214 130" fill="none" stroke="${RED}" stroke-width="11" stroke-linecap="round"/>
   <path d="M150 43 l8 8 -8 8 -8-8Z" fill="${GOLD}"/><circle cx="150" cy="51" r="14" fill="none" stroke="${GOLD}" stroke-width="2" opacity=".6"/>
   <text x="72" y="166" text-anchor="middle" fill="${RED}" font-size="15" font-weight="900">RED = AVOID</text><text x="228" y="166" text-anchor="middle" fill="${GOLD}" font-size="15" font-weight="900">GOLD = COLLECT</text>`;
 }
 function renderPicture(id,kind,label){
  const svg=$id(id);if(!svg)return;svg.setAttribute('viewBox','0 0 300 190');svg.setAttribute('aria-label',label);svg.innerHTML=visual(kind);
 }
 function colourKey(){
  const key=document.createElement('div');key.className='howto-colour-key';
  key.innerHTML='<span class="howto-you"><i class="howto-dot"></i><b class="kw-green">GREEN</b> = YOU</span><span class="howto-go"><i class="howto-dot"></i><b class="kw-blue">BLUE</b> = GO</span><span class="howto-avoid"><i class="howto-dot"></i><b class="kw-red">RED</b> = AVOID</span><span class="howto-collect"><i class="howto-dot"></i><b class="kw-gold">GOLD</b> = COLLECT</span>';
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

 // Show this improved visual guide once even to players who saw the earlier version.
 try{if(localStorage.getItem(HOWTO_KEY)!=='true')preplaySeen=false;}catch{preplaySeen=false;}
 const originalFinishPreplay=finishPreplay;
 finishPreplay=function(){try{localStorage.setItem(HOWTO_KEY,'true');}catch{}return originalFinishPreplay();};
 showPreplaySlide=function(){
  const slide=slides[Math.max(0,Math.min(slides.length-1,preplaySlide))];
  $id('preplay-title').innerHTML=slide.title;$id('preplay-copy').innerHTML=slide.copy;
  $id('preplay-step').textContent=`${preplaySlide+1} / ${slides.length}`;
  renderPicture('preplay-picture',slide.kind,slide.plainTitle+'. '+$id('preplay-copy').textContent);
  $id('preplay-go').textContent=preplaySlide===slides.length-1?'GOT IT — PLAY':'NEXT';ensurePreplayKey();
 };
 const go=$id('preplay-go');
 go?.addEventListener('click',event=>{
  event.preventDefault();event.stopImmediatePropagation();
  if(preplaySlide<slides.length-1){preplaySlide++;showPreplaySlide();return;}
  finishPreplay();
 },true);
 $id('preplay-skip')?.addEventListener('click',()=>{try{localStorage.setItem(HOWTO_KEY,'true');}catch{}},true);

 // Keep the five guided-practice slots, but make them teach the same five visual rules.
 if(typeof TRAINING!=='undefined'&&Array.isArray(TRAINING)){
  TRAINING.splice(0,TRAINING.length,
   ['GREEN = YOU','The green ball is you. Tap once to see how your ball changes rings.'],
   ['TAP = MOVE ONE RING','One controlled tap moves one ring. Reach the gold spark with one tap.'],
   ['BLUE = GO HERE','Blue shows the safe ring. Move there before the red barrier arrives.'],
   ["HOLD = DON'T TAP",'Blue is already on your ring. Stay there and let red pass on the other ring.'],
   ['RED = AVOID · GOLD = COLLECT','Red is danger. Gold sparks are rewards. Remember the five rules.']
  );
 }
 if(typeof TRAINING_HINTS!=='undefined'&&Array.isArray(TRAINING_HINTS)){
  TRAINING_HINTS.splice(0,TRAINING_HINTS.length,...trainingCards.map(card=>card.hint));
 }
 const originalShowTrainingStep=showTrainingStep;
 showTrainingStep=function(step){
  originalShowTrainingStep(step);step=Math.max(0,Math.min(trainingCards.length-1,step));const card=trainingCards[step];
  $id('training-title').innerHTML=card.title;$id('training-copy').innerHTML=card.copy;
  renderPicture('training-picture',card.kind,card.plain+'. '+$id('training-copy').textContent);
  $id('training-go').textContent=step===trainingCards.length-1?'DONE — BACK TO HOME':'TRY IT';
 };

 // Lesson 4 is a real HOLD exercise: the safe blue ring is the ring you are already on.
 const originalBeginTrainingStep=beginTrainingStep;
 beginTrainingStep=function(){
  const stage=tutorialStage;originalBeginTrainingStep();
  if(stage===3&&roundKind==='tutorial'&&!trainingWaiting){
   shield=0;tutorialShift=false;const stayLane=lane,other=stayLane===0?1:0;
   rows=[{angle:angle+1.35,baseAngle:angle+1.35,sparkLane:stayLane,hazardLanes:[other],hit:false,collected:true,passed:false,open:false,pattern:'classic',locked:true}];
   $id('tutorial-instruction').textContent=trainingCards[3].hint;
  }
 };
 const originalUpdateTutorial=updateTutorial;
 updateTutorial=function(dt){
  if(tutorialStage!==3)return originalUpdateTutorial(dt);
  if(trainingWaiting)return;
  gameTime+=dt;trainingElapsed+=dt;angle+=dt*.6;radius+=(laneRadius(lane)-radius)*(1-Math.exp(-dt*24));updateLanding(dt);
  const row=rows[0];if(!row){updateHUD();return;}
  if(tutorialShift){
   tutorialShift=false;lane=row.sparkLane;radius=laneRadius(lane);landing=null;row.angle=angle+1.35;row.baseAngle=row.angle;
   $id('tutorial-instruction').textContent="HOLD means don't tap. Stay on BLUE and try again.";tone(230,.08,'triangle',.035);updateHUD();return;
  }
  if(row.angle-angle<-.12){completeTrainingLesson(4);return;}
  updateHUD();
 };

 // Rewrite Home help with coloured keywords and a little more explanation.
 const guide=document.querySelector('.game-guide');
 if(guide){
  const intro=guide.querySelector('.guide-intro');if(intro)intro.textContent='Learn the colours first. Everything else builds from these rules.';
  const rules=guide.querySelector('.essential-rules');
  if(rules)rules.innerHTML=`
   <li><strong>${kw('GREEN','green')} = YOU.</strong> Your ball moves around the loop automatically. You choose only the ring.</li>
   <li><strong>TAP = MOVE ONE RING.</strong> One tap moves one ring. Two-ring moves later in the game need two quick taps.</li>
   <li><strong>${kw('BLUE','blue')} = GO.</strong> Blue is the safe destination. Move early enough to finish the shift before danger arrives.</li>
   <li><strong>HOLD = DON'T TAP.</strong> If blue is already on your ring, stay there. An unnecessary tap can move you into danger.</li>
   <li><strong>${kw('RED','red')} = AVOID · ${kw('GOLD','gold')} = COLLECT.</strong> Red/coral bars are danger. Gold sparks are rewards; six build shield charge.</li>`;
  if(!guide.querySelector('.howto-colour-key'))guide.insertBefore(colourKey(),rules?.nextSibling||guide.firstChild);
  let advanced=guide.querySelector('.advanced-howto');if(!advanced){advanced=document.createElement('div');advanced.className='advanced-howto';rules?.insertAdjacentElement('afterend',advanced);}
  advanced.innerHTML='<strong>Later levels use the same language</strong>DOUBLE SHIFT = two quick taps · SWITCH GATE = watch the safe gap move · ATTACK = follow the shown sequence. Fire Ball works the same as before.';
 }

 const hint=$id('tap-anywhere-hint');
 if(hint){const tap=hint.querySelector('.tap-copy'),click=hint.querySelector('.click-copy'),sub=hint.querySelector('span');if(tap)tap.textContent='TAP ONCE = MOVE ONE RING';if(click)click.textContent='CLICK / SPACE = MOVE ONE RING';if(sub)sub.textContent="BLUE = GO · HOLD = DON'T TAP · RED = AVOID";}
 const mobile=document.querySelector('.mobile-hint');if(mobile)mobile.innerHTML=`<span class="legend-orb"></span> <b class="kw-green">YOU</b> &nbsp; <b class="kw-blue">BLUE = GO</b> &nbsp; <b class="kw-red">RED = AVOID</b> &nbsp; <b class="kw-gold">GOLD = COLLECT</b>`;
})();
