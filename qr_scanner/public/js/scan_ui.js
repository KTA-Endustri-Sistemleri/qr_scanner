(async function(){
  const input = document.getElementById('qr_input');
  const btn = document.getElementById('submit_btn');
  const log = document.getElementById('log');
  const startCam = document.getElementById('start_cam');
  const video = document.getElementById('preview');

  async function postScan(code){
    const r = await fetch('/api/method/qr_scanner.api.create_scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ qr_code: code, scanned_via: 'USB Scanner' })
    });
    log.textContent = JSON.stringify(await r.json(), null, 2);
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

  // Kamera başlatma (decode kütüphanesini sonra ekleyeceğiz)
  startCam.addEventListener('click', async ()=>{
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
    video.srcObject = stream; video.play();
  });
})();
