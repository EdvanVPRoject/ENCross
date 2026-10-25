# File Inti ENCross (VanCross) untuk Pembaruan Fitur & Audit

Semua file program penting ini ditempatkan **langsung di dalam folder `Edit/`** (tanpa subfolder) untuk mempermudah audit dan pengeditan cepat:

---

### 📋 Daftar File & Lokasi Asal di Proyek:

| Nama File di `Edit/` | Lokasi Asli di Proyek | Fungsi & Pembaruan Terbaru |
| :--- | :--- | :--- |
| **`features.js`** | `client/src/config/features.js` | **Pusat On/Off Fitur:** Saklar toggle fitur (`enableAutoClipboardSync`, `enableVirtualTouchpad`, `enableTransferResume`, `enableNotificationMirror`, `enableRingPhone`, `enableBatteryMonitor`, `enableRemoteFileExplorer`, dll), konfigurasi Scrcpy default, dan slot aksi kustom. |
| **`App.jsx`** | `client/src/App.jsx` | **Logika Utama Frontend:** State global, sinkronisasi background clipboard dua arah, remote input touchpad/numpad, pause/resume file transfer, alarm dering HP ("Ring My Phone") dengan banner interaktif, monitor status baterai live, dan penerima notifikasi HP. |
| **`PeersRadar.jsx`** | `client/src/components/PeersRadar.jsx` | **Tampilan Radar & Kartu Perangkat:** Tombol aksi 2 kolom rapi, tombol khusus "Remote & Touchpad PC", tombol "Deringkan HP", badge status baterai real-time (persentase, charging, suhu °C), indikator ping RTT 5 detik, dan riwayat transfer berkas sesi. |
| **`TouchpadModal.jsx`** | `client/src/components/TouchpadModal.jsx` | **Virtual Remote PC:** Trackpad sentuh ultra-responsif (gerak kursor, klik kiri/kanan, scroll 2 jari), Numpad 4x5 kalkulator, serta tombol pintasan media & Windows (Vol, Mute, Play/Pause, Show Desktop). |
| **`TransferProgressModal.jsx`** | `client/src/components/TransferProgressModal.jsx` | **Modal Transfer Berkas:** Visualisasi progres transfer WebRTC P2P dengan tombol Jeda (Pause) dan Lanjutkan (Resume). |
| **`ScrcpyModal.jsx`** | `client/src/components/ScrcpyModal.jsx` | **Fitur Scrcpy Ultra Rendah Latensi:** Opsi resolusi & bitrate, toggle matikan layar HP saat mirroring, deteksi ADB USB/Wi-Fi, accordion pairing Android 11+ (port & pairing code). |
| **`FileExplorerModal.jsx`** | `client/src/components/FileExplorerModal.jsx` | **Remote File Explorer Dua Arah:** Menjelajahi file HP dari Laptop dan file Laptop dari HP, shortcut folder cepat (Download, Kamera DCIM, Gambar, Dokumen), serta fitur unduh/pull file instan. |
| **`webrtcManager.js`** | `client/src/utils/webrtcManager.js` | **Engine WebRTC P2P:** Dukungan Pause (`pauseTransfer`) dan Resume (`resumeTransfer`) transfer file, pengiriman input remote P2P instan (`sendRemoteInput`), buffer backpressure 1MB, dan pergantian kamera. |
| **`index.js`** | `server/index.js` (dan `desktop/server.js`) | **Signaling & File Server:** Socket handler `sync-clipboard`, `remote-input-event`, `ring-device`, `stop-ring-device`, `mirror-notification`, `update-battery-status`, endpoint file download PC, dan manajemen koneksi LAN. |
| **`main.js`** | `desktop/main.js` | **Proses Native Electron Desktop:** Pemantau background clipboard Windows (`clipboard.readText()`), manajer simulator input native Windows (`input-helper.exe`), dan sanitasi ADB. |
| **`MainActivity.java`** | `client/android/.../MainActivity.java` | **Fitur Native Android:** Jembatan native clipboard `@JavascriptInterface("AndroidClipboard")`, ringer alarm kencang `@JavascriptInterface("AndroidRinger")` dengan bypass profil senyap via `STREAM_ALARM`, monitor baterai `@JavascriptInterface("AndroidBattery")` (`ACTION_BATTERY_CHANGED`), bridge notifikasi `@JavascriptInterface("AndroidNotifications")`, perbaikan crash Android 14+ (`registerCallback`), dan sistem file HP. |
| **`NotificationMirrorService.java`** | `client/android/.../NotificationMirrorService.java` | **Layanan Listener Notifikasi Android:** `NotificationListenerService` native bawaan Android SDK untuk menangkap notifikasi masuk (WhatsApp, SMS, Bank, dsb.) dan meneruskannya ke dashboard VanCross desktop tanpa dependency eksternal. |

---

### 🚀 Fitur Baru yang Telah Diimplementasikan:

#### ⚡ Kategori 1: Prioritas Tinggi (Produktivitas Harian)
1. **Auto Clipboard Sync Dua Arah (Background Clipboard):**
   - Saat teks disalin (`Ctrl+C`) di Laptop, otomatis masuk ke clipboard HP, dan sebaliknya teks yang disalin di HP langsung terkirim dan disalin ke clipboard Laptop tanpa perlu tombol manual.
2. **Virtual Touchpad & Keyboard / Numpad (HP Menjadi Mouse & Remote Laptop):**
   - Mengubah layar HP menjadi trackpad laptop (geser kursor, klik kiri, klik kanan, scroll 2 jari) serta keypad Numpad virtual dan tombol multimedia Windows dengan latensi sub-milidetik via native input simulator.
3. **Pause & Resume Transfer File WebRTC:**
   - Transfer file besar kini dapat dijeda (**Pause**) dan dilanjutkan kembali (**Resume**) kapan saja tanpa harus mengulang transfer dari awal (0%).

#### 📲 Kategori 2: Integrasi Sistem & Continuity (Ala Apple / Samsung DeX)
4. **Notification Mirroring (Notifikasi HP Muncul di Laptop):**
   - Notifikasi penting dari HP (WhatsApp, SMS, Telepon, Bank) otomatis dikirim dan dimunculkan sebagai notifikasi desktop di layar laptop Anda saat fokus bekerja.
5. **Deringkan HP / "Ring My Phone":**
   - Tombol 1-klik di kartu perangkat pada radar laptop untuk membunyikan alarm suara kencang di HP meskipun HP sedang dalam mode senyap atau getar (menggunakan `AudioManager.STREAM_ALARM` volume maksimal + loop getaran panjang). Di layar HP muncul banner peringatan dengan tombol "HENTIKAN DERING".
6. **Monitor Baterai & Status Perangkat Real-Time:**
   - Di kartu perangkat pada radar laptop, terdapat badge indikator status baterai live: persentase daya baterai (%), ikon & indikator sedang dicas (charging/plugged), serta tooltip suhu baterai (°C).

---

### 💡 Cara Menerapkan & Mengompilasi Proyek:
File-file di folder `Edit/` ini selalu disinkronkan dengan file aktif di proyek. Anda dapat menjalankan:
- **`build_all.bat`** di direktori utama `vancross/` untuk otomatis mengompilasi frontend React, menyinkronkan aset Capacitor Android, dan mem-build APK (`release/ENCross.apk`).
- Atau `npm run build` di dalam folder `client/`.
