(() => {
  const el = id => document.getElementById(id);
  let latestEntries=[], activeBoard='endless', activeChallenge=null, canPlayOffline=true, startingDaily=false;
  let nickname = '', ranked = false, nextAction, busy = false, offlineReady=false, connection='connecting';
  let playerKey='',scoreQueue=[],scoreJob=null,retryTimer=null,bestListener=null,savedBest=null;
  const queueStorage=()=>`loop-shift-score-queue-v3:${playerKey}`;
  const notifyBest=()=>bestListener?.(savedBest);
  function clearScoreStatus(){for(const id of ['score-save-status','board-save-status','retry-score','retry-board-score','retry-home-score'])el(id).hidden=true;}
  function clearPlayer(){
    persistQueue();playerKey='';scoreQueue=[];savedBest=null;ranked=false;
    if(!offlineReady)nickname='';
    clearTimeout(retryTimer);retryTimer=null;clearScoreStatus();
    playerLabel();window.LoopShiftSocial?.identity(null);
  }
  function persistQueue(){if(playerKey)try{localStorage.setItem(queueStorage(),JSON.stringify(scoreQueue));}catch{}}
  function scoreStatus(message,waiting=false){
    el('score-save-status').hidden=false;el('score-save-status').textContent=message;
    el('board-save-status').textContent=message;el('board-save-status').hidden=false;
    el('retry-score').hidden=!waiting;el('retry-board-score').hidden=!waiting;
    el('retry-home-score').hidden=!waiting||!ranked;
    notifyBest();
  }
  function restoreQueue(key){
    if(!key||key===playerKey)return;
    playerKey=key;savedBest=null;scoreQueue=[];clearScoreStatus();
    try{const items=JSON.parse(localStorage.getItem(queueStorage())||'[]');if(Array.isArray(items))scoreQueue=items.filter(item=>item.owner===key&&typeof item.id==='string'&&Number.isSafeInteger(item.score)&&item.score>=0&&Number.isFinite(item.duration)&&item.duration>=0).slice(0,20);}catch{}
    if(scoreQueue.length)scoreStatus('A score is waiting to save. We’ll retry when connected.',true);
  }
  let progressListener=null,serverProgress=null,progressPending=null,progressBusy=false;
  let lastRefresh = 0, refreshJob = null, round = 0;
  const validName = value => {
    const name = value.normalize('NFC').trim().replace(/\s+/g, ' ');
    return Array.from(name).length >= 1 && Array.from(name).length <= 16 && /^[\p{L}\p{M}\p{N} ._'’-]+$/u.test(name) && /[\p{L}\p{N}]/u.test(name) ? name : null;
  };
  async function request(path, data) {
    const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 8000);
    try {
      const response = await fetch('./api/' + path, { method: data ? 'POST' : 'GET', credentials: 'same-origin', cache: 'no-store', headers: data ? {'Content-Type': 'application/json','x-loopshift-season':'2'} : {}, body: data ? JSON.stringify(data) : undefined, signal: controller.signal });
      if (!response.headers.get('content-type')?.includes('application/json')) throw new Error('Connect to the game server to use the shared board.');
      const result = await response.json();
      if (!response.ok) {const error=new Error(result.error || 'The board is unavailable. Please retry.');error.status=response.status;error.retryAfter=Number(response.headers.get('retry-after'))||1;throw error;}
      return result;
    } catch (error) {
      if (error.name === 'AbortError' || error instanceof TypeError) throw new Error('Could not connect. Check your internet connection and retry.');
      throw error;
    } finally { clearTimeout(timer); }
  }
  function playerLabel() {
    el('player-label').textContent = nickname || 'Ready to play?';
    if(window.LoopShiftAvatar)el('profile-avatar').replaceChildren(...(nickname?[window.LoopShiftAvatar.make(nickname)]:[]));
    el('edit-name').textContent = nickname ? 'Edit name' : 'Add name';
  }
  function render(data) {
    connection='online';
    const weekly=data.challenge?.kind==='weekly',daily=!!data.challenge&&!weekly,kind=weekly?'weekly':daily?'daily':'endless';
    if(daily)activeChallenge=data.challenge;
    const visible=kind===activeBoard;
    if(data.me){restoreQueue(data.me.key);if(Number.isSafeInteger(data.me.mainBest))savedBest=data.me.mainBest;else if(!daily&&!weekly)savedBest=data.me.best;}
    if(visible){
    el('board-endless').setAttribute('aria-pressed',String(kind==='endless'));el('board-daily').setAttribute('aria-pressed',String(daily));el('board-weekly').setAttribute('aria-pressed',String(weekly));
    el('board-title').textContent=weekly?'🏆 Weekly Top 10':daily?'🏆 Daily Top 10':'Live Top 10 Feed';
    if(daily)el('daily-status').textContent='Resets 05:30 IST (00:00 UTC) · Online';
    latestEntries=data.entries;
    el('board-rows').replaceChildren();el('board-podium').replaceChildren();
    for (const entry of data.entries) {
      const tr = document.createElement('tr');
      if (entry.isYou) tr.classList.add('is-you');
      const rank = document.createElement('td'), name = document.createElement('td'), score = document.createElement('td');
      rank.textContent = entry.rank===1?'🏆':entry.rank===2?'🥈':entry.rank===3?'🥉':String(entry.rank).padStart(2, '0');
      rank.setAttribute('aria-label',`Rank ${entry.rank}`);
      name.textContent = entry.name + (entry.isYou ? ' · You' : '');
      if(window.LoopShiftAvatar)name.append(window.LoopShiftAvatar.make(entry.name));
      if(entry.rank<=3){const card=document.createElement('article');card.className='podium-card place-'+entry.rank;const medal=document.createElement('span');medal.textContent=entry.rank===1?'🏆':entry.rank===2?'🥈':'🥉';const title=document.createElement('strong');title.textContent=entry.name;const points=document.createElement('span');points.textContent=entry.score.toLocaleString();card.append(medal);if(window.LoopShiftAvatar)card.append(window.LoopShiftAvatar.make(entry.name));card.append(title,points);el('board-podium').append(card);}
      if(entry.title){const title=document.createElement('small');title.className='player-title';title.textContent=({'perfect-pilot':'Perfect Pilot','shield-survivor':'Shield Survivor','six-ring-master':'Six-Ring Master'})[entry.title]||'';name.append(title);}
      score.textContent = entry.score.toLocaleString();
      tr.append(rank, name, score);el('board-rows').append(tr);
    }
    el('board-table-wrap').hidden = !data.entries.length;
    el('board-status').textContent = data.entries.length ? (weekly?data.challenge.rule.name+' · Week of '+data.challenge.week:daily?'Daily leaderboard · '+data.challenge.day:'Shared leaderboard · Up to date') : (weekly?'No weekly scores yet. Set the first score.':daily?'No daily scores yet. Set today’s first score.':'The board is open. Finish a round with points to claim the first spot.');
    el('board-you').hidden = false;el('board-you').setAttribute('data-rank',String(data.me?.rank||''));
    el('board-you').textContent=data.me?(data.me.rank?`${data.me.name} · Your rank: #${data.me.rank} · Best: ${data.me.best.toLocaleString()}`:`${data.me.name} · Finish a ranked round to set your first score.`):'Add a name to see your online best and rank.';
    el('board-add-name').hidden=!!data.me;
    el('personal-standing').hidden=!data.me;
    if(data.me){el('standing-name').textContent=data.me.name;el('standing-rank').textContent=data.me.rank?'#'+data.me.rank:'—';el('standing-score').textContent=data.me.best.toLocaleString();el('standing-medal').textContent=data.me.rank===1?'🏆':data.me.rank===2?'🥈':data.me.rank===3?'🥉':'';if(window.LoopShiftAvatar)el('standing-avatar').replaceChildren(window.LoopShiftAvatar.make(data.me.name));}
    }
    if (data.me) {
      nickname = data.me.name;ranked = true;offlineReady=false;playerLabel();window.LoopShiftSocial?.identity({key:playerKey,name:nickname});
      if(data.me.progress){el('home-player-level').textContent=`Level ${data.me.progress.highest} / 100`;el('home-level-meter').value=data.me.progress.highest;serverProgress=data.me.progress;progressListener?.(serverProgress);if(!progressPending&&!progressBusy)el('progress-sync').textContent='Trophies and unlocked levels saved.';}
    } else { el('home-player-level').textContent='';el('home-level-meter').value=0;clearPlayer(); }
    notifyBest();
  }
  async function refresh(force = false) {
    if (refreshJob) return refreshJob;
    if(scoreJob)await scoreJob;
    if(refreshJob)return refreshJob;
    if (!force && Date.now() - lastRefresh < 10000) return;
    lastRefresh = Date.now();
    el('refresh-board').disabled = true;
    refreshJob = request(activeBoard==='weekly'?'weekly':activeBoard==='daily'?'daily':'leaderboard').then(render).catch(error => {
      connection='offline';notifyBest();
      el('board-status').textContent = error.message + (el('board-rows').children.length ? ' Showing the last loaded scores.' : '');
    }).finally(() => { el('refresh-board').disabled = false;refreshJob = null; });
    const job=refreshJob;
    job.then(()=>{if(ranked&&scoreQueue.length)saveScore();});
    return job;
  }
  function askName(action,allowOffline=true) {
    canPlayOffline=allowOffline;
    nextAction = action;
    el('name-error').textContent = '';el('play-offline').hidden = true;
    let saved = '';try { saved = localStorage.getItem('loop-shift-nickname-v2') || ''; } catch {}
    el('player-name').value = nickname || saved;
    el('save-name').textContent = action ? 'Save & play ↗' : 'Save nickname ↗';
    if (!el('name-dialog').open) el('name-dialog').showModal();
    el('player-name').focus();
  }
  function finishName(name, online) {
    offlineReady=!online;if(!online)clearPlayer();
    nickname = name;ranked = online;playerLabel();notifyBest();
    try { localStorage.setItem('loop-shift-nickname-v2', name); } catch {}
    const action = nextAction;nextAction = null;
    el('name-dialog').close();
    if(progressPending)saveProgress();
    if(scoreQueue.length)saveScore();
    if (action) action();
  }
  el('name-form').addEventListener('submit', async event => {
    event.preventDefault();if (busy) return;
    const name = validName(el('player-name').value);
    if (!name) { el('name-error').textContent = 'Enter 1–16 letters or numbers. Spaces, dots, apostrophes, hyphens and underscores are OK.';el('player-name').focus();return; }
    busy = true;el('save-name').disabled = true;el('player-name').disabled = true;el('cancel-name').disabled = true;el('play-offline').hidden = true;el('name-error').textContent = 'Saving your nickname…';
    try { if (refreshJob) await refreshJob;if(scoreJob)await scoreJob;const data = await request('player', {name});render(data);finishName(data.me.name, true); }
    catch (error) { el('name-error').textContent = error.message;el('play-offline').hidden = !nextAction || !canPlayOffline; }
    finally { busy = false;el('save-name').disabled = false;el('player-name').disabled = false;el('cancel-name').disabled = false; }
  });
  el('play-offline').addEventListener('click', () => {
    const name = validName(el('player-name').value);
    if (name) finishName(name, false);
  });
  el('cancel-name').addEventListener('click', () => { nextAction = null;el('name-dialog').close(); });
  el('name-dialog').addEventListener('cancel', event => { if (busy) event.preventDefault();else nextAction = null; });
  el('edit-name').addEventListener('click', () => askName());
  el('board-add-name').addEventListener('click', () => askName());
  el('refresh-board').addEventListener('click', () => refresh(true));
  function queueScore(score,duration,challenge){
    const item={id:Date.now().toString(36)+'-'+Math.random().toString(36).slice(2),owner:playerKey,score,duration,round,challenge};
    if(!challenge){
      const previous=scoreQueue.find(entry=>!entry.challenge);
      if(previous&&previous.score>=score)return;
      scoreQueue=scoreQueue.filter(entry=>entry.challenge);
    }
    scoreQueue.push(item);persistQueue();notifyBest();
  }
  function saveScore(){
    if(scoreJob)return scoreJob;
    if(!ranked||!scoreQueue.length)return Promise.resolve();
    clearTimeout(retryTimer);retryTimer=null;
    const item=scoreQueue[0];let saved=false,refreshIdentity=false;
    scoreStatus('Saving your score…');
    // Serialize requests so a slow refresh or earlier save cannot replace new data.
    scoreJob=(async()=>{
      try{
        if(refreshJob)await refreshJob;
        if(!ranked||item.owner!==playerKey)return;
        const data=await request(item.challenge?(item.challenge.kind==='weekly'?'weekly/score':'daily/score'):'scores',{playerKey:item.owner,score:item.score,duration:item.duration,...(item.challenge?{token:item.challenge.token}:{})});
        if(item.owner!==playerKey)return;
        scoreQueue=scoreQueue.filter(entry=>entry.id!==item.id);persistQueue();saved=true;render(data);
        const prefix=item.challenge?(item.challenge.kind==='weekly'?'Weekly best saved':'Daily best saved'):'Best saved';
        scoreStatus(data.me.rank?`${prefix} · ${data.me.name} is #${data.me.rank} with ${data.me.best.toLocaleString()} points.`:'Round saved. Collect points to enter the Top 10.');
      }catch(error){
        if(item.owner!==playerKey)return;
        if(error.status===401){offlineReady=false;clearPlayer();refreshIdentity=true;}
        else if(!error.status||error.status>=500)connection='offline';
        if(item.challenge&&[409,410].includes(error.status)){
          scoreQueue=scoreQueue.filter(entry=>entry.id!==item.id);persistQueue();
          scoreStatus((item.challenge.kind==='weekly'?'Weekly':'Daily')+' score not saved. '+error.message);
        }else scoreStatus(`Score not saved yet (${item.score.toLocaleString()} points). ${error.message}`,true);
        if(error.status===429)retryTimer=setTimeout(saveScore,Math.min(5000,Math.max(1100,error.retryAfter*1000)));
      }finally{scoreJob=null;notifyBest();}
      if(refreshIdentity)return refresh(true);
      if(saved&&scoreQueue.length)return saveScore();
    })();
    return scoreJob;
  }
  el('retry-score').addEventListener('click',saveScore);
  el('retry-board-score').addEventListener('click',saveScore);
  el('retry-home-score').addEventListener('click',saveScore);
  window.addEventListener?.('online',()=>{refresh(true);});
  async function saveProgress(){
    if(progressBusy||!progressPending)return;
    if(!ranked){el('progress-sync').textContent='Unlocks are only in this session. Save a nickname to keep them.';return;}
    progressBusy=true;const current=progressPending;progressPending=null;
    el('progress-sync').textContent='Saving unlocks…';el('retry-progress').hidden=true;
    try{serverProgress=await request('progress',current);progressListener?.(serverProgress);el('progress-sync').textContent='Trophies and unlocked levels saved.';}
    catch(error){progressPending=progressPending?{highest:Math.max(current.highest,progressPending.highest),distance:Math.max(current.distance,progressPending.distance),badges:current.badges|progressPending.badges,chain:Math.max(current.chain||0,progressPending.chain||0),clean:Math.max(current.clean||0,progressPending.clean||0)}:current;el('progress-sync').textContent='Unlocks not saved. '+error.message;el('retry-progress').hidden=false;}
    finally{progressBusy=false;}
    if(progressPending&&el('retry-progress').hidden)saveProgress();
  }
  el('retry-progress').addEventListener('click',saveProgress);
  window.LoopShiftBoard = {
    request,player:()=>ranked?{key:playerKey,name:nickname}:null,
    best:()=>ranked?savedBest:null,
    record:()=>({connection,ranked,pending:ranked?scoreQueue.filter(item=>!item.challenge&&item.owner===playerKey).reduce((top,item)=>Math.max(top,item.score),0):0}),
    onBest(listener){bestListener=listener;notifyBest();},
    onProgress(listener){progressListener=listener;if(serverProgress)listener(serverProgress);},
    saveProgress(data){progressPending=progressPending?{highest:Math.max(data.highest,progressPending.highest),distance:Math.max(data.distance,progressPending.distance),badges:data.badges|progressPending.badges,chain:Math.max(data.chain||0,progressPending.chain||0),clean:Math.max(data.clean||0,progressPending.clean||0)}:data;saveProgress();},
    target(score,kind='endless') {
      if(kind!==activeBoard)return null;
      const rivals=latestEntries.filter(e=>!e.isYou&&e.score>=score).sort((a,b)=>a.score-b.score);
      if(!rivals.length)return latestEntries.some(e=>!e.isYou)?'You’ve passed the listed rivals. Keep going!':null;
      const next=rivals[0];return `${next.score+1-score} points to beat ${next.name} · #${next.rank}`;
    },
    async beginDaily(callback){
      if(startingDaily)return;
      if(!ranked){askName(()=>window.LoopShiftBoard.beginDaily(callback),false);return;}
      startingDaily=true;el('daily-play').disabled=true;el('daily-status').textContent='Preparing today’s course…';
      try{
        if(refreshJob)await refreshJob;
        if(scoreJob)await scoreJob;
        if(scoreQueue.some(item=>item.challenge)){await saveScore();if(scoreQueue.some(item=>item.challenge))throw new Error('Save your previous daily score with Retry before starting another daily challenge.');}
        const challenge=await request('daily/start',{});
        activeBoard='daily';render(challenge.board);
        callback({...challenge,best:challenge.board.me?.best||0});
      }catch(error){el('daily-status').textContent=error.message;if(!el('game-screen').hidden){el('score-save-status').hidden=false;el('score-save-status').textContent=error.message;}}
      finally{startingDaily=false;el('daily-play').disabled=false;}
    },
    async beginWeekly(callback){
      if(startingDaily)return;
      if(!ranked){askName(()=>window.LoopShiftBoard.beginWeekly(callback),false);return;}
      startingDaily=true;el('weekly-play').disabled=true;el('weekly-status').textContent='Preparing this week’s course…';
      try{
        if(refreshJob)await refreshJob;if(scoreJob)await scoreJob;
        const challenge=await request('weekly/start',{});activeBoard='weekly';render(challenge.board);
        callback({...challenge,best:challenge.board.me?.best||0});
      }catch(error){el('weekly-status').textContent=error.message;if(!el('game-screen').hidden){el('score-save-status').hidden=false;el('score-save-status').textContent=error.message;}}
      finally{startingDaily=false;el('weekly-play').disabled=false;}
    },
    ready: () => ranked||offlineReady,
    askName, refresh,
    beginRound() { round++;if(!scoreQueue.length){el('score-save-status').hidden=true;el('retry-score').hidden=true;}else saveScore(); },
    submit(score, duration, challenge=null) {
      if (!ranked) {scoreStatus('Unranked round. Connect and save your nickname from Home to join the board.');return;}
      queueScore(score,duration,challenge);return saveScore();
    }
  };
  el('board-endless').addEventListener('click',async()=>{if(refreshJob)await refreshJob;activeBoard='endless';refresh(true);});
  el('board-daily').addEventListener('click',async()=>{if(refreshJob)await refreshJob;activeBoard='daily';refresh(true);});
  el('board-weekly').addEventListener('click',async()=>{if(refreshJob)await refreshJob;activeBoard='weekly';refresh(true);});
  refresh(true);
})();
