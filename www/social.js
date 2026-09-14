/* Collections, weekly events and private groups. No gameplay input is handled here. */
(() => {
  const el=id=>document.getElementById(id),board=window.LoopShiftBoard;
  const TITLES=[['perfect-pilot','Perfect Pilot','Chain 5 perfect shifts',1],['shield-survivor','Shield Survivor','Clear 5 consecutive levels without losing a shield',2],['six-ring-master','Six-Ring Master','Clear Level 13',4]];
  const BOSSES=[['Twin Comet','☄','#ffbe72'],['Sweep Compass','✥','#72e6ff'],['Pulse Crown','♛','#c8a4ff'],['Orbit Phoenix','♜','#ff8a75'],['Solar Voyager','☀','#ffd66d'],['Nebula Heart','♥','#ffa8da'],['Aurora Wings','⋈','#83f5c0'],['Stellar Compass','✧','#a4cfff'],['Nova Crown','♕','#ed9fff'],['Loop Champion','🏆','#d6ff62']];
  let player=null,collection={bosses:0,titles:0,title:''},goal=null,queue=[],saving=null,refreshing=null,groupsJob=null;
  let activeGroup='',retryTimer=null,groups=[],busy=false;
  const storage=()=>`loop-shift-social-v1:${player?.key||'device'}`;
  const read=()=>{try{return JSON.parse(localStorage.getItem(storage())||'{}');}catch{return {};}};
  function persist(){try{localStorage.setItem(storage(),JSON.stringify({collection,queue}));}catch{}}
  function status(text){el('social-status').textContent=text;el('retry-social').hidden=!queue.length;}
  function drawCollection(){
    el('boss-collection').replaceChildren();let earned=0;
    BOSSES.forEach(([name,icon,color],i)=>{
      const unlocked=!!(collection.bosses&(1<<i));if(unlocked)earned++;
      const card=document.createElement('li');card.className='boss-trophy'+(unlocked?' earned':'');card.style.setProperty('--trophy-color',color);
      const symbol=document.createElement('span');symbol.className='trophy-symbol';symbol.textContent=unlocked?icon:'◇';symbol.setAttribute('aria-hidden','true');
      const title=document.createElement('strong');title.textContent=name;
      const detail=document.createElement('small');detail.textContent=`Level ${(i+1)*10} · ${unlocked?'Earned':'Locked'}`;
      card.append(symbol,title,detail);el('boss-collection').append(card);
    });
    const next=BOSSES.findIndex((_,i)=>!(collection.bosses&(1<<i)));
    el('boss-next').textContent=next<0?'All ten boss trophies earned!':`${earned}/10 trophies · Next: ${BOSSES[next][0]} at Level ${(next+1)*10}`;
    el('title-options').replaceChildren();
    for(const [id,name,rule,bit] of [['','No title','Keep your nickname only',0],...TITLES]){
      const button=document.createElement('button');button.type='button';button.className='title-choice';button.disabled=!!bit&&!(collection.titles&bit);button.setAttribute('aria-pressed',String(collection.title===id));
      const title=document.createElement('strong'),detail=document.createElement('small');title.textContent=name;detail.textContent=bit&&!(collection.titles&bit)?rule:collection.title===id?'Selected':'Select';button.append(title,detail);
      button.addEventListener('click',()=>selectTitle(id));el('title-options').append(button);
    }
    el('collection-owner').textContent=player?`Saved for ${player.name}`:'Device collection · Connect a nickname for server rewards';
  }
  function render(data){
    if(data.collection)collection={bosses:collection.bosses|data.collection.bosses,titles:collection.titles|data.collection.titles,title:data.collection.title};
    if(data.community){
      goal=data.community;el('community-count').textContent=`${goal.total.toLocaleString()} / ${goal.goal.toLocaleString()} sparks`;
      el('community-meter').value=Math.min(goal.total,goal.goal);el('community-meter').max=goal.goal;
      el('community-note').textContent=goal.total>=goal.goal?'Goal reached! Convergence theme unlocked for everyone.':`Your contribution: ${goal.mine.toLocaleString()} · Resets Monday, 00:00 UTC`;
      el('community-reward').disabled=!goal.unlocked;el('community-reward').textContent=goal.unlocked?'Use Convergence theme':'Convergence theme · Locked';
      if(goal.unlocked)try{localStorage.setItem('loop-shift-community-theme','true');}catch{}
    }
    persist();drawCollection();
  }
  function identity(next){
    if(!next?.key){
      if(!player)return;player=null;queue=[];groups=[];activeGroup='';renderGroups({groups:[]});el('group-copy-text').hidden=true;el('group-leave-confirm').hidden=true;
      const local=read();collection={bosses:local.collection?.bosses&1023,titles:local.collection?.titles&7,title:local.collection?.title||''};drawCollection();return;
    }
    if(next.key===player?.key){const renamed=next.name!==player.name;player=next;if(renamed)drawCollection();return;}
    groups=[];activeGroup='';renderGroups({groups:[]});el('group-copy-text').hidden=true;el('group-leave-confirm').hidden=true;
    player=next;const saved=read();collection={bosses:saved.collection?.bosses&1023,titles:saved.collection?.titles&7,title:''};
    queue=Array.isArray(saved.queue)?saved.queue.filter(x=>x.owner===player.key&&typeof x.token==='string').slice(-100):[];
    if(refreshing)refreshing.then(refresh);else refresh();
    if(queue.length)flush();if(el('friends-panel').open){if(groupsJob)groupsJob.then(refreshGroups);else refreshGroups();}
  }
  async function refresh(){
    if(refreshing)return refreshing;
    const owner=player?.key;
    refreshing=board.request('social').then(data=>{if(owner===player?.key)render(data);}).catch(error=>{status(error.message);}).finally(()=>{refreshing=null;});
    return refreshing;
  }
  async function selectTitle(title){
    if(busy)return;
    if(!player){collection.title=title;persist();drawCollection();return;}
    busy=true;const owner=player.key;
    try{const data=await board.request('social/title',{title});if(owner===player?.key){render(data);status('Player title saved.');await board.refresh(true);refreshGroups();}}
    catch(error){status(error.message);}finally{busy=false;}
  }
  function localAwards(stats){
    collection.bosses|=stats.kind==='endless'?stats.bosses:0;
    collection.titles|=(stats.chain>=5?1:0)|(stats.clean>=5?2:0)|(stats.cleared>=13?4:0);
    persist();drawCollection();
  }
  function begin(kind){
    if(!['endless','daily','weekly'].includes(kind))return null;
    const owner=player?.key;
    if(!owner)return {owner:null,started:Promise.resolve(null)};
    return {owner,started:board.request('social/start',{kind}).catch(error=>{status('Community connection: '+error.message);return null;})};
  }
  async function finish(attempt,stats){
    if(!attempt)return;
    // Device-only runs have a separate collection; never merge them into an online identity.
    if(!attempt.owner&&!player){localAwards(stats);return;}
    if(attempt.owner!==player?.key)return;
    const started=await attempt.started;
    if(!started){status('This run could not connect to community rewards. Try a new run while online.');return;}
    if(attempt.owner!==player?.key)return;
    const item={owner:attempt.owner,token:started.token,sparks:stats.sparks,chain:stats.chain,clean:stats.clean,cleared:stats.cleared,bosses:stats.bosses,duration:stats.duration};
    queue.push(item);persist();status('Saving trophies and community sparks…');return flush();
  }
  function flush(){
    if(saving)return saving;if(!player||!queue.length)return Promise.resolve();
    clearTimeout(retryTimer);const owner=player.key,item=queue[0];let success=false;
    saving=(async()=>{
      try{const data=await board.request('social/finish',item);if(owner!==player?.key)return;
        queue=queue.filter(x=>x.token!==item.token);render(data);success=true;status('Trophies and community sparks saved.');
      }catch(error){if(owner!==player?.key)return;
        if([400,409,410].includes(error.status)){queue=queue.filter(x=>x.token!==item.token);success=true;status('A contribution could not be saved: '+error.message);}
        else{status('Rewards waiting to save. '+error.message);if(error.status===429)retryTimer=setTimeout(flush,2000);}
        persist();
      }finally{saving=null;el('retry-social').hidden=!queue.length;}
      if(success&&queue.length)return flush();
    })();return saving;
  }
  function renderGroups(data){
    groups=data.groups;el('group-choices').replaceChildren();
    if(!groups.some(g=>g.id===activeGroup))activeGroup=groups[0]?.id||'';
    for(const group of groups){const b=document.createElement('button');b.type='button';b.textContent=group.name;b.setAttribute('aria-pressed',String(group.id===activeGroup));b.addEventListener('click',()=>{activeGroup=group.id;renderGroups({groups});});el('group-choices').append(b);}
    const selected=groups.find(g=>g.id===activeGroup);el('group-view').hidden=!selected;
    if(selected){
      el('group-name').textContent=selected.name;el('group-invite').textContent=selected.invite;el('group-members').textContent=`${selected.members}/30 members · Best 100-level run scores`;
      el('friend-rows').replaceChildren();
      for(const entry of selected.entries){const row=document.createElement('tr');if(entry.isYou)row.className='is-you';
        const rank=document.createElement('td'),name=document.createElement('td'),score=document.createElement('td');rank.textContent=entry.rank?String(entry.rank):'—';name.textContent=entry.name+(entry.isYou?' · You':'');score.textContent=entry.score?entry.score.toLocaleString():'No run yet';
        if(entry.title){const title=document.createElement('small');title.className='player-title';title.textContent=TITLES.find(x=>x[0]===entry.title)?.[1]||'';name.append(title);}row.append(rank,name,score);el('friend-rows').append(row);
      }
    }
    el('groups-status').textContent=groups.length?`${groups.length}/5 groups joined. Only members can view these boards.`:'Create a group or enter a friend’s invite code.';
  }
  async function refreshGroups(){
    if(groupsJob)return groupsJob;
    if(!player){el('groups-status').textContent='Save your nickname to use private groups.';return;}
    const owner=player.key;
    groupsJob=board.request('groups').then(data=>{if(owner===player?.key)renderGroups(data);}).catch(error=>{el('groups-status').textContent=error.message;}).finally(()=>{groupsJob=null;});return groupsJob;
  }
  async function groupAction(action,data){
    if(busy)return;if(!player){board.askName(()=>groupAction(action,data),false);return;}
    el('group-leave-confirm').hidden=true;el('group-copy-text').hidden=true;busy=true;const owner=player.key;el('groups-status').textContent='Updating your groups…';
    try{const result=await board.request('groups/'+action,data);if(owner===player?.key)renderGroups(result);}
    catch(error){el('groups-status').textContent=error.message;}finally{busy=false;}
  }
  el('group-create-form').addEventListener('submit',event=>{event.preventDefault();groupAction('create',{name:el('new-group-name').value});});
  el('group-join-form').addEventListener('submit',event=>{event.preventDefault();groupAction('join',{code:el('join-group-code').value});});
  el('group-leave').addEventListener('click',()=>{el('group-leave-confirm').hidden=false;});
  el('group-leave-cancel').addEventListener('click',()=>{el('group-leave-confirm').hidden=true;});
  el('group-leave-yes').addEventListener('click',()=>{el('group-leave-confirm').hidden=true;groupAction('leave',{group:activeGroup});});
  el('group-copy').addEventListener('click',async()=>{const group=groups.find(g=>g.id===activeGroup);if(!group)return;
    const text=`Join ${group.name} in Loop Shift. Invite code: ${group.invite}. Play at ${location.origin}${location.pathname}#home`;
    try{if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(text);el('groups-status').textContent='Invite copied. Send it to your friends.';return;}}catch{}
    el('group-copy-text').hidden=false;el('group-copy-text').value=text;el('group-copy-text').focus();el('group-copy-text').select();
  });
  el('friends-panel').addEventListener('toggle',()=>{if(el('friends-panel').open)refreshGroups();});
  el('groups-refresh').addEventListener('click',refreshGroups);el('retry-social').addEventListener('click',flush);
  el('community-refresh').addEventListener('click',refresh);
  window.addEventListener('online',()=>{refresh();flush();});
  window.LoopShiftSocial={identity,begin,finish,refresh,refreshGroups,unlockedTheme:()=>!!goal?.unlocked,title:()=>TITLES.find(x=>x[0]===collection.title)?.[1]||'',bosses:()=>collection.bosses};
  const saved=read();collection={bosses:saved.collection?.bosses&1023,titles:saved.collection?.titles&7,title:saved.collection?.title||''};drawCollection();
  const current=board.player();if(current)identity(current);else refresh();
  board.request('weekly').then(data=>{el('weekly-name').textContent=data.challenge.rule.name;el('weekly-rule').textContent=data.challenge.rule.description;el('weekly-status').textContent='2 minutes · Resets Monday, 00:00 UTC';}).catch(error=>{el('weekly-status').textContent=error.message;});
})();
