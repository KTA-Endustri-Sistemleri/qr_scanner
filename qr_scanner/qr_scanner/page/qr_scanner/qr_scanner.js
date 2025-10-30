// --- QR Scanner – ERPNext card stays default; OPAQUE full-bleed overlays for loading/success ---
frappe.pages['qr_scanner'].on_page_load = function (wrapper) {
  const page = frappe.ui.make_app_page({ parent: wrapper, title: 'QR Scanner', single_column: true });

  $(page.body).html(`
    <style>
      .qr-container { width:100%; max-width:960px; margin:16px auto; padding:0 12px; }

      /* Kartın stiline dokunmuyoruz; sadece overlay için konumlandırma */
      .qr-card { position: relative; }

      .qr-section { padding:18px; }
      .qr-title { font-weight:700; font-size:1.05rem; margin-bottom:8px; }
      .qr-row { display:flex; gap:10px; align-items:center; }
      .qr-help { color:#6b7280; margin-top:8px; }
      @media (prefers-color-scheme: dark){ .qr-help{ color:#9ca3af; } }

      .qr-input{
        flex:1; font-size:1.1rem; padding:12px 14px;
        border-radius:10px; border:1px solid #e5e7eb; background:#fff; color:#0f172a;
      }
      .qr-input:focus{ outline:none; border-color:#60a5fa; box-shadow:0 0 0 3px rgba(96,165,250,.22); }
      @media (prefers-color-scheme: dark){
        .qr-input{ background:#0f172a; color:#e5e7eb; border-color:#243042; }
      }

      /* === O P A K  OVERLAYLER === */
      .qr-overlay{
        position:absolute; inset:0; z-index:1;
        border-radius: inherit; display:none;
        pointer-events: all; /* alttaki input'a tıklanmasın */
      }
      .qr-overlay .qr-overlay-content{
        display:flex; flex-direction:column; justify-content:center; align-items:center;
        text-align:center; width:100%; height:100%; gap:8px; font-weight:600; padding:18px; color:inherit;
      }

      /* Loading: düz mavi + beyaz metin/ikon */
      .qr-overlay.loading{ background:#1e40af; color:#ffffff; }      /* blue-800 */
      .qr-overlay.loading .qr-spinner{
        width:18px; height:18px; border:2px solid rgba(255,255,255,.35);
        border-top-color:#ffffff; border-radius:50%; animation:qrs .8s linear infinite;
      }
      @keyframes qrs{ to{ transform: rotate(360deg) } }

      /* Success: düz yeşil + beyaz metin/ikon */
      .qr-overlay.success{ background:#166534; color:#ffffff; }      /* green-800 */
      .qr-overlay.success .qr-dot-ok{ width:12px; height:12px; border-radius:50%; background:#ffffff; }

      /* Dark mode – opak tonları bir seviye koyulaştır */
      @media (prefers-color-scheme: dark){
        .qr-overlay.loading{ background:#1e3a8a; }  /* blue-900 */
        .qr-overlay.success{ background:#14532d; }  /* green-900 */
      }

      /* Lock overlay (değişmedi) */
      .qr-lock{position:fixed;inset:0;background:#dc3545;z-index:10000;display:none;color:#fff}
      .qr-lock.show{display:flex}
      .qr-lock-inner{margin:auto;width:min(560px,90vw);background:rgba(0,0,0,.18);border-radius:14px;padding:20px;box-shadow:0 12px 40px rgba(0,0,0,.35);backdrop-filter:blur(2px)}
      .qr-lock-title{font-size:1.15rem;font-weight:700;margin-bottom:6px}
      .qr-lock-desc{opacity:.9;margin-bottom:14px}
      .qr-lock-form{display:flex;gap:8px}
      .qr-lock-input{flex:1;padding:12px 14px;border-radius:10px;border:none;outline:none;font-size:1rem}
      .qr-lock-btn{padding:12px 16px;border-radius:10px;border:none;cursor:pointer;font-weight:600}
      .qr-lock-error{margin-top:10px;font-weight:600;display:none}
    </style>

    <div class="qr-container">
      <div id="qrCard" class="card qr-card">
        <!-- KART İÇERİĞİ (hep görünür; overlay üstten kaplar) -->
        <div class="qr-section" role="region" aria-live="polite" aria-atomic="true">
          <div class="qr-title">USB / Klavye Wedge</div>
          <div class="qr-row">
            <input id="manual" type="text" class="form-control qr-input"
                   placeholder="USB tarayıcıyla okutun veya elle yazıp Enter'a basın" autofocus />
          </div>
          <div class="qr-help">Durumlar kartın <strong>üstünde</strong> gösterilir; kartın rengine dokunmayız. Duplicate olursa parola istenir.</div>
        </div>

        <!-- LOADING OVERLAY (OPAK) -->
        <div id="overlayLoading" class="qr-overlay loading" aria-hidden="true">
          <div class="qr-overlay-content" aria-live="polite">
            <div class="qr-spinner" aria-hidden="true"></div>
            <div>İşlem yapılıyor…</div>
            <div class="qr-help" style="color:#fff;opacity:.9">Kayıt gönderiliyor, lütfen bekleyin.</div>
          </div>
        </div>

        <!-- SUCCESS OVERLAY (OPAK) -->
        <div id="overlaySuccess" class="qr-overlay success" aria-hidden="true">
          <div class="qr-overlay-content" aria-live="polite">
            <div class="qr-dot-ok" aria-hidden="true"></div>
            <div>Kayıt edildi</div>
            <div id="successDesc" class="qr-help" style="color:#fff;opacity:.9">İşlem tamamlandı.</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Lock -->
    <div id="qrLock" class="qr-lock" role="dialog" aria-modal="true" aria-labelledby="qrLockTitle">
      <div class="qr-lock-inner">
        <div id="qrLockTitle" class="qr-lock-title">Erişim Kilitli</div>
        <div id="qrLockDesc"  class="qr-lock-desc">Yinelenen barkod algılandı. Devam etmek için yönetici parolasını girin.</div>
        <form id="qrLockForm" class="qr-lock-form" autocomplete="off">
          <input type="text" tabindex="-1" aria-hidden="true" style="position:absolute;left:-9999px;top:-9999px" />
          <input id="qrLockInput" class="qr-lock-input" type="password" placeholder="Yönetici parolası"
                 name="unlock_pwd" autocomplete="new-password" autocapitalize="off" autocorrect="off" spellcheck="false" inputmode="text" />
          <button id="qrLockBtn" class="qr-lock-btn" type="submit">Kilidi Aç</button>
        </form>
        <div id="qrLockError" class="qr-lock-error">Parola hatalı.</div>
      </div>
    </div>
  `);

  // --- Refs ---
  const manual         = document.getElementById('manual');
  const overlayLoading = document.getElementById('overlayLoading');
  const overlaySuccess = document.getElementById('overlaySuccess');
  const successDesc    = document.getElementById('successDesc');

  // Overlay göster/gizle (opak)
  function showOverlay(el){
    if (overlayLoading) overlayLoading.style.display = (el === overlayLoading) ? 'block' : 'none';
    if (overlaySuccess) overlaySuccess.style.display = (el === overlaySuccess) ? 'block' : 'none';
  }
  // Başlangıç: overlay yok
  showOverlay(null);

  // ---- Settings ----
  let CFG = {
    success_toast_ms: 1500,  // success overlay süresi
    beep_enabled:     1,
    vibrate_enabled:  1,
    debounce_ms:      800,
    autofocus_back:   1,
    silence_ms:       120,
    lock_on_duplicate:1,
    loading_enabled:  1,
    ui_cooldown_ms:   1000   // loading overlay süresi
  };
  const applySettings = function(s){ if (s) CFG = Object.assign(CFG, s || {}); };
  frappe.call({ method: 'qr_scanner.api.get_client_settings' })
    .then(function(r){ applySettings(r.message); })
    .catch(function(){});

  // ---- SFX ----
  function beep(freq, ms){
    if(!CFG.beep_enabled) return;
    try{
      const ctx=new (window.AudioContext||window.webkitAudioContext)();
      const osc=ctx.createOscillator(); const g=ctx.createGain();
      osc.connect(g); g.connect(ctx.destination);
      osc.type='sine'; osc.frequency.value=freq||880; g.gain.value=0.06;
      osc.start(); setTimeout(function(){ osc.stop(); ctx.close(); }, ms||110);
    }catch(_){}
  }
  function vibrate(ms){ if(CFG.vibrate_enabled && navigator.vibrate) navigator.vibrate(ms||60); }

  // ---- State / timers ----
  const DEBUG = window.QR_DEBUG === true;
  let isLocked=false, inFlight=false, lastCode='', lastTime=0;
  let cooldownEndsAt=0, toSuccessTimer=null, successHideTimer=null;

  function focusInput(){ setTimeout(function(){ manual && manual.focus(); }, 30); }
  function clearTimers(){
    if(toSuccessTimer){ clearTimeout(toSuccessTimer); toSuccessTimer=null; }
    if(successHideTimer){ clearTimeout(successHideTimer); successHideTimer=null; }
  }

  function setIdle(){
    showOverlay(null);
    if(manual){ manual.removeAttribute('disabled'); }
    focusInput();
  }
  function setLoading(){
    showOverlay(overlayLoading);
    if(manual){ manual.setAttribute('disabled','disabled'); }
  }
  function setSuccess(name){
    if(successDesc) successDesc.textContent = name ? 'Belge: ' + name : 'İşlem tamamlandı.';
    showOverlay(overlaySuccess);
    if(manual){ manual.setAttribute('disabled','disabled'); }
  }

  function startCooldown(ms){
    if(!CFG.loading_enabled) return;
    const dur = Number(ms != null ? ms : (CFG.ui_cooldown_ms || 1000));
    if(dur<=0) return;
    inFlight=true;
    setLoading();
    cooldownEndsAt=Date.now()+dur;
  }

  function scheduleSuccess(name){
    const remaining=Math.max(0, cooldownEndsAt - Date.now());
    if(toSuccessTimer) clearTimeout(toSuccessTimer);
    toSuccessTimer=setTimeout(function(){
      setSuccess(name);
      const successMs = Number(CFG.success_toast_ms || 1500);
      if(successHideTimer) clearTimeout(successHideTimer);
      successHideTimer=setTimeout(function(){
        setIdle();
        inFlight=false;
      }, successMs);
    }, remaining);
  }

  function abortToIdle(){ clearTimers(); setIdle(); inFlight=false; }

  // ---- Lock ----
  function engageLock(reason){
    abortToIdle();
    isLocked=true;
    if(manual) manual.setAttribute('disabled','disabled');

    const lockDesc = document.getElementById('qrLockDesc');
    const lockErr  = document.getElementById('qrLockError');
    const lockEl   = document.getElementById('qrLock');
    const lockInput= document.getElementById('qrLockInput');

    if(lockDesc){
      lockDesc.textContent = (reason==='duplicate')
        ? 'Yinelenen barkod algılandı. Devam etmek için yönetici parolasını girin.'
        : 'Devam etmek için yönetici parolasını girin.';
    }
    if(lockErr) lockErr.style.display='none';
    if(lockEl)  lockEl.classList.add('show');

    if(lockInput){
      lockInput.value='';
      setTimeout(function(){ try{ lockInput.value=''; }catch(_){ } }, 0);
      setTimeout(function(){ lockInput.focus(); }, 50);
    }
    try{ localStorage.setItem('qr_lock', reason || 'duplicate'); }catch(_){}
    if(DEBUG) console.debug('[QR] engageLock:', reason);
  }
  function releaseLock(){
    isLocked=false;
    const lockEl=document.getElementById('qrLock');
    if(lockEl) lockEl.classList.remove('show');
    if(manual){ manual.removeAttribute('disabled'); manual.value=''; }
    lastCode=''; lastTime=0; inFlight=false;
    try{ localStorage.removeItem('qr_lock'); }catch(_){}
    setIdle();
  }

  (document.getElementById('qrLockInput')||{}).addEventListener?.('focus', function(){
    const el=document.getElementById('qrLockInput'); if(el) el.value='';
  }, { once:true });

  try{ const ls=localStorage.getItem('qr_lock'); if(ls) engageLock(ls); }catch(_){}

  document.getElementById('qrLockForm').addEventListener('submit', function(e){
    e.preventDefault();
    const lockInput=document.getElementById('qrLockInput');
    const lockErr  =document.getElementById('qrLockError');
    const lockBtn  =document.getElementById('qrLockBtn');
    const pw=(lockInput.value||'').trim();
    if(!pw){ if(lockErr){ lockErr.textContent='Parola boş olamaz.'; lockErr.style.display='block'; } return; }
    if(lockBtn) lockBtn.setAttribute('disabled','disabled');

    const req=frappe.call({ method:'qr_scanner.api.verify_unlock_password', args:{ password: pw } });
    req.then(function(r){
      const m=r.message||{};
      if(m.ok){ lockInput.value=''; releaseLock(); beep(880,110); vibrate(40); }
      else{
        if(lockErr) lockErr.textContent = (m.reason==='not_configured')
          ? 'Parola yapılandırılmamış. Lütfen yöneticinize başvurun.' : 'Parola hatalı.';
        if(lockErr) lockErr.style.display='block';
        lockInput.value=''; beep(220,160); vibrate(90);
      }
    }).catch(function(){
      if(lockErr){ lockErr.textContent='Sunucuya ulaşılamadı.'; lockErr.style.display='block'; }
      lockInput.value=''; beep(220,160); vibrate(90);
    }).finally(function(){ if(lockBtn) lockBtn.removeAttribute('disabled'); });
  });

  // ---- Submit Flow ----
  function onScanned(code){
    if(isLocked || inFlight) return;
    const now=Date.now();
    if(code===lastCode && (now-lastTime)<(CFG.debounce_ms||800)) return;
    lastCode=code; lastTime=now;

    startCooldown(CFG.ui_cooldown_ms);

    const req=frappe.call({
      method:'qr_scanner.api.create_scan',
      args:{ qr_code:code, scanned_via:'USB Scanner' }
    });

    req.then(function(r){
      const m=r.message||{};
      if(m.created){
        beep(900,110); vibrate(40);
        scheduleSuccess(m.name);
      }else if(m.reason==='duplicate'){
        if(CFG.lock_on_duplicate) engageLock('duplicate');
        else { frappe.show_alert({ message:'Duplicate: bu barkod daha önce okutulmuş.', indicator:'red' }); abortToIdle(); }
        beep(220,160); vibrate(90);
      }else{
        const serverMsg = m.msg ||
          (r && r._server_messages && (function(){ try{ return JSON.parse(r._server_messages).join(' '); }catch(_){ return null; } })()) ||
          'İşlem tamamlanamadı.';
        frappe.show_alert({ message: serverMsg, indicator:'red' });
        abortToIdle();
        beep(220,160); vibrate(90);
      }
    }).catch(function(){
      frappe.show_alert({ message:'Sunucuya ulaşılamadı.', indicator:'red' });
      abortToIdle();
      beep(220,160); vibrate(90);
    });
  }

  // Enter ile gönderim
  manual.addEventListener('keydown', function(e){
    if(isLocked || inFlight){ e.preventDefault(); return; }
    if(e.key==='Enter'){
      e.preventDefault();
      const val=manual.value.trim();
      manual.value='';
      if(val) onScanned(val);
    }
  });

  // Odak yönetimi
  manual.addEventListener('blur', function(){
    if(CFG.autofocus_back && !isLocked && !inFlight) setTimeout(function(){ manual.focus(); }, 50);
  });

  // İlk durum
  setIdle();
};