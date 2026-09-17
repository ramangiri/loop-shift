/* Load engagement, Difficulty 2.0, then the clearer How to Play layer. Fire Ball stays in game.js unchanged. */
(() => {
 const load=(src,onload)=>{const script=document.createElement('script');script.src=src;script.async=false;if(onload)script.addEventListener('load',onload,{once:true});document.head.appendChild(script);};
 load('./player-feedback-base.js',()=>load('./difficulty-v2.js',()=>load('./onboarding-v2.js')));
})();
