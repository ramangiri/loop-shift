/* Feedback is user-sent email. No messages are posted to a public endpoint. */
(() => {
 const el=id=>document.getElementById(id),recipient='giriraman160@gmail.com';
 let opener=null,draft='';
 function open(event){opener=event.currentTarget;el('feedback-dialog').showModal();el('feedback-message').focus();}
 for(const id of ['feedback-home','feedback-settings','feedback-result','feedback-progress','feedback-friends','feedback-help'])el(id).addEventListener('click',open);
 function close(){el('feedback-dialog').close();opener?.focus();}
 el('feedback-close').addEventListener('click',close);
 el('feedback-dialog').addEventListener('cancel',event=>{event.preventDefault();close();});
 el('feedback-form').addEventListener('submit',event=>{
  event.preventDefault();const message=el('feedback-message').value.trim();
  if(message.length<10||message.length>2000){el('feedback-status').textContent='Please enter 10–2,000 characters.';return;}
  const type=['Bug','Suggestion','Difficulty','Controls / blue guide','Other'].includes(el('feedback-type').value)?el('feedback-type').value:'Other';
  const context=window.LoopShiftFeedbackContext?.()||{};
  const subject=`Loop Shift ${type} · v2.3.3`;
  draft=`${message}\n\nGame: Loop Shift v2.3.3\nLevel: ${context.level||1}\nMode: ${context.mode||'Home'}\nScreen: ${window.innerWidth} × ${window.innerHeight}`;
  el('feedback-copy').hidden=false;
  el('feedback-status').textContent='Send the message in your email app to finish. If it does not open, copy your feedback and email it to '+recipient+'.';
  window.location.href='mailto:'+recipient+'?subject='+encodeURIComponent(subject)+'&body='+encodeURIComponent(draft);
 });
 el('feedback-copy').addEventListener('click',async()=>{
  if(!draft)return;const text='To: '+recipient+'\n'+draft;
  try{if(!navigator.clipboard?.writeText)throw new Error();await navigator.clipboard.writeText(text);el('feedback-status').textContent='Copied. Paste it into an email to '+recipient+'.';}
  catch{el('feedback-fallback').value=text;el('feedback-fallback').hidden=false;el('feedback-fallback').focus();el('feedback-fallback').select();}
 });
})();
