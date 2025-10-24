## [1.1.0] - 2025-10-24
### 🚀 Added
- **QR Scanner Workspace**  
  - Yeni Workspace oluşturuldu (`QR Scanner`)  
  - İçerik:
    - **QR Scanner Page** → Ana tarama arayüzü
    - **QR Scanner Log** → Tarama geçmişi
    - **QR Scanner Settings** → İstemci tarafı ayarları  
  - Workspace, `install.py` içindeki `after_install` ve `after_migrate` event’leriyle otomatik içe alınıyor.  
  - `MANIFEST.in` ve `setup.py` yapılandırmaları eklendi, böylece workspace JSON dosyası app ile birlikte paketleniyor.

### 🧩 Internal
- `install.py` yeniden düzenlendi:
  - `_import_workspace_json()` fonksiyonu eklendi  
  - Workspace JSON dosyası (`qr_scanner.json`) kurulumda otomatik içe alınır hale getirildi  
  - Roller (`QR Scanner User`, `QR Scanner Manager`) ve varsayılan ayarlar kuruluma entegre edildi  
- Minor versiyon bump: `1.0.0 → 1.1.0`

### ⚙️ Compatibility
- Geriye dönük tam uyumluluk korunmuştur.
- Mevcut sitelerde `bench migrate` sonrası Workspace otomatik olarak yüklenecektir.

---