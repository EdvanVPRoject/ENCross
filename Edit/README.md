# 8 File Inti ENCross untuk Pembaruan Fitur

Semua file program penting ini ditempatkan **langsung di dalam folder `Edit/`** (tanpa subfolder) untuk mempermudah Anda melakukan audit dan pengeditan secara cepat:

---

### 📋 Daftar File & Lokasi Asal di Proyek:

| Nama File di `Edit/` | Lokasi Asli di Proyek | Fungsi & Kegunaan |
| :--- | :--- | :--- |
| **`features.js`** | `client/src/config/features.js` | **Pusat On/Off Fitur:** Saklar toggle fitur (Scrcpy, Webcam, Transfer, Chat) dan slot pendaftaran tombol aksi kustom (`CUSTOM_ACTIONS`). |
| **`App.jsx`** | `client/src/App.jsx` | **Logika Utama Frontend:** State global, alur event Socket.io, dan pembukaan jendela modal. |
| **`PeersRadar.jsx`** | `client/src/components/PeersRadar.jsx` | **Tombol Aksi UI:** Tampilan kartu perangkat PC/HP dan tombol aksi (*Mirror Layar*, *Webcam HP*, *Kirim File/Teks*). |
| **`ScrcpyModal.jsx`** | `client/src/components/ScrcpyModal.jsx` | **Fitur Scrcpy 60 FPS:** Jendela kontrol deteksi ADB USB/Wi-Fi dan tombol 1-klik mulai mirroring layar HP. |
| **`webrtcManager.js`** | `client/src/utils/webrtcManager.js` | **Engine WebRTC P2P:** Protokol transfer file chunk 64KB, streaming video nirkabel, dan pergantian kamera depan/belakang. |
| **`index.js`** | `server/index.js` | **Signaling Server:** Backend Socket.io lokal yang menghubungkan perangkat di jaringan Wi-Fi/LAN dan meneruskan event real-time. |
| **`main.js`** | `desktop/main.js` | **Proses Native Windows:** Backend Electron yang menjalankan engine `scrcpy.exe` dan perintah `adb`. |
| **`MainActivity.java`** | `client/android/.../MainActivity.java` | **Fitur Native Android:** Jembatan Java di HP untuk rekam layar Android (MediaProjection) dan integrasi sistem. |

---

### 💡 Cara Menerapkan Hasil Edit ke Proyek:
Setelah Anda mengedit file di folder `Edit/`, salin file tersebut kembali ke **Lokasi Asli di Proyek** sesuai tabel di atas, lalu jalankan **`build_all.bat`** di root folder untuk mengompilasi APK atau Desktop Windows.
