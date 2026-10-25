# File Inti ENCross (VanCross) untuk Pembaruan Fitur & Audit

Semua file program penting ini ditempatkan **langsung di dalam folder `Edit/`** (tanpa subfolder) untuk mempermudah audit dan pengeditan cepat:

---

### 📋 Daftar File & Lokasi Asal di Proyek:

| Nama File di `Edit/` | Lokasi Asli di Proyek | Fungsi & Pembaruan Terbaru |
| :--- | :--- | :--- |
| **`features.js`** | `client/src/config/features.js` | **Pusat On/Off Fitur:** Saklar toggle fitur (`enableAutoClipboardSync`, `enableVirtualTouchpad`, `enableTransferResume`, `enableNotificationMirror`, `enableRingPhone`, `enableBatteryMonitor`, `enableInstantMediaStreaming`, `enableFolderTransfer`, `enableRemoteFileExplorer`, dll), konfigurasi Scrcpy default, dan slot aksi kustom. |
| **`App.jsx`** | `client/src/App.jsx` | **Logika Utama Frontend:** State global, pemutar media instan (`MediaStreamingModal`), navigasi bertingkat tombol back Android, sinkronisasi background clipboard dua arah, remote input touchpad/numpad, pause/resume file transfer, alarm dering HP ("Ring My Phone"), monitor baterai live, dan notifikasi HP. |
| **`PeersRadar.jsx`** | `client/src/components/PeersRadar.jsx` | **Tampilan Radar & Kartu Perangkat:** Tombol "Kirim Seluruh Folder" dengan pembacaan rekursif `webkitGetAsEntry` saat drag-and-drop folder, tombol aksi 2 kolom rapi, tombol "Remote & Touchpad PC", tombol "Deringkan HP", badge baterai real-time, dan riwayat transfer. |
| **`MediaStreamingModal.jsx`** | `client/src/components/MediaStreamingModal.jsx` | **Pemutar Media Streaming Instan (Baru):** Streaming video dan audio langsung antar perangkat via HTTP Range Request tanpa unduh penuh, seek instan, fallback otomatis ke proxy server lokal jika port HP terisolasi, dan tombol pintasan unduh/salin URL. |
| **`FileExplorerModal.jsx`** | `client/src/components/FileExplorerModal.jsx` | **Remote File Explorer Dua Arah:** Tombol aksi ganda "Putar" (streaming instan) dan "Ambil File" (unduh penuh) pada file video/audio, navigasi folder cepat (Download, Kamera DCIM, Gambar, Dokumen), serta pembacaan berkas HP/PC. |
| **`TouchpadModal.jsx`** | `client/src/components/TouchpadModal.jsx` | **Virtual Remote PC:** Trackpad sentuh ultra-responsif (gerak kursor, klik kiri/kanan, scroll 2 jari), Numpad 4x5 kalkulator, serta tombol pintasan media & Windows (Vol, Mute, Play/Pause, Show Desktop). |
| **`TransferProgressModal.jsx`** | `client/src/components/TransferProgressModal.jsx` | **Modal Transfer Berkas & Folder:** Penanganan `relativePath` untuk transfer struktur folder utuh ke `Downloads/ENCross/...`, serta kontrol Jeda (Pause) dan Lanjutkan (Resume). |
| **`ScrcpyModal.jsx`** | `client/src/components/ScrcpyModal.jsx` | **Fitur Scrcpy Ultra Rendah Latensi:** Opsi resolusi & bitrate, toggle matikan layar HP saat mirroring, deteksi ADB USB/Wi-Fi, accordion pairing Android 11+ (port & pairing code). |
| **`webrtcManager.js`** | `client/src/utils/webrtcManager.js` | **Engine WebRTC P2P:** Transmisi metadata `relativePath` pada packet `file-start` untuk folder transfer utuh, kontrol Pause/Resume, buffer backpressure 1MB, dan pergantian kamera. |
| **`index.js`** | `server/index.js` (dan `desktop/server.js`) | **Signaling, File & Streaming Server:** Endpoint `/api/pc-files/stream` dengan dukungan HTTP 206 Partial Content (Range Request) untuk streaming media PC instan, endpoint proxy `/api/media-stream-proxy` untuk streaming media HP, socket clipboard, dan remote input. |
| **`main.js`** | `desktop/main.js` | **Proses Native Electron Desktop:** Rekonstruksi hierarki direktori folder otomatis (`fs.mkdirSync` rekursif berdasarkan `relativePath`) saat menerima folder transfer di `Downloads/ENCross/`, clipboard sync Windows, dan simulator input. |
| **`MainActivity.java`** | `client/android/.../MainActivity.java` | **Fitur Native Android:** Server streaming media embedded port 8088 (`MediaStreamServer`) dengan dukungan HTTP Range Request (206 Partial Content) menggunakan core Java `ServerSocket` & `RandomAccessFile`, native clipboard, ringer alarm kencang `STREAM_ALARM`, monitor baterai `ACTION_BATTERY_CHANGED`, bridge notifikasi, dan perbaikan crash Android 14+. |
| **`NotificationMirrorService.java`** | `client/android/.../NotificationMirrorService.java` | **Layanan Listener Notifikasi Android:** `NotificationListenerService` native bawaan Android SDK untuk menangkap notifikasi masuk (WhatsApp, SMS, Bank, dsb.) dan meneruskannya ke desktop tanpa library eksternal. |

---

### 🚀 Fitur Baru yang Telah Diimplementasikan:

#### ⚡ Kategori 1: Prioritas Tinggi (Produktivitas Harian)
1. **Auto Clipboard Sync Dua Arah (Background Clipboard):**
   - Teks yang disalin (`Ctrl+C`) di Laptop langsung masuk ke clipboard HP, dan teks yang disalin di HP otomatis disalin ke clipboard Laptop.
2. **Virtual Touchpad & Keyboard / Numpad (HP Menjadi Mouse & Remote Laptop):**
   - Mengubah layar HP menjadi trackpad laptop (kursor, klik kiri/kanan, scroll 2 jari) serta keypad Numpad kalkulator dan tombol multimedia Windows.
3. **Pause & Resume Transfer File WebRTC:**
   - Transfer berkas besar dapat dijeda (**Pause**) dan dilanjutkan kembali (**Resume**) kapan saja tanpa harus mengulang dari awal (0%).

#### 📲 Kategori 2: Integrasi Sistem & Continuity (Ala Apple / Samsung DeX)
4. **Notification Mirroring (Notifikasi HP Muncul di Laptop):**
   - Notifikasi penting HP (WhatsApp, SMS, Telepon, Bank) otomatis muncul sebagai notifikasi desktop di layar laptop.
5. **Deringkan HP / "Ring My Phone":**
   - Membunyikan alarm suara kencang di HP pada volume maksimal (`STREAM_ALARM`) meskipun HP dalam mode senyap/getar, disertai getaran loop dan banner peringatan interaktif di layar HP.
6. **Monitor Baterai & Status Perangkat Real-Time:**
   - Badge indikator persentase daya baterai (%), ikon & status pengisian daya (charging), dan temperatur suhu baterai (°C) secara live di radar laptop.

#### 🎬 Kategori 3: Media & Pengelolaan Berkas Lanjutan
7. **Streaming Media Instan (Play Video/Audio Tanpa Unduh Dulu):**
   - Putar video atau lagu di HP langsung di layar laptop (atau sebaliknya) secara streaming seketika tanpa harus menunggu file selesai diunduh penuh.
   - Menggunakan HTTP Range Request (HTTP 206 Partial Content) pada server lokal Express (`/api/pc-files/stream`) dan embedded HTTP streaming server di Android (port 8088), memungkinkan video player HTML5 melakukan *instant seek* dan *buffering* instan.
   - Dilengkapi fallback otomatis ke proxy server lokal (`/api/media-stream-proxy`) jika koneksi langsung antar-port terhalang firewall/NAT.
8. **Kirim Seluruh Folder (Folder Transfer with Directory Structure):**
   - Drag-and-drop langsung seluruh folder atau klik tombol "Kirim Seluruh Folder" tanpa perlu kompres manual ke file `.zip`.
   - Menggunakan Web File System API (`webkitGetAsEntry` / `directory reader` / `<input webkitdirectory>`) untuk membaca seluruh hierarki berkas secara rekursif.
   - Target penerima (Desktop Electron & Android) secara otomatis membuat kembali seluruh pohon direktori folder di dalam folder `Downloads/ENCross/<NamaFolder>/...`.

---

### 💡 Cara Menerapkan & Mengompilasi Proyek:
File-file di folder `Edit/` ini selalu disinkronkan dengan file aktif di proyek. Anda dapat menjalankan:
- **`build_all.bat`** di direktori utama `vancross/` untuk otomatis mengompilasi frontend React, menyinkronkan aset Capacitor Android, dan mem-build APK (`release/ENCross.apk`).
- Atau `npm run build` di dalam folder `client/`.
