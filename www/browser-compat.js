/* Cross-browser compatibility helpers for older Android browsers/WebViews. */
(() => {
  const root=document.documentElement;
  const supports=(query)=>{
    try{return !!window.CSS?.supports?.(query);}catch{return false;}
  };
  const hasSupport=(()=>{
    try{return !!window.CSS?.supports?.('selector(:has(*))');}catch{return false;}
  })();
  const dvhSupport=supports('height: 100dvh');
  const aspectSupport=supports('aspect-ratio: 1 / 1');
  const backdropSupport=supports('backdrop-filter: blur(1px)')||supports('-webkit-backdrop-filter: blur(1px)');

  root.classList.toggle('no-css-has',!hasSupport);
  root.classList.toggle('no-dvh',!dvhSupport);
  root.classList.toggle('no-aspect-ratio',!aspectSupport);
  root.classList.toggle('no-backdrop-filter',!backdropSupport);

  function visible(el){return !!el&&!el.hidden&&getComputedStyle(el).display!=='none'&&getComputedStyle(el).visibility!=='hidden';}
  function nonEmpty(el){return !!el&&el.textContent.trim().length>0;}

  function syncViewport(){
    const vv=window.visualViewport;
    const height=Math.round(vv?.height||window.innerHeight||document.documentElement.clientHeight||800);
    const width=Math.round(vv?.width||window.innerWidth||document.documentElement.clientWidth||390);
    root.style.setProperty('--compat-vh',height+'px');
    root.style.setProperty('--compat-vw',width+'px');

    if(!aspectSupport){
      document.querySelectorAll('.arena').forEach(arena=>{
        const w=arena.getBoundingClientRect().width;
        if(w>0)arena.style.height=Math.round(w)+'px';
      });
    }
  }

  function toggle(el,name,on){if(el)el.classList.toggle(name,!!on);}
  function syncHasFallbacks(){
    if(hasSupport)return;

    const arena=document.querySelector('.arena');
    const overlay=arena?.querySelector('.overlay');
    toggle(arena,'compat-overlay-open',visible(overlay));

    const movement=document.querySelector('.movement-controls');
    toggle(movement,'compat-shift-in-visible',visible(document.getElementById('shift-in')));

    const notices=document.querySelector('.arena-notices');
    const banner=document.getElementById('level-banner-wrap');
    toggle(notices,'compat-level-banner',!!banner?.classList.contains('show'));

    const targets=document.querySelector('#game-screen .run-targets');
    const route=document.getElementById('route-cue');
    const rival=document.getElementById('rival-chip');
    const milestone=document.getElementById('milestone-countdown');
    toggle(targets,'compat-route-visible',nonEmpty(route));
    toggle(targets,'compat-rival-visible',visible(rival));
    toggle(targets,'compat-milestone-visible',visible(milestone));

    const feedback=document.querySelector('#game-screen .game-feedback');
    const toast=document.getElementById('toast');
    const skill=document.getElementById('skill-effect');
    toggle(feedback,'compat-toast-visible',!!toast?.classList.contains('show'));
    toggle(feedback,'compat-skill-visible',!!skill?.classList.contains('visible'));

    const status=document.querySelector('#game-screen .arena-status');
    const pattern=document.getElementById('pattern-notice');
    toggle(status,'compat-level-banner',!!banner?.classList.contains('show'));
    toggle(status,'compat-route-visible',nonEmpty(route));
    toggle(status,'compat-rival-visible',visible(rival));
    toggle(status,'compat-milestone-visible',visible(milestone));
    toggle(status,'compat-pattern-warning',!!pattern?.classList.contains('warning'));

    const messages=document.querySelector('#game-screen .arena-messages');
    const tapHint=document.getElementById('tap-anywhere-hint');
    const tapVisible=visible(tapHint)&&!tapHint?.classList.contains('faded');
    const anyMessage=tapVisible||!!banner?.classList.contains('show')||!!skill?.classList.contains('visible')||!!toast?.classList.contains('show');
    toggle(messages,'compat-message-visible',anyMessage);
    toggle(messages,'compat-tap-visible',tapVisible);
    toggle(messages,'compat-banner-visible',!!banner?.classList.contains('show'));
    toggle(messages,'compat-skill-visible',!!skill?.classList.contains('visible'));
    toggle(messages,'compat-toast-visible',!!toast?.classList.contains('show'));

    const resultActions=document.querySelector('#game-screen .result-actions');
    toggle(resultActions,'compat-single-action',!!resultActions?.querySelector('button[hidden]'));

    const resultComfort=document.querySelector('#game-screen .result-comfort');
    toggle(resultComfort,'compat-comfort-visible',visible(document.getElementById('comfort-check')));
  }

  function sync(){
    syncViewport();
    syncHasFallbacks();
  }

  const observer=new MutationObserver(syncHasFallbacks);
  observer.observe(document.documentElement,{subtree:true,childList:true,attributes:true,characterData:true,attributeFilter:['class','hidden','style','data-screen','data-playstate']});
  window.addEventListener('resize',syncViewport,{passive:true});
  window.addEventListener('orientationchange',()=>setTimeout(syncViewport,80),{passive:true});
  window.visualViewport?.addEventListener('resize',syncViewport,{passive:true});
  window.visualViewport?.addEventListener('scroll',syncViewport,{passive:true});
  document.addEventListener('DOMContentLoaded',sync,{once:true});
  requestAnimationFrame(sync);
})();