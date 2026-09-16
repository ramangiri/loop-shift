/* Replay stores only a bounded visual history, never a second live game. */
(() => {
  const el=id=>document.getElementById(id),TAU=Math.PI*2;
  let frames=[],result=null,loss=null,raf=null,card=null,cardUrl=null,generation=0;
  function stop(){if(raf!==null)cancelAnimationFrame(raf);raf=null;}
  function reset(){
    generation++;stop();frames=[];result=null;loss=null;card=null;
    if(cardUrl)URL.revokeObjectURL(cardUrl);cardUrl=null;
    for(const id of ['result-extras','replay-panel','card-preview','card-share','card-download'])el(id).hidden=true;
    el('replay-panel').open=false;el('card-panel').open=false;el('card-status').textContent='';el('card-create').disabled=false;
  }
  const wantsFrame=time=>!frames.length||time-frames.at(-1).time>=1/30-1e-6;
  function capture(frame,force=false){
    if(!force&&!wantsFrame(frame.time))return;
    frames.push(frame);while(frames.length>92||frames.length>1&&frames[1].time<frame.time-3)frames.shift();
  }
  function finish(data,hit){
    stop();result={...data};loss=hit;
    el('result-extras').hidden=false;el('replay-panel').hidden=!hit||frames.length<2;
    el('card-share').hidden=false;
    el('card-game-link').href=data.url;el('card-game-link').textContent='Invite friends to play ↗';
    if(hit&&frames.length){paint(frames.at(-1),true);el('replay-caption').textContent=`Last ${Math.min(3,frames.at(-1).time-frames[0].time).toFixed(1)} seconds · Half speed`;} 
  }
  function paint(frame,highlight=false){
    const canvas=el('replay-canvas'),ctx=canvas.getContext('2d'),size=640;
    ctx.clearRect(0,0,size,size);ctx.fillStyle='#0c1915';ctx.fillRect(0,0,size,size);ctx.lineCap='round';
    const arc=(r,a,b,color,width)=>{ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();ctx.arc(320,320,r*size,a,b);ctx.stroke();};
    for(const r of frame.radii){arc(r,0,TAU,'#254036',15);arc(r,0,TAU,'#5b7364',1);}
    for(const row of frame.rows){
      if(row.angle-frame.angle>TAU-.45||row.angle-frame.angle<-.5)continue;
      for(const lane of row.hazards){if(frame.radii[lane]===undefined)continue;ctx.setLineDash(row.open?[4,6]:[]);arc(frame.radii[lane],row.angle-.065,row.angle+.065,row.open?'#93b9a9':'#ff8a75',row.open?3:14);}
      ctx.setLineDash([]);
      if(!row.collected){const r=frame.radii[row.safe];ctx.fillStyle='#f5dc88';ctx.beginPath();ctx.arc(320+Math.cos(row.angle)*r*size,320+Math.sin(row.angle)*r*size,5,0,TAU);ctx.fill();}
    }
    const x=320+Math.cos(frame.angle)*frame.radius*size,y=320+Math.sin(frame.angle)*frame.radius*size;
    ctx.fillStyle=frame.color;ctx.beginPath();ctx.arc(x,y,8,0,TAU);ctx.fill();
    for(let i=0;i<frame.shield;i++){ctx.strokeStyle='#d6ff62';ctx.lineWidth=2;ctx.beginPath();ctx.arc(x,y,15+i*6,0,TAU);ctx.stroke();}
    if(highlight&&loss){
      const safe=frame.radii[loss.safe],hit=frame.radii[loss.lane];
      if(safe!==undefined){arc(safe,0,TAU,'#83f5c0',4);ctx.font='bold 22px Arial';ctx.textAlign='center';ctx.fillStyle='#83f5c0';ctx.fillText(`SAFE: RING ${loss.safe+1}`,320,300);}
      if(hit!==undefined){arc(hit,loss.angle-.11,loss.angle+.11,'#fff8ef',22);arc(hit,loss.angle-.07,loss.angle+.07,'#ff776d',14);}
      ctx.font='18px Arial';ctx.fillStyle='#d9e6dc';ctx.textAlign='center';ctx.fillText('Count rings from the centre',320,335);
    }
  }
  function playReplay(){
    if(!loss||frames.length<2)return;stop();el('replay-panel').open=true;
    const beginning=performance.now(),from=Math.max(frames[0].time,frames.at(-1).time-3),end=frames.at(-1).time;
    const tick=now=>{
      const time=Math.min(end,from+(now-beginning)/2000);let index=frames.findIndex(f=>f.time>=time);if(index<0)index=frames.length-1;
      const b=frames[index],a=frames[Math.max(0,index-1)],mix=b.time===a.time?1:Math.max(0,Math.min(1,(time-a.time)/(b.time-a.time)));
      paint({...b,angle:a.angle+(b.angle-a.angle)*mix,radius:a.radius+(b.radius-a.radius)*mix},time>=end-.3);
      if(time<end)raf=requestAnimationFrame(tick);else{raf=null;el('replay-caption').textContent='White/coral: collision · Mint: safe ring';}
    };raf=requestAnimationFrame(tick);
  }
  async function createCard(){
    if(!result||el('card-create').disabled)return;const version=generation,data={...result};el('card-create').disabled=true;el('card-status').textContent='Creating your card…';
    try{
      if(document.fonts?.ready)await document.fonts.ready;
      if(version!==generation)return;
      const canvas=document.createElement('canvas');canvas.width=960;canvas.height=1200;const ctx=canvas.getContext('2d');
      ctx.fillStyle='#0b1712';ctx.fillRect(0,0,960,1200);
      for(let i=0;i<6;i++){ctx.strokeStyle=i%2?'#83f5c025':'#d6ff6230';ctx.lineWidth=18;ctx.beginPath();ctx.arc(900,260,120+i*67,0,TAU);ctx.stroke();}
      ctx.fillStyle='#d6ff62';ctx.fillRect(56,62,8,80);
      const text=(value,x,y,max,size,color='#eff8e8',arcade=true)=>{ctx.fillStyle=color;do{ctx.font=`${arcade?'800':'600'} ${size--}px ${arcade?'LoopArcade,':''}Arial,sans-serif`;}while(size>14&&ctx.measureText(value).width>max);ctx.fillText(value,x,y);};
      text('LOOP SHIFT',86,120,780,56);text('CAN YOU BEAT MY RUN?',64,215,820,29,'#aabfaf');
      if(window.LoopShiftAvatar&&typeof Image!=='undefined'){const avatar=window.LoopShiftAvatar.make(data.name,data.avatar);try{await avatar.decode();if(version!==generation)return;ctx.drawImage(avatar,64,276,82,82);}catch{}}
      text(data.name,164,335,730,46,'#eff8e8',false);if(data.title)text(data.title.toUpperCase(),64,383,830,23,'#d6ff62');
      text(data.mode.toUpperCase(),64,465,830,23,'#b5cbbd');text(data.score.toLocaleString(),58,615,840,130,'#d6ff62');text('POINTS',66,665,820,26);
      ctx.fillStyle='#203b2d';ctx.fillRect(64,717,832,2);
      text('LEVEL REACHED',64,785,360,23,'#aabfaf');text(String(data.level),64,868,360,68);
      text('BEST PERFECT CHAIN',490,785,400,23,'#aabfaf');text(String(data.chain),490,868,380,68);
      text(data.ranked?'FINISHED RUN':'UNRANKED RUN',64,962,820,25,'#ffbd93');
      const url=new URL(data.url);text(url.host+url.pathname,64,1062,820,27,'#d6ff62',false);text('TAP. SHIFT. FIND YOUR FLOW.',64,1125,820,22,'#b5cbbd');
      const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));if(!blob)throw new Error('Image creation is unavailable in this browser.');
      if(version!==generation)return;if(cardUrl)URL.revokeObjectURL(cardUrl);
      cardUrl=URL.createObjectURL(blob);card=new File([blob],'LoopShift-result.png',{type:'image/png'});
      el('card-preview').src=cardUrl;el('card-preview').hidden=false;el('card-download').href=cardUrl;el('card-download').hidden=false;el('card-share').hidden=false;el('card-status').textContent='Your card is ready. Share it or save the image.';
    }catch(error){if(version===generation)el('card-status').textContent=error.message;}
    finally{if(version===generation)el('card-create').disabled=false;}
  }
  async function shareCard(){
    if(!result)return;
    const text=`Can you beat my score? ${result.score} points in Loop Shift · Level ${result.level} · Best chain ${result.chain}.`;
    try{
      if(card&&navigator.share&&navigator.canShare?.({files:[card]})){await navigator.share({files:[card],title:'Loop Shift result',text,url:result.url});return;}
      if(navigator.share){await navigator.share({title:'Loop Shift result',text,url:result.url});el('card-status').textContent='Game link shared. Use Save image for your card.';return;}
      if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(text+' '+result.url);el('card-status').textContent='Result and game link copied. Use Save image for the card.';return;}
    }catch(error){if(error.name==='AbortError')return;}
    el('card-status').textContent='Use Save image, or press and hold the card to save it. The game link is below.';
  }
  el('replay-play').addEventListener('click',playReplay);el('replay-stop').addEventListener('click',()=>{stop();if(frames.length)paint(frames.at(-1),true);});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
  for(const id of ['replay-panel','card-panel'])el(id).addEventListener('toggle',()=>{
    if(!el(id).open){if(id==='replay-panel')stop();return;}
    el(id).scrollIntoView?.({block:'start',behavior:'auto'});
    if(id==='card-panel'&&!card)createCard();
  });
  el('card-create').addEventListener('click',createCard);el('card-share').addEventListener('click',shareCard);
  window.LoopShiftResults={capture,finish,reset,stop,wantsFrame};
})();
