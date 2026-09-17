/* Feedback is user-sent email. No messages are posted to a public endpoint. */
(() => {
 try{if(localStorage.getItem('loop-shift-theme')===null)localStorage.setItem('loop-shift-theme','dark');}catch{}
 const el=id=>document.getElementById(id),recipient='giriraman160@gmail.com';let opener=null,draft='';
 function fitViewport(){if(window.visualViewport)el('feedback-dialog').style.setProperty('--feedback-viewport',window.visualViewport.height+'px');}window.visualViewport?.addEventListener('resize',fitViewport);
 function open(event){opener=event.currentTarget;fitViewport();el('feedback-dialog').showModal();el('feedback-close').focus();}for(const id of ['feedback-home','feedback-settings','feedback-result','feedback-progress','feedback-friends','feedback-help'])el(id).addEventListener('click',open);
 function close(){el('feedback-dialog').close();opener?.focus();}el('feedback-close').addEventListener('click',close);el('feedback-dialog').addEventListener('cancel',event=>{event.preventDefault();close();});
 el('feedback-form').addEventListener('submit',event=>{event.preventDefault();const message=el('feedback-message').value.trim();if(message.length<10||message.length>2000){el('feedback-status').textContent='Please enter 10–2,000 characters.';return;}const type=['Bug','Suggestion','Difficulty','Controls / blue guide','Other'].includes(el('feedback-type').value)?el('feedback-type').value:'Other';const context=window.LoopShiftFeedbackContext?.()||{};const subject=`Loop Shift ${type} · v2.3.6`;draft=`${message}\n\nGame: Loop Shift v2.3.6\nLevel: ${context.level||1}\nMode: ${context.mode||'Home'}\nScreen: ${window.innerWidth} × ${window.innerHeight}`;el('feedback-copy').hidden=false;el('feedback-status').textContent='Send the message in your email app to finish. If it does not open, copy your feedback and email it to '+recipient+'.';window.location.href='mailto:'+recipient+'?subject='+encodeURIComponent(subject)+'&body='+encodeURIComponent(draft);});
 el('feedback-copy').addEventListener('click',async()=>{if(!draft)return;const text='To: '+recipient+'\n'+draft;try{if(!navigator.clipboard?.writeText)throw new Error();await navigator.clipboard.writeText(text);el('feedback-status').textContent='Copied. Paste it into an email to '+recipient+'.';}catch{el('feedback-fallback').value=text;el('feedback-fallback').hidden=false;el('feedback-fallback').focus();el('feedback-fallback').select();}});
})();

/* Special collectibles: keep them reachable, quick to read and out of Fire Ball. */
(() => {
 const $id=id=>document.getElementById(id);
 const SPECIALS={gem:{name:'PURPLE GEM',points:100,color:'#b77cff',unlock:1,shape:'diamond'},star:{name:'CYAN STAR',points:250,color:'#61e9ff',unlock:11,shape:'star'},crown:{name:'GOLDEN CROWN',points:500,color:'#ffd76a',unlock:21,shape:'crown'}};
 const zones=['FOUNDATION','RHYTHM','CHOICE','FLOW','PRECISION','PRESSURE','MASTERY','FOCUS','VELOCITY','FINAL LOOP'];
 const SPECIAL_LEAD=.24,SPECIAL_WINDOW=.95,COLLECT_WINDOW=.12;
 let lastLevel=0,lastBreak=false,serial=0;
 const seen=new WeakSet(),bursts=[];
 const stats={gem:0,star:0,crown:0};
 try{Object.assign(stats,JSON.parse(localStorage.getItem('loop-shift-specials-v1')||'{}'));}catch{}
 const style=document.createElement('style');style.textContent=`.special-coin-layer{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:5}.difficulty-pulse{position:fixed;left:50%;bottom:max(18px,env(safe-area-inset-bottom));transform:translateX(-50%);z-index:80;background:#15201c;color:#f5f7f6;border:1px solid #53655d;border-radius:18px;padding:12px 14px;width:min(92vw,430px);box-shadow:0 14px 42px #0008}.difficulty-pulse div{display:flex;gap:8px}.difficulty-pulse button{flex:1;min-height:42px}`;document.head.appendChild(style);
 const gameCanvas=$id('game'),layer=document.createElement('canvas');layer.className='special-coin-layer';layer.setAttribute('aria-hidden','true');if(gameCanvas?.parentElement){const parent=gameCanvas.parentElement;if(getComputedStyle(parent).position==='static')parent.style.position='relative';parent.appendChild(layer);}const lctx=layer.getContext('2d');
 const rushActive=()=>((typeof rushTime!=='undefined'&&rushTime>0)||window.LoopShiftFirePowerActive?.());
 const specialAngle=row=>row.angle-SPECIAL_LEAD;
 function specialForLevel(lvl){const roll=(serial*37+lvl*17)%100;if(lvl>=21&&roll<16)return'crown';if(lvl>=11&&roll<48)return'star';return'gem';}
 // The normal spark lane is guaranteed open at this barrier. Never place a special
 // on bonusLane here because that optional lane can still be the blocker lane while
 // the row is being prepared.
 function chooseLane(row){return Number.isInteger(row.sparkLane)?row.sparkLane:(Number.isInteger(row.bonusLane)?row.bonusLane:0);}
 function assignSpecials(){if(typeof rows==='undefined'||typeof level==='undefined'||roundKind!=='endless'||rushActive())return;for(const row of rows){if(seen.has(row))continue;seen.add(row);serial++;if(serial%7!==0)continue;const type=specialForLevel(level),def=SPECIALS[type];if(level<def.unlock)continue;row.specialType=type;row.specialLane=chooseLane(row);row.specialCollected=false;row.specialResolved=false;}}
 function burst(row,def){const p=point(specialAngle(row),laneRadius(row.specialLane));bursts.push({x:p.x,y:p.y,color:def.color,born:performance.now(),type:row.specialType});}
 function collectSpecial(row){const def=SPECIALS[row.specialType];if(!def)return;row.specialCollected=true;row.specialResolved=true;score+=def.points;stats[row.specialType]=(stats[row.specialType]||0)+1;try{localStorage.setItem('loop-shift-specials-v1',JSON.stringify(stats));}catch{}burst(row,def);showEffect(`+${def.points} · ${def.name}`,row.specialType==='crown'?'fever':'perfect');tone(row.specialType==='crown'?1180:row.specialType==='star'?980:820,.13,'sine',.09);vibrate(row.specialType==='crown'?[15,20,15]:14);updateHUD();}
 // Resolve at the collectible itself, before the red blocker reaches the ball. This
 // removes the old wait-until-row-passed delay and makes collection feel immediate.
 function resolveSpecials(){if(typeof rows==='undefined'||typeof radius==='undefined'||rushActive())return;for(const row of rows){if(!row.specialType||row.specialResolved)continue;const delta=angle-specialAngle(row);if(delta<-.055)continue;if(delta<=COLLECT_WINDOW&&Math.abs(radius-laneRadius(row.specialLane))<.04){collectSpecial(row);continue;}if(delta>COLLECT_WINDOW)row.specialResolved=true;}}
 function drawShape(c,x,y,r,type,rotation=0){c.save();c.translate(x,y);c.rotate(rotation);c.beginPath();if(type==='diamond'){c.moveTo(0,-r);c.lineTo(r*.8,0);c.lineTo(0,r);c.lineTo(-r*.8,0);c.closePath();}else if(type==='star'){for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,rr=i%2?r*.45:r;c.lineTo(Math.cos(a)*rr,Math.sin(a)*rr);}c.closePath();}else{c.moveTo(-r,-r*.2);c.lineTo(-r*.7,r*.65);c.lineTo(r*.7,r*.65);c.lineTo(r,r*.2);c.lineTo(r*.45,-r*.35);c.lineTo(0,r*.05);c.lineTo(-r*.45,-r*.35);c.closePath();}c.fill();c.stroke();c.restore();}
 function renderSpecials(){if(!gameCanvas||!lctx)return;const rect=gameCanvas.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,2),scale=rect.width/(typeof size==='number'&&size?size:rect.width);if(layer.width!==Math.round(rect.width*dpr)||layer.height!==Math.round(rect.height*dpr)){layer.width=Math.round(rect.width*dpr);layer.height=Math.round(rect.height*dpr);layer.style.width=rect.width+'px';layer.style.height=rect.height+'px';lctx.setTransform(dpr,0,0,dpr,0,0);}lctx.clearRect(0,0,rect.width,rect.height);if(typeof mode==='undefined'||mode!=='playing'||rushActive())return;const now=performance.now();for(const row of rows){if(!row.specialType||row.specialCollected||row.specialResolved)continue;const target=specialAngle(row),seconds=(target-angle)/Math.max(.01,speedNow());if(seconds>SPECIAL_WINDOW||seconds<-.16)continue;const def=SPECIALS[row.specialType],p=point(target,laneRadius(row.specialLane)),x=p.x*scale,y=p.y*scale,near=Math.max(0,1-Math.max(0,seconds)/SPECIAL_WINDOW),pulse=1+.11*near+.08*Math.sin(now*.034),r=Math.max(8,rect.width*.022)*pulse;lctx.save();lctx.globalAlpha=.95;lctx.strokeStyle=def.color;lctx.lineWidth=2+near*1.5;lctx.beginPath();lctx.arc(x,y,r*(1.35+near*.35),0,Math.PI*2);lctx.stroke();lctx.shadowColor=def.color;lctx.shadowBlur=10+near*22;lctx.fillStyle=def.color;lctx.strokeStyle='#fff';lctx.lineWidth=1.5;drawShape(lctx,x,y,r,def.shape,row.specialType==='gem'?now*.006:0);lctx.restore();}for(let i=bursts.length-1;i>=0;i--){const b=bursts[i],age=(now-b.born)/360;if(age>=1){bursts.splice(i,1);continue;}const x=b.x*scale,y=b.y*scale;lctx.save();lctx.strokeStyle=b.color;lctx.fillStyle=b.color;lctx.globalAlpha=1-age;lctx.lineWidth=2.5;lctx.beginPath();lctx.arc(x,y,10+age*38,0,Math.PI*2);lctx.stroke();for(let n=0;n<8;n++){const a=n*Math.PI/4,rr=10+age*46;lctx.beginPath();lctx.arc(x+Math.cos(a)*rr,y+Math.sin(a)*rr,2.4*(1-age)+.8,0,Math.PI*2);lctx.fill();}lctx.restore();}}
 function zoneMoment(){if(typeof level==='undefined'||level===lastLevel)return;lastLevel=level;if((level-1)%10===0){const z=Math.min(9,Math.floor((level-1)/10));showEffect(`ZONE ${z+1} · ${zones[z]}`,'fever');}if(level%10===0)showEffect(`MILESTONE LEVEL ${level}`,'fever');}
 function askDifficulty(){if(document.querySelector('.difficulty-pulse'))return;const box=document.createElement('aside');box.className='difficulty-pulse';box.innerHTML='<p>How did that checkpoint feel?</p><div><button data-v="easy">Too easy</button><button data-v="right">Just right</button><button data-v="hard">Too hard</button></div>';box.addEventListener('click',e=>{const v=e.target?.dataset?.v;if(!v)return;try{const key='loop-shift-difficulty-v1',all=JSON.parse(localStorage.getItem(key)||'[]');all.push({level,value:v,time:Date.now()});localStorage.setItem(key,JSON.stringify(all.slice(-50)));}catch{}box.remove();});document.body.appendChild(box);setTimeout(()=>box.remove(),12000);}
 function checkpointPulse(){const now=typeof breakPending!=='undefined'&&breakPending&&typeof checkpointEligible!=='undefined'&&checkpointEligible;if(now&&!lastBreak)askDifficulty();lastBreak=now;}
 function addGuide(){const list=document.querySelector('.essential-rules');if(!list||document.getElementById('special-coin-guide'))return;const li=document.createElement('li');li.id='special-coin-guide';li.innerHTML='<strong>Special collectibles.</strong> Purple gem <b>+100</b>, cyan star <b>+250</b>, golden crown <b>+500</b>. They appear briefly on the safe route before a barrier and stay hidden during Fire Ball.';list.appendChild(li);}
 addGuide();function frame(){try{assignSpecials();resolveSpecials();zoneMoment();checkpointPulse();renderSpecials();}catch(error){console.warn('Loop Shift engagement layer:',error);}requestAnimationFrame(frame);}requestAnimationFrame(frame);
})();

/* Faster normal level handoff. Gameplay speed and checkpoint rests are unchanged. */
(() => {
 const originalLevelUp=levelUp,originalUpdateLevelTransition=updateLevelTransition;
 levelUp=function(next){const result=originalLevelUp(next);levelBannerTime=Math.min(levelBannerTime,.72);if(mode==='playing'&&!breakPending&&!ringLessonPending&&roundKind!=='tutorial'){rows=[];nextRowIndex=passes;prepareRhythm(1.25,true);rememberSegment();}return result;};
 updateLevelTransition=function(dt){return originalUpdateLevelTransition(dt*1.9);};
})();

/* Tap follows blue when blue recommends a different ring. */
(() => {const originalShift=shift;shift=function(direction=0){if(trainingWaiting||screen!=='game'||mode!=='playing'||startDelay>0||gameTime-lastShift<.055)return;if(direction){if(gameTime-lastShift<.095)lastShift=gameTime-.096;return originalShift(direction);}const blue=guidedTarget();let step;if(blue!==lane)step=Math.sign(blue-lane);else{step=shiftDirection<0?-1:1;if(lane<=0)step=1;else if(lane>=ringCount-1)step=-1;}if(gameTime-lastShift<.095)lastShift=gameTime-.096;return originalShift(step);};const guide=$('guide-status');function guideText(){if(guide){const target=guidedTarget();guide.textContent=target===lane?'BLUE GUIDE · Safe ring':'BLUE GUIDE · Ring '+(target+1);}$('shift')?.setAttribute('aria-label','Tap to shift. Follow the blue guide.');requestAnimationFrame(guideText);}requestAnimationFrame(guideText);})();

/* Classic score sync: server mainBest is the canonical 100-level best. */
(() => {let busy=false,last=0;async function sync(force=false){if(busy||(!force&&Date.now()-last<5000))return;busy=true;last=Date.now();try{const response=await fetch('./api/leaderboard',{credentials:'same-origin',cache:'no-store'});if(!response.ok)return;const data=await response.json(),me=data?.me;if(!me)return;const best=Number.isSafeInteger(me.mainBest)?me.mainBest:Number.isSafeInteger(me.best)?me.best:null;if(best==null)return;const home=$('home-best');if(home)home.textContent=best.toLocaleString();const note=$('home-best-note');if(note)note.textContent='Saved online';if($('board-endless')?.getAttribute('aria-pressed')==='true'){const score=$('standing-score');if(score)score.textContent=best.toLocaleString();const rank=$('standing-rank');if(rank)rank.textContent=me.rank?'#'+me.rank:'—';const medal=$('standing-medal');if(medal)medal.textContent=me.rank===1?'🏆':me.rank===2?'🥈':me.rank===3?'🥉':'';}}catch{}finally{busy=false;}}window.addEventListener('pageshow',()=>sync(true));document.addEventListener('visibilitychange',()=>{if(!document.hidden)sync(true);});$('nav-play')?.addEventListener('click',()=>setTimeout(()=>sync(true),0));$('nav-progress')?.addEventListener('click',()=>setTimeout(()=>sync(true),0));$('board-endless')?.addEventListener('click',()=>setTimeout(()=>sync(true),80));$('refresh-board')?.addEventListener('click',()=>setTimeout(()=>sync(true),400));setInterval(()=>sync(false),10000);sync(true);})();

/* Manual Fire Ball: charge it, choose when to activate it, and keep normal barriers in play. */
(() => {
 if(typeof startRush!=='function'||typeof update!=='function'||typeof updateRushHUD!=='function'||typeof updateHUD!=='function'||typeof collect!=='function'||typeof start!=='function'||typeof crash!=='function')return;
 const FIRE_SECONDS=4,SMASH_COST=.65,SPEED_BOOST=1.12;
 let fireTime=0,fireReady=false;
 const originalUpdate=update,originalUpdateHUD=updateHUD,originalCollect=collect,originalStart=start,originalCrash=crash;
 const status=$('rush-status');
 const button=document.createElement('button');
 button.id='fire-activate';button.type='button';button.className='fire-activate';button.hidden=true;button.textContent='ACTIVATE FIRE BALL 🔥';
 status?.insertAdjacentElement('afterend',button);
 const style=document.createElement('style');style.textContent=`.fire-activate{display:block;margin:.45rem auto .25rem;min-height:44px;padding:.62rem 1rem;border:1px solid #ffbd70;border-radius:999px;background:#5a2c14;color:#fff3dd;font:inherit;font-weight:900;letter-spacing:.04em;box-shadow:0 0 22px #ff8a3d55}.fire-activate[hidden]{display:none}.fire-activate:active{transform:scale(.98)}body[data-fire-power="active"] .special-coin-layer{visibility:hidden}`;document.head.appendChild(style);
 if($('fire-speed-toggle'))$('fire-speed-toggle').hidden=true;
 window.LoopShiftFirePowerActive=()=>fireTime>0;
 function syncFireUI(){
  document.body.dataset.firePower=fireTime>0?'active':fireReady?'ready':'charging';
  if(status)status.textContent=fireTime>0?`🔥 FIRE BALL · ${fireTime.toFixed(1)}s · hit = −0.7s`:fireReady?'🔥 FIRE BALL READY · Choose your moment':`🔥 Fire Ball charge · ${rushChain}/3`;
  button.hidden=!fireReady||fireTime>0||mode!=='playing';button.disabled=startDelay>0;
  const compact=$('compact-power');if(compact)compact.textContent=fireTime>0?`Fire Ball ${fireTime.toFixed(1)}s · clean ×2 / perfect ×3`:fireReady?'Fire Ball READY':`Fire Ball ${rushChain}/3`;
 }
 function armFire(){
  if(fireReady||fireTime>0)return;
  fireReady=true;rushQueued=true;rushChain=0;rushTime=0;rushCoins=[];
  showEffect('FIRE BALL READY 🔥','perfect');toast('Fire Ball ready · activate when you choose');tone(740,.12,'triangle',.06);setTimeout(()=>tone(980,.16,'sine',.06),90);syncFireUI();
 }
 function endFire(message=true){
  if(fireTime<=0&&document.body.dataset.firePower!=='active')return;
  fireTime=0;rushGlow=0;rushTime=0;rushCoins=[];window.LoopShiftMusic?.setRush?.(false);invulnerable=.18;
  if(message){showEffect('FIRE BALL COMPLETE','perfect');toast('Fire Ball complete · build another charge');}
  syncFireUI();
 }
 function activateFire(event){
  event?.preventDefault?.();event?.stopPropagation?.();
  if(!fireReady||fireTime>0||mode!=='playing'||startDelay>0)return;
  fireReady=false;rushQueued=false;rushChain=0;rushTime=0;rushCoins=[];fireTime=FIRE_SECONDS;rushGlow=1;trail=[];
  window.LoopShiftMusic?.setRush?.(true);showEffect('FIRE BALL · ACTIVE 🔥','fever');toast('Dodge to preserve power · smashing a barrier costs 0.7s');tone(180,.18,'triangle',.05,720);vibrate([18,25,18]);syncFireUI();
 }
 button.addEventListener('pointerdown',event=>event.stopPropagation());button.addEventListener('click',activateFire);
 window.addEventListener('keydown',event=>{if(event.key?.toLowerCase()!=='f'||event.repeat||event.target?.matches?.('input,textarea,select,button'))return;if(fireReady){event.preventDefault();activateFire(event);}});
 startRush=function(){if(fireTime>0){rushQueued=false;rushChain=0;return;}armFire();};
 updateRushHUD=function(){syncFireUI();};
 updateHUD=function(){const result=originalUpdateHUD();syncFireUI();return result;};
 collect=function(row){const before=rushChain,result=originalCollect(row);if(row?.special&&(fireReady||fireTime>0)){rushChain=fireReady?0:before;rushQueued=fireReady;syncFireUI();}return result;};
 start=function(options){fireTime=0;fireReady=false;document.body.dataset.firePower='charging';window.LoopShiftMusic?.setRush?.(false);const result=originalStart(options);syncFireUI();return result;};
 crash=function(...args){fireTime=0;fireReady=false;rushQueued=false;rushGlow=0;window.LoopShiftMusic?.setRush?.(false);const result=originalCrash(...args);syncFireUI();return result;};
 update=function(dt){
  if(rushTime>0&&fireTime<=0){rushTime=0;rushCoins=[];armFire();}
  const active=fireTime>0&&mode==='playing';
  const snapshots=active?rows.map(row=>({row,passed:row.passed,hit:row.hit,perfect:!!row.perfectAwarded})):[];
  const baseSpeed=motionSpeed;
  if(active){motionSpeed=baseSpeed*SPEED_BOOST;invulnerable=Math.max(invulnerable,1);rushGlow=1;}
  const result=originalUpdate(dt);
  if(active){
   const naturalTarget=targetSpeed();motionSpeed=naturalTarget+(baseSpeed-naturalTarget)*Math.exp(-dt*.8);
   let smashes=0,clean=0,perfect=0;
   for(const before of snapshots){
    if(!before.hit&&before.row.hit){before.row.fireDestroyed=true;smashes++;burst(before.row.angle,laneRadius(before.row.hazardLane),'#ff9a4d',22);}
    if(!before.passed&&before.row.passed&&!before.row.hit){clean++;if(before.row.perfectAwarded&&!before.perfect)perfect++;}
   }
   if(clean){const factor=scoreFactor(),bonus=factor*clean+factor*perfect;score+=bonus;if(perfect)showEffect(`FIRE PERFECT ×3 · +${bonus}`,'perfect');updateHUD();}
   fireTime=Math.max(0,fireTime-dt-smashes*SMASH_COST);
   if(smashes){showEffect(`FIRE SMASH · −${(smashes*SMASH_COST).toFixed(1)}s`,'close');tone(240,.08,'triangle',.05,620);vibrate(18);}
   if(fireTime>0){invulnerable=Math.max(invulnerable,.3);rushGlow=1;window.LoopShiftMusic?.setRush?.(true);}else endFire(true);
  }
  syncFireUI();return result;
 };
 const list=document.querySelector('.essential-rules');if(list&&!document.getElementById('fire-ball-guide')){const li=document.createElement('li');li.id='fire-ball-guide';li.innerHTML='<strong>Fire Ball is your choice.</strong> Collect 3 orange power sparks to arm it, then tap <b>ACTIVATE FIRE BALL</b>. It lasts 4 seconds: clean barriers score ×2, perfect timing scores ×3, and smashing a red barrier costs 0.7 seconds instead of ending the run.';list.appendChild(li);}
 syncFireUI();
})();
