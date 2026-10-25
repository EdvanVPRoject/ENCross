# File Inti ENCross (VanCross) untuk Pembaruan Fitur & Audit

Semua file program penting ini ditempatkan **langsung di dalam folder `Edit/`** (tanpa subfolder) untuk mempermudah audit dan pengeditan cepat:

---

### 📋 Daftar File & Lokasi Asal di Proyek:

| Nama File di `Edit/` | Lokasi Asli di Proyek | Fungsi & Pembaruan Terbaru |
| :--- | :--- | :--- |
| **`features.js`** | `client/src/config/features.js` | **Pusat On/Off Fitur:** Saklar toggle fitur (`enableWindowsDriveMount`, `enableAutoClipboardSync`, `enableVirtualTouchpad`, `enableTransferResume`, `enableNotificationMirror`, `enableRingPhone`, `enableBatteryMonitor`, `enableInstantMediaStreaming`, `enableFolderTransfer`, `enableWirelessMic`, dll), konfigurasi Scrcpy default, dan slot aksi kustom. |
| **`App.jsx`** | `client/src/App.jsx` | **Logika Utama Frontend:** State global, handler `handleMountPhoneStorage` untuk pemetaan 1-klik Drive Z: ke Windows File Explorer, wireless mic, streaming media instan, navigasi bertingkat tombol back Android, clipboard sync dua arah, remote input touchpad/numpad, alarm dering HP, monitor baterai, dan notifikasi HP. |
| **`PeersRadar.jsx`** | `client/src/components/PeersRadar.jsx` | **Tampilan Radar & Kartu Perangkat:** Tombol dedicated **"Buka di Windows Explorer (Drive Z:)"**, tombol "Mic HP", "Kirim Seluruh Folder" drag-and-drop, aksi 2x2 rapi (Scrcpy, Webcam, Mic HP, Deringkan HP), "Remote & Touchpad PC", badge baterai live, dan riwayat transfer. |
| **`FileExplorerModal.jsx`** | `client/src/components/FileExplorerModal.jsx` | **Remote File Explorer Dua Arah & Drive Windows:** Pintasan dan navigasi langsung ke **Drive C: (Sistem)** dan **Drive D: (Data)** Windows dari HP, tombol aksi ganda "Putar" (streaming instan) dan "Ambil File" (unduh penuh), serta penjelajah memori internal HP. |
| **`WirelessMicModal.jsx`** | `client/src/components/WirelessMicModal.jsx` | **Pusat Mikrofon Nirkabel PC:** Penerima audio mikrofon HP secara real-time di laptop, visualisator gelombang suara & VU meter live, switch monitor speaker laptop, pengatur volume, serta perekam suara instan (Audio Recorder WebM). |
| **`MediaStreamingModal.jsx`** | `client/src/components/MediaStreamingModal.jsx` | **Pemutar Media Streaming Instan:** Streaming video dan audio langsung antar perangkat via HTTP Range Request tanpa unduh penuh, seek instan, fallback otomatis ke proxy server lokal jika port HP terisolasi, dan tombol pintasan unduh/salin URL. |
| **`TouchpadModal.jsx`** | `client/src/components/TouchpadModal.jsx` | **Virtual Remote PC:** Trackpad sentuh ultra-responsif (gerak kursor, klik kiri/kanan, scroll 2 jari), Numpad 4x5 kalkulator, serta tombol pintasan media & Windows (Vol, Mute, Play/Pause, Show Desktop). |
| **`TransferProgressModal.jsx`** | `client/src/components/TransferProgressModal.jsx` | **Modal Transfer Berkas & Folder:** Penanganan `relativePath` untuk transfer struktur folder utuh ke `Downloads/ENCross/...`, serta kontrol Jeda (Pause) dan Lanjutkan (Resume). |
| **`ScrcpyModal.jsx`** | `client/src/components/ScrcpyModal.jsx` | **Fitur Scrcpy Ultra Rendah Latensi:** Opsi resolusi & bitrate, toggle matikan layar HP saat mirroring, deteksi ADB USB/Wi-Fi, accordion pairing Android 11+ (port & pairing code). |
| **`webrtcManager.js`** | `client/src/utils/webrtcManager.js` | **Engine WebRTC P2P:** Dukungan mode `mic`, transmisi metadata `relativePath` folder transfer, kontrol Pause/Resume, buffer backpressure 1MB, dan pergantian kamera. |
| **`index.js`** | `server/index.js` (dan `desktop/server.js`) | **Signaling, File & Streaming Server:** Deteksi dan pembacaan otomatis seluruh Windows Drive (`getWindowsDrives`), resolusi aman jalur `C:/` dan `D:/` (`resolveSafePcPath`), socket handler `request-remote-mic`, endpoint range streaming, socket clipboard, dan remote input. |
| **`main.js`** | `desktop/main.js` (dan `desktop/preload.js`) | **Proses Native Electron Desktop:** IPC handler `mount-phone-storage` (eksekusi `net use Z: http://<ip>:8089` dan peluncuran `explorer.exe Z:`), `unmount-phone-storage`, rekonstruksi direktori folder otomatis, clipboard sync Windows, dan simulator input. |
| **`MainActivity.java`** | `client/android/.../MainActivity.java` | **Fitur Native Android:** Server WebDAV embedded port 8089 (`WebDavServer`) bawaan Java murni untuk Windows Explorer (`OPTIONS`, `PROPFIND`, `GET`, `PUT`, `DELETE`, `MKCOL`, `MOVE`, `LOCK`, `UNLOCK`), server streaming port 8088 (`MediaStreamServer`), izin `RECORD_AUDIO`, clipboard native, ringer alarm kencang `STREAM_ALARM`, monitor baterai `ACTION_BATTERY_CHANGED`, bridge notifikasi, dan perbaikan crash Android 14+. |
| **`NotificationMirrorService.java`** | `client/android/.../NotificationMirrorService.java` | **Layanan Listener Notifikasi Android:** `NotificationListenerService` native bawaan Android SDK untuk menangkap notifikasi masuk (WhatsApp, SMS, Bank, dsb.) dan meneruskannya ke desktop tanpa library eksternal. |

---

### 🚀 Fitur yang Telah Diimplementasikan:

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
   - Putar video atau lagu di HP langsung di layar laptop (atau sebaliknya) secara streaming seketika tanpa harus menunggu file selesai diunduh penuh via HTTP Range Request (206 Partial Content).
8. **Kirim Seluruh Folder (Folder Transfer with Directory Structure):**
   - Drag-and-drop langsung seluruh folder atau klik tombol "Kirim Seluruh Folder" tanpa perlu kompres manual ke file `.zip`, otomatis merekonstruksi pohon folder di penerima.

#### 🎙️ Kategori 4: Fitur Audio & Input Kustom
9. **Wireless PC Microphone (HP Jadi Mic Eksternal Laptop):**
   - Menggunakan mikrofon HP sebagai mic eksternal laptop dengan latensi sangat rendah via WebRTC AudioStream.
   - Dilengkapi filter suara jernih (*echoCancellation*, *noiseSuppression*, *autoGainControl*).
   - Di laptop tersedia visualisator gelombang audio & VU meter decibel real-time, pengatur volume, switch speaker monitor (pencegah feedback gema), serta perekam suara instan (Audio Recorder) berformat WebM/Opus.
   - Di HP terdapat status bar siaran langsung dengan tombol Mute Mic dan Hentikan Siaran.

#### 📂 Kategori 5: Integrasi File Explorer Sistem & Seamless Drive Access
10. **Penyimpanan HP Muncul Langsung di Windows File Explorer (Native Drive Z: via WebDAV):**
    - Server WebDAV ringan embedded pada port `8089` di HP Android (`WebDavServer`) yang dibangun dengan Java murni tanpa dependency pihak ketiga.
    - Di dashboard laptop, cukup klik tombol **"Buka di Windows Explorer (Drive Z:)"** pada kartu HP. Electron langsung memetakan drive (`net use Z: http://<hp-ip>:8089`) dan membuka Windows File Explorer (`explorer.exe Z:`).
    - Berkas di internal HP dapat disalin, dipindahkan, diedit, dan di-drag-and-drop layaknya drive lokal / flashdisk nirkabel.
11. **Jelajahi Drive C: dan Drive D: Windows dari HP:**
    - Remote File Explorer di aplikasi Android kini menampilkan pintasan langsung dan daftar lengkap drive Windows (**Drive C: (Sistem)** dan **Drive D: (Data)**).
    - Membuka akses bebas untuk menelusuri seluruh folder di harddisk laptop, mengunduh dokumen, atau langsung memutar video/musik secara streaming di HP tanpa terkurung hanya di folder user home.

---

### 💡 Cara Menerapkan & Mengompilasi Proyek:
File-file di folder `Edit/` ini selalu disinkronkan dengan file aktif di proyek. Anda dapat menjalankan:
- **`build_all.bat`** di direktori utama `vancross/` untuk otomatis mengompilasi frontend React, menyinkronkan aset Capacitor Android, dan mem-build APK (`release/ENCross.apk`).
- Atau `npm run build` di dalam folder `client/`.
