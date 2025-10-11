// QR Scanner Desk Page – USB + Camera
frappe.pages['qr_scanner'].on_page_load = function (wrapper) {
  const page = frappe.ui.make_app_page({
    parent: wrapper,
    title: 'QR Scanner',
    single_column: true
  });

  $(page.body).html(`
    <div class="p-4">
      <div class="grid" style="grid-template-columns: 1fr; gap: 12px;">
        <div>
          <label class="form-label">USB / Klavye Wedge</label>
          <input id="manual" type="text" class="form-control"
                 placeholder="USB tarayıcıyla okutun veya elle yazıp Enter'a basın" autofocus />
        </div>

        <div class="row g-2 align-items-end">
          <div class="col-sm-6">
            <label class="form-label">Kamera Cihazı</label>
            <select id="cameraSelect" class="form-select"></select>
          </div>
          <div class="col-sm-6">
            <button id="startBtn" class="btn btn-primary">Kamerayı Başlat</button>
            <button id="stopBtn"  class="btn btn-secondary" disabled>Dur</button>
          </div>
        </div>

        <div>
          <video id="video" playsinline autoplay style="width:100%;max-height:55vh;border-radius:8px;background:#000"></video>
          <canvas id="canvas" style="display:none"></canvas>
        </div>

        <div id="status" class="text-muted">Hazır</div>
      </div>
    </div>
  `);

  const $body = $(page.body);
  const manual = $body.find('#manual')[0];
  const statusEl = $body.find('#status')[0];
  const video = $body.find('#video')[0];
  const canvas = $body.find('#canvas')[0];
  const cameraSelect = $body.find('#cameraSelect')[0];
  const startBtn = $body.find('#startBtn')[0];
  const stopBtn  = $body.find('#stopBtn')[0];

  let stream = null;
  let scanning = false;
  let rafId = null;
  let lastCode = '';
  let lastTime = 0;
  let useBarcodeDetector = false;
  let jsQRReady = false;

  function setStatus(msg) {
    if (statusEl) statusEl.textContent = msg;
  }

  // ---- SERVER CALL
  function onScanned(code, source) {
    // Debounce (aynı kodu 1200ms içinde tekrar gönderme)
    const now = Date.now();
    if (code === lastCode && (now - lastTime) < 1200) return;
    lastCode = code; lastTime = now;

    setStatus('Okundu: ' + code);
    frappe.call({
      method: 'qr_scanner.api.create_scan',
      args: { qr_code: code, scanned_via: source }
    }).then(r => {
      const m = r.message || {};
      if (m.created) setStatus('Kayıt edildi: ' + m.name);
      else if (m.reason === 'duplicate') setStatus('Duplicate: daha önce okutulmuş.');
      else setStatus('İşlem: ' + JSON.stringify(m));
    }).catch(() => setStatus('Sunucu hatası'));
  }

  // ---- USB / Keyboard wedge
  if (manual) {
    manual.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const val = manual.value.trim();
        if (val) onScanned(val, 'USB Scanner');
        manual.value = '';
      }
    });
  }

  // ---- Camera helpers
  async function listCameras() {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videos = devices.filter(d => d.kind === 'videoinput');
      cameraSelect.innerHTML = '';
      videos.forEach((d, i) => {
        const opt = document.createElement('option');
        opt.value = d.deviceId;
        opt.textContent = d.label || `Kamera ${i+1}`;
        cameraSelect.appendChild(opt);
      });

      // Arka kamera varsa onu seç
      const back = videos.find(d => /back|arka|environment/i.test(d.label));
      if (back) cameraSelect.value = back.deviceId;
    } catch (err) {
      setStatus('Kamera listelenemedi: ' + err);
    }
  }

  async function startCamera() {
    try {
      await stopCamera();

      const deviceId = cameraSelect.value || undefined;
      const constraints = deviceId
        ? { video: { deviceId: { exact: deviceId } } }
        : { video: { facingMode: { ideal: 'environment' } } };

      stream = await navigator.mediaDevices.getUserMedia(constraints);
      video.srcObject = stream;
      await video.play();

      // BarcodeDetector destekli mi?
      useBarcodeDetector = (window.BarcodeDetector && BarcodeDetector.getSupportedFormats)
        ? (await BarcodeDetector.getSupportedFormats()).includes('qr_code')
        : false;

      if (!useBarcodeDetector) {
        // jsQR'yi dinamik yükle
        await ensureJsQR();
      }

      scanning = true;
      startBtn.disabled = true;
      stopBtn.disabled = false;
      setStatus(useBarcodeDetector ? 'Kamera açık (BarcodeDetector)' : 'Kamera açık (jsQR)');

      tick();
    } catch (err) {
      setStatus('Kamera açılamadı: ' + err);
    }
  }

  async function stopCamera() {
    scanning = false;
    if (rafId) cancelAnimationFrame(rafId);
    rafId = null;

    if (stream) {
      stream.getTracks().forEach(t => t.stop());
      stream = null;
    }
    startBtn.disabled = false;
    stopBtn.disabled = true;
  }

  function tick() {
    if (!scanning) return;

    if (useBarcodeDetector) {
      detectWithBarcodeDetector();
    } else {
      detectWithJsQR();
    }
  }

  async function detectWithBarcodeDetector() {
    try {
      const detector = new BarcodeDetector({ formats: ['qr_code'] });
      const scan = async () => {
        if (!scanning) return;
        const barcodes = await detector.detect(video);
        if (barcodes && barcodes.length) {
          const code = (barcodes[0].rawValue || '').trim();
          if (code) onScanned(code, 'Mobile Camera');
        }
        rafId = requestAnimationFrame(scan);
      };
      rafId = requestAnimationFrame(scan);
    } catch (err) {
      setStatus('BarcodeDetector hatası, jsQR’ye düşülüyor: ' + err);
      useBarcodeDetector = false;
      detectWithJsQR();
    }
  }

  function detectWithJsQR() {
    if (!jsQRReady) {
      setStatus('jsQR yükleniyor…');
      // jsQR yüklenememişse bekle, sonra tekrar dene
      rafId = requestAnimationFrame(detectWithJsQR);
      return;
    }

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const W = Math.min(640, video.videoWidth || 640);
    const H = Math.floor(W * (video.videoHeight ? video.videoHeight / video.videoWidth : 3/4));
    canvas.width = W; canvas.height = H;

    const loop = () => {
      if (!scanning) return;
      try {
        ctx.drawImage(video, 0, 0, W, H);
        const imgData = ctx.getImageData(0, 0, W, H);
        const result = window.jsQR && window.jsQR(imgData.data, W, H, { inversionAttempts: 'dontInvert' });
        if (result && result.data) {
          const code = (result.data || '').trim();
          if (code) onScanned(code, 'Mobile Camera');
        }
      } catch (e) {
        // çerçeve çizimi sırasında hata olabilir; yoksay ve devam et
      }
      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);
  }

  function ensureJsQR() {
    return new Promise((resolve, reject) => {
      if (window.jsQR) { jsQRReady = true; return resolve(); }
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js';
      s.onload = () => { jsQRReady = true; resolve(); };
      s.onerror = (e) => reject(e);
      document.head.appendChild(s);
    });
  }

  // UI events
  startBtn.addEventListener('click', startCamera);
  stopBtn.addEventListener('click', stopCamera);

  // load cameras on entry
  if (navigator.mediaDevices?.enumerateDevices) listCameras();

  // cleanup on leave
  wrapper.addEventListener('page-change', stopCamera);
  window.addEventListener('beforeunload', stopCamera);
};