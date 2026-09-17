/* Clarity polish: make the third-ring lesson match the real player color and one-tap rule. */
(() => {
  const $id=id=>document.getElementById(id);

  const style=document.createElement('style');
  style.textContent=`
    #ring-lesson .ring-lesson-rule{display:flex;align-items:center;gap:8px;margin:.45rem 0;padding:.55rem .65rem;border:1px solid #40564b;border-radius:12px;background:#0c1512;font-weight:850}
    #ring-lesson .ring-lesson-rule b{min-width:78px}
    #ring-lesson .rule-you b{color:#f5faf7}.rule-blue b{color:#72e6ff}.rule-tap b{color:#f5dc88}
    #ring-lesson-orb{stroke:#fff;stroke-width:2.2px}
  `;
  document.head.appendChild(style);

  function syncRingLesson(){
    const dialog=$id('ring-lesson');if(!dialog)return;
    const kicker=dialog.querySelector('.ring-lesson-kicker');if(kicker)kicker.textContent='NEW RING · SAME ONE-TAP RULE';
    const title=$id('ring-lesson-title');if(title)title.textContent='One more ring — same rule';
    const practice=$id('ring-lesson-practice');if(practice)practice.setAttribute('aria-label','Practise one tap to the blue safe ring');
    const status=$id('ring-practice-status');if(status)status.textContent='Tap the picture once to practise — optional.';
    const copy=$id('ring-lesson-copy');if(copy)copy.innerHTML='<p class="ring-lesson-rule rule-you"><b>YOUR BALL</b><span>= YOU</span></p><p class="ring-lesson-rule rule-blue"><b>BLUE ARC</b><span>= GO HERE</span></p><p class="ring-lesson-rule rule-tap"><b>ONE TAP</b><span>= MOVE TO BLUE</span></p>';
    const foot=dialog.querySelector('.ring-lesson-foot');if(foot)foot.textContent='Then press GOT IT — PLAY. Gameplay resumes with a short safe stretch.';

    const picture=dialog.querySelector('.ring-lesson-picture');
    if(picture){
      picture.setAttribute('aria-label','Your player ball and a blue arc on the neighbouring ring. Tap once to move to blue.');
      const newRing=picture.querySelector('.lesson-new-ring');if(newRing){newRing.setAttribute('stroke','#61747a');newRing.setAttribute('opacity','.75');}
      const labels=picture.querySelectorAll('text');
      if(labels[0]){labels[0].textContent='YOU';labels[0].setAttribute('fill','#f5faf7');}
      if(labels[1]){labels[1].textContent='BLUE = GO HERE';labels[1].setAttribute('fill','#72e6ff');}
    }
    const orb=$id('ring-lesson-orb');
    if(orb){
      try{orb.setAttribute('fill',typeof ballColor==='function'?ballColor():'#f5faf7');}catch{orb.setAttribute('fill','#f5faf7');}
      orb.setAttribute('stroke','#ffffff');orb.setAttribute('stroke-width','2.2');
    }
  }

  syncRingLesson();
  if(typeof showRingLesson==='function'){
    const previousShowRingLesson=showRingLesson;
    showRingLesson=function(){const result=previousShowRingLesson();syncRingLesson();return result;};
  }

  // Remove the stale colour-specific fallback before any tutorial code replaces it.
  const preplayTitle=$id('preplay-title');if(preplayTitle&&/lime/i.test(preplayTitle.textContent))preplayTitle.textContent='YOUR BALL = YOU';

  // Explain the new reaction-first course in the quick rules reference.
  const adv=document.querySelector('.game-guide .advanced-howto');
  if(adv)adv.innerHTML='<strong>Read and react from Level 1</strong>Pattern order changes each run · BLUE is always one tap away · Later levels add speed, moving gates, switch gates and optional close-call gold.';
})();
