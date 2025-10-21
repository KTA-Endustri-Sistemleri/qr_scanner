# 📦 QR Scanner (ERPNext v15.81.1)

Test cihazından gelen QR etiketlerini **USB barkod okuyucu** ⌨️ ile tarayıp ERPNext’e kaydeder. **Duplicate** kayıtları 🚫 otomatik engeller.

---

## 🧰 Kurulum
```bash
cd ~/frappe-bench
bench get-app qr_scanner https://github.com/KTA-Endustri-Sistemleri/qr_scanner.git
bench --site your.site install-app qr_scanner
bench --site your.site migrate
bench build && bench restart
bench set-config -g qr_scanner_unlock_password "changeit"
```

---

## ▶️ Kullanım
- Desk’te **QR Scanner** sayfasını açın: `https://your.site/app/qr-scanner`  
- **USB tarayıcı** ile okutun.  
- Sonuçlar **toast** bildirimleriyle görünür:  
  - ✅ **Başarılı** → yeşil, 1–2 sn sonra kendiliğinden kapanır.  
  - 🔁 **Duplicate** → kırmızı, kullanıcı kapatana kadar kalır.

> 💡 **İpucu:** USB tarayıcı odak kaybederse alan otomatik yeniden odaklanır. Hızlı taramalarda aynı kod kısa aralıkla tekrarlandıysa yazılım bunu yoksayar (debounce).

---

## 🔐 İzinler
- Sayfa ve API, varsayılan olarak **System Manager** (ve isterseniz `QR Scanner User`) rolü ile sınırlandırılabilir.
- Doctype ve endpoint izinlerini ihtiyacınıza göre düzenleyin.

---

## 🧪 Duplicate Davranışı
- Sunucu tarafında duplicate kontrolü yapılır; duplicate olan barkod **yeniden kaydedilmez**.  
- Eşzamanlı taramalar için veritabanında `qr_code` alanında **UNIQUE index** önerilir (veri bütünlüğü için).

---

## 🧩 Hızlı Sorun Giderme
- 🖥️ **Sayfa görünmüyor:** `reload-doc` → `bench --site your.site reload-doc "QR Scanner" page qr_scanner`  
- 🔑 **Yetki hatası:** Rol atamalarını kontrol edin (System Manager / QR Scanner User).   
- 🔁 **Duplicate beklediğim gibi değil:** `qr_code` alanında UNIQUE index ve API’de race-safe insert olduğundan emin olun.

---

## 🗺️ Feature Olarak Eklenecekler (Roadmap)
1. **⚙️ QR Scanner Settings (Single DocType)**  
   Panelden yönetilecek ayarlar:  
   `success_toast_ms`, `duplicate_sticky`, `beep_enabled`, `vibrate_enabled`, `debounce_ms`, `autofocus_back`.  
   **API:** `qr_scanner.api.get_client_settings` ile JS varsayılanlarını server tarafından override edeceğiz.

2. **⚡ Enter’sız Otomatik Gönderim (USB “burst” algılama)**  
   Barkod okuyucudan gelen hızlı tuş vuruşlarını algılayıp kısa bir **sessizlikte** otomatik gönderim.  
   Ayarlanabilir eşikler: `silence_ms`, `min_len`, `burst_threshold_ms`, `burst_min_keys` (tercihen Settings üzerinden).

---