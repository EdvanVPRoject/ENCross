// =============================================================================
// VANCROSS / ENCROS - PUSAT PENGATURAN & MODUL FITUR (FEATURE CONFIG)
// File ini dapat Anda edit secara langsung untuk menambah, mengubah, atau
// mengaktifkan/menonaktifkan fitur tanpa harus mengubah banyak kode internal.
// =============================================================================

export const APP_CONFIG = {
  appName: 'ENCross',
  appVersion: '1.0.0',
  author: 'Edvan',
  description: 'P2P File Transfer, Instant Text, Screen Mirror & Wireless Cam Hub',
  defaultRoom: 'encross-lan',
  defaultPort: 3001,
};

// Toggle fitur utama (Ubah true/false untuk mengaktifkan/menonaktifkan)
export const FEATURE_TOGGLES = {
  // 1. Transfer File P2P (WebRTC DataChannel 64KB Chunk)
  enableFileTransfer: true,

  // 2. Chat Teks Instan (Socket.io Signaling)
  enableTextSync: true,

  // 3. Mirroring Layar HP ke Laptop via Scrcpy Hub (Native 60 FPS)
  enableScrcpyMirror: true,

  // 4. Mirroring Layar WebRTC (Bagi Layar PC/Laptop)
  enableWebRTCScreenShare: true,

  // 5. Webcam HP Nirkabel (Kamera Depan/Belakang sebagai Webcam PC)
  enableWirelessWebcam: true,

  // 6. Sambungkan via QR Code Scanner
  enableQrScanner: true,

  // 7. Input Manual IP Server (Laptop ke Laptop / HP ke Laptop)
  enableManualIpConnect: true,
};

// Konfigurasi Standar Scrcpy Screen Mirroring (Desktop)
export const SCRCPY_CONFIG = {
  windowTitle: 'ENCross - Layar HP',
  stayAwake: true,
  alwaysOnTop: false,
  maxFps: 60,
  defaultAdbPort: 5555,
};

// Daftar Tombol Aksi Tambahan yang bisa Anda tambahkan ke Kartu Perangkat
// Anda bisa menambahkan item baru di sini untuk menampilkan tombol kustom di UI
export const CUSTOM_ACTIONS = [
  // Contoh aksi kustom (bisa Anda aktifkan atau tambah):
  // {
  //   id: 'ping-device',
  //   label: 'Ping Perangkat',
  //   icon: 'Activity',
  //   target: 'all', // 'all', 'mobile', atau 'desktop'
  //   onClick: (peer) => console.log('Ping to peer:', peer)
  // }
];
