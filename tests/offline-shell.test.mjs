import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
test('installed website opens cached pages and assets without waiting for the server',async()=>{
 const handlers={},cache=new Map(),calls=[];
 const page={body:'game'},script={body:'controls'};
 cache.set('https://game.test/',page);cache.set('./index.html',page);cache.set('https://game.test/game.js',script);
 vm.runInNewContext(readFileSync(new URL('../sw.js',import.meta.url),'utf8'),{
  URL,self:{registration:{scope:'https://game.test/'},addEventListener:(n,f)=>handlers[n]=f},
  caches:{match:async request=>cache.get(typeof request==='string'?request:request.url)},
  fetch:async request=>{calls.push(request.url);throw new Error('offline')}
 });
 for(const [url,mode,expected] of [['https://game.test/','navigate',page],['https://game.test/game.js','same-origin',script],['https://game.test/index.html','navigate',page]]){
  let response;handlers.fetch({request:{url,mode,method:'GET'},respondWith:p=>response=p});assert.equal(await response,expected);
 }
 assert.equal(calls.length,0);
 let intercepted=false;handlers.fetch({request:{url:'https://game.test/api/board',method:'GET'},respondWith:()=>intercepted=true});assert.equal(intercepted,false,'Online records never use the asset cache');
});
