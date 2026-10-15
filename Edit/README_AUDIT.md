# Manifest Audit File Fitur ENCross / Vancross

Folder `Edit/` ini dibuat khusus untuk mempermudah Anda melakukan **audit kode**, peninjauan (review), dan pemeliharaan fitur yang telah ditambahkan atau diperbarui pada proyek **ENCross**.

---

## 📁 Struktur Direktori Folder Audit (`Edit/`)

```
Edit/
├── README_AUDIT.md            # Manifest dan ringkasan audit ini
├── client/                    # Kode Antarmuka & Logika Web/HP (React + Tailwind)
│   ├── App.jsx                # State root, alur sinyal WebRTC, dan modal orchestrator
│   ├── Navbar.jsx             # Navigasi atas, logo ENCross, IP lokal, dan status bar
│   ├── PeersRadar.jsx         # Radar deteksi perangkat, kelompok Laptop & HP, tombol aksi
│   ├── ScrcpyModal.jsx        # Hub kontrol Scrcpy 60 FPS (deteksi ADB USB/Wi-Fi)
│   ├── ShareSourceModal.jsx   # Dialog pilihan siaran live di HP (Layar HP vs Kamera HP)
│   ├── ScreenViewModal.jsx    # Jendela pemutar siaran remote WebRTC (fullscreen & switch cam)
│   ├── ServerIpModal.jsx      # Scanner QR Code kamera & form input IP manual
│   ├── features.js            # Pusat saklar toggle fitur & slot tombol aksi kustom
│   └── webrtcManager.js       # Engine WebRTC P2P (transfer chunk 64KB & capture canvas)
├── server/
│   └── index.js               # Signaling server Socket.io & relay perintah antar perangkat
├── desktop/
│   ├── main.js                # Backend Electron, child_process Scrcpy/ADB, system tray
│   └── preload.js             # Bridge API aman (IPC renderer) untuk fitur desktop
├── android/
│   ├── MainActivity.java      # Bridge Android Java, MediaProjection capture, downloader
│   ├── MediaProjectionService.java # Foreground Service notifikasi rekam layar Android
│   └── AndroidManifest.xml    # Izin foreground service & media projection
└── tools/
    ├── build_all.bat          # Script interaktif 1-klik untuk build client, APK, & desktop
    └── PANDUAN_UPDATE.md      # Panduan arsitektur dan tutorial menambah fitur baru
```

---

## 🔍 Detail Audit Setiap File & Fitur yang Diperbarui

### 1. `client/ScrcpyModal.jsx` & `desktop/main.js` (Fitur Mirroring Layar Scrcpy Hub 60 FPS)
- **Tujuan:** Mengatasi pembatasan rekam layar di browser Android dengan menjalankan engine Scrcpy secara native langsung dari desktop laptop.
- **Poin Audit:**
  - `desktop/main.js`: Menangani IPC `get-scrcpy-status` (cek versi Scrcpy & `adb devices`), `start-scrcpy` (`scrcpy --window-title --stay-awake`), `connect-adb-tcpip`, dan `enable-adb-tcpip`.
  - `client/ScrcpyModal.jsx`: Menampilkan status HP terdeteksi (USB atau Wi-Fi), tombol 1-klik *"Mulai Mirror"*, input IP untuk koneksi nirkabel, dan panduan aktivasi USB Debugging.

### 2. `client/PeersRadar.jsx` (Pemisahan Tombol & Pengelompokan PC / HP)
- **Tujuan:** Memisahkan tombol agar tidak rancu antara *Mirror Layar* dan *Webcam*, serta mengelompokkan tampilan perangkat.
- **Poin Audit:**
  - Di layar HP: Tombol **`Mirror Layar`** dan **`Webcam HP`** dibuat terpisah secara eksplisit.
  - Di layar Laptop: Tersedia tombol **`Mirror Layar HP (Scrcpy Hub) • 60 FPS`** berwarna biru langit untuk menjalankan Scrcpy secara instan, serta tombol **`Webcam HP`**.
  - Pengelompokan perangkat: Perangkat Laptop/PC berada di bagian atas dan Android/HP di bagian bawah dengan pemisah yang rapi.

### 3. `android/MainActivity.java` & `android/MediaProjectionService.java`
- **Tujuan:** Siaran layar native Android via MediaProjection API.
- **Poin Audit:**
  - `MediaProjectionService.java`: Foreground Service dengan notification channel resmi untuk memenuhi standar keamanan Android 10/14+.
  - `MainActivity.java`: Menangkap virtual display, konversi bitmap frame buffer, throttling 22 FPS zero-latency, dan penjagaan WebView agar tidak ter-pause di latar belakang.

### 4. `client/webrtcManager.js`
- **Tujuan:** Pipeline WebRTC P2P dan pergantian kamera fisik.
- **Poin Audit:**
  - Memperbaiki pergantian kamera fisik depan/belakang menggunakan enumerasi hardware device ID.
  - Memperbaiki pipeline canvas offscreen agar WebRTC `canvas.captureStream(22)` terus berjalan lancar tanpa terhenti oleh layout render tree.

### 5. `client/features.js`
- **Tujuan:** Memusatkan konfigurasi fitur dan tombol kustom agar mudah diedit tanpa menyentuh kode kompleks.

---

## 🛠️ Cara Menguji & Memvalidasi Hasil Audit

1. **Jalankan Script Build:**
   Buka file `tools/build_all.bat` (atau `build_all.bat` di root) untuk menguji kompilasi Web, APK Android, atau Desktop Windows.
2. **Jalankan Aplikasi:**
   Pilih opsi `[5]` pada `build_all.bat` untuk menjalankan mode dev, atau jalankan `start.bat`.
