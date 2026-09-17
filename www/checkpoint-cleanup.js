/* Remove the optional checkpoint difficulty survey without changing checkpoint flow. */
(() => {
  const removePrompt=()=>document.querySelectorAll('.difficulty-pulse').forEach(node=>node.remove());
  const style=document.createElement('style');
  style.textContent='.difficulty-pulse{display:none!important}';
  document.head.appendChild(style);
  removePrompt();
  const observer=new MutationObserver(mutations=>{
    for(const mutation of mutations){
      for(const node of mutation.addedNodes){
        if(!(node instanceof Element))continue;
        if(node.matches?.('.difficulty-pulse'))node.remove();
        else node.querySelectorAll?.('.difficulty-pulse').forEach(el=>el.remove());
      }
    }
  });
  observer.observe(document.documentElement,{childList:true,subtree:true});
})();
