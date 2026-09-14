// Original mellow arcade beat, synthesized locally. No external recordings.
(() => {
  let context,master,timer,enabled=true,active=false,level=1,fever=false,step=0,next=0,blocked=false;
  let transport=null,nextStep=null,combo=0,bassMix=0,melodyMix=0,duckUntil=0;
  const voices=new Set();
  try{enabled=localStorage.getItem('loop-shift-music')!=='false';}catch{}
  const button=document.getElementById('music-toggle');
  function label(){button.textContent=enabled?(blocked?'♫ Tap to enable':'♫ Music on'):'♫ Music off';button.setAttribute('aria-pressed',String(enabled));button.setAttribute('aria-label',enabled?(blocked?'Enable background music':'Mute background music'):'Enable background music');button.setAttribute('title',enabled?(blocked?'Tap to enable music':'Music on'):'Music off');}
  function note(hz,time,length,volume,type='sine',endHz=null){
    volume *= time < duckUntil ? .38 : 1;
    const oscillator=context.createOscillator(),gain=context.createGain();
    oscillator.type=type;oscillator.frequency.setValueAtTime(hz,time);
    if(endHz)oscillator.frequency.exponentialRampToValueAtTime(endHz,time+length);
    gain.gain.setValueAtTime(0,time);gain.gain.linearRampToValueAtTime(volume,time+.008);gain.gain.exponentialRampToValueAtTime(.0001,time+length);
    voices.add(oscillator);oscillator.connect(gain);gain.connect(master);oscillator.start(time);oscillator.stop(time+length+.02);
    oscillator.onended=()=>{voices.delete(oscillator);oscillator.disconnect();gain.disconnect();};
  }
  function playStep(position,time,beat,accent=false){
    const bar=((position%16)+16)%16,chord=[55,65.406,49,58.27][((Math.floor(position/32)%4)+4)%4];
    // Layers ease in on the existing beat; performance never restarts the transport.
    const bassTarget=combo>=5?1:combo>=3?.75:combo>=2?.45:0;
    bassMix+=(bassTarget-bassMix)*.28;melodyMix+=((fever?1:0)-melodyMix)*.25;
    if(accent)note(chord*8,time,.11,.10,'triangle');
    if(bar%4===0)note(110,time,.14,.042,'sine',42);
    if([0,6,8,14].includes(bar)&&bassMix>.02)note(chord*(bar===14?1.5:1),time,beat*2.1,.055*bassMix,'triangle');
    if(bar===4||bar===12)note(185,time,.055,.016,'triangle');
    if(bar%2===1&&level>=3)note(660,time,.025,.004,'triangle');
    if(bar===0){note(chord*2,time,beat*6,.008);note(chord*3,time,beat*5,.006);}
    if(melodyMix>.02&&[0,3,6,10,12].includes(bar)){
      const melody=[4,5,6,5,8][[0,3,6,10,12].indexOf(bar)];note(chord*melody,time,beat*2.3,.046*melodyMix,'sine');
    }

  }
  function schedule(){
    if(!context||context.state!=='running'||!enabled||!active)return;
    if(transport){
      if(!transport.running)return;
      const now=context.currentTime,{rate}=transport;
      const phase=transport.phase+(now-transport.at)*rate;
      if(nextStep===null||nextStep<phase-.5)nextStep=Math.ceil(phase-1e-7);
      while(nextStep<phase+rate*.12){
        const time=Math.max(now,now+(nextStep-phase)/rate);
        playStep(nextStep,time,1/rate,transport.accents.some(value=>Math.abs(value-nextStep)<.001));
        nextStep++;
      }
      return;
    }
    // Standalone fallback; gameplay supplies its own orbit-locked transport.
    const beat=60/Math.min(112,84+(level-1)*1.3)/4;
    if(next<context.currentTime)next=context.currentTime+.03;
    while(next<context.currentTime+.12){playStep(step++,next,beat);next+=beat;}
  }
  function cancelVoices(){
    for(const voice of voices){try{voice.stop(context.currentTime);}catch{}}
    voices.clear();
  }
  function sync(value){
    if(!Number.isFinite(value.phase)||!Number.isFinite(value.rate)||value.rate<=0)return;
    const now=context?.currentTime||0;
    const drift=transport?Math.abs(value.phase-transport.phase-(transport.running?(now-transport.at)*transport.rate:0)):0;
    if(!transport||transport.epoch!==value.epoch||transport.running!==value.running||drift>.25){cancelVoices();nextStep=null;}
    transport={...value,accents:(value.accents||[]).filter(Number.isFinite),at:context?.currentTime||0};
    schedule();
  }
  function stop(){bassMix=0;melodyMix=0;clearInterval(timer);timer=null;nextStep=null;cancelVoices();if(master)master.gain.setValueAtTime(0,context.currentTime);}
  function begin(){
    if(!enabled||!active)return;
    try{
      context ||= new (window.AudioContext||window.webkitAudioContext)();
      if(!master){master=context.createGain();master.gain.setValueAtTime(0,context.currentTime);master.connect(context.destination);}
      context.onstatechange=()=>{blocked=enabled&&active&&context.state!=='running';label();};
      context.resume().then(()=>{
        if(!active||!enabled)return;
        blocked=context.state!=='running';label();if(blocked)return;
        master.gain.setValueAtTime(.7,context.currentTime);next=context.currentTime+.03;
        if(transport)transport.at=context.currentTime;
        if(!timer)timer=setInterval(schedule,60);schedule();
      }).catch(()=>{blocked=true;label();});
    }catch{blocked=true;label();}
  }
  button.addEventListener('click',()=>{
    // Retry blocked playback without accidentally muting the saved preference.
    if(enabled&&blocked){begin();return;}
    enabled=!enabled;try{localStorage.setItem('loop-shift-music',String(enabled));}catch{}
    blocked=false;label();if(enabled)begin();else stop();
  });
  function retry(){if(enabled&&active&&context?.state!=='running')begin();}
  document.addEventListener('pointerdown',retry);
  document.addEventListener('keydown',retry);
  document.addEventListener('visibilitychange',()=>{if(document.hidden){active=false;stop();}});
  window.addEventListener('blur',()=>{active=false;stop();});
  window.LoopShiftMusic={sync,unlock(){if(!enabled)return;try{context ||= new (window.AudioContext||window.webkitAudioContext)();context.resume().catch(()=>{});}catch{}},play(){active=true;begin();},pause(){active=false;stop();},setLevel(value){level=value;},setFever(value){fever=!!value;},setCombo(value){combo=Math.max(0,Number(value)||0);},duck(seconds=.16){if(context)duckUntil=Math.max(duckUntil,context.currentTime+Math.min(.5,seconds));}};
  label();
})();
