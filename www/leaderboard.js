(() => {
  const el = id => document.getElementById(id);
  let latestEntries=[], activeBoard='endless', activeChallenge=null, canPlayOffline=true, startingDaily=false;
  let nickname = '', ranked = false, nextAction, busy = false;
  let playerKey='',scoreQueue=[],scoreJob=null,retryTimer=null,bestListener=null,savedBest=null;
  const queueStorage=()=>`loop-shift-score-queue-v3:${playerKey}`;
  function persistQueue(){if(playerKey)try{localStorage.setItem(queueStorage(),JSON.stringify(scoreQueue));}catch{}}
  function scoreStatus(message,waiting=false){
    el('score-save-status').hidden=false;el('score-save-status').textContent=message;
    el('board-save-status').textContent=message;el('board-save-status').hidden=false;
    el('retry-score').hidden=!waiting;el('retry-board-score').hidden=!waiting;
  }
  function restoreQueue(key){
    if(!key||key===playerKey)return;
    playerKey=key;savedBest=null;scoreQueue=[];
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
    el('edit-name').textContent = nickname ? 'Edit name' : 'Add name';
  }
  function render(data) {
    const daily=!!data.challenge;
    if(daily)activeChallenge=data.challenge;
    const visible=(daily?'daily':'endless')===activeBoard;
    if(data.me){restoreQueue(data.me.key);if(!daily)savedBest=data.me.best;}
    if(visible){
    el('board-endless').setAttribute('aria-pressed',String(!daily));el('board-daily').setAttribute('aria-pressed',String(daily));
    el('board-title').textContent=daily?'🏆 Daily Top 10':'🏆 Top 10';
    if(daily)el('daily-status').textContent='Resets 05:30 IST (00:00 UTC) · Online';
    latestEntries=data.entries;
    el('board-rows').replaceChildren();
    for (const entry of data.entries) {
      const tr = document.createElement('tr');
      if (entry.isYou) tr.classList.add('is-you');
      const rank = document.createElement('td'), name = document.createElement('td'), score = document.createElement('td');
      rank.textContent = entry.rank===1?'🏆':entry.rank===2?'🥈':entry.rank===3?'🥉':String(entry.rank).padStart(2, '0');
      rank.setAttribute('aria-label',`Rank ${entry.rank}`);
      name.textContent = entry.name + (entry.isYou ? ' · You' : '');
      score.textContent = entry.score.toLocaleString();
      tr.append(rank, name, score);el('board-rows').append(tr);
    }
    el('board-table-wrap').hidden = !data.entries.length;
    el('board-status').textContent = data.entries.length ? (daily?'Daily leaderboard · '+data.challenge.day:'Shared leaderboard · Up to date') : (daily?'No daily scores yet. Set today’s first score.':'The board is open. Finish a round with points to claim the first spot.');
    el('board-you').hidden = !data.me;
    if(data.me)el('board-you').textContent=data.me.rank?`${data.me.name} · Your rank: #${data.me.rank} · Best: ${data.me.best.toLocaleString()}`:`${data.me.name} · Finish a ranked round to set your first score.`;
    }
    if (data.me) {
      nickname = data.me.name;ranked = true;playerLabel();
      if(data.me.progress){serverProgress=data.me.progress;progressListener?.(serverProgress);if(!progressPending&&!progressBusy)el('progress-sync').textContent='Trophies and unlocked levels saved.';}
      bestListener?.(savedBest);
    } else { ranked = false;savedBest=null;bestListener?.(null); }
  }
  async function refresh(force = false) {
    if (refreshJob) return refreshJob;
    if(scoreJob)await scoreJob;
    if(refreshJob)return refreshJob;
    if (!force && Date.now() - lastRefresh < 10000) return;
    lastRefresh = Date.now();
    el('refresh-board').disabled = true;
    refreshJob = request(activeBoard==='daily'?'daily':'leaderboard').then(render).catch(error => {
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
    nickname = name;ranked = online;playerLabel();
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
    try { if (refreshJob) await refreshJob;const data = await request('player', {name});render(data);finishName(data.me.name, true); }
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
  el('refresh-board').addEventListener('click', () => refresh(true));
  function queueScore(score,duration,challenge){
    const item={id:Date.now().toString(36)+'-'+Math.random().toString(36).slice(2),owner:playerKey,score,duration,round,challenge};
    if(!challenge){
      const previous=scoreQueue.find(entry=>!entry.challenge);
      if(previous&&previous.score>=score)return;
      scoreQueue=scoreQueue.filter(entry=>entry.challenge);
    }
    scoreQueue.push(item);persistQueue();
  }
  function saveScore(){
    if(scoreJob)return scoreJob;
    if(!ranked||!scoreQueue.length)return Promise.resolve();
    clearTimeout(retryTimer);retryTimer=null;
    const item=scoreQueue[0];let saved=false;
    scoreStatus('Saving your score…');
    // Serialize requests so a slow refresh or earlier save cannot replace new data.
    scoreJob=(async()=>{
      try{
        if(refreshJob)await refreshJob;
        if(item.owner!==playerKey)return;
        const data=await request(item.challenge?'daily/score':'scores',{score:item.score,duration:item.duration,...(item.challenge?{token:item.challenge.token}:{})});
        if(item.owner!==playerKey)return;
        scoreQueue=scoreQueue.filter(entry=>entry.id!==item.id);persistQueue();saved=true;render(data);
        const prefix=item.challenge?'Daily best saved':'Best saved';
        scoreStatus(data.me.rank?`${prefix} · ${data.me.name} is #${data.me.rank} with ${data.me.best.toLocaleString()} points.`:'Round saved. Collect points to enter the Top 10.');
      }catch(error){
        if(item.owner!==playerKey)return;
        if(item.challenge&&[409,410].includes(error.status)){
          scoreQueue=scoreQueue.filter(entry=>entry.id!==item.id);persistQueue();
          scoreStatus('Daily score not saved. '+error.message);
        }else scoreStatus(`Score not saved yet (${item.score.toLocaleString()} points). ${error.message}`,true);
        if(error.status===429)retryTimer=setTimeout(saveScore,Math.min(5000,Math.max(1100,error.retryAfter*1000)));
      }finally{scoreJob=null;}
      if(saved&&scoreQueue.length)return saveScore();
    })();
    return scoreJob;
  }
  el('retry-score').addEventListener('click',saveScore);
  el('retry-board-score').addEventListener('click',saveScore);
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
    best:()=>ranked?savedBest:null,
    onBest(listener){bestListener=listener;if(savedBest!==null)listener(savedBest);},
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
    ready: () => !!nickname,
    askName, refresh,
    beginRound() { round++;if(!scoreQueue.length){el('score-save-status').hidden=true;el('retry-score').hidden=true;}else saveScore(); },
    submit(score, duration, challenge=null) {
      if (!ranked) {scoreStatus('Unranked round. Connect and save your nickname from Home to join the board.');return;}
      queueScore(score,duration,challenge);return saveScore();
    }
  };
  el('board-endless').addEventListener('click',async()=>{if(refreshJob)await refreshJob;activeBoard='endless';refresh(true);});
  el('board-daily').addEventListener('click',async()=>{if(refreshJob)await refreshJob;activeBoard='daily';refresh(true);});
  refresh(true);
})();
