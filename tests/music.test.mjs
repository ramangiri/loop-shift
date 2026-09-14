import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
test('music starts on play, pauses immediately and respects the saved toggle',async()=>{
  let scheduled=0,cleared=0,notes=0,click;const gains=[];
  const param=()=>({setValueAtTime(v){this.value=v;},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){}});
  class Context{
    currentTime=0;state='running';destination={};
    resume(){return Promise.resolve();}
    createGain(){const gain={gain:param(),connect(){},disconnect(){}};gains.push(gain);return gain;}
    createOscillator(){return {frequency:param(),connect(){},disconnect(){},start(){notes++;},stop(){}};}
  }
  const button={textContent:'',setAttribute(){},addEventListener(type,fn){click=fn;}};
  const scope={window:{AudioContext:Context,addEventListener(){}},document:{getElementById:()=>button,addEventListener(){}},localStorage:{getItem:()=>null,setItem(){}},setInterval(){scheduled++;return scheduled;},clearInterval(){cleared++;}};
  vm.runInNewContext(readFileSync(new URL('../www/music.js',import.meta.url),'utf8'),scope);
  assert.equal(notes,0,'No autoplay before player gesture');
  const music=scope.window.LoopShiftMusic;music.play();await Promise.resolve();
  assert.ok(notes>0);assert.equal(scheduled,1);
  music.pause();assert.equal(gains[0].gain.value,0);assert.ok(cleared>0);
  click();music.play();await Promise.resolve();assert.equal(scheduled,1,'Muted music remains stopped');
  click();await Promise.resolve();assert.equal(scheduled,2);music.pause();
});
test('blocked music retries on the button and recovers after interruption',async()=>{
  let click,ctx,reject=true,notes=0;const events={},saved=[];
  const param=()=>({setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){}});
  class Context{
    currentTime=0;state='suspended';destination={};constructor(){ctx=this;}
    resume(){if(reject)return Promise.reject(new Error('gesture needed'));this.state='running';return Promise.resolve();}
    createGain(){return {gain:param(),connect(){},disconnect(){}};}
    createOscillator(){return {frequency:param(),connect(){},disconnect(){},start(){notes++;},stop(){}};}
  }
  const button={textContent:'',setAttribute(){},addEventListener(t,fn){click=fn;}};
  const scope={window:{AudioContext:Context,addEventListener(){}},document:{getElementById:()=>button,addEventListener(t,fn){events[t]=fn;}},localStorage:{getItem:()=>null,setItem(k,v){saved.push(v);}},setInterval:()=>1,clearInterval(){}};
  vm.runInNewContext(readFileSync(new URL('../www/music.js',import.meta.url),'utf8'),scope);
  scope.window.LoopShiftMusic.play();await new Promise(resolve=>setImmediate(resolve));
  assert.match(button.textContent,/Tap to enable/);assert.equal(notes,0);
  reject=false;click();await Promise.resolve();assert.ok(notes>0);assert.deepEqual(saved,[]);
  ctx.state='suspended';ctx.onstatechange();assert.match(button.textContent,/Tap to enable/);
  events.pointerdown();await Promise.resolve();assert.equal(ctx.state,'running');assert.match(button.textContent,/Music on/);
  click();assert.equal(saved.at(-1),'false');ctx.state='suspended';events.pointerdown();assert.equal(ctx.state,'suspended','A gesture must not override mute');
});

test('orbit transport cues land on the supplied beat, freeze in countdowns and re-anchor after pause',async()=>{
  let ctx,click;const notes=[];
  const param=()=>({setValueAtTime(v){this.value=v;},linearRampToValueAtTime(v){this.peak=v;},exponentialRampToValueAtTime(){}});
  class Context{
    currentTime=0;state='running';destination={};constructor(){ctx=this;}
    resume(){return Promise.resolve();}
    createGain(){return {gain:param(),connect(){},disconnect(){}};}
    createOscillator(){return {frequency:param(),connect(gain){this.gain=gain;},disconnect(){},start(time){this.time=time;notes.push(this);},stop(time){this.stoppedAt=time;}};}
  }
  const button={setAttribute(){},addEventListener(t,fn){click=fn;}};
  const scope={window:{AudioContext:Context,addEventListener(){}},document:{getElementById:()=>button,addEventListener(){}},localStorage:{getItem:()=>null,setItem(){}},setInterval:()=>1,clearInterval(){}};
  vm.runInNewContext(readFileSync(new URL('../www/music.js',import.meta.url),'utf8'),scope);
  const music=scope.window.LoopShiftMusic;
  const transport={phase:-.2,rate:4,accents:[0,4,12],epoch:1,running:false};
  music.sync(transport);music.play();await Promise.resolve();
  assert.equal(notes.length,0,'Countdown does not advance the soundtrack');
  music.sync({...transport,running:true});
  const cues=()=>notes.filter(n=>n.gain.gain.peak===.10);
  assert.equal(cues().length,1);assert.ok(Math.abs(cues()[0].time-.05)<1e-8,'Cue is scheduled at the predicted perfect window');
  ctx.currentTime=.04;music.sync({...transport,phase:-.04,running:true});
  assert.equal(cues().length,1,'Frame synchronization cannot duplicate a scheduled beat');
  music.pause();assert.equal(cues()[0].stoppedAt,.04,'Pause cancels already queued notes');
  ctx.currentTime=20;music.sync(transport);music.play();await Promise.resolve();
  assert.equal(cues().length,1,'Resume countdown remains silent');
  music.sync({...transport,running:true});
  assert.ok(Math.abs(cues().at(-1).time-20.05)<1e-8,'Resuming uses the new audio clock without advancing the course');
  ctx.currentTime=21;music.setFever(true);music.sync({...transport,phase:3.8,rate:2,epoch:2,running:true});
  assert.ok(Math.abs(cues().at(-1).time-21.1)<1e-8,'New level and Fever follow the supplied orbit rate');
  click();const mutedCount=notes.length;ctx.currentTime=22;
  music.sync({...transport,phase:4,epoch:3,running:true});
  assert.equal(notes.length,mutedCount,'Transport updates preserve mute');
});

test('combo adds bass, Fever adds melody, and effects duck new music without restarting the beat',async()=>{
  let context;const notes=[];
  const param=()=>({setValueAtTime(value){this.value=value;},linearRampToValueAtTime(value){this.peak=value;},exponentialRampToValueAtTime(){}});
  class Context{
    currentTime=0;state='running';destination={};constructor(){context=this;}
    resume(){return Promise.resolve();}
    createGain(){return {gain:param(),connect(){},disconnect(){}};}
    createOscillator(){return {frequency:param(),connect(gain){this.gain=gain;},disconnect(){},start(time){this.time=time;notes.push(this);},stop(time){this.stoppedAt=time;}};}
  }
  const button={setAttribute(){},addEventListener(){}};
  const scope={window:{AudioContext:Context,addEventListener(){}},document:{getElementById:()=>button,addEventListener(){}},localStorage:{getItem:()=>null,setItem(){}},setInterval:()=>1,clearInterval(){}};
  vm.runInNewContext(readFileSync(new URL('../www/music.js',import.meta.url),'utf8'),scope);const music=scope.window.LoopShiftMusic;
  music.sync({phase:0,rate:4,accents:[],epoch:1,running:true});music.play();await Promise.resolve();
  const bass=()=>notes.filter(n=>n.type==='triangle'&&n.frequency.value<100);
  assert.equal(bass().length,0,'A new run starts with a light beat');
  music.setCombo(5);
  for(let i=1;i<=16;i++){context.currentTime=i/4;music.sync({phase:i,rate:4,accents:[],epoch:1,running:true});}
  assert.ok(bass().length>=4);assert.ok(bass().at(-1).gain.gain.peak>bass()[0].gain.gain.peak,'Bass eases up with the combo');
  const melodic=()=>notes.filter(n=>n.type==='sine'&&n.frequency.value>=200);assert.equal(melodic().length,0);
  music.setFever(true);
  for(let i=17;i<=32;i++){context.currentTime=i/4;music.sync({phase:i,rate:4,accents:[],epoch:1,running:true});}
  assert.ok(melodic().length>=4,'Fever introduces the melody layer');
  context.currentTime=8.23;music.duck(.3);music.sync({phase:32.92,rate:4,accents:[33],epoch:1,running:true});
  const cue=notes.find(n=>Math.abs(n.time-8.25)<.001&&n.type==='triangle'&&n.frequency.value>300);assert.ok(cue);assert.ok(Math.abs(cue.gain.gain.peak-.038)<1e-8);
  music.pause();const before=notes.length;music.setCombo(6);music.setFever(true);context.currentTime=9;music.sync({phase:36,rate:4,accents:[36],epoch:1,running:true});assert.equal(notes.length,before);
});
