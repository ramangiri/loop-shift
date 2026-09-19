import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {uiHarness} from './ui-harness.mjs';

function loadFeedback(h){
 const source=readFileSync(new URL('../www/player-feedback-base.js',import.meta.url),'utf8');
 const feedbackOnly=source.split('/* Special collectibles:')[0];
 vm.runInContext(feedbackOnly,h.scope);
}

test('feedback prepares a private owner email and never claims delivery',async()=>{
 const location={href:''},h=uiHarness({window:{location,innerWidth:390,innerHeight:740,LoopShiftFeedbackContext:()=>({level:42,mode:'endless'})}});
 loadFeedback(h);h.click('feedback-home');assert.equal(h.nodes.get('feedback-dialog').open,true);
 h.nodes.get('feedback-type').value='Bug';h.nodes.get('feedback-message').value='The guide jumped & I hit a barrier.';
 h.nodes.get('feedback-form').events.submit({preventDefault(){}});
 const uri=new URL(location.href);assert.equal(uri.protocol,'mailto:');assert.equal(uri.pathname,'giriraman160@gmail.com');
 assert.match(uri.searchParams.get('body'),/Level: 42/);assert.match(uri.searchParams.get('body'),/jumped & I hit/);
 assert.match(h.nodes.get('feedback-status').textContent,/Send the message in your email app/);
 await h.click('feedback-copy');assert.equal(h.nodes.get('feedback-fallback').hidden,false);assert.match(h.nodes.get('feedback-fallback').value,/giriraman160@gmail.com/);
 h.click('feedback-close');assert.equal(h.nodes.get('feedback-dialog').open,false);
});
test('empty feedback cannot open an email composer',()=>{
 const location={href:''},h=uiHarness({window:{location}});
 loadFeedback(h);
 h.nodes.get('feedback-message').value='   ';h.nodes.get('feedback-form').events.submit({preventDefault(){}});
 assert.equal(location.href,'');assert.match(h.nodes.get('feedback-status').textContent,/10–2,000/);
});
