# QR Scanner (ERPNext v15.81.1)

Test cihazından gelen QR etiketlerini USB barkod okuyucu veya mobil kamera ile tarayıp ERPNext’e kaydeder. Duplicate engeller.

## Kurulum
```bash
cd ~/frappe-bench
bench get-app qr_scanner https://github.com/KTA-Endustri-Sistemleri/qr_scanner.git
bench --site your.site install-app qr_scanner
bench --site your.site migrate