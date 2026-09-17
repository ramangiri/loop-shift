/* Keep the Classic lifetime best consistent across Home and Progress. */
(() => {
 const $=id=>document.getElementById(id);
 let busy=false,last=0;
 async function sync(force=false){
  if(busy||(!force&&Date.now()-last<5000))return;
  busy=true;last=Date.now();
  try{
   const response=await fetch('./api/leaderboard',{credentials:'same-origin',cache:'no-store'});
   if(!response.ok)return;
   const data=await response.json(),me=data?.me;
   if(!me)return;
   const best=Number.isSafeInteger(me.mainBest)?me.mainBest:Number.isSafeInteger(me.best)?me.best:null;
   if(best==null)return;
   const home=$('home-best');if(home)home.textContent=best.toLocaleString();
   const note=$('home-best-note');if(note)note.textContent='Saved online';
   /* The personal card must match the selected Classic/100 Levels board. */
   if($('board-endless')?.getAttribute('aria-pressed')==='true'){
    const score=$('standing-score');if(score)score.textContent=best.toLocaleString();
    const rank=$('standing-rank');if(rank)rank.textContent=me.rank?'#'+me.rank:'—';
    const medal=$('standing-medal');if(medal)medal.textContent=me.rank===1?'🏆':me.rank===2?'🥈':me.rank===3?'🥉':'';
   }
  }catch{}finally{busy=false;}
 }
 window.addEventListener('pageshow',()=>sync(true));
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)sync(true);});
 $('nav-play')?.addEventListener('click',()=>setTimeout(()=>sync(true),0));
 $('nav-progress')?.addEventListener('click',()=>setTimeout(()=>sync(true),0));
 $('board-endless')?.addEventListener('click',()=>setTimeout(()=>sync(true),50));
 $('refresh-board')?.addEventListener('click',()=>setTimeout(()=>sync(true),300));
 setInterval(()=>sync(false),10000);
 sync(true);
})();