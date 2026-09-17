(() => {
 const root=document.getElementById('challenge-picker'),value=document.getElementById('challenge-choice'),caption=document.getElementById('mode-caption');
 const buttons=[...root.querySelectorAll('[data-value]')];
 function choose(button,remember=true){
  value.value=button.dataset.value;buttons.forEach(option=>option.setAttribute('aria-pressed',String(option===button)));
  const names={survive:'Classic',sparks:'Classic · Sparks goal',perfects:'Classic · Perfects goal',daily:'Daily',weekly:'Weekly'};
  caption.textContent='Selected: '+names[value.value];
  document.getElementById('board-'+(['daily','weekly'].includes(value.value)?value.value:'endless'))?.click?.();
  if(button.closest?.('details'))button.closest('details').open=true;
  if(remember){try{localStorage.setItem('loop-shift-selected-mode',value.value);}catch{}}
 }
 buttons.forEach(button=>button.addEventListener('click',()=>choose(button)));
 let saved;try{saved=localStorage.getItem('loop-shift-selected-mode');}catch{}
 const selected=buttons.find(button=>button.dataset.value===saved)||buttons[0];choose(selected,false);
 selected.scrollIntoView?.({block:'nearest',inline:'nearest'});
})();
