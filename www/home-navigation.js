/* Home destinations only; gameplay owns run state and save handling. */
(() => {
  const names=['play','progress','friends'];
  let selected='play';
  function show(name,focus=false){
    selected=names.includes(name)?name:'play';
    for(const item of names){
      document.getElementById('home-panel-'+item).hidden=item!==selected;
      document.getElementById('nav-'+item).setAttribute('aria-current',item===selected?'page':'false');
    }
    if(focus){document.getElementById('nav-'+selected).focus({preventScroll:true});window.scrollTo({top:0,behavior:'instant'});}
  }
  for(const name of names)document.getElementById('nav-'+name).addEventListener('click',()=>show(name,true));
  window.addEventListener('hashchange',()=>{if(['#daily','#weekly','#home'].includes(location.hash))show('play');});
  window.LoopShiftHome={show,back(){if(selected==='play')return false;show('play',true);return true;}};
  show('play');
})();
