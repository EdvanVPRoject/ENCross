# File Inti ENCross (VanCross) untuk Pembaruan Fitur & Audit

Semua file program penting ini ditempatkan **langsung di dalam folder `Edit/`** (tanpa subfolder) untuk mempermudah audit dan pengeditan cepat:

---

### 📋 Daftar File & Lokasi Asal di Proyek:

| Nama File di `Edit/` | Lokasi Asli di Proyek | Fungsi & Pembaruan Terbaru |
| :--- | :--- | :--- |
| **`features.js`** | `client/src/config/features.js` | **Pusat On/Off Fitur:** Saklar toggle fitur (`enableRemoteFileExplorer`, `enableAudioStream`, `enableGlobalPaste`, `enableTransferHistory`), konfigurasi Scrcpy default (`maxSize`, `bitRate`, `turnScreenOff`), dan pendaftaran aksi kustom (`CUSTOM_ACTIONS`). |
| **`App.jsx`** | `client/src/App.jsx` | **Logika Utama Frontend:** State global, dialog persetujuan privasi & user gesture remote request, penanganan dua arah File Explorer, paste global (`Ctrl+V`), ping latency checker 5 detik, riwayat transfer, dan sinkronisasi history/back button. |
| **`PeersRadar.jsx`** | `client/src/components/PeersRadar.jsx` | **Tampilan Radar & Kartu Perangkat:** Grid kartu peer 2 kolom tombol aksi, indikator ping RTT langsung, drag-and-drop file visual, riwayat transfer sesi dengan tombol buka folder ENCross, dan integrasi tombol kustom. |
| **`ScrcpyModal.jsx`** | `client/src/components/ScrcpyModal.jsx` | **Fitur Scrcpy Ultra Rendah Latensi:** Opsi resolusi & bitrate, toggle matikan layar HP saat mirroring, deteksi ADB USB/Wi-Fi, accordion pairing Android 11+ (port & pairing code), serta pencegahan teks terpotong. |
| **`FileExplorerModal.jsx`** | `client/src/components/FileExplorerModal.jsx` | **Remote File Explorer Dua Arah (Baru):** Menjelajahi file HP dari Laptop dan file Laptop dari HP, shortcut folder cepat (Download, Kamera DCIM, Gambar, Dokumen), status perizinan penyimpanan, serta fitur unduh/pull file instan. |
| **`webrtcManager.js`** | `client/src/utils/webrtcManager.js` | **Engine WebRTC P2P:** Optimasi backpressure buffer 1MB (`bufferedAmountLowThreshold`), negosiasi ulang SDP saat ganti kamera tanpa sender, tombol batalkan transfer per-file, dan opsi streaming audio. |
| **`index.js`** | `server/index.js` (dan `desktop/server.js`) | **Signaling & File Server:** Socket.io handler remote FS (`fs-list-request`, `fs-list-response`, `fs-pull-file-request`, `fs-read-local-pc-dir`), endpoint `GET /api/pc-files/download`, dan sanitasi direktori terhadap folder home pengguna. |
| **`main.js`** | `desktop/main.js` | **Proses Native Electron Desktop:** Sanitasi eksekusi ADB menggunakan `execFile` & validasi regex, IPC pairing ADB Wi-Fi, pembukaan folder unduhan ENCross, dan pencegahan penimpaan file duplikat (`getUniqueSafeFilePath`). |
| **`MainActivity.java`** | `client/android/.../MainActivity.java` | **Fitur Native Android:** Perbaikan crash Android 14+ (`registerCallback` sebelum `createVirtualDisplay`), deteksi IP Wi-Fi akurat (filter interface `rmnet`/`tun`), dan jembatan Javascript `@JavascriptInterface("AndroidFileSystem")`. |

---

### 🚀 Fitur Utama & Perbaikan Baru:
1. **Pencegahan Crash Android 14+ (API 34+):** Pendaftaran `MediaProjection.Callback` sebelum memanggil `createVirtualDisplay()`.
2. **Akses File Dua Arah (Laptop <-> HP):** Jelajahi file HP dari Laptop melalui `AndroidFileSystem` Web Interface atau jelajahi file Laptop dari HP melalui Socket.io + REST download endpoint aman.
3. **Keamanan Privasi & User Gesture:** Permintaan remote screen share atau kamera wajib dikonfirmasi melalui dialog izin ("Izinkan", "Selalu Percayai", atau "Tolak") guna mencegah pengintipan dan kegagalan `getDisplayMedia`.
4. **Scrcpy Kontrol Kualitas & Wireless Pairing:** Pengaturan resolusi (Original, 1080p, 720p), bitrate (2M - 16M), toggle matikan layar HP, serta panduan pairing nirkabel Android 11+.
5. **Indikator Ping Real-Time & Global Paste:** Pemantauan latensi jaringan lokal per 5 detik dan kemudahan mengirim file/screenshot hanya dengan menekan `Ctrl+V`.

---

### 💡 Cara Menerapkan Hasil Edit ke Proyek:
File-file di folder `Edit/` ini selalu disinkronkan dengan file aktif di proyek. Anda dapat menjalankan **`build_all.bat`** di direktori utama atau perintah `npm run build` di folder `client/` untuk mengompilasi aplikasi.
