import vm from 'node:vm';
import {readFileSync} from 'node:fs';
export function uiHarness(extra={}){
  const nodes=new Map(),events={},raf=new Map(),painted=[],storage=extra.storage||new Map();let frameId=0,clock=0;
  const context=new Proxy({measureText:value=>({width:String(value).length*18}),fillText:(...args)=>painted.push(args)}, {get:(o,k)=>o[k]||(()=>{}),set:(o,k,v)=>(o[k]=v,true)});
  const node=(tag='',id='')=>({tag,id,children:[],attrs:{},events:{},style:{setProperty(){}},classList:{add(){},remove(){},toggle(){}},value:'',textContent:'',hidden:false,disabled:false,open:false,
    setAttribute(k,v){this.attrs[k]=v;},append(...items){this.children.push(...items);},replaceChildren(...items){this.children=items;},addEventListener(t,f){this.events[t]=f;},focus(){},select(){},getContext:()=>context,
    toBlob(callback){callback(new Blob(['png'],{type:'image/png'}));}
  });
  for(const [,id] of readFileSync(new URL('../www/index.html',import.meta.url),'utf8').matchAll(/id="([^"]+)"/g))nodes.set(id,node('',id));
  const window={addEventListener:(n,f)=>events[n]=f,...extra.window};
  const scope={console,URL,File,Blob,performance:{now:()=>clock},window,navigator:extra.navigator||{},location:{origin:'https://game.test',pathname:'/loop-shift/'},
    document:{hidden:false,getElementById:id=>nodes.get(id),createElement:tag=>node(tag),addEventListener:(n,f)=>events[n]=f,fonts:{ready:Promise.resolve()}},
    localStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)},setTimeout,clearTimeout,setInterval,clearInterval,
    requestAnimationFrame:f=>{raf.set(++frameId,f);return frameId;},cancelAnimationFrame:id=>raf.delete(id)
  };
  vm.createContext(scope);
  return {scope,nodes,painted,storage,events,raf,load(file){vm.runInContext(readFileSync(new URL('../www/'+file,import.meta.url),'utf8'),scope);},click:id=>nodes.get(id).events.click?.({preventDefault(){}}),
    frame(time){clock=time;const callbacks=[...raf.values()];raf.clear();for(const fn of callbacks)fn(time);}};
}
export async function settle(){for(let i=0;i<8;i++)await new Promise(r=>setImmediate(r));}
export async function waitFor(predicate,message='UI did not finish updating'){
  const deadline=Date.now()+2000;
  while(!predicate()){
    if(Date.now()>=deadline)throw new Error(message);
    await new Promise(r=>setTimeout(r,5));
  }
}
