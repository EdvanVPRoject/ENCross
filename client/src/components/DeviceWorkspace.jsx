import React, { useRef, useState, useEffect } from 'react';
import {
  ArrowLeft,
  Smartphone,
  Laptop,
  Tablet,
  Folder,
  Upload,
  MessageSquare,
  MonitorPlay,
  Camera,
  Mic,
  MousePointer,
  BellRing,
  HardDrive,
  Layers,
  Battery,
  BatteryCharging,
  BatteryWarning,
  Power,
  RotateCw,
  Maximize2,
  Minimize2,
  Volume2,
  VolumeX,
  Volume1,
  Square,
  Circle,
  ChevronLeft,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  Play,
  Pause,
  RefreshCw,
  FolderUp,
  Clock,
  ArrowDownLeft,
  ArrowUpRight,
  FolderOpen,
  Trash2
} from 'lucide-react';
import { triggerHaptic } from '../utils/feedback';
import { FEATURE_TOGGLES } from '../config/features';
import { formatBytes } from '../utils/deviceInfo';

function formatTransferTime(ts) {
  if (!ts) return '';
  if (typeof ts === 'string') return ts;
  try {
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

export function DeviceWorkspace({
  peer,
  selfInfo,
  isMobile,
  pingMs,
  onBack,
  onSendFile,
  onOpenTextSync,
  onOpenFileExplorer,
  onOpenTouchpad,
  onOpenMacroPad,
  onRingDevice,
  onMountPhoneStorage,
  onStartScreenShare,
  onRequestRemoteScreen,
  onRequestRemoteCamera,
  onRequestRemoteMic,
  incomingStream,
  incomingStreamMode,
  onSwitchCamera,
  transferHistory = [],
  onClearTransferHistory,
  onOpenFolder
}) {
  const fileInputRef = useRef(null);
  const folderInputRef = useRef(null);
  const mirrorContainerRef = useRef(null);
  const videoRef = useRef(null);
  const rafRef = useRef(null);

  const [showHistory, setShowHistory] = useState(true);

  // In-App Mirroring states
  const [mirrorEngine, setMirrorEngine] = useState('scrcpy'); // 'scrcpy' | 'webrtc'
  const [isDockedMode, setIsDockedMode] = useState(true);
  const [isMirrorActive, setIsMirrorActive] = useState(false);
  const [isScrcpyStarting, setIsScrcpyStarting] = useState(false);
  const [scrcpyError, setScrcpyError] = useState(null);
  const [scrcpyPid, setScrcpyPid] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  const isPeerMobile = peer?.deviceType?.toLowerCase() === 'mobile' || peer?.deviceType?.toLowerCase() === 'smartphone';
  const isElectron = typeof window !== 'undefined' && Boolean(window.electronAPI?.isElectron);

  // Helper to determine device icon
  const getDeviceIcon = (deviceType, className = 'w-6 h-6') => {
    switch (deviceType?.toLowerCase()) {
      case 'mobile':
      case 'smartphone':
        return <Smartphone className={`${className} text-emerald-400`} />;
      case 'tablet':
        return <Tablet className={`${className} text-purple-400`} />;
      case 'desktop':
      case 'laptop':
      default:
        return <Laptop className={`${className} text-cyan-400`} />;
    }
  };

  // Sync In-App Scrcpy window position to the DOM placeholder bounds (RAF throttled to eliminate IPC lag/stutter)
  const updateScrcpyPosition = () => {
    if (!isElectron || !isMirrorActive || mirrorEngine !== 'scrcpy' || !isDockedMode || !mirrorContainerRef.current) return;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      if (!mirrorContainerRef.current) return;
      const rect = mirrorContainerRef.current.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        window.electronAPI?.updateScrcpyBounds?.({
          x: Math.round(rect.left),
          y: Math.round(rect.top),
          width: Math.round(rect.width),
          height: Math.round(rect.height)
        });
      }
    });
  };

  useEffect(() => {
    if (isMirrorActive && mirrorEngine === 'scrcpy' && isDockedMode) {
      updateScrcpyPosition();

      // Listen to window resize / move events from Electron
      const unsub = window.electronAPI?.onWindowBoundsChanged?.(() => {
        updateScrcpyPosition();
      });

      const ro = new ResizeObserver(() => {
        updateScrcpyPosition();
      });
      if (mirrorContainerRef.current) {
        ro.observe(mirrorContainerRef.current);
      }

      window.addEventListener('resize', updateScrcpyPosition, { passive: true });
      window.addEventListener('scroll', updateScrcpyPosition, { passive: true });

      return () => {
        unsub?.();
        ro.disconnect();
        window.removeEventListener('resize', updateScrcpyPosition);
        window.removeEventListener('scroll', updateScrcpyPosition);
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
      };
    }
  }, [isMirrorActive, mirrorEngine, isDockedMode]);

  // Handle Scrcpy process stopping externally
  useEffect(() => {
    if (isElectron && window.electronAPI?.onScrcpyStopped) {
      const unsub = window.electronAPI.onScrcpyStopped((data) => {
        setIsMirrorActive(false);
        if (data?.error && data.code !== 0) {
          setScrcpyError(data.error);
        }
      });
      return () => unsub?.();
    }
  }, [isElectron]);

  // Clean up Scrcpy & RAF when leaving workspace or unmounting
  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (isElectron && isMirrorActive) {
        window.electronAPI?.stopScrcpy?.();
      }
    };
  }, [isMirrorActive, isElectron]);

  // Hook WebRTC incomingStream if active with full cleanup to prevent memory leaks
  useEffect(() => {
    const videoEl = videoRef.current;
    if (incomingStream && videoEl) {
      videoEl.srcObject = incomingStream;
      videoEl.play().catch(console.warn);
      setIsMirrorActive(true);
      setMirrorEngine('webrtc');
    }
    return () => {
      if (videoEl) {
        try {
          videoEl.pause();
          videoEl.srcObject = null;
        } catch (_) {}
      }
    };
  }, [incomingStream]);

  // Start Screen Mirroring (Scrcpy or WebRTC)
  const handleStartMirroring = async (forceEngine) => {
    const engine = forceEngine || mirrorEngine;
    triggerHaptic([30]);
    setScrcpyError(null);

    // If WebRTC selected or running in browser (non-Electron)
    if (engine === 'webrtc' || !isElectron) {
      setMirrorEngine('webrtc');
      setIsMirrorActive(true);
      onRequestRemoteScreen?.(peer.id, peer.deviceId);
      return;
    }

    // Scrcpy via Electron
    setIsScrcpyStarting(true);
    try {
      const rect = mirrorContainerRef.current?.getBoundingClientRect() || {
        left: 200,
        top: 150,
        width: 380,
        height: 600
      };

      const res = await window.electronAPI.startScrcpy({
        deviceId: peer.deviceId || peer.adbSerial || null,
        ip: peer.ip || peer.clientIp || null,
        docked: isDockedMode,
        stayAwake: true,
        maxSize: 1200,
        bitRate: '8M',
        bounds: {
          x: rect.left,
          y: rect.top,
          width: rect.width,
          height: rect.height
        }
      });

      if (res.success) {
        setIsMirrorActive(true);
        setScrcpyPid(res.pid);
        if (isDockedMode) {
          setTimeout(updateScrcpyPosition, 500);
        }
      } else {
        setScrcpyError(res.error || 'Gagal memulai Scrcpy.');
      }
    } catch (err) {
      setScrcpyError(err.message || 'Kesalahan saat menjalankan Scrcpy.');
    } finally {
      setIsScrcpyStarting(false);
    }
  };

  const handleStopMirroring = async () => {
    triggerHaptic([30]);
    if (isElectron) {
      await window.electronAPI.stopScrcpy();
    }
    setIsMirrorActive(false);
  };

  // Android Navigation Key Events (Back, Home, Recents, Power, Volume)
  const handleAdbKey = async (keycode) => {
    triggerHaptic([25]);
    if (isElectron && window.electronAPI?.sendAdbKeyevent) {
      await window.electronAPI.sendAdbKeyevent({
        ip: peer.ip || peer.clientIp || null,
        keycode
      });
    }
  };

  // Drag and drop handler for files onto workspace
  const handleDropFiles = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = Array.from(e.dataTransfer.files || []);
    if (files.length > 0 && onSendFile) {
      triggerHaptic([40]);
      onSendFile(peer.id, files);
    }
  };

  const renderTransferHistory = () => {
    if (!transferHistory || transferHistory.length === 0) return null;

    return (
      <div className="bg-zinc-900/90 border border-zinc-800 rounded-3xl p-4 shadow-xl flex flex-col gap-2.5 animate-view-enter">
        <div className="flex items-center justify-between">
          <button
            onClick={() => {
              triggerHaptic([15]);
              setShowHistory(!showHistory);
            }}
            className="flex items-center gap-2 text-xs font-bold text-zinc-300 hover:text-white transition cursor-pointer"
          >
            <Clock className="w-4 h-4 text-cyan-400" />
            <span>Riwayat Transfer ({transferHistory.length})</span>
            <span className="text-[10px] text-zinc-500 font-normal">[{showHistory ? 'Sembunyikan' : 'Lihat'}]</span>
          </button>

          <div className="flex items-center gap-1.5">
            {onOpenFolder && showHistory && (
              <button
                onClick={onOpenFolder}
                className="text-[11px] text-zinc-400 hover:text-cyan-300 transition cursor-pointer flex items-center gap-1 bg-zinc-800/70 hover:bg-zinc-800 px-2 py-1 rounded-lg border border-zinc-700/50"
                title="Buka Folder Unduhan"
              >
                <FolderOpen className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">Folder Unduhan</span>
              </button>
            )}
            {onClearTransferHistory && showHistory && (
              <button
                onClick={onClearTransferHistory}
                className="text-[11px] text-zinc-500 hover:text-red-400 transition cursor-pointer flex items-center gap-1 bg-zinc-800/50 hover:bg-red-950/40 px-2 py-1 rounded-lg border border-zinc-700/40 hover:border-red-800/50"
                title="Hapus riwayat sesi"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Hapus</span>
              </button>
            )}
          </div>
        </div>

        {showHistory && (
          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {transferHistory.map((item, idx) => {
              const isUpload = item.direction === 'upload' || item.direction === 'sent';
              const name = item.fileName || item.name || 'Berkas';
              const sizeStr = item.fileSize ? formatBytes(item.fileSize) : '';
              const timeStr = formatTransferTime(item.timestamp || item.time);
              const statusLabel = isUpload ? 'Terkirim' : 'Diterima';

              return (
                <div
                  key={item.fileId || item.id || idx}
                  className="flex items-center justify-between bg-zinc-950/70 border border-zinc-800/60 rounded-xl p-2.5 text-xs text-zinc-300 hover:border-zinc-700/70 transition gap-2"
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div className={`p-1.5 rounded-lg shrink-0 ${isUpload ? 'bg-cyan-950/60 text-cyan-400 border border-cyan-800/50' : 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/50'}`}>
                      {isUpload ? (
                        <ArrowUpRight className="w-4 h-4" />
                      ) : (
                        <ArrowDownLeft className="w-4 h-4" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-zinc-200 text-xs" title={name}>{name}</p>
                      <p className="text-[10px] text-zinc-500 flex items-center gap-1.5">
                        {sizeStr && <span>{sizeStr}</span>}
                        {sizeStr && <span>•</span>}
                        <span className={isUpload ? 'text-cyan-400 font-medium' : 'text-emerald-400 font-medium'}>{statusLabel}</span>
                        {timeStr && <span>• {timeStr}</span>}
                      </p>
                    </div>
                  </div>
                  {item.blobUrl && (
                    <a
                      href={item.blobUrl}
                      download={name}
                      className="shrink-0 text-[11px] font-medium text-emerald-400 hover:text-emerald-300 bg-emerald-950/50 border border-emerald-800/60 px-2.5 py-1 rounded-lg transition active:scale-95"
                    >
                      Simpan
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        if (!isDragOver) setIsDragOver(true);
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={handleDropFiles}
      className="w-full max-w-6xl mx-auto px-3 sm:px-6 py-3 flex flex-col gap-4 animate-view-enter smooth-gpu min-h-[85vh] relative"
    >
      {/* Hidden file & folder inputs */}
      <input
        type="file"
        ref={fileInputRef}
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length > 0 && onSendFile) {
            onSendFile(peer.id, Array.from(e.target.files));
          }
          e.target.value = '';
        }}
      />
      <input
        type="file"
        ref={folderInputRef}
        webkitdirectory="true"
        directory="true"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length > 0 && onSendFile) {
            onSendFile(peer.id, Array.from(e.target.files));
          }
          e.target.value = '';
        }}
      />

      {/* Drag Over Overlay */}
      {isDragOver && (
        <div className="absolute inset-0 z-50 bg-emerald-950/85 backdrop-blur-md rounded-3xl border-2 border-dashed border-emerald-400 flex flex-col items-center justify-center pointer-events-none animate-in fade-in duration-150">
          <Upload className="w-12 h-12 text-emerald-400 animate-bounce mb-3" />
          <h3 className="text-lg font-bold text-white">Lepaskan Berkas Untuk Dikirim</h3>
          <p className="text-xs text-emerald-300 mt-1">Langsung transfer ke {peer.name}</p>
        </div>
      )}

      {/* 1. Top Bar: Back Button, Selected Device Info & Status */}
      <div className="bg-zinc-900/95 border border-zinc-800 rounded-2xl px-4 py-3 shadow-xl backdrop-blur-md flex items-center justify-between gap-3 flex-wrap sm:flex-nowrap">
        {/* Left: Back Button & Target Device Summary */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => {
              triggerHaptic([30]);
              if (isMirrorActive && isElectron) {
                window.electronAPI?.stopScrcpy?.();
              }
              onBack();
            }}
            className="flex items-center gap-1.5 bg-zinc-800 hover:bg-zinc-700 active:scale-95 text-zinc-200 border border-zinc-700 px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 shadow-sm"
            title="Kembali ke Daftar Perangkat"
          >
            <ArrowLeft className="w-4 h-4 text-emerald-400" />
            <span className="hidden sm:inline">Daftar Perangkat</span>
          </button>

          <div className="h-6 w-px bg-zinc-800 shrink-0" />

          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 bg-zinc-800 border border-zinc-700 rounded-xl shrink-0">
              {getDeviceIcon(peer.deviceType, 'w-5 h-5')}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-white truncate">{peer.name}</h2>
                <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.2 rounded font-mono font-medium shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  TERHUBUNG
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 font-mono truncate">
                {peer.os || 'OS'} • {peer.ip || 'Wi-Fi LAN'}
                {pingMs ? ` • ${pingMs} ms` : ''}
              </p>
            </div>
          </div>
        </div>

        {/* Right: Battery & Quick Switch */}
        <div className="flex items-center gap-2 shrink-0">
          {peer.battery && typeof peer.battery.level === 'number' && peer.battery.level >= 0 && (
            <div className="flex items-center gap-1 text-xs text-zinc-300 font-mono bg-zinc-800/80 px-2 py-1 rounded-lg border border-zinc-700/60">
              {peer.battery.isCharging ? (
                <BatteryCharging className="w-3.5 h-3.5 text-emerald-400" />
              ) : peer.battery.level <= 20 ? (
                <BatteryWarning className="w-3.5 h-3.5 text-amber-400" />
              ) : (
                <Battery className="w-3.5 h-3.5 text-zinc-300" />
              )}
              <span>{peer.battery.level}%</span>
            </div>
          )}

          <button
            onClick={() => {
              triggerHaptic([30]);
              if (isMirrorActive && isElectron) {
                window.electronAPI?.stopScrcpy?.();
              }
              onBack();
            }}
            className="text-xs text-zinc-400 hover:text-white px-2.5 py-1.5 rounded-lg hover:bg-zinc-800 transition cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>

      {/* 2. Main Workspace Layout */}
      {/* CASE A: Running on PC / Laptop controlling an Android Phone (AnyDesk / StarDesk In-App Mirroring Mode) */}
      {!isMobile && isPeerMobile ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1">
          {/* LEFT 7-8 COLUMNS: IN-APP SCREEN MIRRORING (AnyDesk style canvas) */}
          <div className="lg:col-span-8 bg-zinc-900/90 border border-zinc-800 rounded-3xl p-4 flex flex-col justify-between shadow-2xl relative overflow-hidden min-h-[580px]">
            {/* Top Toolbar inside Mirroring Box */}
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800 gap-2 flex-wrap z-20">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <MonitorPlay className="w-4 h-4 text-emerald-400" />
                  Layar Ponsel (In-App)
                </span>

                {/* Engine switcher */}
                <div className="bg-zinc-800 p-0.5 rounded-lg border border-zinc-700 flex items-center text-[10px] font-mono">
                  <button
                    onClick={() => {
                      triggerHaptic([20]);
                      setMirrorEngine('scrcpy');
                    }}
                    className={`px-2 py-0.5 rounded-md transition ${
                      mirrorEngine === 'scrcpy'
                        ? 'bg-emerald-500 text-zinc-950 font-bold'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    ⚡ Scrcpy 60FPS
                  </button>
                  <button
                    onClick={() => {
                      triggerHaptic([20]);
                      setMirrorEngine('webrtc');
                    }}
                    className={`px-2 py-0.5 rounded-md transition ${
                      mirrorEngine === 'webrtc'
                        ? 'bg-emerald-500 text-zinc-950 font-bold'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    🌐 WebRTC
                  </button>
                </div>

                {/* Dock / Pop-out toggle if Scrcpy & Electron */}
                {isElectron && mirrorEngine === 'scrcpy' && (
                  <button
                    onClick={() => {
                      triggerHaptic([20]);
                      setIsDockedMode(!isDockedMode);
                    }}
                    className="text-[10px] text-zinc-400 hover:text-zinc-200 bg-zinc-800 px-2 py-1 rounded-md border border-zinc-700 font-mono transition"
                    title={isDockedMode ? 'Buka Scrcpy di jendela terpisah' : 'Tempelkan Scrcpy di dalam aplikasi'}
                  >
                    {isDockedMode ? '📌 In-App' : '🪟 Pop-Out'}
                  </button>
                )}
              </div>

              {/* Start / Stop Toggle */}
              <div className="flex items-center gap-2">
                {isMirrorActive ? (
                  <button
                    onClick={handleStopMirroring}
                    className="flex items-center gap-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/40 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer shadow-sm active:scale-95"
                  >
                    <Pause className="w-3.5 h-3.5" />
                    <span>Hentikan Mirror</span>
                  </button>
                ) : (
                  <button
                    onClick={() => handleStartMirroring()}
                    disabled={isScrcpyStarting}
                    className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold px-3.5 py-1.5 rounded-xl text-xs transition cursor-pointer shadow-md shadow-emerald-950/40 active:scale-95 disabled:opacity-50"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>{isScrcpyStarting ? 'Menghubungkan...' : 'Mulai Mirroring'}</span>
                  </button>
                )}
              </div>
            </div>

            {/* Error Message if any */}
            {scrcpyError && (
              <div className="bg-red-950/50 border border-red-500/40 text-red-300 text-xs p-2.5 rounded-xl my-2">
                {scrcpyError}
              </div>
            )}

            {/* CENTER: PHONE DISPLAY CONTAINER (Scrcpy Win32 Dock or WebRTC Video) */}
            <div className="flex-1 flex items-center justify-center p-2 relative my-2">
              <div
                ref={mirrorContainerRef}
                id="scrcpy-container"
                className="w-full max-w-[340px] h-[480px] sm:h-[540px] bg-black border-4 border-zinc-800 rounded-[2.5rem] shadow-2xl relative overflow-hidden flex flex-col items-center justify-center"
              >
                {/* Phone Speaker Notch */}
                <div className="absolute top-2 w-20 h-3 bg-zinc-800 rounded-full z-30 pointer-events-none" />

                {/* If Scrcpy Active: Win32 native window is docked directly at this rectangle! */}
                {isMirrorActive && mirrorEngine === 'scrcpy' ? (
                  <div className="w-full h-full flex flex-col items-center justify-center text-center p-4">
                    {isDockedMode ? (
                      <p className="text-xs text-zinc-500 font-mono animate-pulse">
                        [Scrcpy 60 FPS Native Docked Inside Frame]
                      </p>
                    ) : (
                      <div className="flex flex-col items-center">
                        <Smartphone className="w-12 h-12 text-emerald-400 mb-2" />
                        <h4 className="text-sm font-bold text-zinc-200 mb-1">Mirroring Aktif (Pop-Out)</h4>
                        <p className="text-[11px] text-zinc-400 max-w-[200px]">
                          Tampilan layar ponsel Anda terbuka pada jendela terpisah di Windows.
                        </p>
                      </div>
                    )}
                  </div>
                ) : mirrorEngine === 'webrtc' && incomingStream ? (
                  /* WebRTC stream view */
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className="w-full h-full object-contain"
                  />
                ) : (
                  /* Idle / Connect Placeholder */
                  <div className="text-center p-6 flex flex-col items-center justify-center">
                    <Smartphone className="w-16 h-16 text-zinc-700 mb-3 animate-pulse" />
                    <h4 className="text-sm font-bold text-zinc-300 mb-1">Mirroring Layar HP</h4>
                    <p className="text-[11px] text-zinc-500 leading-relaxed mb-4 max-w-[220px]">
                      Tampilan layar ponsel Vivo Anda akan muncul dan dapat dikontrol langsung di sini.
                    </p>
                    <button
                      onClick={() => handleStartMirroring()}
                      className="bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-bold py-2 px-4 rounded-xl transition cursor-pointer shadow-lg active:scale-95"
                    >
                      Buka Layar HP Sekarang
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Floating Android Navigation Bar (AnyDesk / StarDesk Controller) */}
            <div className="bg-zinc-950/90 border border-zinc-800/90 rounded-2xl p-2 flex items-center justify-center gap-2 sm:gap-4 shrink-0 shadow-lg">
              <button
                onClick={() => handleAdbKey(4)}
                className="flex items-center gap-1 p-2 rounded-xl hover:bg-zinc-800 text-zinc-400 hover:text-white transition cursor-pointer text-xs"
                title="Kembali (Back)"
              >
                <ChevronLeft className="w-4 h-4 text-zinc-300" />
                <span className="hidden sm:inline">Back</span>
              </button>

              <button
                onClick={() => handleAdbKey(3)}
                className="flex items-center gap-1 p-2 rounded-xl hover:bg-zinc-800 text-zinc-400 hover:text-white transition cursor-pointer text-xs"
                title="Beranda (Home)"
              >
                <Circle className="w-4 h-4 text-emerald-400" />
                <span className="hidden sm:inline">Home</span>
              </button>

              <button
                onClick={() => handleAdbKey(187)}
                className="flex items-center gap-1 p-2 rounded-xl hover:bg-zinc-800 text-zinc-400 hover:text-white transition cursor-pointer text-xs"
                title="Aplikasi Terbaru (Recents)"
              >
                <Square className="w-4 h-4 text-cyan-400" />
                <span className="hidden sm:inline">Recents</span>
              </button>

              <div className="h-4 w-px bg-zinc-800" />

              <button
                onClick={() => handleAdbKey(26)}
                className="flex items-center gap-1 p-2 rounded-xl hover:bg-zinc-800 text-zinc-400 hover:text-red-400 transition cursor-pointer text-xs"
                title="Tombol Daya / Kunci Layar (Power)"
              >
                <Power className="w-4 h-4 text-red-400" />
                <span className="hidden sm:inline">Power</span>
              </button>

              <button
                onClick={() => handleAdbKey(24)}
                className="p-2 rounded-xl hover:bg-zinc-800 text-zinc-400 hover:text-white transition cursor-pointer"
                title="Volume Up"
              >
                <Volume2 className="w-4 h-4 text-zinc-300" />
              </button>

              <button
                onClick={() => handleAdbKey(25)}
                className="p-2 rounded-xl hover:bg-zinc-800 text-zinc-400 hover:text-white transition cursor-pointer"
                title="Volume Down"
              >
                <Volume1 className="w-4 h-4 text-zinc-300" />
              </button>
            </div>
          </div>

          {/* RIGHT 4-5 COLUMNS: FULL FEATURE TOOLBAR FOR THIS PHONE */}
          <div className="lg:col-span-4 flex flex-col gap-3">
            {/* 1. Quick Transfer Dropzone */}
            <div className="bg-zinc-900/90 border border-zinc-800 rounded-3xl p-4 shadow-xl flex flex-col gap-2.5">
              <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                <Upload className="w-4 h-4 text-cyan-400" />
                Transfer Cepat ke Ponsel
              </h4>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center justify-center gap-1.5 bg-zinc-100 hover:bg-white text-zinc-950 font-bold py-2.5 px-3 rounded-xl text-xs transition cursor-pointer shadow-sm active:scale-95"
                >
                  <Upload className="w-4 h-4 shrink-0" />
                  <span>Kirim File</span>
                </button>

                <button
                  onClick={() => folderInputRef.current?.click()}
                  className="flex items-center justify-center gap-1.5 bg-zinc-800 hover:bg-zinc-700 text-amber-300 border border-amber-500/30 py-2.5 px-3 rounded-xl text-xs font-semibold transition cursor-pointer shadow-sm active:scale-95"
                >
                  <FolderUp className="w-4 h-4 shrink-0 text-amber-400" />
                  <span>Kirim Folder</span>
                </button>
              </div>

              <p className="text-[10px] text-zinc-500 text-center">
                Atau tarik & lepas (drag-and-drop) file langsung ke jendela ini
              </p>
            </div>

            {/* Quick Access to Session Transfer History */}
            {renderTransferHistory()}

            {/* 2. File Explorer & Drive Mount */}
            <div className="bg-zinc-900/90 border border-zinc-800 rounded-3xl p-4 shadow-xl flex flex-col gap-2.5">
              <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                <Folder className="w-4 h-4 text-emerald-400" />
                Manajemen Berkas Ponsel
              </h4>

              <button
                onClick={() => {
                  triggerHaptic([30]);
                  onOpenFileExplorer?.(peer);
                }}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-zinc-800/80 hover:bg-zinc-800 border border-zinc-700/60 hover:border-emerald-500/40 text-left transition cursor-pointer active:scale-98"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <Folder className="w-4 h-4" />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-white">Jelajah Berkas (Explorer)</h5>
                    <p className="text-[10px] text-zinc-400">Akses, unduh, dan unggah file dua arah</p>
                  </div>
                </div>
                <ArrowLeft className="w-4 h-4 text-zinc-500 rotate-180" />
              </button>

              {FEATURE_TOGGLES.enableWindowsDriveMount !== false && (
                <button
                  onClick={() => {
                    triggerHaptic([30]);
                    onMountPhoneStorage?.(peer);
                  }}
                  className="w-full flex items-center justify-between p-3 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-left transition cursor-pointer active:scale-98"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-cyan-500/20 text-cyan-400">
                      <HardDrive className="w-4 h-4" />
                    </div>
                    <div>
                      <h5 className="text-xs font-bold text-cyan-200">Buka di Windows Explorer (Drive Z:)</h5>
                      <p className="text-[10px] text-cyan-300/70">Mount memori HP sebagai hard drive PC</p>
                    </div>
                  </div>
                  <ExternalLink className="w-4 h-4 text-cyan-400" />
                </button>
              )}
            </div>

            {/* 3. Multimedia & Utilities (Webcam, Mic, Ring, Chat) */}
            <div className="bg-zinc-900/90 border border-zinc-800 rounded-3xl p-4 shadow-xl flex flex-col gap-2">
              <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-wider mb-1">
                Kamera, Audio & Utilitas
              </h4>

              <div className="grid grid-cols-2 gap-2">
                {/* Wireless Webcam */}
                <button
                  onClick={() => {
                    triggerHaptic([30]);
                    onRequestRemoteCamera?.(peer.id);
                  }}
                  className="flex items-center gap-2 p-2.5 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 text-zinc-200 border border-zinc-700/60 text-xs font-semibold transition cursor-pointer text-left"
                >
                  <Camera className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="truncate">Webcam HP</span>
                </button>

                {/* Wireless Mic */}
                <button
                  onClick={() => {
                    triggerHaptic([30]);
                    onRequestRemoteMic?.(peer.id);
                  }}
                  className="flex items-center gap-2 p-2.5 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 text-zinc-200 border border-zinc-700/60 text-xs font-semibold transition cursor-pointer text-left"
                >
                  <Mic className="w-4 h-4 text-teal-400 shrink-0" />
                  <span className="truncate">Mic HP (PC Mic)</span>
                </button>

                {/* Kirim Teks / Sync Clipboard */}
                <button
                  onClick={() => {
                    triggerHaptic([30]);
                    onOpenTextSync?.(peer);
                  }}
                  className="flex items-center gap-2 p-2.5 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 text-zinc-200 border border-zinc-700/60 text-xs font-semibold transition cursor-pointer text-left"
                >
                  <MessageSquare className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span className="truncate">Kirim Teks</span>
                </button>

                {/* Deringkan Ponsel */}
                <button
                  onClick={() => {
                    triggerHaptic([30]);
                    onRingDevice?.(peer.id, peer.deviceId);
                  }}
                  className="flex items-center gap-2 p-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/30 text-xs font-semibold transition cursor-pointer text-left"
                >
                  <BellRing className="w-4 h-4 text-red-400 shrink-0" />
                  <span className="truncate">Deringkan HP</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* CASE B: Running on Mobile Phone controlling Laptop/PC (or Mobile to Mobile) */
        <div className="flex flex-col gap-4">
          <div className="bg-zinc-900/90 border border-zinc-800 rounded-3xl p-5 shadow-2xl flex flex-col gap-4">
            <div>
              <h3 className="text-base font-bold text-white mb-1">Pusat Kontrol PC</h3>
              <p className="text-xs text-zinc-400">
                Pilih aksi untuk mengontrol, mentransfer berkas, atau memanfaatkan sensor ke {peer.name}.
              </p>
            </div>

            {/* Grid of full features */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {/* 1. Remote Touchpad & Numpad */}
              <button
                onClick={() => {
                  triggerHaptic([30]);
                  onOpenTouchpad?.(peer);
                }}
                className="flex items-start gap-3.5 p-4 rounded-2xl bg-zinc-800/90 hover:bg-zinc-800 border border-emerald-500/30 hover:border-emerald-500 text-left transition cursor-pointer active:scale-98 shadow-md"
              >
                <div className="p-3 rounded-xl bg-emerald-500/20 text-emerald-400 shrink-0">
                  <MousePointer className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Remote Mouse & Touchpad</h4>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    Gunakan layar sentuh HP sebagai touchpad, gesture scrolling, dan numpad PC
                  </p>
                </div>
              </button>

              {/* 2. Macro Pad & Stream Deck */}
              <button
                onClick={() => {
                  triggerHaptic([30]);
                  onOpenMacroPad?.(peer);
                }}
                className="flex items-start gap-3.5 p-4 rounded-2xl bg-zinc-800/90 hover:bg-zinc-800 border border-purple-500/30 hover:border-purple-500 text-left transition cursor-pointer active:scale-98 shadow-md"
              >
                <div className="p-3 rounded-xl bg-purple-500/20 text-purple-400 shrink-0">
                  <Layers className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Macro Pad & Shortcut PC</h4>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    Tombol pintasan cepat Stream Deck untuk OBS, Windows, dan multimedia
                  </p>
                </div>
              </button>

              {/* 3. Send Files & Folder */}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-start gap-3.5 p-4 rounded-2xl bg-zinc-800/90 hover:bg-zinc-800 border border-cyan-500/30 hover:border-cyan-500 text-left transition cursor-pointer active:scale-98 shadow-md"
              >
                <div className="p-3 rounded-xl bg-cyan-500/20 text-cyan-400 shrink-0">
                  <Upload className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Kirim File & Folder</h4>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    Transfer foto, video, atau dokumen berkecepatan tinggi tanpa kuota internet
                  </p>
                </div>
              </button>

              {/* 4. Remote File Explorer */}
              <button
                onClick={() => {
                  triggerHaptic([30]);
                  onOpenFileExplorer?.(peer);
                }}
                className="flex items-start gap-3.5 p-4 rounded-2xl bg-zinc-800/90 hover:bg-zinc-800 border border-zinc-700 hover:border-zinc-500 text-left transition cursor-pointer active:scale-98 shadow-md"
              >
                <div className="p-3 rounded-xl bg-zinc-700/40 text-amber-400 shrink-0">
                  <Folder className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Jelajah File Laptop</h4>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    Akses folder laptop dan unduh berkas langsung ke penyimpanan ponsel
                  </p>
                </div>
              </button>

              {/* 5. Wireless Webcam ke PC */}
              <button
                onClick={() => {
                  triggerHaptic([30]);
                  onStartScreenShare?.(peer.id, 'camera');
                }}
                className="flex items-start gap-3.5 p-4 rounded-2xl bg-zinc-800/90 hover:bg-zinc-800 border border-zinc-700 hover:border-zinc-500 text-left transition cursor-pointer active:scale-98 shadow-md"
              >
                <div className="p-3 rounded-xl bg-zinc-700/40 text-emerald-400 shrink-0">
                  <Camera className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Jadikan Webcam Laptop</h4>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    Gunakan kamera ponsel berkualitas tinggi sebagai webcam PC/OBS
                  </p>
                </div>
              </button>

              {/* 6. Wireless Mic ke PC */}
              <button
                onClick={() => {
                  triggerHaptic([30]);
                  onStartScreenShare?.(peer.id, 'mic');
                }}
                className="flex items-start gap-3.5 p-4 rounded-2xl bg-zinc-800/90 hover:bg-zinc-800 border border-zinc-700 hover:border-zinc-500 text-left transition cursor-pointer active:scale-98 shadow-md"
              >
                <div className="p-3 rounded-xl bg-zinc-700/40 text-teal-400 shrink-0">
                  <Mic className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Jadikan Mic Laptop</h4>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    Streaming audio mic HP dengan hardware AI Noise Cancellation ke PC
                  </p>
                </div>
              </button>

              {/* 7. Kirim Teks & Sinkronisasi Clipboard */}
              <button
                onClick={() => {
                  triggerHaptic([30]);
                  onOpenTextSync?.(peer);
                }}
                className="flex items-start gap-3.5 p-4 rounded-2xl bg-zinc-800/90 hover:bg-zinc-800 border border-zinc-700 hover:border-zinc-500 text-left transition cursor-pointer active:scale-98 shadow-md"
              >
                <div className="p-3 rounded-xl bg-zinc-700/40 text-cyan-400 shrink-0">
                  <MessageSquare className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Kirim Teks & Clipboard</h4>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    Kirim link, pesan instan, dan sinkronisasi papan klip otomatis
                  </p>
                </div>
              </button>

              {/* 8. Monitor Layar Laptop */}
              <button
                onClick={() => {
                  triggerHaptic([30]);
                  onRequestRemoteScreen?.(peer.id);
                }}
                className="flex items-start gap-3.5 p-4 rounded-2xl bg-zinc-800/90 hover:bg-zinc-800 border border-zinc-700 hover:border-zinc-500 text-left transition cursor-pointer active:scale-98 shadow-md"
              >
                <div className="p-3 rounded-xl bg-zinc-700/40 text-indigo-400 shrink-0">
                  <MonitorPlay className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Lihat Layar Laptop</h4>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    Pantau layar laptop dari layar ponsel secara realtime (WebRTC)
                  </p>
                </div>
              </button>
            </div>
          </div>

          {/* Quick Access to Session Transfer History */}
          {renderTransferHistory()}
        </div>
      )}
    </div>
  );
}
export default DeviceWorkspace;
