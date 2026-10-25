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

  // 8. Akses File Dua Arah (Laptop <-> HP)
  enableRemoteFileExplorer: true,

  // 9. Dukungan Audio pada Webcam & Screen Share
  enableAudioStream: true,

  // 10. Paste Ctrl+V Langsung untuk Kirim File / Screenshot
  enableGlobalPaste: true,

  // 11. Riwayat Transfer File pada Sesi Aktif
  enableTransferHistory: true,

  // 12. Auto Clipboard Sync Dua Arah (Background Clipboard Laptop <-> HP)
  enableAutoClipboardSync: true,

  // 13. Virtual Touchpad & Numpad (HP Menjadi Mouse & Remote Laptop)
  enableVirtualTouchpad: true,

  // 14. Pause & Resume Transfer File WebRTC
  enableTransferResume: true,

  // 15. Notification Mirroring (Notifikasi HP Muncul di Laptop)
  enableNotificationMirror: true,

  // 16. Deringkan HP / Ring My Phone (Cari HP yang Lupa Ditaruh)
  enableRingPhone: true,

  // 17. Monitor Baterai & Status Perangkat Real-Time
  enableBatteryMonitor: true,

  // 18. Streaming Media Instan (Play Video/Audio Tanpa Unduh Dulu)
  enableInstantMediaStreaming: true,

  // 19. Kirim Seluruh Folder (Folder Transfer with Directory Structure)
  enableFolderTransfer: true,
};

// Konfigurasi Standar Scrcpy Screen Mirroring (Desktop)
export const SCRCPY_CONFIG = {
  windowTitle: 'ENCross - Layar HP',
  stayAwake: true,
  alwaysOnTop: false,
  maxFps: 60,
  defaultAdbPort: 5555,
  maxSize: 0,
  bitRate: '8M',
  turnScreenOff: false,
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



