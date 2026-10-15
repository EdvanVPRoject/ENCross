# 8 File Inti untuk Memperbarui Fitur ENCross

Folder `Edit/` ini telah difilter khusus hanya memuat **8 file program inti** yang paling penting untuk Anda audit, modifikasi, dan perbarui fiturnya:

---

### 1. `client/features.js` (Pusat Konfigurasi Fitur)
- **Fungsi:** Tempat utama untuk menyalakan/mematikan fitur (On/Off toggle) dan menambah tombol aksi kustom (`CUSTOM_ACTIONS`) tanpa perlu membongkar kode UI.
- **Kapan diedit:** Saat ingin mengaktifkan/menonaktifkan transfer file, chat teks, Scrcpy, webcam, atau mengubah pengaturan default Scrcpy (FPS/judul).

### 2. `client/App.jsx` (Logika Utama & Alur Aplikasi)
- **Fungsi:** Otak logika frontend (React). Mengatur state global, alur event Socket.io, dan pembukaan jendela modal (Scrcpy, QR, chat).
- **Kapan diedit:** Saat menambah alur logika baru, menangani event sinyal baru, atau mengubah interaksi antar-layar.

### 3. `client/PeersRadar.jsx` (Tampilan Kartu Perangkat & Tombol Aksi)
- **Fungsi:** Tampilan radar yang membagi kelompok PC & HP serta menampilkan tombol-tombol aksi (Kirim File, Kirim Teks, Mirror Layar Scrcpy, Webcam HP).
- **Kapan diedit:** Saat ingin menambah, menghapus, atau mengubah desain dan perilaku tombol aksi pada perangkat yang terdeteksi.

### 4. `client/ScrcpyModal.jsx` (Hub Mirroring Layar HP 60 FPS)
- **Fungsi:** Jendela kontrol fitur Scrcpy di laptop. Menampilkan HP yang terdeteksi via USB/Wi-Fi dan tombol 1-klik untuk memulai mirroring layar HP.
- **Kapan diedit:** Saat ingin menyesuaikan antarmuka kontrol mirroring layar ponsel atau menambah opsi koneksi ADB.

### 5. `client/webrtcManager.js` (Engine Jaringan P2P & Streaming)
- **Fungsi:** Mengatur koneksi langsung (Peer-to-Peer) WebRTC, pengiriman potongan file (chunking), dan penangkapan kamera/layar.
- **Kapan diedit:** Saat memodifikasi protokol transfer data peer-to-peer atau penanganan stream video kamera.

### 6. `server/index.js` (Server Signaling Socket.io)
- **Fungsi:** Backend server lokal yang menghubungkan perangkat di jaringan Wi-Fi/LAN dan meneruskan sinyal WebRTC serta chat teks.
- **Kapan diedit:** Saat ingin menambah event pengiriman data atau perintah baru antar perangkat di jaringan lokal.

### 7. `desktop/main.js` (Fitur Native Desktop Windows)
- **Fungsi:** Proses Electron yang menjalankan engine Scrcpy (`scrcpy.exe`), perintah ADB (`adb devices`, `adb connect`), dan integrasi taskbar.
- **Kapan diedit:** Saat ingin menambah fitur khusus Windows Desktop (misal perintah terminal baru, integrasi file system).

### 8. `android/MainActivity.java` (Fitur Native Android)
- **Fungsi:** Jembatan Java di aplikasi HP Android untuk fitur sistem (deteksi IP lokal, MediaProjection rekam layar, penyimpanan file).
- **Kapan diedit:** Saat ingin menambah izin atau fitur native sistem operasi Android.

---

### 💡 Cara Cepat Menerapkan Hasil Edit ke Proyek
Setelah Anda selesai mengedit file di folder ini dan ingin menerapkannya ke proyek utama:
1. Salin file yang diedit kembali ke foldernya masing-masing di proyek `vancross`.
2. Jalankan file **`build_all.bat`** di root direktori untuk mengompilasi APK Android atau Desktop Windows.
