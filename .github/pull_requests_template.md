<!--
Title suggestion:
feat: integrate QR Scan Settings + client-side lock & server-side password verify
-->

<!-- Choose your language below (TR/EN) -->

<details>
<summary>🇹🇷 Türkçe</summary>

## Özet
QR Scan Settings (Single DocType) eklendi; istemci ayarları (toast süresi, beep/vibrate, debounce, autofocus, silence vb.) panelden yönetiliyor. 
Duplicate’te client-side kırmızı kilit devreye giriyor; parola sunucuda doğrulanıyor (Unlock Password). Kalıcı server lock kaldırıldı.

## Neler değişti?
- [x] `QR Scan Settings` (Single DocType) + `get_client_settings` API
- [x] `verify_unlock_password`: parola doğrulama (DocType alanı → yoksa site_config fallback)
- [x] `qr_scanner.js`: client-side lock, parola alanı her kilitte temizlenir, debounce/inFlight reset
- [x] Rollere `QR Scanner Manager` eklendi (Page + API erişiminde)
- [x] README.tr.md / README.en.md güncellendi (roadmap kaldırıldı)

## Ekran görüntüsü / Notlar
<!-- İstersen ekran görüntüsü ekle -->
- QR Scan Settings → Unlock Password alanı eklendi
- Duplicate → tam ekran kırmızı kilit → parola gir → devam

## Test Planı
1. **Başarılı kayıt**: benzersiz QR okut → yeşil toast kapanıyor mu?
2. **Duplicate**: aynı QR’i tekrar okut → kilit geliyor mu?
3. **Parola**: doğru parola → kilit kapanıyor mu, input odak/temiz mi?
4. **Yanlış parola**: hata mesajı ve şifre alanı temizleniyor mu?
5. **Parola tanımlı değil**: `not_configured` davranışı beklenen mi? (ayar politikanıza göre)
6. **Debounce**: 800ms içinde aynı kod gelirse yoksayıyor mu?
7. **Autofocus**: odak kaybında input geri odaklanıyor mu?

## Deploy / Operasyon
**Docker ayrık kurulumda:**
- Frontend container:  
  ```bash
  bench build
  ```
- Backend/site container:  
  ```bash
  bench --site your.site migrate
  bench --site your.site clear-cache
  bench restart
  ```

**İlk kurulum / yükseltme sonrası:**
- Desk → **QR Scan Settings** → **Unlock Password** alanını doldurun
- Gerekirse `QR Scan Record.qr_code` alanına **UNIQUE index** ekleyin

## Geri alma planı (Rollback)
- Bu PR’ı revert et → `bench migrate` (gerekirse)
- JS eski sürüme dön → `bench build && bench restart`

## Riskler
- Parola alanı boş ise kilit ekranı politika gereği davranmalı (`not_configured` uyarısı)
- Yanlış rol atamaları → sayfa/API erişimi hatası

## İlgili işler / referanslar
- Issue: #____
- Docs: README.tr.md / README.en.md güncel

## Onay
- [ ] Kod gözden geçirildi
- [ ] CI geçti
- [ ] Manuel test adımları tamam
- [ ] Squash & Merge


</details>

<details>
<summary>🇬🇧 English</summary>

## Summary
Adds QR Scan Settings (Single DocType). Client behavior (toast duration, beep/vibrate, debounce, autofocus, silence, etc.) is configurable from the UI. 
On duplicate, a client-side fullscreen red lock appears; password is verified server-side (Unlock Password). Persistent server lock removed.

## What changed?
- [x] `QR Scan Settings` (Single DocType) + `get_client_settings` API
- [x] `verify_unlock_password`: server-side password check (DocType field, fallback to site_config)
- [x] `qr_scanner.js`: client-side lock, password input cleared every time, debounce/inFlight reset
- [x] Roles: added `QR Scanner Manager` to Page + API access
- [x] Updated README.tr.md / README.en.md (removed roadmap)

## Screenshots / Notes
<!-- Add screenshots if useful -->
- QR Scan Settings → Unlock Password field
- Duplicate → fullscreen red lock → enter password → continue

## Test Plan
1. **Happy path**: unique QR → green toast auto-closes
2. **Duplicate**: same QR → lock appears
3. **Password**: correct password → lock closes, input refocus/clear
4. **Wrong password**: error message and input cleared
5. **No password configured**: `not_configured` behavior matches policy
6. **Debounce**: same code within 800ms is ignored
7. **Autofocus**: input re-focuses after blur

## Deploy / Ops
**In split Docker setup:**
- Frontend container:
  ```bash
  bench build
  ```
- Backend/site container:
  ```bash
  bench --site your.site migrate
  bench --site your.site clear-cache
  bench restart
  ```

**Post-install / upgrade:**
- Desk → **QR Scan Settings** → set **Unlock Password**
- Ensure **UNIQUE index** on `QR Scan Record.qr_code`

## Rollback
- Revert this PR → `bench migrate` (if needed)
- Revert JS → `bench build && bench restart`

## Risks
- Empty password policy: ensure desired behavior for `not_configured`
- Role assignments might block Page/API access

## Related
- Issue: #____
- Docs: updated README.tr.md / README.en.md

## Approval
- [ ] Code review complete
- [ ] CI is green
- [ ] Manual tests done
- [ ] Squash & Merge


</details>