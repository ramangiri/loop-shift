/* Load engagement, Difficulty 2.0, clearer How to Play, no-HOLD rules, animation, tutorial fixes, checkpoint cleanup, guide/speed fixes, then the pause popup. Fire Ball stays in game.js unchanged. */
(() => {
 const load=(src,onload)=>{const script=document.createElement('script');script.src=src;script.async=false;if(onload)script.addEventListener('load',onload,{once:true});document.head.appendChild(script);};
 load('./player-feedback-base.js',()=>load('./difficulty-v2.js',()=>load('./onboarding-v2.js',()=>load('./no-hold.js',()=>load('./howto-animation.js',()=>load('./tutorial-practice-fix.js',()=>load('./checkpoint-cleanup.js',()=>load('./guide-speed-fix.js',()=>load('./pause-menu.js')))))))));
})();
