import React, { useRef, useState } from 'react';
import {
  Laptop,
  Smartphone,
  Tablet,
  Upload,
  MessageSquare,
  MonitorPlay,
  Camera,
  QrCode,
  Wifi,
  Activity,
  SwitchCamera,
  Folder,
  Clock,
  Trash2,
  FolderOpen,
  ExternalLink,
  Download,
  ArrowDownLeft,
  ArrowUpRight,
  Sparkles,
  MousePointer,
  Battery,
  BatteryCharging,
  BatteryWarning,
  BellRing,
  FolderUp,
  Mic,
  HardDrive
} from 'lucide-react';
import { triggerHaptic } from '../utils/feedback';
import { FEATURE_TOGGLES, SCRCPY_CONFIG, CUSTOM_ACTIONS } from '../config/features';
import logoImg from '../assets/logo.png';

export function PeersRadar({
  peers = [],
  localIp,
  selfIp,
  activeSharingPeerId,
  activeSharingMode,
  cameraFacingMode,
  onSwitchCamera,
  unreadPeerId,
  onSendFile,
  onOpenTextSync,
  onStartScreenShare,
  onRequestRemoteScreen,
  onRequestRemoteCamera,
  onRequestRemoteMic,
  onOpenScrcpy,
  onOpenQR,
  isMobile,
  onOpenConnect,
  onOpenFileExplorer,
  pingMs,
  transferHistory = [],
  onClearTransferHistory,
  onOpenFolder,
  onOpenTouchpad,
  onRingDevice,
  onMountPhoneStorage
}) {
  const fileInputRef = useRef(null);
  const folderInputRef = useRef(null);
  const selectedPeerRef = useRef(null);
  const [dragOverPeerId, setDragOverPeerId] = useState(null);

  // Helper to recursively extract files from Drag & Drop with folder directory tree
  const extractFilesFromDataTransfer = async (dataTransfer) => {
    const items = dataTransfer.items;
    if (!items || items.length === 0) {
      return Array.from(dataTransfer.files || []);
    }

    const files = [];

    const traverseEntry = async (entry, dirPath = '') => {
      if (entry.isFile) {
        const file = await new Promise((resolve) => entry.file(resolve));
        file.relativePath = dirPath ? `${dirPath}/${file.name}` : file.name;
        files.push(file);
      } else if (entry.isDirectory) {
        const currentPath = dirPath ? `${dirPath}/${entry.name}` : entry.name;
        const dirReader = entry.createReader();
        const readBatch = async () => {
          const entries = await new Promise((resolve) => dirReader.readEntries(resolve));
          if (entries.length > 0) {
            for (const childEntry of entries) {
              await traverseEntry(childEntry, currentPath);
            }
            await readBatch();
          }
        };
        await readBatch();
      }
    };

    const queue = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.webkitGetAsEntry) {
        const entry = item.webkitGetAsEntry();
        if (entry) {
          queue.push(traverseEntry(entry));
          continue;
        }
      }
      const file = item.getAsFile();
      if (file) {
        file.relativePath = file.webkitRelativePath || file.name;
        files.push(file);
      }
    }

    if (queue.length > 0) {
      await Promise.all(queue);
      return files;
    }

    return Array.from(dataTransfer.files || []);
  };

  const handleFileSelect = (peerId) => {
    triggerHaptic([35]);
    selectedPeerRef.current = peerId;
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const handleFolderSelect = (peerId) => {
    triggerHaptic([35]);
    selectedPeerRef.current = peerId;
    if (folderInputRef.current) {
      folderInputRef.current.value = '';
      folderInputRef.current.click();
    }
  };

  const handleFolderChange = (e) => {
    const rawFiles = Array.from(e.target.files || []);
    if (rawFiles.length > 0 && selectedPeerRef.current && onSendFile) {
      const files = rawFiles.map((f) => {
        f.relativePath = f.webkitRelativePath || f.name;
        return f;
      });
      onSendFile(selectedPeerRef.current, files);
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes || bytes <= 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i] || 'B'}`;
  };

  const formatTime = (ts) => {
    if (!ts) return '';
    try {
      return new Date(ts).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  const getDeviceIcon = (type) => {
    switch (type) {
      case 'mobile':
        return <Smartphone className="w-5 h-5 sm:w-6 sm:h-6 text-zinc-300" />;
      case 'tablet':
        return <Tablet className="w-5 h-5 sm:w-6 sm:h-6 text-zinc-300" />;
      default:
        return <Laptop className="w-5 h-5 sm:w-6 sm:h-6 text-zinc-300" />;
    }
  };

  const isPc = (peer) => peer.deviceType === 'desktop' || ['Windows', 'macOS', 'Linux'].includes(peer.os);
  const pcPeers = peers.filter(isPc);
  const mobilePeers = peers.filter((p) => !isPc(p));

  const renderPeerCard = (peer) => {
    const isPeerMobile = !isPc(peer);
    const isDragOver = dragOverPeerId === peer.id;

    return (
      <div
        key={peer.id}
        onDragOver={(e) => {
          e.preventDefault();
          if (dragOverPeerId !== peer.id) setDragOverPeerId(peer.id);
        }}
        onDragLeave={() => {
          if (dragOverPeerId === peer.id) setDragOverPeerId(null);
        }}
        onDrop={async (e) => {
          e.preventDefault();
          setDragOverPeerId(null);
          const files = await extractFilesFromDataTransfer(e.dataTransfer);
          if (files.length > 0 && onSendFile) {
            onSendFile(peer.id, files);
          }
        }}
        className={`bg-zinc-900 border rounded-2xl p-4 sm:p-5 transition-all flex flex-col justify-between shadow-sm relative overflow-hidden text-left ${
          isDragOver
            ? 'border-emerald-500 bg-emerald-500/10 ring-2 ring-emerald-500/30 scale-[1.01]'
            : 'border-zinc-800 hover:border-zinc-700'
        }`}
      >
        {/* Glow overlay during drag-and-drop */}
        {isDragOver && (
          <div className="absolute inset-0 z-10 bg-emerald-950/80 backdrop-blur-xs flex flex-col items-center justify-center p-4 text-center pointer-events-none animate-in fade-in duration-150">
            <Upload className="w-8 h-8 text-emerald-400 mb-2 animate-bounce" />
            <p className="text-xs font-bold text-white">Lepaskan file untuk mengirim</p>
            <p className="text-[11px] text-emerald-300 truncate max-w-xs mt-0.5">Ke {peer.name}</p>
          </div>
        )}

        <div>
          {/* Top Bar: Icon & Ping / Connection Status */}
          <div className="flex items-start justify-between mb-3">
            <div className="p-2 sm:p-2.5 bg-zinc-800/90 border border-zinc-700/60 rounded-xl">
              {getDeviceIcon(peer.deviceType)}
            </div>
            <div className="flex items-center gap-1.5 text-zinc-400 text-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-mono text-[11px] text-emerald-400">
                {pingMs ? `${pingMs} ms • P2P LAN` : 'P2P LAN'}
              </span>
            </div>
          </div>

          {/* Device Name & Details */}
          <h3 className="text-sm sm:text-base font-semibold text-white truncate mb-1">
            {peer.name}
          </h3>
          <div className="flex items-center gap-2 text-[11px] text-zinc-400 mb-4 font-mono">
            <span className="bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-300">{peer.os}</span>
            <span>•</span>
            <span className="bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-300">{peer.browser}</span>
            {peer.battery && typeof peer.battery.level === 'number' && peer.battery.level >= 0 && (
              <>
                <span>•</span>
                <span
                  className="inline-flex items-center gap-1 bg-zinc-800/90 px-1.5 py-0.5 rounded text-zinc-300"
                  title={'Baterai: ' + peer.battery.level + '%' + (peer.battery.isCharging ? ' (Mengisi Daya)' : '')}
                >
                  {peer.battery.isCharging ? (
                    <BatteryCharging className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  ) : peer.battery.level <= 20 ? (
                    <BatteryWarning className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  ) : (
                    <Battery className="w-3.5 h-3.5 text-zinc-300 shrink-0" />
                  )}
                  <span>{peer.battery.level}%</span>
                </span>
              </>
            )}
          </div>
        </div>

        {/* 2-Column Grid Action Hierarchy */}
        <div className="space-y-2 pt-3 border-t border-zinc-800/90">
          {/* Baris Utama: Kirim File / Foto & Jelajahi File */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => handleFileSelect(peer.id)}
              className="flex items-center justify-center gap-1.5 bg-zinc-100 hover:bg-white active:scale-[0.98] text-zinc-950 font-semibold py-2 px-2.5 rounded-xl text-xs transition cursor-pointer shadow-xs"
              title="Kirim satu atau banyak file/foto"
            >
              <Upload className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Kirim File</span>
            </button>

            {FEATURE_TOGGLES.enableRemoteFileExplorer !== false && (
              <button
                onClick={() => {
                  triggerHaptic([30]);
                  if (onOpenFileExplorer) onOpenFileExplorer(peer);
                }}
                className="flex items-center justify-center gap-1.5 bg-zinc-800 hover:bg-zinc-700 active:scale-[0.98] text-zinc-200 border border-zinc-700 py-2 px-2.5 rounded-xl text-xs font-semibold transition cursor-pointer shadow-xs"
                title="Akses folder & file dua arah secara langsung"
              >
                <Folder className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="truncate">Jelajahi File</span>
              </button>
            )}
          </div>

          {/* Tombol Kirim Seluruh Folder (Folder Transfer with Directory Structure) */}
          {FEATURE_TOGGLES.enableFolderTransfer !== false && (
            <button
              onClick={() => handleFolderSelect(peer.id)}
              className="w-full flex items-center justify-center gap-1.5 bg-zinc-800/80 hover:bg-zinc-700 active:scale-[0.98] text-amber-300 border border-amber-500/30 hover:border-amber-500/50 py-1.5 px-2.5 rounded-xl text-xs font-medium transition cursor-pointer"
              title="Kirim seluruh folder beserta struktur direktori tanpa perlu zip manual"
            >
              <FolderUp className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>Kirim Seluruh Folder</span>
            </button>
          )}

          {/* Baris Kedua: Kirim Teks & Bagi Layar / Mirror */}
          <div className="grid grid-cols-2 gap-2">
            {/* Kirim Teks */}
            <button
              onClick={() => {
                triggerHaptic([30]);
                onOpenTextSync(peer);
              }}
              className={`flex items-center justify-center gap-1.5 active:scale-[0.98] py-2 px-2 rounded-xl text-xs font-medium transition cursor-pointer ${
                unreadPeerId === peer.id || (peer.deviceId && unreadPeerId === peer.deviceId)
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30 ring-1 ring-emerald-500/30'
                  : 'bg-zinc-800/80 hover:bg-zinc-700 text-zinc-200 border border-zinc-700/60'
              }`}
            >
              <MessageSquare
                className={`w-3.5 h-3.5 shrink-0 ${
                  unreadPeerId === peer.id || (peer.deviceId && unreadPeerId === peer.deviceId)
                    ? 'text-emerald-400 animate-bounce'
                    : 'text-zinc-400'
                }`}
              />
              <span className="truncate">
                {unreadPeerId === peer.id || (peer.deviceId && unreadPeerId === peer.deviceId)
                  ? 'Pesan Baru'
                  : 'Kirim Teks'}
              </span>
            </button>

            {/* Bagi Layar / Mirror Layar */}
            <button
              onClick={() => {
                triggerHaptic([30]);
                onStartScreenShare(peer.id, 'screen');
              }}
              className={`flex items-center justify-center gap-1.5 active:scale-[0.98] py-2 px-2 rounded-xl text-xs font-medium transition cursor-pointer ${
                activeSharingPeerId === peer.id && activeSharingMode === 'screen'
                  ? 'bg-red-500/20 text-red-300 border border-red-500/40 hover:bg-red-500/30'
                  : 'bg-sky-500/10 hover:bg-sky-500/20 text-sky-300 border border-sky-500/30'
              }`}
            >
              <MonitorPlay
                className={`w-3.5 h-3.5 shrink-0 ${
                  activeSharingPeerId === peer.id && activeSharingMode === 'screen'
                    ? 'text-red-400 animate-pulse'
                    : 'text-sky-400'
                }`}
              />
              <span className="truncate">
                {activeSharingPeerId === peer.id && activeSharingMode === 'screen'
                  ? 'Stop Layar'
                  : isMobile
                  ? 'Mirror Layar'
                  : 'Bagi Layar'}
              </span>
            </button>
          </div>

          {/* Baris Ketiga: Khusus jika peer adalah HP dilihat dari Laptop/PC */}
          {!isMobile && isPeerMobile && (
            <div className="flex flex-col gap-2 pt-0.5">
              <div className="grid grid-cols-2 gap-2">
                {/* Scrcpy 60 FPS Native */}
                {FEATURE_TOGGLES.enableScrcpyMirror !== false && (
                  <button
                    onClick={() => {
                      triggerHaptic([30]);
                      if (onOpenScrcpy) onOpenScrcpy(peer);
                    }}
                    className="flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg text-[11px] font-semibold bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 border border-sky-500/35 transition cursor-pointer active:scale-[0.98]"
                    title="Mirror layar HP dengan mouse & keyboard (60 FPS Native)"
                  >
                    <Smartphone className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                    <span className="truncate">Scrcpy 60 FPS</span>
                  </button>
                )}

                {/* Webcam HP */}
                {FEATURE_TOGGLES.enableWirelessWebcam !== false && (
                  <button
                    onClick={() => {
                      triggerHaptic([30]);
                      if (onRequestRemoteCamera) onRequestRemoteCamera(peer.id);
                    }}
                    className={`flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg text-[11px] font-medium transition cursor-pointer active:scale-[0.98] ${
                      activeSharingPeerId === peer.id && activeSharingMode === 'camera'
                        ? 'bg-red-500/20 text-red-300 border border-red-500/40 hover:bg-red-500/30'
                        : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    }`}
                    title="Jadikan kamera ponsel ini sebagai webcam nirkabel PC"
                  >
                    <Camera className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span className="truncate">
                      {activeSharingPeerId === peer.id && activeSharingMode === 'camera' ? 'Stop Cam' : 'Webcam HP'}
                    </span>
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                {/* Wireless Mic HP */}
                {FEATURE_TOGGLES.enableWirelessMic !== false && (
                  <button
                    onClick={() => {
                      triggerHaptic([30]);
                      if (onRequestRemoteMic) onRequestRemoteMic(peer.id);
                    }}
                    className={`flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg text-[11px] font-medium transition cursor-pointer active:scale-[0.98] ${
                      activeSharingPeerId === peer.id && activeSharingMode === 'mic'
                        ? 'bg-red-500/20 text-red-300 border border-red-500/40 hover:bg-red-500/30'
                        : 'bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 border border-teal-500/30'
                    }`}
                    title="Gunakan mikrofon ponsel ini sebagai mic eksternal laptop"
                  >
                    <Mic className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                    <span className="truncate">
                      {activeSharingPeerId === peer.id && activeSharingMode === 'mic' ? 'Stop Mic' : 'Mic HP'}
                    </span>
                  </button>
                )}

                {/* Deringkan HP */}
                {FEATURE_TOGGLES.enableRingPhone !== false && (
                  <button
                    onClick={() => {
                      triggerHaptic([35]);
                      if (onRingDevice) onRingDevice(peer.id);
                    }}
                    className="flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg text-[11px] font-medium bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/30 transition cursor-pointer active:scale-[0.98]"
                    title="Bunyikan alarm suara kencang di HP jika lupa menaruh"
                  >
                    <BellRing className="w-3.5 h-3.5 text-red-400 shrink-0" />
                    <span className="truncate">Deringkan HP</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Baris Khusus: Buka Penyimpanan HP di Windows File Explorer (Drive Z:) */}
          {isPeerMobile && FEATURE_TOGGLES.enableWindowsDriveMount !== false && (
            <div className="pt-0.5">
              <button
                onClick={() => {
                  triggerHaptic([30]);
                  if (onMountPhoneStorage) onMountPhoneStorage(peer);
                }}
                className="w-full flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-[11px] font-semibold bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/35 transition cursor-pointer active:scale-[0.98]"
                title="Buka seluruh penyimpanan internal HP langsung di Windows File Explorer (Drive Z:)"
              >
                <HardDrive className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span className="truncate">Buka di Windows Explorer (Drive Z:)</span>
              </button>
            </div>
          )}

                    {/* Baris Khusus: Remote / Virtual Touchpad jika peer adalah Laptop/PC */}
          {!isPeerMobile && FEATURE_TOGGLES.enableVirtualTouchpad !== false && (
            <div className="pt-0.5">
              <button
                onClick={() => {
                  triggerHaptic([30]);
                  if (onOpenTouchpad) onOpenTouchpad(peer);
                }}
                className="w-full flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-[11px] font-semibold bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/35 transition cursor-pointer active:scale-[0.98]"
                title="Gunakan HP sebagai trackpad, mouse, numpad, dan kontrol remote PC"
              >
                <MousePointer className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="truncate">Remote & Touchpad PC</span>
              </button>
            </div>
          )}

          {/* Render Custom Actions dari features.js jika ada */}
          {CUSTOM_ACTIONS && CUSTOM_ACTIONS.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {CUSTOM_ACTIONS.filter(
                (act) => act.target === 'all' || act.target === peer.deviceType || (act.target === 'mobile' && isPeerMobile) || (act.target === 'desktop' && !isPeerMobile)
              ).map((act) => (
                <button
                  key={act.id}
                  onClick={() => {
                    triggerHaptic([25]);
                    if (typeof act.onClick === 'function') act.onClick(peer);
                  }}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[11px] font-medium border border-zinc-700/60 transition cursor-pointer active:scale-[0.98]"
                >
                  <Sparkles className="w-3 h-3 text-amber-400" />
                  <span>{act.label}</span>
                </button>
              ))}
            </div>
          )}

          {/* Quick Switch Camera Button on Peer Card when Camera Streaming */}
          {activeSharingPeerId === peer.id && activeSharingMode === 'camera' && onSwitchCamera && (
            <button
              onClick={() => {
                triggerHaptic([30]);
                onSwitchCamera();
              }}
              className="w-full mt-1 flex items-center justify-center gap-1.5 active:scale-[0.98] py-2 px-2 rounded-xl text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30 transition cursor-pointer"
            >
              <SwitchCamera className="w-3.5 h-3.5 text-emerald-400" />
              <span>Ganti Kamera ({cameraFacingMode === 'user' ? 'Depan' : 'Belakang'})</span>
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="w-full max-w-6xl mx-auto py-4 sm:py-8 px-3 sm:px-6">
      {/* Hidden file input supporting multi-file selection */}
      <input
        type="file"
        multiple
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Hidden folder input supporting recursive folder selection */}
      <input
        type="file"
        webkitdirectory=""
        directory=""
        multiple
        ref={folderInputRef}
        onChange={handleFolderChange}
        className="hidden"
      />

      {peers.length === 0 ? (
        /* Waiting / Empty State */
        <div className="flex flex-col items-center justify-center py-12 sm:py-20 text-center">
          <div className="w-16 h-16 sm:w-20 sm:h-20 mb-4 relative flex items-center justify-center">
            <img
              src={logoImg}
              alt="ENCross"
              className="w-full h-full object-contain filter drop-shadow-md select-none"
            />
            <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500" />
            </span>
          </div>

          <h2 className="text-base sm:text-lg font-semibold text-white mb-1.5 tracking-tight">
            Menunggu Perangkat Lain
          </h2>
          <p className="text-zinc-400 text-xs max-w-xs sm:max-w-sm mb-5 leading-relaxed px-2">
            {isMobile
              ? 'Pastikan HP dan Laptop terhubung ke Wi-Fi yang sama, lalu sambungkan via Scan QR atau ketik IP Laptop.'
              : 'Pastikan kedua perangkat di Wi-Fi yang sama, lalu scan QR Code di bawah menggunakan smartphone.'}
          </p>

          <div className="flex flex-col items-center gap-2.5">
            {isMobile && onOpenConnect ? (
              <button
                onClick={() => {
                  triggerHaptic([30]);
                  onOpenConnect();
                }}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-semibold px-4 py-2.5 rounded-xl text-xs transition cursor-pointer shadow-sm active:scale-[0.98]"
              >
                <Wifi className="w-4 h-4" />
                <span>Sambungkan ke Laptop (Scan QR / IP)</span>
              </button>
            ) : !isMobile && onOpenQR ? (
              /* Button on desktop when no peers are connected */
              <button
                onClick={() => {
                  triggerHaptic([30]);
                  onOpenQR();
                }}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-semibold px-4 py-2.5 rounded-xl text-xs transition cursor-pointer shadow-sm active:scale-[0.98]"
              >
                <QrCode className="w-4 h-4" />
                <span>Tampilkan QR Code Koneksi</span>
              </button>
            ) : null}

            {((isMobile && (selfIp || localIp)) || (!isMobile && localIp && localIp !== '127.0.0.1')) && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs font-mono text-zinc-300 mt-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-zinc-500 font-sans text-[11px]">{isMobile ? 'IP HP:' : 'IP Laptop:'}</span>
                <span className="text-emerald-400 font-semibold">{isMobile ? (selfIp || localIp) : localIp}</span>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Connected Peers Layout */
        <div className="w-full">
          {/* Compact Modern Header Bar */}
          <div className="flex items-center justify-between p-3.5 mb-6 rounded-2xl bg-zinc-900/90 border border-zinc-800 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 relative flex items-center justify-center shrink-0">
                <img src={logoImg} alt="ENCross" className="w-full h-full object-contain filter drop-shadow select-none" />
                <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                </span>
              </div>
              <div className="text-left">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-bold text-white tracking-tight">Perangkat Terdeteksi</h2>
                  <span className="text-[10px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-mono font-medium">
                    {peers.length} Online
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400 font-mono">
                  {pingMs ? `Latensi LAN: ${pingMs} ms • Real-time P2P` : 'P2P Real-time LAN Hub'}
                </p>
              </div>
            </div>

            {/* Quick Actions in Compact Header */}
            <div className="flex items-center gap-2">
              {!isMobile && onOpenQR && (
                <button
                  onClick={onOpenQR}
                  title="Buka QR Code untuk di-scan Smartphone"
                  className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition cursor-pointer border border-zinc-700/60 active:scale-[0.98]"
                >
                  <QrCode className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Grouped Peers Grid */}
          <div className="space-y-6">
            {/* Kelompok 1: Laptop & Komputer (PC) - Hanya jika ada */}
            {pcPeers.length > 0 && (
              <section className="space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-zinc-800/80">
                  <div className="flex items-center gap-2">
                    <Laptop className="w-4 h-4 text-emerald-400" />
                    <h3 className="text-xs sm:text-sm font-semibold text-zinc-200 tracking-tight uppercase">
                      Laptop & Komputer (PC)
                    </h3>
                    <span className="text-[10px] font-mono text-zinc-400 bg-zinc-800 px-2 py-0.5 rounded">
                      {pcPeers.length} Perangkat
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                  {pcPeers.map(renderPeerCard)}
                </div>
              </section>
            )}

            {/* Garis Pemisah: Hanya jika PC DAN HP sama-sama online */}
            {pcPeers.length > 0 && mobilePeers.length > 0 && (
              <div className="relative my-6 sm:my-8">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-zinc-800" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-zinc-950 px-3 py-0.5 text-zinc-500 font-mono text-[11px] uppercase tracking-wider rounded border border-zinc-800/80">
                    Pemisah Perangkat (PC / HP)
                  </span>
                </div>
              </div>
            )}

            {/* Kelompok 2: Smartphone & HP - Hanya jika ada */}
            {mobilePeers.length > 0 && (
              <section className="space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-zinc-800/80">
                  <div className="flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-cyan-400" />
                    <h3 className="text-xs sm:text-sm font-semibold text-zinc-200 tracking-tight uppercase">
                      Smartphone & HP (Android / iOS)
                    </h3>
                    <span className="text-[10px] font-mono text-zinc-400 bg-zinc-800 px-2 py-0.5 rounded">
                      {mobilePeers.length} Perangkat
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                  {mobilePeers.map(renderPeerCard)}
                </div>
              </section>
            )}
          </div>

          {/* Session Transfer History Panel */}
          {FEATURE_TOGGLES.enableTransferHistory !== false && transferHistory && transferHistory.length > 0 && (
            <div className="mt-8 text-left bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4 sm:p-5 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-emerald-400" />
                  <h4 className="text-xs font-semibold text-zinc-200 uppercase tracking-tight">
                    Riwayat Transfer Sesi Ini ({transferHistory.length})
                  </h4>
                </div>

                <div className="flex items-center gap-2">
                  {onOpenFolder && (
                    <button
                      onClick={onOpenFolder}
                      className="flex items-center gap-1 px-2.5 py-1 text-[11px] bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg border border-zinc-700 transition cursor-pointer"
                      title="Buka folder Downloads/ENCross"
                    >
                      <FolderOpen className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Buka Folder ENCross</span>
                    </button>
                  )}
                  {onClearTransferHistory && (
                    <button
                      onClick={onClearTransferHistory}
                      className="flex items-center gap-1 px-2 py-1 text-[11px] text-zinc-400 hover:text-red-400 hover:bg-zinc-800 rounded-lg transition cursor-pointer"
                      title="Bersihkan riwayat transfer sesi ini"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Bersihkan</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-1.5 max-h-56 overflow-y-auto">
                {transferHistory.map((item, idx) => (
                  <div
                    key={`${item.fileId}_${idx}`}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-950/60 border border-zinc-800/80 text-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 pr-2">
                      <div className="p-1.5 rounded-lg bg-zinc-800 shrink-0">
                        {item.direction === 'upload' ? (
                          <ArrowUpRight className="w-3.5 h-3.5 text-blue-400" />
                        ) : (
                          <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-400" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-zinc-200 font-medium truncate text-xs">{item.fileName}</p>
                        <p className="text-[10px] text-zinc-400 font-mono">
                          {formatFileSize(item.fileSize)} • {formatTime(item.timestamp)} •{' '}
                          {item.direction === 'upload' ? 'Terkirim' : 'Diterima'}
                        </p>
                      </div>
                    </div>

                    {item.blobUrl && (
                      <a
                        href={item.blobUrl}
                        download={item.fileName}
                        className="flex items-center gap-1 px-2.5 py-1 bg-emerald-600/30 hover:bg-emerald-600 text-emerald-300 hover:text-white rounded-lg text-[11px] font-semibold transition cursor-pointer shrink-0"
                      >
                        <Download className="w-3 h-3" />
                        <span>Unduh Ulang</span>
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default PeersRadar;


