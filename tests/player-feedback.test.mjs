import test from 'node:test';
import assert from 'node:assert/strict';
import {uiHarness} from './ui-harness.mjs';
test('feedback prepares a private owner email and never claims delivery',async()=>{
 const location={href:''},h=uiHarness({window:{location,innerWidth:390,innerHeight:740,LoopShiftFeedbackContext:()=>({level:42,mode:'endless'})}});
 h.load('player-feedback.js');h.click('feedback-home');assert.equal(h.nodes.get('feedback-dialog').open,true);
 h.nodes.get('feedback-type').value='Bug';h.nodes.get('feedback-message').value='The guide jumped & I hit a barrier.';
 h.nodes.get('feedback-form').events.submit({preventDefault(){}});
 const uri=new URL(location.href);assert.equal(uri.protocol,'mailto:');assert.equal(uri.pathname,'giriram160@gmail.com');
 assert.match(uri.searchParams.get('body'),/Level: 42/);assert.match(uri.searchParams.get('body'),/jumped & I hit/);
 assert.match(h.nodes.get('feedback-status').textContent,/Send the message in your email app/);
 await h.click('feedback-copy');assert.equal(h.nodes.get('feedback-fallback').hidden,false);assert.match(h.nodes.get('feedback-fallback').value,/giriram160@gmail.com/);
 h.click('feedback-close');assert.equal(h.nodes.get('feedback-dialog').open,false);
});
test('empty feedback cannot open an email composer',()=>{
 const location={href:''},h=uiHarness({window:{location}});h.load('player-feedback.js');
 h.nodes.get('feedback-message').value='   ';h.nodes.get('feedback-form').events.submit({preventDefault(){}});
 assert.equal(location.href,'');assert.match(h.nodes.get('feedback-status').textContent,/10–2,000/);
});
