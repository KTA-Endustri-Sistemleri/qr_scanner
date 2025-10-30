# 📦 QR Scanner (ERPNext v15.81.1)

**USB barkod okuyucu** ⌨️ ile QR etiketlerini tarar ve ERPNext’e kaydeder.  
**Duplicate** durumunda **tam ekran kırmızı kilit** açılır, devam etmek için **yönetici parolası** gerekir.

---

## 🧰 Kurulum
```bash
cd ~/frappe-bench
bench get-app qr_scanner https://github.com/KTA-Endustri-Sistemleri/qr_scanner.git
bench --site your.site install-app qr_scanner
bench --site your.site migrate
bench build && bench restart
```
> 🐳 **Docker ortamında:**
> - `bench build` → **frontend** container’ında  
> - `bench migrate` → **backend/site** container’ında çalıştırılmalıdır.

---

## ▶️ Kullanım
- Desk’te **QR Scanner** sayfasını açın: `https://your.site/app/qr-scanner`  
- **USB tarayıcı** ile okutun veya elle yazıp **Enter**’a basın.  
- Geri bildirim:
  - 🔄 **İşlem yapılıyor** → kart üzerinde **mavi opak katman** (süre: `ui_cooldown_ms`)  
  - ✅ **Kayıt edildi** → kart üzerinde **yeşil opak katman** (süre: `success_toast_ms`)  
  - 🔁 **Duplicate** → tam ekran **kırmızı kilit** açılır; parola girilmesi gerekir.

**Kullanım kolaylıkları**
- Odak kaybolursa alan otomatik yeniden odaklanır.  
- Aynı kod kısa aralıkla gelirse yoksayılır (**debounce**).  
- Kilit açıldıktan sonra alan yeniden aktifleşir, dahili durum sıfırlanır.  
- Parola kutusu her seferinde **boş gelir**, autofill devre dışıdır.  
- Artık toast yok — tüm görsel geri bildirimler **kartın içinde** gösterilir.  
- Overlay’ler **opak** olup arka planı tamamen gizler ve tıklamaları engeller.

---

## ⚙️ QR Scan Settings (Single DocType)
Tüm istemci davranışlarını tek panelden yönetebilirsiniz:
- `success_toast_ms` → Kayıt edildi ekranı süresi  
- `ui_cooldown_ms` → İşlem yapılıyor ekranı süresi  
- `beep_enabled`, `vibrate_enabled` → Ses/Titreşim kontrolü  
- `debounce_ms` → Taramalar arası minimum süre  
- `autofocus_back` → Tarayıcı alanına otomatik odaklanma  
- `silence_ms` → Otomatik gönderim sessizlik eşiği  
- `lock_on_duplicate` → Duplicate durumda kilit açılıp açılmayacağı  
- `unlock_password` → Yönetici parolası (sunucuda doğrulanır)

> ⚡ `site_config.json`’daki `qr_scanner_unlock_password` değeri yedek olarak kullanılır.  
> `get_client_settings` API’si bu DocType’tan istemciye ayarları taşır.

---

## 🔐 İzinler
- Sayfa ve API erişimi şu rollere tanımlıdır:
  - `System Manager`
  - `QR Scanner User`
  - `QR Scanner Manager`
- Gerekirse Doctype veya endpoint izinlerini özelleştirebilirsiniz.

---

## 🧪 Duplicate Davranışı
- Duplicate QR kodlar yeniden kaydedilmez.  
- Eşzamanlı işlemler için `QR Scan Record`’da `qr_code` alanına **UNIQUE index** önerilir.

---

## 🔒 Kilit & Parola
- Duplicate → **tam ekran kırmızı kilit**  
- Parola `qr_scanner.api.verify_unlock_password` ile sunucuda doğrulanır  
- Doğru parola → kilit kapanır (istemci tarafı kilit; sunucu cache kullanılmaz)  
- Parola ayarı `QR Scan Settings` içinden veya `site_config.json`’dan yönetilir  

> 🔒 Kalıcı sunucu kilidi artık yok — tüm kontrol istemci tarafında, doğrulama ise sunucuda.

---

## 🧩 Hızlı Sorun Giderme
| Sorun | Çözüm |
|--------|--------|
| Sayfa görünmüyor | `bench reload-doc "QR Scanner" page qr_scanner` |
| Yetki hatası | Rolleri kontrol edin: System Manager, QR Scanner User, QR Scanner Manager |
| Duplicate çalışmıyor | `qr_code` alanında UNIQUE index olduğundan emin olun |
| Parola ekranı açılmıyor | `lock_on_duplicate` ayarını kontrol edin |
| Parola tanımlı değil | QR Scan Settings → Unlock Password alanını doldurun |
| Kilitten sonra tarama duruyor | Güncel JS sürümünü kullanın; parola alanı artık sıfırlanıyor |
| Overlay çok hızlı kayboluyor | `ui_cooldown_ms` veya `success_toast_ms` ayarlarını güncelleyin |