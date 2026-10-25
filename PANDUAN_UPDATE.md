# Panduan Edit & Pembaruan Fitur Vancross / ENCross

Dokumen ini merupakan panduan lengkap arsitektur dan peta file program untuk memudahkan Anda mengedit, memperbarui, serta menambahkan fitur baru pada aplikasi **ENCross** (Web, Android APK, dan Windows Desktop).

---

## 1. File Pusat Pengaturan Fitur Cepat

Untuk memudahkan Anda mengaktifkan/menonaktifkan atau mengatur fitur tanpa harus membongkar ratusan baris kode, gunakan file konfigurasi modular berikut:

- 📄 **[`client/src/config/features.js`](file:///d:/ProjekAntigravity/encross/client/src/config/features.js)**
  - Mengatur judul aplikasi, nama pembuat, dan versi.
  - Saklar On/Off fitur (`enableFileTransfer`, `enableTextSync`, `enableScrcpyMirror`, `enableWirelessWebcam`, `enableQrScanner`, `enableManualIpConnect`).
  - Pengaturan default Scrcpy (FPS, judul jendela, timeout stay-awake).
  - Slot untuk mendaftarkan tombol aksi kustom tambahan (`CUSTOM_ACTIONS`).

---

## 2. Peta Lengkap File Program & Fungsinya

Setiap modul di ENCross dirancang terisolasi dan modular. Berikut daftar file program utama yang dapat Anda edit:

### A. Tampilan & UI Utama (Frontend React + Tailwind)
| Nama File | Fungsi & Apa yang Bisa Diedit |
| :--- | :--- |
| **[`client/src/App.jsx`](file:///d:/ProjekAntigravity/encross/client/src/App.jsx)** | Pusat alur logika (State Root), manajemen koneksi Socket.io, pengendali modal, dan pemanggil stream WebRTC. |
| **[`client/src/components/PeersRadar.jsx`](file:///d:/ProjekAntigravity/encross/client/src/components/PeersRadar.jsx)** | Tampilan Radar & daftar perangkat. Membagi kelompok PC dan HP, menampilkan tombol kirim file, teks, mirror layar, webcam, dan Scrcpy Hub. |
| **[`client/src/components/ScrcpyModal.jsx`](file:///d:/ProjekAntigravity/encross/client/src/components/ScrcpyModal.jsx)** | Jendela kontrol Scrcpy 60 FPS di laptop: deteksi HP via ADB, tombol koneksi Wi-Fi (nirkabel), dan panduan koneksi. |
| **[`client/src/components/ShareSourceModal.jsx`](file:///d:/ProjekAntigravity/encross/client/src/components/ShareSourceModal.jsx)** | Dialog di HP untuk memilih siaran antara *Layar HP (Screen Mirror)* atau *Kamera HP (Wireless Cam)*. |
| **[`client/src/components/ScreenViewModal.jsx`](file:///d:/ProjekAntigravity/encross/client/src/components/ScreenViewModal.jsx)** | Jendela pemutar video siaran live WebRTC dari perangkat lawan (fitur fullscreen, ganti kamera remote). |
| **[`client/src/components/ServerIpModal.jsx`](file:///d:/ProjekAntigravity/encross/client/src/components/ServerIpModal.jsx)** | Dialog hubungkan manual: Scanner QR Code kamera dan form input IP manual (Laptop ke Laptop / HP ke Laptop). |
| **[`client/src/components/TextSyncDrawer.jsx`](file:///d:/ProjekAntigravity/encross/client/src/components/TextSyncDrawer.jsx)** | Panel obrolan chat teks instan real-time antar perangkat. |
| **[`client/src/components/TransferProgressModal.jsx`](file:///d:/ProjekAntigravity/encross/client/src/components/TransferProgressModal.jsx)** | Dialog visual kecepatan transfer file (persentase, MB/s, progress bar). |

---

### B. Jaringan P2P & Signaling Server
| Nama File | Fungsi & Apa yang Bisa Diedit |
| :--- | :--- |
| **[`client/src/utils/webrtcManager.js`](file:///d:/ProjekAntigravity/encross/client/src/utils/webrtcManager.js)** | Engine WebRTC peer-to-peer. Mengatur koneksi RTCPeerConnection, pengiriman chunk file 64KB, penangkapan canvas native screen, dan pergantian kamera fisik. |
| **[`server/index.js`](file:///d:/ProjekAntigravity/encross/server/index.js)** | Server Socket.io lokal (Node.js). Mengatur penemuan perangkat di LAN, penyampaian sinyal WebRTC (offer, answer, ICE), dan pesan teks instan. |

---

### C. Aplikasi Desktop Windows (Electron)
| Nama File | Fungsi & Apa yang Bisa Diedit |
| :--- | :--- |
| **[`desktop/main.js`](file:///d:/ProjekAntigravity/encross/desktop/main.js)** | Backend aplikasi desktop Windows. Menjalankan proses Scrcpy secara native via `child_process`, perintah ADB, System Tray di taskbar, dan penyimpanan otomatis file download. |
| **[`desktop/preload.js`](file:///d:/ProjekAntigravity/encross/desktop/preload.js)** | Jembatan (Bridge) aman yang mengekspos fungsi desktop ke UI (`window.electronAPI`), seperti `startScrcpy`, `connectAdbTcpip`, dan `getScrcpyStatus`. |

---

### D. Aplikasi Android Native (Capacitor + Java)
| Nama File | Fungsi & Apa yang Bisa Diedit |
| :--- | :--- |
| **[`client/android/app/src/main/java/com/vancross/app/MainActivity.java`](file:///d:/ProjekAntigravity/encross/client/android/app/src/main/java/com/vancross/app/MainActivity.java)** | Bridge Java native: Pengambilan IP lokal perangkat HP, MediaProjection capture stream, penyimpanan file ke folder Downloads/ENCross, dan integrasi tombol back fisik. |
| **[`client/android/app/src/main/AndroidManifest.xml`](file:///d:/ProjekAntigravity/encross/client/android/app/src/main/AndroidManifest.xml)** | Deklarasi izin Android (`FOREGROUND_SERVICE`, `FOREGROUND_SERVICE_MEDIA_PROJECTION`, `INTERNET`, dll.). |

---

## 3. Contoh Cara Menambahkan Fitur Baru

### Contoh 1: Menambahkan Tombol Aksi Baru di Kartu Perangkat
1. Buka **[`client/src/components/PeersRadar.jsx`](file:///d:/ProjekAntigravity/encross/client/src/components/PeersRadar.jsx)**.
2. Cari bagian `/* DESKTOP / LAPTOP PEER ACTIONS */` atau `/* MOBILE PEER ACTIONS */`.
3. Tambahkan tombol baru, misalnya:
```jsx
<button
  onClick={() => {
    triggerHaptic([30]);
    alert('Fitur baru dipanggil untuk perangkat: ' + peer.name);
  }}
  className="px-3 py-2 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/40 text-xs font-semibold"
>
  Fitur Kustom
</button>
```

### Contoh 2: Menambahkan Perintah Baru Antara Laptop dan HP via Socket.io
1. Buka **[`server/index.js`](file:///d:/ProjekAntigravity/encross/server/index.js)**:
```javascript
socket.on('perintah-kustom', ({ targetId, data }) => {
  if (targetId) {
    io.to(targetId).emit('perintah-kustom-diterima', { senderId: socket.id, data });
  }
});
```
2. Buka **[`client/src/App.jsx`](file:///d:/ProjekAntigravity/encross/client/src/App.jsx)**:
```javascript
// Kirim perintah
socketRef.current.emit('perintah-kustom', { targetId: peerId, data: 'Halo' });

// Tangkap di perangkat penerima
newSocket.on('perintah-kustom-diterima', ({ senderId, data }) => {
  console.log('Perintah diterima:', data);
});
```

---

## 4. Cara Mudah Kompilasi & Build (1-Klik)

Gunakan file script otomatis **[`build_all.bat`](file:///d:/ProjekAntigravity/encross/build_all.bat)** yang telah disediakan di root direktori proyek.

Cukup klik dua kali `build_all.bat` pada Windows Explorer, lalu pilih nomor:
- **Tekan 1**: Membangun Web Client saja (`client/dist`).
- **Tekan 2**: Membangun Web Client + Mengompilasi file **APK Android** (`release/ENCross.apk`).
- **Tekan 3**: Memaketkan aplikasi **Desktop Windows** (.exe installer & portable di `release/`).
- **Tekan 4**: Membangun SEMUANYA sekaligus (Web, Android APK, dan Desktop Windows).
- **Tekan 5**: Menjalankan server dan client dalam mode pengembangan (live reload).
