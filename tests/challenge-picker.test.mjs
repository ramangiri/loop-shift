import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
test('goal cards update the game value and keep exactly one selected',()=>{
 const html=readFileSync(new URL('../www/index.html',import.meta.url),'utf8');
 const buttons=[...html.matchAll(/data-value="([^" ]+)" aria-pressed="(true|false)"/g)].map(([,value,pressed])=>({dataset:{value},attrs:{'aria-pressed':pressed},addEventListener(t,f){this[t]=f},setAttribute(k,v){this.attrs[k]=v}}));
 assert.equal(buttons.length,3);
 const value={value:'survive'},root={querySelectorAll:()=>buttons};
 vm.runInNewContext(readFileSync(new URL('../www/challenge-picker.js',import.meta.url),'utf8'),{document:{getElementById:id=>id==='challenge-picker'?root:value}});
 for(const button of buttons){button.click();assert.equal(value.value,button.dataset.value);assert.equal(buttons.filter(b=>b.attrs['aria-pressed']==='true').length,1);}
 assert.ok(!html.includes('id="challenge-list"'));
});
