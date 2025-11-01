# 📦 QR Scanner (ERPNext v15.81.1)

**USB barkod okuyucu** ⌨️ ile QR etiketlerini tarar ve ERPNext’e kaydeder.  
**Duplicate** durumunda **tam ekran kırmızı kilit** açılır, devam etmek için **yönetici parolası** gerekir.

---

## 🆕 v1.2.0’da Neler Değişti (Özet)
- **Kart içi opak overlay’ler** toast’ların yerini aldı:
  - 🔄 **İşlem yapılıyor** → mavi overlay (`ui_cooldown_ms` süresi)
  - ✅ **Kayıt edildi** → yeşil overlay (`success_toast_ms` süresi)
  - ⚠️ **Uyarı** → amber overlay (ör.: geçersiz uzunluk)
  - Overlay’ler **tamamen opak**, arka planı gizler ve tıklamaları engeller; ERPNext kartının **içinde** render edilir.
- **Durum makinesi**: `setIdle()`, `setLoading()`, `setSuccess()`, `setWarning()` ile tutarlı geçişler.
- **Küçük ekran kilidi** (≤ 420×720): parola ile buton dikey hizalanır, buton %100 genişlik alır.
- **33 karakter doğrulaması**: İstemci tarafında **33 hane değilse** uyarı overlay’i; sunucu `invalid_length` döner.
- **Cihaz/istemci metadata**: Tarayıcıdan sessizce toplanır ve her kayda yazılır (bkz. *Metadata*).
- **Migrasyon gerekli**: DocType alanları eklendi; `qr_code` için UNIQUE index (bkz. *Migrasyon*).

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
  - 🔄 **İşlem yapılıyor** → kart üzerinde **mavi opak katman** (`ui_cooldown_ms`)  
  - ✅ **Kayıt edildi** → kart üzerinde **yeşil opak katman** (`success_toast_ms`)  
  - ⚠️ **Uyarı** → **amber katman** (örnek: **33 karakter** olmayan kodlar)  
  - 🔁 **Duplicate** → tam ekran **kırmızı kilit** açılır; parola girilmesi gerekir.

**Kullanım kolaylıkları**
- Odak kaybolursa alan otomatik yeniden odaklanır.  
- Aynı kod kısa aralıkla gelirse yoksayılır (**debounce**).  
- Kilit açılana kadar ekran durumu hatırlanır.  
- İşlem sırasında giriş alanı devre dışıdır.  
- Cihaz bilgileri otomatik toplanır (model, platform; UI alanı yok).  
- Overlay’ler tamamen **opak** ve odak/tıklamayı engeller.

---

## ⚙️ QR Scan Settings (Single DocType)
Tüm istemci davranışlarını tek panelden yönetebilirsiniz:
- `success_toast_ms` → “Kayıt edildi” ekranı süresi  
- `ui_cooldown_ms` → “İşlem yapılıyor” ekranı süresi  
- `beep_enabled`, `vibrate_enabled` → Ses/Titreşim kontrolü  
- `debounce_ms` → Taramalar arası minimum süre  
- `autofocus_back` → Alan odak yönetimi  
- `silence_ms` → Otomatik gönderim sessizlik eşiği  
- `lock_on_duplicate` → Duplicate durumda kilit açılıp açılmayacağı  
- `unlock_password` → Yönetici parolası (sunucu tarafında doğrulanır)

> ⚡ `site_config.json`’daki `qr_scanner_unlock_password` değeri yedek olarak kullanılır.  
> `get_client_settings` API’si bu ayarları güvenle istemciye taşır.

---

## 🧩 Metadata
Her kayıt cihaz ve istemci bilgisini tutar (alanlar + JSON):
- `device_label`, `device_model`, `device_vendor`, `device_uuid`
- `client_platform`, `client_lang`, `client_hw_threads`, `client_screen`, `client_user_agent`
- Gerekirse ham veri `metadata` (JSON) alanına yazılabilir.
- `client_meta` otomatik gönderilir — **kullanıcı etkileşimi gerekmez**.

---

## 🔧 Migrasyon (v1.2.0)
Bu sürüm **QR Scan Record**’a cihaz/istemci alanları ekler ve migrasyon gerektirir.

1) **DocType alanlarını** ekleyin (yukarıdaki liste).  
2) `qr_code` üzerinde **UNIQUE index** sağlamak için idempotent patch ekleyin:
```python
# qr_scanner/patches/v1_2_0_qr_scan_record_device_fields.py
import frappe
INDEX_NAME = "uniq_qr_code"
def _has_index(name):
    return bool(frappe.db.sql("SHOW INDEX FROM `tabQR Scan Record` WHERE Key_name=%s", (name,), as_dict=True))
def execute():
    if not _has_index(INDEX_NAME):
        frappe.db.sql(f"ALTER TABLE `tabQR Scan Record` ADD UNIQUE KEY `{INDEX_NAME}` (`qr_code`)")
        frappe.db.commit()
```
`patches.txt` sonuna ekleyin:
```
qr_scanner.patches.v1_2_0_qr_scan_record_device_fields
```
3) **Reload & migrate**:
```bash
bench --site your.site reload-doc "QR Scanner" doctype qr_scan_record
bench --site your.site migrate
```

---

## 🔐 İzinler
- Sayfa ve API erişimi şu rollere tanımlıdır:
  - `System Manager`
  - `QR Scanner User`
  - `QR Scanner Manager`

---

## 🧪 Duplicate Davranışı
- Duplicate QR kodlar yeniden kaydedilmez.  
- `QR Scan Record`’da `qr_code` için **UNIQUE index** olduğundan emin olun.

---

## 🔒 Kilit & Parola
- Duplicate → **tam ekran kırmızı kilit**  
- Parola `qr_scanner.api.verify_unlock_password` ile doğrulanır.  
- Parola `QR Scan Settings` veya `site_config.json` üzerinden yönetilir.  
- Kilit doğru parola girilene kadar açık kalır.

---

## 🧩 Hızlı Sorun Giderme
| Sorun | Çözüm |
|--------|--------|
| Sayfa görünmüyor | `bench reload-doc "QR Scanner" page qr_scanner` |
| Yetki hatası | System Manager / QR Scanner rollerini kontrol edin |
| Duplicate çalışmıyor | `qr_code` alanında UNIQUE index olduğundan emin olun |
| Parola ekranı açılmıyor | `lock_on_duplicate` ayarını kontrol edin |
| Parola yok | QR Scan Settings → Unlock Password alanını doldurun |
| Overlay süresi | `ui_cooldown_ms` veya `success_toast_ms` ayarlarını güncelleyin |
| Uzunluk uyarısı | Kod **tam 33 karakter** olmalıdır |