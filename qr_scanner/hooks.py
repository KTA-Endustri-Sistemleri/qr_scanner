app_name = "qr_scanner"
app_title = "QR Scanner"
app_publisher = "Ufuk Karamalli"
app_description = "QR Scanner for KTA"
app_email = "ufukkaramalli@gmail.com"
app_license = "mit"

# Installation / Migration
after_install = "qr_scanner.install.after_install"
after_migrate = "qr_scanner.install.after_migrate"

# DocType Events
# QR Scan Settings kaydedildiğinde client cache’i temizlemek için
doc_events = {
    "QR Scan Settings": {
        # sınıf yolu DEĞİL, fonksiyon yolu!
        "on_update": "qr_scanner.qr_scanner.doctype.qr_scan_settings.qr_scan_settings.settings_on_update"
    }
}

# (İsteğe bağlı) Desk’e global JS/CSS eklemek istersen burada kullan
# app_include_js = "/assets/qr_scanner/js/some_global.js"
# app_include_css = "/assets/qr_scanner/css/some_global.css"