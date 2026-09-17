/* Load the stable engagement layer first, then Difficulty 2.0. Fire Ball stays in game.js unchanged. */
(() => {
 const load=(src,onload)=>{const script=document.createElement('script');script.src=src;script.async=false;if(onload)script.addEventListener('load',onload,{once:true});document.head.appendChild(script);};
 load('./player-feedback-base.js',()=>load('./difficulty-v2.js'));
})();
