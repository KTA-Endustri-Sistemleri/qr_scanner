(function(){
  const input = document.getElementById('qr_input');
  const btn = document.getElementById('submit_btn');
  const log = document.getElementById('log');
  const startCam = document.getElementById('start_cam');
  const video = document.getElementById('preview');

  function getCookie(name){
    const m = document.cookie.match(new RegExp('(?:^|; )' + name.replace(/([.$?*|{}()[\]\\/+^])/g, '\\$1') + '=([^;]*)'));
    return m ? decodeURIComponent(m[1]) : null;
  }

  async function postScan(code){
    const csrf = getCookie('csrf_token'); // login olduysan gelir
    const r = await fetch('/api/method/qr_scanner.api.create_scan', {
      method: 'POST',
      credentials: 'include',                 // cookie'leri gönder
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...(csrf ? {'X-Frappe-CSRF-Token': csrf} : {}) // varsa ekle
      },
      body: JSON.stringify({ qr_code: code, scanned_via: 'USB Scanner' })
    });

    // JSON dışı hata sayfası gelirse yakala
    let j;
    try { j = await r.json(); } catch(e) { j = { ok:false, status:r.status, text: await r.text() }; }
    log.textContent = JSON.stringify(j, null, 2);
  }

  btn.addEventListener('click', ()=>{
    const code=(input.value||'').trim();
    if(code){ postScan(code); input.value=''; }
  });
  input.addEventListener('keypress', (e)=>{
    if(e.key==='Enter'){
      const code=(input.value||'').trim();
      if(code){ postScan(code); input.value=''; }
    }
  });

  startCam?.addEventListener('click', async ()=>{
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
    video.srcObject = stream; video.play();
  });
})();
