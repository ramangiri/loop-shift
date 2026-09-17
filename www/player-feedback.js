/* Feedback is user-sent email. No messages are posted to a public endpoint. */
(() => {
 const el=id=>document.getElementById(id),recipient='giriraman160@gmail.com';
 let opener=null,draft='';
 function fitViewport(){if(window.visualViewport)el('feedback-dialog').style.setProperty('--feedback-viewport',window.visualViewport.height+'px');}
 window.visualViewport?.addEventListener('resize',fitViewport);
 function open(event){opener=event.currentTarget;fitViewport();el('feedback-dialog').showModal();el('feedback-close').focus();}
 for(const id of ['feedback-home','feedback-settings','feedback-result','feedback-progress','feedback-friends','feedback-help'])el(id).addEventListener('click',open);
 function close(){el('feedback-dialog').close();opener?.focus();}
 el('feedback-close').addEventListener('click',close);
 el('feedback-dialog').addEventListener('cancel',event=>{event.preventDefault();close();});
 el('feedback-form').addEventListener('submit',event=>{
  event.preventDefault();const message=el('feedback-message').value.trim();
  if(message.length<10||message.length>2000){el('feedback-status').textContent='Please enter 10–2,000 characters.';return;}
  const type=['Bug','Suggestion','Difficulty','Controls / blue guide','Other'].includes(el('feedback-type').value)?el('feedback-type').value:'Other';
  const context=window.LoopShiftFeedbackContext?.()||{};
  const subject=`Loop Shift ${type} · v2.3.3`;
  draft=`${message}\n\nGame: Loop Shift v2.3.3\nLevel: ${context.level||1}\nMode: ${context.mode||'Home'}\nScreen: ${window.innerWidth} × ${window.innerHeight}`;
  el('feedback-copy').hidden=false;
  el('feedback-status').textContent='Send the message in your email app to finish. If it does not open, copy your feedback and email it to '+recipient+'.';
  window.location.href='mailto:'+recipient+'?subject='+encodeURIComponent(subject)+'&body='+encodeURIComponent(draft);
 });
 el('feedback-copy').addEventListener('click',async()=>{
  if(!draft)return;const text='To: '+recipient+'\n'+draft;
  try{if(!navigator.clipboard?.writeText)throw new Error();await navigator.clipboard.writeText(text);el('feedback-status').textContent='Copied. Paste it into an email to '+recipient+'.';}
  catch{el('feedback-fallback').value=text;el('feedback-fallback').hidden=false;el('feedback-fallback').focus();el('feedback-fallback').select();}
 });
})();

/* Gameplay engagement layer: optional special collectibles, 10-level identities and
   lightweight checkpoint difficulty feedback. Kept separate from the safe blue route. */
(() => {
 const $id=id=>document.getElementById(id);
 const SPECIALS={
  gem:{name:'PURPLE GEM',points:100,color:'#b77cff',unlock:1,shape:'diamond'},
  star:{name:'CYAN STAR',points:250,color:'#61e9ff',unlock:11,shape:'star'},
  crown:{name:'GOLDEN CROWN',points:500,color:'#ffd76a',unlock:21,shape:'crown'}
 };
 const zones=['FOUNDATION','RHYTHM','CHOICE','FLOW','PRECISION','PRESSURE','MASTERY','FOCUS','VELOCITY','FINAL LOOP'];
 let lastLevel=0,lastBreak=false,serial=0;
 const seen=new WeakSet();
 const stats={gem:0,star:0,crown:0};
 try{Object.assign(stats,JSON.parse(localStorage.getItem('loop-shift-specials-v1')||'{}'));}catch{}
 const style=document.createElement('style');
 style.textContent=`.special-coin-layer{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:5}.special-coin-legend{margin:.7rem 0;padding:.75rem;border:1px solid color-mix(in srgb,currentColor 18%,transparent);border-radius:14px;font-size:.86rem;line-height:1.45}.special-coin-legend strong{display:block;margin-bottom:.3rem}.special-coin-legend span{white-space:nowrap}.difficulty-pulse{position:fixed;left:50%;bottom:max(18px,env(safe-area-inset-bottom));transform:translateX(-50%);z-index:80;background:#15201c;color:#f5f7f6;border:1px solid #53655d;border-radius:18px;padding:12px 14px;width:min(92vw,430px);box-shadow:0 14px 42px #0008}.difficulty-pulse p{margin:0 0 9px;font-weight:700}.difficulty-pulse div{display:flex;gap:8px}.difficulty-pulse button{flex:1;min-height:42px;border-radius:12px;border:1px solid #71877c;background:#1d2a24;color:inherit;font:inherit}.difficulty-pulse button:active{transform:scale(.98)}`;
 document.head.appendChild(style);
 const gameCanvas=$id('game');const layer=document.createElement('canvas');layer.className='special-coin-layer';layer.setAttribute('aria-hidden','true');
 if(gameCanvas?.parentElement){const parent=gameCanvas.parentElement;if(getComputedStyle(parent).position==='static')parent.style.position='relative';parent.appendChild(layer);}const lctx=layer.getContext('2d');
 function specialForLevel(lvl){const roll=(serial*37+lvl*17)%100;if(lvl>=21&&roll<16)return 'crown';if(lvl>=11&&roll<48)return 'star';return 'gem';}
 function chooseLane(row){return Number.isInteger(row.bonusLane)?row.bonusLane:row.sparkLane;}
 function assignSpecials(){if(typeof rows==='undefined'||typeof level==='undefined'||roundKind!=='endless')return;for(const row of rows){if(seen.has(row))continue;seen.add(row);serial++;if(serial%7!==0)continue;const type=specialForLevel(level),def=SPECIALS[type];if(level<def.unlock)continue;row.specialType=type;row.specialLane=chooseLane(row);row.specialCollected=false;row.specialResolved=false;}}
 function collectSpecial(row){const def=SPECIALS[row.specialType];if(!def)return;row.specialCollected=true;row.specialResolved=true;score+=def.points;stats[row.specialType]=(stats[row.specialType]||0)+1;try{localStorage.setItem('loop-shift-specials-v1',JSON.stringify(stats));}catch{}showEffect(`+${def.points} · ${def.name}`,row.specialType==='crown'?'fever':'perfect');tone(row.specialType==='crown'?1180:row.specialType==='star'?980:820,.18,'sine',.08);vibrate(row.specialType==='crown'?[18,28,18]:18);updateHUD();}
 function resolveSpecials(){if(typeof rows==='undefined'||typeof lane==='undefined')return;for(const row of rows){if(!row.specialType||row.specialResolved||!row.passed)continue;row.specialResolved=true;if(lane===row.specialLane)collectSpecial(row);}}
 function drawShape(c,x,y,r,type){c.save();c.translate(x,y);c.beginPath();if(type==='diamond'){c.moveTo(0,-r);c.lineTo(r*.8,0);c.lineTo(0,r);c.lineTo(-r*.8,0);c.closePath();}else if(type==='star'){for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,rr=i%2?r*.45:r;c.lineTo(Math.cos(a)*rr,Math.sin(a)*rr);}c.closePath();}else{c.moveTo(-r,-r*.2);c.lineTo(-r*.7,r*.65);c.lineTo(r*.7,r*.65);c.lineTo(r,r*.2);c.lineTo(r*.45,-r*.35);c.lineTo(0,r*.05);c.lineTo(-r*.45,-r*.35);c.closePath();}c.fill();c.stroke();c.restore();}
 function renderSpecials(){if(!gameCanvas||!lctx)return;const rect=gameCanvas.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,2);if(layer.width!==Math.round(rect.width*dpr)||layer.height!==Math.round(rect.height*dpr)){layer.width=Math.round(rect.width*dpr);layer.height=Math.round(rect.height*dpr);layer.style.width=rect.width+'px';layer.style.height=rect.height+'px';lctx.setTransform(dpr,0,0,dpr,0,0);}lctx.clearRect(0,0,rect.width,rect.height);if(typeof mode==='undefined'||mode!=='playing'||typeof rows==='undefined')return;const scale=rect.width/(typeof size==='number'&&size?size:rect.width);for(const row of rows){if(!row.specialType||row.specialCollected||row.passed)continue;const def=SPECIALS[row.specialType];if(!def)continue;const p=point(row.angle,laneRadius(row.specialLane));const x=p.x*scale,y=p.y*scale,r=Math.max(7,rect.width*.022);lctx.save();lctx.shadowColor=def.color;lctx.shadowBlur=14;lctx.fillStyle=def.color;lctx.strokeStyle='#ffffff';lctx.lineWidth=1.5;drawShape(lctx,x,y,r,def.shape);lctx.restore();}}
 function zoneMoment(){if(typeof level==='undefined'||level===lastLevel)return;lastLevel=level;if((level-1)%10===0){const z=Math.min(9,Math.floor((level-1)/10));showEffect(`ZONE ${z+1} · ${zones[z]}`,'fever');}if(level%10===0)showEffect(`MILESTONE LEVEL ${level}`,'fever');}
 function askDifficulty(){if(document.querySelector('.difficulty-pulse'))return;const box=document.createElement('aside');box.className='difficulty-pulse';box.setAttribute('role','dialog');box.setAttribute('aria-label','Difficulty feedback');box.innerHTML='<p>How did that checkpoint feel?</p><div><button data-v="easy">Too easy</button><button data-v="right">Just right</button><button data-v="hard">Too hard</button></div>';box.addEventListener('click',e=>{const v=e.target?.dataset?.v;if(!v)return;try{const key='loop-shift-difficulty-v1',all=JSON.parse(localStorage.getItem(key)||'[]');all.push({level:typeof level==='number'?level:0,value:v,time:Date.now()});localStorage.setItem(key,JSON.stringify(all.slice(-50)));}catch{}box.remove();});document.body.appendChild(box);setTimeout(()=>box.remove(),12000);}
 function checkpointPulse(){const now=typeof breakPending!=='undefined'&&breakPending&&typeof checkpointEligible!=='undefined'&&checkpointEligible;if(now&&!lastBreak)askDifficulty();lastBreak=now;}
 function addGuide(){const list=document.querySelector('.essential-rules');if(!list||document.getElementById('special-coin-guide'))return;const li=document.createElement('li');li.id='special-coin-guide';li.innerHTML='<strong>Choose special collectibles.</strong> Purple gem <b>+100</b>, cyan star <b>+250</b>, golden crown <b>+500</b>. They are optional: missing one costs nothing, and the blue guide always prioritises survival.';list.appendChild(li);const legend=document.createElement('div');legend.className='special-coin-legend';legend.innerHTML='<strong>SPECIAL COLLECTIBLES</strong><span>◆ Purple Gem +100</span> · <span>★ Cyan Star +250</span> · <span>♛ Golden Crown +500</span><br><small>Gem from Level 1 · Star from Level 11 · Crown from Level 21</small>';list.parentElement.appendChild(legend);}
 addGuide();function frame(){try{assignSpecials();resolveSpecials();zoneMoment();checkpointPulse();renderSpecials();}catch(error){console.warn('Loop Shift engagement layer:',error);}requestAnimationFrame(frame);}requestAnimationFrame(frame);
})();