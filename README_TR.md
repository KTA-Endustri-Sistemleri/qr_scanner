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
# Tam ekran kilitte kullanılacak parola (istemci sunucuya doğrulatır)
bench set-config -g qr_scanner_unlock_password "changeit"
```

> 🐳 Docker ortamında:  
> - `bench build` → **frontend** container’ında  
> - `bench migrate` → **backend/site** container’ında çalıştırılmalı.

---

## ▶️ Kullanım
- Desk’te **QR Scanner** sayfasını açın: `https://your.site/app/qr-scanner`
- **USB tarayıcı** ile okutun veya elle yazıp **Enter**’a basın.
- Geri bildirim:
  - ✅ **Başarılı** → yeşil toast (1–2 sn sonra kapanır)
  - 🔁 **Duplicate** → **tam ekran kırmızı kilit** açılır; parola girin.

**Kullanım kolaylıkları**
- Odak kaybolursa alan otomatik yeniden odaklanır.  
- Aynı kod kısa aralıkla gelirse yoksayılır (debounce).  
- Kilit açıldıktan sonra alan yeniden aktifleşir, dahili durum sıfırlanır.  
- Parola kutusu her seferinde **boş gelir**, autofill devre dışı.

---

## 🔐 İzinler
- Sayfa ve API erişimi artık şu rollere tanımlıdır:
  - `System Manager`
  - `QR Scanner User`
  - `QR Scanner Manager`
- Gerekirse Doctype ve endpoint izinlerini özelleştirebilirsiniz.

---

## 🧪 Duplicate Davranışı
- Duplicate QR kodlar yeniden kaydedilmez.  
- Eşzamanlı işlemler için `QR Scan Record`’da `qr_code` alanına **UNIQUE index** ekleyin.

---

## 🔒 Kilit & Parola
- Duplicate → **tam ekran kırmızı kilit**.  
- Parola girişi `qr_scanner.api.verify_unlock_password` ile sunucuda doğrulanır.  
- Doğru parola → kilit kapanır (istemci tarafı kilit; server cache kullanılmaz).  
- Parola `site_config.json`’da `qr_scanner_unlock_password` anahtarıyla saklanır.

> 🔒 Artık kalıcı sunucu kilidi yok; bu sayede arayüz daha hızlı ve stabil.  
> Parola yine sunucuda doğrulanır.

---

## 🧩 Hızlı Sorun Giderme
| Sorun | Çözüm |
|--------|--------|
| Sayfa görünmüyor | `bench reload-doc "QR Scanner" page qr_scanner` |
| Yetki hatası | Rolleri kontrol edin: System Manager, QR Scanner User, QR Scanner Manager |
| Duplicate çalışmıyor | `qr_code` alanında UNIQUE index olduğundan emin olun |
| Kilit açılmıyor | `qr_scanner_unlock_password` değerini kontrol edin |
| Kilitten sonra tarama duruyor | Güncel JS sürümünü kullanın; parola alanı artık temizleniyor |

---

## 🗺️ Yol Haritası
1. **⚙️ QR Scanner Settings (Single DocType)**  
   Panelden yönetim: `success_toast_ms`, `beep_enabled`, `vibrate_enabled`, `debounce_ms`, `autofocus_back`, `silence_ms` vb.  
   **API:** `qr_scanner.api.get_client_settings`
2. **⚡ Enter’sız Otomatik Gönderim (USB “burst” algılama)**  
   Kısa bir **sessizlik** penceresi sonrası otomatik gönderim (ayarlanabilir eşikler).