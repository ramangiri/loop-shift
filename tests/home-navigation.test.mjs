import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
test('Home destinations preserve panels and Back returns to Play before exiting',()=>{
 const nodes=new Map(),events={};
 for(const name of ['play','progress','friends'])for(const prefix of ['nav-','home-panel-'])nodes.set(prefix+name,{hidden:false,attrs:{},setAttribute(k,v){this.attrs[k]=v},addEventListener(t,f){this[t]=f},focus(){}});
 const window={addEventListener:(t,f)=>events[t]=f,scrollTo(){}};
 const location={hash:'#home'};
 vm.runInNewContext(readFileSync(new URL('../home-navigation.js',import.meta.url),'utf8'),{document:{getElementById:id=>nodes.get(id)},window,location});
 nodes.get('nav-progress').click();assert.equal(nodes.get('home-panel-play').hidden,true);assert.equal(nodes.get('home-panel-progress').hidden,false);
 assert.equal(window.LoopShiftHome.back(),true);assert.equal(window.LoopShiftHome.back(),false);
 nodes.get('nav-friends').click();location.hash='#daily';events.hashchange();assert.equal(nodes.get('home-panel-play').hidden,false);assert.equal(nodes.get('home-panel-friends').hidden,true);
});
