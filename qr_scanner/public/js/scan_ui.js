(function () {
  const input = document.getElementById('qr_input');
  const btn = document.getElementById('submit_btn');
  const log = document.getElementById('log');
  const startCam = document.getElementById('start_cam');
  const video = document.getElementById('preview');

  // --- CSRF alma ---
  let CSRF = "";
  async function fetchCsrf() {
    const r = await fetch('/api/method/qr_scanner.api.get_csrf', {
      method: 'GET',
      credentials: 'include',
      headers: { 'Accept': 'application/json' }
    });
    const j = await r.json();
    CSRF = j.message?.csrf_token || j.csrf_token || "";
  }
  fetchCsrf();

  async function postScan(code, via='USB Scanner') {
    if (!CSRF) await fetchCsrf();
    const r = await fetch('/api/method/qr_scanner.api.create_scan', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Frappe-CSRF-Token': CSRF
      },
      body: JSON.stringify({ qr_code: code, scanned_via: via })
    });
    let j; try { j = await r.json(); } catch(e) { j = { ok:false, status:r.status, text: await r.text() }; }
    if (log) log.textContent = JSON.stringify(j, null, 2);
  }

  // --- USB input ---
  btn?.addEventListener('click', () => {
    const code = (input?.value || '').trim();
    if (code) { postScan(code); if (input) input.value = ''; }
  });
  input?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      const code = (input.value || '').trim();
      if (code) { postScan(code); input.value = ''; }
    }
  });

  // --- Kamera ile QR okuma (jsQR) ---
  let stream = null;
  let rafId = null;
  let lastDecoded = "";
  let lastTime = 0;

  // Görüntüyü işlemek için gizli bir canvas oluştur
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  function beep() {
    try {
      const ac = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.connect(gain); gain.connect(ac.destination);
      osc.frequency.value = 880; gain.gain.value = 0.06;
      osc.start(); setTimeout(()=>{ osc.stop(); ac.close(); }, 120);
    } catch {}
  }

  async function startCamera() {
    // not: mobilde arka kamera için environment
    const constraints = {
      video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: false
    };
    stream = await navigator.mediaDevices.getUserMedia(constraints);
    video.srcObject = stream;
    await video.play();
    scanLoop();
  }

  function stopCamera() {
    if (rafId) cancelAnimationFrame(rafId);
    rafId = null;
    if (stream) {
      stream.getTracks().forEach(t => t.stop());
      stream = null;
    }
  }

  function scanLoop() {
    if (!video.videoWidth) { rafId = requestAnimationFrame(scanLoop); return; }
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const img = ctx.getImageData(0, 0, canvas.width, canvas.height);

    if (window.jsQR) {
      const now = performance.now();
      if (now - lastTime > 160) { // ~6fps decode
        const res = window.jsQR(img.data, img.width, img.height, { inversionAttempts: 'attemptBoth' });
        lastTime = now;
        if (res && res.data) {
          const code = res.data.trim();
          // Aynı kodu 1 sn içinde tekrar göndermeyelim
          const shouldSend = code && (code !== lastDecoded || (now - lastTime) > 1000);
          if (shouldSend) {
            lastDecoded = code;
            beep();
            postScan(code, 'Mobile Camera');
          }
        }
      }
    } else {
      if (log) log.textContent = 'jsQR yüklenemedi. Script etiketini kontrol edin.';
    }

    rafId = requestAnimationFrame(scanLoop);
  }

  startCam?.addEventListener('click', () => {
    if (!stream) startCamera().catch(err => {
      console.error(err);
      alert('Camera start failed: ' + err.message);
    });
    else { stopCamera(); startCamera().catch(console.error); }
  });

  // Sayfa kapanırken kamerayı kapat
  window.addEventListener('beforeunload', stopCamera);
})();