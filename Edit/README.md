# File Inti ENCross (VanCross) untuk Pembaruan Fitur & Audit

Semua file program penting ini ditempatkan **langsung di dalam folder `Edit/`** (tanpa subfolder) untuk mempermudah audit dan pengeditan cepat:

---

### 📋 Daftar File & Lokasi Asal di Proyek:

| Nama File di `Edit/` | Lokasi Asli di Proyek | Fungsi & Pembaruan Terbaru |
| :--- | :--- | :--- |
| **`features.js`** | `client/src/config/features.js` | **Pusat On/Off Fitur:** Saklar toggle fitur (`enableAutoClipboardSync`, `enableVirtualTouchpad`, `enableTransferResume`, `enableRemoteFileExplorer`, dll), konfigurasi Scrcpy default, dan slot aksi kustom. |
| **`App.jsx`** | `client/src/App.jsx` | **Logika Utama Frontend:** State global, sinkronisasi background clipboard dua arah, penghubung remote input touchpad/numpad, kontrol jeda/lanjutkan transfer berkas, dan dialog izin keamanan. |
| **`PeersRadar.jsx`** | `client/src/components/PeersRadar.jsx` | **Tampilan Radar & Kartu Perangkat:** Tombol aksi 2 kolom rapi, tombol khusus "Remote & Touchpad PC", indikator ping RTT 5 detik, dan riwayat transfer berkas sesi. |
| **`TouchpadModal.jsx`** | `client/src/components/TouchpadModal.jsx` | **Virtual Remote PC (Baru):** Trackpad sentuh ultra-responsif (gerak kursor, klik kiri/kanan, scroll 2 jari), Numpad 4x5 kalkulator, serta tombol pintasan media & Windows (Vol, Mute, Play/Pause, Show Desktop). |
| **`ScrcpyModal.jsx`** | `client/src/components/ScrcpyModal.jsx` | **Fitur Scrcpy Ultra Rendah Latensi:** Opsi resolusi & bitrate, toggle matikan layar HP saat mirroring, deteksi ADB USB/Wi-Fi, accordion pairing Android 11+ (port & pairing code). |
| **`FileExplorerModal.jsx`** | `client/src/components/FileExplorerModal.jsx` | **Remote File Explorer Dua Arah:** Menjelajahi file HP dari Laptop dan file Laptop dari HP, shortcut folder cepat (Download, Kamera DCIM, Gambar, Dokumen), serta fitur unduh/pull file instan. |
| **`webrtcManager.js`** | `client/src/utils/webrtcManager.js` | **Engine WebRTC P2P:** Dukungan Pause (`pauseTransfer`) dan Resume (`resumeTransfer`) transfer file, pengiriman input remote P2P instan (`sendRemoteInput`), buffer backpressure 1MB, dan pergantian kamera. |
| **`index.js`** | `server/index.js` (dan `desktop/server.js`) | **Signaling & File Server:** Socket handler `sync-clipboard` dan `remote-input-event`, endpoint file download PC, dan manajemen koneksi LAN. |
| **`main.js`** | `desktop/main.js` | **Proses Native Electron Desktop:** Pemantau background clipboard Windows (`clipboard.readText()`), manajer simulator input native Windows (`input-helper.exe`), dan sanitasi ADB. |
| **`MainActivity.java`** | `client/android/.../MainActivity.java` | **Fitur Native Android:** Jembatan native clipboard `@JavascriptInterface("AndroidClipboard")` dengan `OnPrimaryClipChangedListener`, perbaikan crash Android 14+ (`registerCallback`), dan sistem file HP. |

---

### 🚀 3 Fitur Baru yang Baru Ditambahkan (Kategori 1: Prioritas Tinggi):
1. **Auto Clipboard Sync Dua Arah (Background Clipboard):**
   - Saat teks disalin (`Ctrl+C`) di Laptop, otomatis masuk ke clipboard HP, dan sebaliknya teks yang disalin di HP langsung terkirim dan disalin ke clipboard Laptop tanpa perlu tombol manual.
2. **Virtual Touchpad & Keyboard / Numpad (HP Menjadi Mouse & Remote Laptop):**
   - Mengubah layar HP menjadi trackpad laptop (geser kursor, klik kiri, klik kanan, scroll 2 jari) serta keypad Numpad virtual dan tombol multimedia Windows dengan latensi sub-milidetik via native input simulator.
3. **Pause & Resume Transfer File WebRTC:**
   - Transfer file besar kini dapat dijeda (**Pause**) dan dilanjutkan kembali (**Resume**) kapan saja tanpa harus mengulang transfer dari awal (0%).

---

### 💡 Cara Menerapkan Hasil Edit ke Proyek:
File-file di folder `Edit/` ini selalu disinkronkan dengan file aktif di proyek. Anda dapat menjalankan **`build_all.bat`** di direktori utama atau perintah `npm run build` di folder `client/` untuk mengompilasi aplikasi.
