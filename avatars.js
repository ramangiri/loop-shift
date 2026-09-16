(() => {
 const boys=new Set(['giri','naveen','arun','sam']);
 function make(name){
  const key=String(name||'').trim().toLowerCase(),boy=boys.has(key);
  let seed=0;for(const ch of key)seed=(seed*31+ch.codePointAt(0))>>>0;
  const shirt=['#dd9457','#84b7ae','#b1a1cf','#d7b867'][seed%4],skin=['#e7b58e','#c78d65','#a66f4d'][seed%3];
  const hair=boy?'<path d="M18 31Q14 9 32 10Q51 9 47 31L40 22L35 25L28 21L21 31" fill="#302723"/>':'<path d="M12 50L14 27Q13 8 32 9Q51 8 51 29L53 51Z" fill="#302723"/>';
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="18" fill="#31463a"/>${hair}<path d="M8 64Q10 46 32 46Q54 46 56 64" fill="${shirt}"/><rect x="27" y="40" width="10" height="12" rx="4" fill="${skin}"/><ellipse cx="32" cy="31" rx="15" ry="18" fill="${skin}"/>${boy?hair:'<path d="M17 30Q14 11 32 11Q51 11 47 28Q35 24 31 18Q26 27 17 30" fill="#302723"/>'}<path d="M22 30h4m12 0h4" stroke="#302723" stroke-width="3" stroke-linecap="round"/><path d="M26 39Q32 45 38 39" fill="white" stroke="#794b3b" stroke-width="1.5" stroke-linejoin="round"/></svg>`;
  const img=document.createElement('img');img.className='arcade-avatar';img.alt='';img.width=48;img.height=48;img.src='data:image/svg+xml,'+encodeURIComponent(svg);return img;
 }
 window.LoopShiftAvatar={make};
})();
