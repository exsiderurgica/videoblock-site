(async()=>{
  try{
    const r=await fetch('release.json?ts='+Date.now(),{cache:'no-store'});
    if(!r.ok)return;
    const d=await r.json();
    document.querySelectorAll('[data-release]').forEach(el=>{
      const k=el.dataset.release;
      if(d[k]) el.textContent=d[k];
    });
  }catch(e){}
})();

(()=>{
  const PAYPAL_URL='https://paypal.me/Exsiderurgica';
  let pendingDownload='';

  const style=document.createElement('style');
  style.textContent=`
    .donation-gate{position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,.78);display:none;align-items:center;justify-content:center;padding:20px}
    .donation-gate.open{display:flex}
    .donation-card{width:min(520px,100%);background:#07100c;color:#e9fff3;border:1px solid #1f6b45;padding:24px;box-shadow:0 24px 80px rgba(0,0,0,.55)}
    .donation-card h2{margin:0 0 10px;font-size:28px;line-height:1.05}
    .donation-card p{margin:0 0 20px;color:#a7c9b6;line-height:1.5}
    .donation-actions{display:grid;grid-template-columns:1fr 1fr;gap:10px}
    .donation-actions button{appearance:none;border:1px solid #2d8a5c;background:transparent;color:#e9fff3;padding:14px 16px;font:inherit;font-weight:800;cursor:pointer}
    .donation-actions .donate{background:#2dff8f;color:#03150b;border-color:#2dff8f}
    .donation-note{margin-top:12px!important;font-size:12px;color:#6f9f83!important}
    @media(max-width:560px){.donation-actions{grid-template-columns:1fr}}
  `;
  document.head.appendChild(style);

  const gate=document.createElement('div');
  gate.className='donation-gate';
  gate.innerHTML=`<div class="donation-card" role="dialog" aria-modal="true" aria-labelledby="donationTitle"><h2 id="donationTitle">VideoBlock is free.</h2><p>If it is useful to you, would you like to support development before downloading?</p><div class="donation-actions"><button class="donate" type="button">DONATE WITH PAYPAL</button><button class="free" type="button">NO THANKS — DOWNLOAD FREE</button></div><p class="donation-note">Donation is completely optional. Both choices give access to the same APK.</p></div>`;
  document.body.appendChild(gate);

  const startDownload=()=>{
    if(!pendingDownload)return;
    const url=pendingDownload;
    pendingDownload='';
    gate.classList.remove('open');
    window.location.href=url;
  };

  document.addEventListener('click',e=>{
    const a=e.target.closest('a[href*="VideoBlock-stable.apk"]');
    if(!a)return;
    e.preventDefault();
    pendingDownload=a.href;
    gate.classList.add('open');
  });

  gate.querySelector('.free').addEventListener('click',startDownload);
  gate.querySelector('.donate').addEventListener('click',()=>{
    window.open(PAYPAL_URL,'_blank','noopener,noreferrer');
    setTimeout(startDownload,250);
  });
  gate.addEventListener('click',e=>{if(e.target===gate){gate.classList.remove('open');pendingDownload='';}});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'){gate.classList.remove('open');pendingDownload='';}});
})();