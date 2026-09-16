import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
test('goal cards update the game value and keep exactly one selected',()=>{
 const html=readFileSync(new URL('../www/index.html',import.meta.url),'utf8');
 const buttons=[...html.matchAll(/data-value="([^" ]+)" aria-pressed="(true|false)"/g)].map(([,value,pressed])=>({dataset:{value},attrs:{'aria-pressed':pressed},addEventListener(t,f){this[t]=f},setAttribute(k,v){this.attrs[k]=v}}));
 assert.equal(buttons.length,5);
 const value={value:'survive'},caption={},root={querySelectorAll:()=>buttons},saved=new Map([['loop-shift-selected-mode','weekly']]);
 vm.runInNewContext(readFileSync(new URL('../www/challenge-picker.js',import.meta.url),'utf8'),{document:{getElementById:id=>id==='challenge-picker'?root:id==='mode-caption'?caption:value},localStorage:{getItem:k=>saved.get(k),setItem:(k,v)=>saved.set(k,v)}});
 assert.equal(value.value,'weekly');assert.equal(caption.textContent,'Selected: Weekly');
 for(const button of buttons){button.click();assert.equal(value.value,button.dataset.value);assert.equal(saved.get('loop-shift-selected-mode'),button.dataset.value);assert.equal(buttons.filter(b=>b.attrs['aria-pressed']==='true').length,1);}
 assert.ok(!html.includes('id="challenge-list"'));
});
