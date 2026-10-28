import React, { useRef, useState, useEffect } from 'react';
import {
  ArrowLeft,
  ArrowRight,
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
  Keyboard,
  Presentation,
  Zap,
  ClipboardList,
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
  Trash2,
  Tv,
  Loader2
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
  onOpenFolder,
  onOpenRemoteKeyboard,
  onOpenPresentationClicker,
  onOpenWakeOnLan,
  onToggleDropzone,
  isDropzoneActive,
  onOpenSecondDisplay,
  autoStartMirror = false
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

  // Auto-start mirroring when entering workspace with mirror intent
  useEffect(() => {
    if (autoStartMirror && !isMirrorActive && !isScrcpyStarting) {
      handleStartMirroring();
    }
  }, [autoStartMirror]);

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
        console.warn('[Scrcpy] Not available, falling back to WebRTC mirror:', res.error);
        setMirrorEngine('webrtc');
        setIsMirrorActive(true);
        onRequestRemoteScreen?.(peer.id, peer.deviceId);
      }
    } catch (err) {
      console.warn('[Scrcpy] Exception, falling back to WebRTC mirror:', err);
      setMirrorEngine('webrtc');
      setIsMirrorActive(true);
      onRequestRemoteScreen?.(peer.id, peer.deviceId);
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
      <div className="apple-card p-4 shadow-sm flex flex-col gap-2.5 animate-view-enter">
        <div className="flex items-center justify-between">
          <button
            onClick={() => {
              triggerHaptic([15]);
              setShowHistory(!showHistory);
            }}
            className="flex items-center gap-2 text-xs font-bold text-zinc-800 dark:text-zinc-200 hover:text-blue-500 transition cursor-pointer"
          >
            <Clock className="w-4 h-4 text-blue-500" />
            <span>Riwayat Transfer ({transferHistory.length})</span>
            <span className="text-[10px] text-zinc-500 font-normal">[{showHistory ? 'Sembunyikan' : 'Lihat'}]</span>
          </button>

          <div className="flex items-center gap-1.5">
            {onOpenFolder && showHistory && (
              <button
                onClick={onOpenFolder}
                className="text-[11px] text-zinc-600 dark:text-zinc-300 hover:text-blue-500 transition cursor-pointer flex items-center gap-1 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 px-2.5 py-1 rounded-full border border-black/8 dark:border-white/10"
                title="Buka Folder Unduhan"
              >
                <FolderOpen className="w-3.5 h-3.5 text-amber-500" />
                <span className="hidden sm:inline">Folder Unduhan</span>
              </button>
            )}
            {onClearTransferHistory && showHistory && (
              <button
                onClick={onClearTransferHistory}
                className="text-[11px] text-zinc-500 hover:text-red-500 transition cursor-pointer flex items-center gap-1 bg-black/5 dark:bg-white/5 hover:bg-red-500/10 px-2.5 py-1 rounded-full border border-black/8 dark:border-white/10"
                title="Hapus riwayat sesi"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Hapus</span>
              </button>
            )}
          </div>
        </div>

        {showHistory && (
          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
            {transferHistory.map((item, idx) => {
              const isUpload = item.direction === 'upload' || item.direction === 'sent';
              const name = item.fileName || item.name || 'Berkas';
              const sizeStr = item.fileSize ? formatBytes(item.fileSize) : '';
              const timeStr = formatTransferTime(item.timestamp || item.time);
              const statusLabel = isUpload ? 'Terkirim' : 'Diterima';

              return (
                <div
                  key={item.fileId || item.id || idx}
                  className="flex items-center justify-between bg-black/3 dark:bg-white/3 border border-black/5 dark:border-white/5 rounded-xl p-2.5 text-xs text-zinc-800 dark:text-zinc-200 hover:border-black/15 dark:hover:border-white/15 transition gap-2"
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div className={`p-1.5 rounded-lg shrink-0 ${isUpload ? 'bg-blue-500/10 text-blue-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                      {isUpload ? (
                        <ArrowUpRight className="w-4 h-4" />
                      ) : (
                        <ArrowDownLeft className="w-4 h-4" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-zinc-900 dark:text-zinc-100 text-xs" title={name}>{name}</p>
                      <p className="text-[10px] text-zinc-500 flex items-center gap-1.5">
                        {sizeStr && <span>{sizeStr}</span>}
                        {sizeStr && <span>•</span>}
                        <span className={isUpload ? 'text-blue-500 font-medium' : 'text-emerald-500 font-medium'}>{statusLabel}</span>
                        {timeStr && <span>• {timeStr}</span>}
                      </p>
                    </div>
                  </div>
                  {item.blobUrl && (
                    <a
                      href={item.blobUrl}
                      download={name}
                      className="shrink-0 text-[11px] font-medium text-blue-500 hover:text-blue-600 bg-blue-500/10 hover:bg-blue-500/15 border border-blue-500/20 px-3 py-1 rounded-full transition active:scale-95"
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
        {...{ webkitdirectory: '', directory: '' }}
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
      <div className="apple-card px-4 py-3 shadow-sm flex items-center justify-between gap-3 flex-wrap sm:flex-nowrap">
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
            className="flex items-center gap-1.5 bg-black/5 hover:bg-black/10 dark:bg-white/8 dark:hover:bg-white/12 active:scale-95 text-zinc-700 dark:text-zinc-200 border border-black/8 dark:border-white/10 px-3.5 py-1.5 rounded-full text-xs font-semibold transition cursor-pointer shrink-0 shadow-xs"
            title="Kembali ke Daftar Perangkat"
          >
            <ArrowLeft className="w-4 h-4 text-blue-500" />
            <span className="hidden sm:inline">Daftar Perangkat</span>
          </button>

          <div className="h-6 w-px bg-black/8 dark:bg-white/10 shrink-0" />

          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 bg-black/5 dark:bg-white/5 border border-black/8 dark:border-white/10 rounded-xl shrink-0">
              {getDeviceIcon(peer.deviceType, 'w-5 h-5')}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-white truncate">{peer.name}</h2>
                <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.2 rounded-full font-mono font-medium shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  TERHUBUNG
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] text-blue-600 dark:text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-0.2 rounded-full font-mono font-medium shrink-0">
                  <ShieldCheck className="w-3 h-3 text-blue-500" />
                  SINKRON
                </span>
              </div>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-mono truncate">
                {peer.os || 'OS'} • {peer.ip || 'Wi-Fi LAN'}
                {pingMs ? ` • ${pingMs} ms` : ''}
              </p>
            </div>
          </div>
        </div>

        {/* Right: Battery & Quick Switch */}
        <div className="flex items-center gap-2 shrink-0">
          {peer.battery && typeof peer.battery.level === 'number' && peer.battery.level >= 0 && (
            <div className="flex items-center gap-1 text-xs text-zinc-700 dark:text-zinc-300 font-mono bg-black/5 dark:bg-white/5 px-2.5 py-1 rounded-full border border-black/8 dark:border-white/10">
              {peer.battery.isCharging ? (
                <BatteryCharging className="w-3.5 h-3.5 text-emerald-500" />
              ) : peer.battery.level <= 20 ? (
                <BatteryWarning className="w-3.5 h-3.5 text-amber-500" />
              ) : (
                <Battery className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" />
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
            className="text-xs text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white px-3 py-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>

      {/* 2. Main Workspace Layout */}
      {/* CASE A: Running on PC / Laptop controlling an Android Phone (AnyDesk / StarDesk In-App Mirroring Mode) */}
      {!isMobile && isPeerMobile ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1">
          {/* LEFT 7-8 COLUMNS: IN-APP SCREEN MIRRORING (Apple iPhone Mirroring style) */}
          <div className="lg:col-span-8 apple-card p-4 flex flex-col justify-between shadow-sm relative overflow-hidden min-h-[580px]">
            {/* Top Toolbar inside Mirroring Box */}
            <div className="flex items-center justify-between pb-3 border-b border-black/8 dark:border-white/10 gap-2 flex-wrap z-20">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-zinc-900 dark:text-white flex items-center gap-1.5">
                  <MonitorPlay className="w-4 h-4 text-blue-500" />
                  Layar Ponsel (In-App)
                </span>

                {/* Engine switcher */}
                <div className="bg-black/5 dark:bg-white/8 p-0.5 rounded-full border border-black/8 dark:border-white/10 flex items-center text-[10px] font-mono">
                  <button
                    onClick={() => {
                      triggerHaptic([20]);
                      setMirrorEngine('scrcpy');
                    }}
                    className={`px-2.5 py-0.5 rounded-full transition ${
                      mirrorEngine === 'scrcpy'
                        ? 'bg-[#0071e3] text-white font-semibold'
                        : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                    }`}
                  >
                    ⚡ Scrcpy 60FPS
                  </button>
                  <button
                    onClick={() => {
                      triggerHaptic([20]);
                      setMirrorEngine('webrtc');
                    }}
                    className={`px-2.5 py-0.5 rounded-full transition ${
                      mirrorEngine === 'webrtc'
                        ? 'bg-[#0071e3] text-white font-semibold'
                        : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
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
                    className="text-[10px] text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white bg-black/5 dark:bg-white/8 px-2.5 py-1 rounded-full border border-black/8 dark:border-white/10 font-mono transition"
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
                    className="flex items-center gap-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/20 px-3.5 py-1.5 rounded-full text-xs font-medium transition cursor-pointer shadow-sm active:scale-95"
                  >
                    <Pause className="w-3.5 h-3.5" />
                    <span>Hentikan Mirror</span>
                  </button>
                ) : (
                  <button
                    onClick={() => handleStartMirroring()}
                    disabled={isScrcpyStarting}
                    className="flex items-center gap-1.5 bg-[#0071e3] hover:bg-[#0077ed] text-white font-medium px-4 py-1.5 rounded-full text-xs transition cursor-pointer shadow-sm active:scale-95 disabled:opacity-50"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>{isScrcpyStarting ? 'Menghubungkan...' : 'Mulai Mirroring'}</span>
                  </button>
                )}
              </div>
            </div>

            {/* Error Message if any */}
            {scrcpyError && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs p-3 rounded-2xl my-2">
                {scrcpyError}
              </div>
            )}

            {/* CENTER: PHONE DISPLAY CONTAINER (Scrcpy Win32 Dock or WebRTC Video) */}
            <div className="flex-1 flex items-center justify-center p-2 relative my-2">
              <div
                ref={mirrorContainerRef}
                id="scrcpy-container"
                className="w-full max-w-[340px] h-[480px] sm:h-[540px] bg-black border-[3px] border-black/20 dark:border-white/20 rounded-[2.5rem] shadow-xl relative overflow-hidden flex flex-col items-center justify-center ring-1 ring-black/5 dark:ring-white/10"
              >
                {/* Phone Speaker Notch */}
                <div className="absolute top-2 w-20 h-3 bg-zinc-800 rounded-full z-30 pointer-events-none" />

                {/* If Scrcpy Active: Win32 native window is docked directly at this rectangle! */}
                {isMirrorActive && mirrorEngine === 'scrcpy' ? (
                  <div className="w-full h-full flex flex-col items-center justify-center text-center p-4">
                    {isDockedMode ? (
                      <p className="text-xs text-zinc-500 font-mono">
                        [Scrcpy 60 FPS Native Docked Inside Frame]
                      </p>
                    ) : (
                      <div className="flex flex-col items-center">
                        <Smartphone className="w-12 h-12 text-[#0071e3] mb-2" />
                        <h4 className="text-sm font-semibold text-white mb-1">Mirroring Aktif (Pop-Out)</h4>
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
                ) : isScrcpyStarting ? (
                  /* Loading Spinner */
                  <div className="text-center p-6 flex flex-col items-center justify-center animate-in fade-in">
                    <Loader2 className="w-12 h-12 text-[#0071e3] animate-spin mb-3" />
                    <h4 className="text-sm font-semibold text-white mb-1">Menghubungkan Mirroring...</h4>
                    <p className="text-[11px] text-zinc-400">Menyiapkan tampilan layar ponsel ke PC...</p>
                  </div>
                ) : (
                  /* Idle / Connect Placeholder */
                  <div className="text-center p-6 flex flex-col items-center justify-center">
                    <Smartphone className="w-14 h-14 text-zinc-600 mb-3" />
                    <h4 className="text-sm font-semibold text-white mb-1">Mirroring Layar HP</h4>
                    <p className="text-[11px] text-zinc-400 leading-relaxed mb-4 max-w-[220px]">
                      Tampilan layar ponsel Anda akan muncul dan dapat dikontrol langsung di sini.
                    </p>
                    <button
                      onClick={() => handleStartMirroring()}
                      className="bg-[#0071e3] hover:bg-[#0077ed] text-white text-xs font-medium py-2 px-5 rounded-full transition cursor-pointer shadow-sm active:scale-95"
                    >
                      Buka Layar HP Sekarang
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Floating Android Navigation Bar (Apple Capsule Floating Style) */}
            <div className="apple-glass rounded-full px-4 py-1.5 flex items-center justify-center gap-2 sm:gap-4 shrink-0 shadow-sm border border-black/8 dark:border-white/10 self-center">
              <button
                onClick={() => handleAdbKey(4)}
                className="flex items-center gap-1.5 p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition cursor-pointer text-xs"
                title="Kembali (Back)"
              >
                <ChevronLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Back</span>
              </button>

              <button
                onClick={() => handleAdbKey(3)}
                className="flex items-center gap-1.5 p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition cursor-pointer text-xs"
                title="Beranda (Home)"
              >
                <Circle className="w-4 h-4 text-emerald-500" />
                <span className="hidden sm:inline">Home</span>
              </button>

              <button
                onClick={() => handleAdbKey(187)}
                className="flex items-center gap-1.5 p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition cursor-pointer text-xs"
                title="Aplikasi Terbaru (Recents)"
              >
                <Square className="w-4 h-4 text-blue-500" />
                <span className="hidden sm:inline">Recents</span>
              </button>

              <div className="h-4 w-px bg-black/10 dark:bg-white/15" />

              <button
                onClick={() => handleAdbKey(26)}
                className="flex items-center gap-1.5 p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-zinc-600 dark:text-zinc-400 hover:text-red-500 transition cursor-pointer text-xs"
                title="Tombol Daya / Kunci Layar (Power)"
              >
                <Power className="w-4 h-4 text-red-500" />
                <span className="hidden sm:inline">Power</span>
              </button>

              <button
                onClick={() => handleAdbKey(24)}
                className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition cursor-pointer"
                title="Volume Up"
              >
                <Volume2 className="w-4 h-4" />
              </button>

              <button
                onClick={() => handleAdbKey(25)}
                className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition cursor-pointer"
                title="Volume Down"
              >
                <Volume1 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* RIGHT 4-5 COLUMNS: FULL FEATURE TOOLBAR FOR THIS PHONE */}
          <div className="lg:col-span-4 flex flex-col gap-3">
            {/* 1. Quick Transfer Dropzone */}
            <div className="apple-card p-4 shadow-sm flex flex-col gap-3">
              <h4 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                <Upload className="w-4 h-4 text-[#0071e3]" />
                Transfer Cepat ke Ponsel
              </h4>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="ios-pressable flex items-center justify-center gap-1.5 bg-[#0071e3] hover:bg-[#0077ed] text-white font-medium py-2.5 px-3 rounded-full text-xs transition cursor-pointer shadow-sm"
                >
                  <Upload className="w-4 h-4 shrink-0" />
                  <span>Kirim File</span>
                </button>

                <button
                  onClick={() => folderInputRef.current?.click()}
                  className="ios-pressable flex items-center justify-center gap-1.5 bg-black/5 dark:bg-white/8 hover:bg-black/10 dark:hover:bg-white/12 text-zinc-800 dark:text-zinc-200 border border-black/8 dark:border-white/10 py-2.5 px-3 rounded-full text-xs font-medium transition cursor-pointer"
                >
                  <FolderUp className="w-4 h-4 shrink-0 text-amber-500" />
                  <span>Kirim Folder</span>
                </button>
              </div>

              <p className="text-[10px] text-zinc-400 dark:text-zinc-500 text-center font-normal">
                Atau tarik & lepas (drag-and-drop) file langsung ke jendela ini
              </p>
            </div>

            {/* Quick Access to Session Transfer History */}
            {renderTransferHistory()}

            {/* 2. File Explorer & Drive Mount */}
            <div className="apple-card p-4 shadow-sm flex flex-col gap-2.5">
              <h4 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                <Folder className="w-4 h-4 text-emerald-500" />
                Manajemen Berkas Ponsel
              </h4>

              <button
                onClick={() => {
                  triggerHaptic([30]);
                  onOpenFileExplorer?.(peer);
                }}
                className="ios-pressable w-full flex items-center justify-between p-3 rounded-2xl bg-black/3 dark:bg-white/5 hover:bg-black/6 dark:hover:bg-white/8 border border-black/6 dark:border-white/8 text-left transition cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    <Folder className="w-4 h-4" />
                  </div>
                  <div>
                    <h5 className="text-xs font-semibold text-zinc-900 dark:text-white">Jelajah Berkas (Explorer)</h5>
                    <p className="text-[10px] text-zinc-500 dark:text-zinc-400">Akses, unduh, dan unggah file dua arah</p>
                  </div>
                </div>
                <ArrowLeft className="w-4 h-4 text-zinc-400 rotate-180" />
              </button>

              {FEATURE_TOGGLES.enableWindowsDriveMount !== false && (
                <button
                  onClick={() => {
                    triggerHaptic([30]);
                    onMountPhoneStorage?.(peer);
                  }}
                  className="ios-pressable w-full flex items-center justify-between p-3 rounded-2xl bg-blue-500/5 dark:bg-blue-500/10 hover:bg-blue-500/10 dark:hover:bg-blue-500/15 border border-blue-500/15 text-left transition cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-blue-500/20 text-[#0071e3]">
                      <HardDrive className="w-4 h-4" />
                    </div>
                    <div>
                      <h5 className="text-xs font-semibold text-[#0071e3] dark:text-blue-400">Buka di Windows Explorer (Drive Z:)</h5>
                      <p className="text-[10px] text-zinc-500 dark:text-zinc-400">Mount memori HP sebagai hard drive PC</p>
                    </div>
                  </div>
                  <ExternalLink className="w-4 h-4 text-[#0071e3] dark:text-blue-400" />
                </button>
              )}
            </div>

            {/* 3. Multimedia & Utilities (Webcam, Mic, Ring, Chat) */}
            <div className="apple-card p-4 shadow-sm flex flex-col gap-2.5">
              <h4 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-0.5">
                Kamera, Audio & Utilitas
              </h4>

              <div className="grid grid-cols-2 gap-2">
                {/* Wireless Webcam */}
                <button
                  onClick={() => {
                    triggerHaptic([30]);
                    onRequestRemoteCamera?.(peer.id);
                  }}
                  className="ios-pressable flex items-center gap-2 p-2.5 rounded-2xl bg-black/3 dark:bg-white/5 hover:bg-black/6 dark:hover:bg-white/8 border border-black/6 dark:border-white/8 text-zinc-800 dark:text-zinc-200 text-xs font-medium transition cursor-pointer text-left"
                >
                  <Camera className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span className="truncate">Webcam HP</span>
                </button>

                {/* Wireless Mic */}
                <button
                  onClick={() => {
                    triggerHaptic([30]);
                    onRequestRemoteMic?.(peer.id);
                  }}
                  className="ios-pressable flex items-center gap-2 p-2.5 rounded-2xl bg-black/3 dark:bg-white/5 hover:bg-black/6 dark:hover:bg-white/8 border border-black/6 dark:border-white/8 text-zinc-800 dark:text-zinc-200 text-xs font-medium transition cursor-pointer text-left"
                >
                  <Mic className="w-4 h-4 text-teal-500 shrink-0" />
                  <span className="truncate">Mic HP (PC Mic)</span>
                </button>

                {/* Riwayat Clipboard & Teks */}
                <button
                  onClick={() => {
                    triggerHaptic([30]);
                    onOpenTextSync?.(peer);
                  }}
                  className="ios-pressable flex items-center gap-2 p-2.5 rounded-2xl bg-black/3 dark:bg-white/5 hover:bg-black/6 dark:hover:bg-white/8 border border-black/6 dark:border-white/8 text-zinc-800 dark:text-zinc-200 text-xs font-medium transition cursor-pointer text-left"
                >
                  <ClipboardList className="w-4 h-4 text-blue-500 shrink-0" />
                  <span className="truncate">Riwayat Clipboard</span>
                </button>

                {/* Deringkan Ponsel */}
                <button
                  onClick={() => {
                    triggerHaptic([30]);
                    onRingDevice?.(peer.id, peer.deviceId);
                  }}
                  className="ios-pressable flex items-center gap-2 p-2.5 rounded-2xl bg-red-500/5 dark:bg-red-500/10 hover:bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/15 text-xs font-medium transition cursor-pointer text-left"
                >
                  <BellRing className="w-4 h-4 text-red-500 shrink-0" />
                  <span className="truncate">Deringkan HP</span>
                </button>

                {/* Floating Dropzone Toggle */}
                {isElectron && (
                  <button
                    onClick={() => {
                      triggerHaptic([30]);
                      onToggleDropzone?.();
                    }}
                    className={`ios-pressable flex items-center gap-2 p-2.5 rounded-2xl border text-xs font-medium transition cursor-pointer text-left ${
                      isDropzoneActive
                        ? 'bg-blue-500/15 text-[#0071e3] border-blue-500/30 font-semibold'
                        : 'bg-black/3 dark:bg-white/5 hover:bg-black/6 dark:hover:bg-white/8 border-black/6 dark:border-white/8 text-zinc-800 dark:text-zinc-200'
                    }`}
                  >
                    <Upload className="w-4 h-4 text-[#0071e3] shrink-0" />
                    <span className="truncate">{isDropzoneActive ? 'Dropzone Aktif' : 'Dropzone Mengambang'}</span>
                  </button>
                )}

                {/* Wake-on-LAN */}
                <button
                  onClick={() => {
                    triggerHaptic([30]);
                    onOpenWakeOnLan?.(peer);
                  }}
                  className="ios-pressable flex items-center gap-2 p-2.5 rounded-2xl bg-amber-500/5 dark:bg-amber-500/10 hover:bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/15 text-xs font-medium transition cursor-pointer text-left"
                >
                  <Zap className="w-4 h-4 text-amber-500 shrink-0" />
                  <span className="truncate">Wake-on-LAN</span>
                </button>

                {/* Monitor Tambahan ke HP */}
                {FEATURE_TOGGLES.enableSecondDisplay !== false && (
                  <button
                    onClick={() => {
                      triggerHaptic([30]);
                      onOpenSecondDisplay?.(peer);
                    }}
                    className="ios-pressable flex items-center gap-2 p-2.5 rounded-2xl bg-sky-500/5 dark:bg-sky-500/10 hover:bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/20 text-xs font-medium transition cursor-pointer text-left"
                  >
                    <Tv className="w-4 h-4 text-sky-500 shrink-0" />
                    <span className="truncate">Monitor Tambahan</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* CASE B: Running on Mobile Phone controlling Laptop/PC (or Mobile to Mobile) */
        <div className="flex flex-col gap-4">
          {/* Section 1: Navigasi & Kontrol PC */}
          <div className="apple-card p-4 sm:p-5 shadow-sm flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <MousePointer className="w-4 h-4 text-emerald-500" />
                <span>Navigasi & Kontrol Input PC</span>
              </h3>
              <span className="text-[10px] font-mono text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full font-medium">
                Aktif
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* 1. Unified Remote Input (Mousepad + Keyboard Realtime + MacroPad PC) */}
              <button
                onClick={() => {
                  triggerHaptic([30]);
                  onOpenTouchpad?.(peer);
                }}
                className="col-span-1 sm:col-span-2 ios-pressable flex items-start gap-4 p-4.5 rounded-2xl bg-gradient-to-br from-emerald-500/10 via-blue-500/5 to-purple-500/10 hover:from-emerald-500/15 hover:via-blue-500/10 hover:to-purple-500/15 border-2 border-emerald-500/30 text-left transition cursor-pointer shadow-sm group relative overflow-hidden"
              >
                <div className="p-3 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-500 text-white shrink-0 shadow-md group-hover:scale-105 transition-transform">
                  <MousePointer className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-white flex items-center gap-1.5">
                      <span>Remote Input Terpadu</span>
                      <ArrowRight className="w-4 h-4 text-emerald-500 group-hover:translate-x-1 transition-transform" />
                    </h4>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                      MOUSE + KEYBOARD + MACROPAD
                    </span>
                  </div>
                  <p className="text-xs text-zinc-600 dark:text-zinc-300 mt-1 leading-relaxed">
                    Kontrol PC lengkap dalam satu tempat: mousepad sentuh presisi & scroll dua jari, keyboard realtime PC dengan tombol Enter & shortcut, serta tombol Stream Deck / MacroPad cepat.
                  </p>
                  <div className="flex items-center gap-3 mt-2 text-[11px] text-zinc-500 dark:text-zinc-400 font-medium flex-wrap">
                    <span className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      Touchpad Presisi
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                      Keyboard Realtime
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                      Shortcut MacroPad
                    </span>
                  </div>
                </div>
              </button>

              {/* 2. Pengendali Presentasi / Clicker */}
              <button
                onClick={() => {
                  triggerHaptic([30]);
                  onOpenPresentationClicker?.(peer);
                }}
                className="ios-pressable flex items-start gap-3.5 p-4 rounded-2xl bg-black/3 dark:bg-white/5 hover:bg-black/6 dark:hover:bg-white/8 border border-black/8 dark:border-white/10 text-left transition cursor-pointer shadow-sm group"
              >
                <div className="p-3 rounded-2xl bg-orange-500/10 text-orange-600 dark:text-orange-400 shrink-0 border border-orange-500/20 group-hover:scale-105 transition-transform">
                  <Presentation className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-zinc-900 dark:text-white flex items-center gap-1.5">
                    <span>Pengendali Presentasi</span>
                    <ArrowRight className="w-3.5 h-3.5 text-zinc-400 group-hover:translate-x-0.5 transition-transform" />
                  </h4>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
                    Slide clicker PowerPoint, PDF, Canva dengan tombol besar, stopwatch timer, dan pointer.
                  </p>
                </div>
              </button>

              {/* 3. Monitor Tambahan Nirkabel */}
              {FEATURE_TOGGLES.enableSecondDisplay !== false && (
                <button
                  onClick={() => {
                    triggerHaptic([30]);
                    onOpenSecondDisplay?.(peer);
                  }}
                  className="ios-pressable flex items-start gap-3.5 p-4 rounded-2xl bg-black/3 dark:bg-white/5 hover:bg-black/6 dark:hover:bg-white/8 border border-black/8 dark:border-white/10 text-left transition cursor-pointer shadow-sm group"
                >
                  <div className="p-3 rounded-2xl bg-sky-500/10 text-sky-600 dark:text-sky-400 shrink-0 border border-sky-500/20 group-hover:scale-105 transition-transform">
                    <Tv className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-zinc-900 dark:text-white flex items-center gap-1.5">
                      <span>Mirror & Monitor Layar</span>
                      <ArrowRight className="w-3.5 h-3.5 text-zinc-400 group-hover:translate-x-0.5 transition-transform" />
                    </h4>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
                      Jadikan HP/Tablet sebagai monitor kedua PC atau cermin layar laptop dengan kontrol sentuh 60 FPS.
                    </p>
                  </div>
                </button>
              )}
            </div>
          </div>

          {/* Section 2: Transfer & Penyimpanan Berkas */}
          <div className="apple-card p-4 sm:p-5 shadow-sm flex flex-col gap-3">
            <h3 className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <Upload className="w-4 h-4 text-blue-500" />
              <span>Transfer & Manajemen Berkas</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Kirim File */}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="ios-pressable flex items-start gap-3.5 p-4 rounded-2xl bg-black/3 dark:bg-white/5 hover:bg-black/6 dark:hover:bg-white/8 border border-black/8 dark:border-white/10 text-left transition cursor-pointer shadow-sm group"
              >
                <div className="p-3 rounded-2xl bg-blue-500/10 text-[#0071e3] shrink-0 border border-blue-500/20 group-hover:scale-105 transition-transform">
                  <Upload className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-zinc-900 dark:text-white">Kirim Berkas</h4>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
                    Transfer foto, video, dokumen tanpa kompresi dan tanpa kuota.
                  </p>
                </div>
              </button>

              {/* Kirim Folder */}
              <button
                onClick={() => folderInputRef.current?.click()}
                className="ios-pressable flex items-start gap-3.5 p-4 rounded-2xl bg-black/3 dark:bg-white/5 hover:bg-black/6 dark:hover:bg-white/8 border border-black/8 dark:border-white/10 text-left transition cursor-pointer shadow-sm group"
              >
                <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-500 shrink-0 border border-amber-500/20 group-hover:scale-105 transition-transform">
                  <FolderUp className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-zinc-900 dark:text-white">Kirim Folder</h4>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
                    Kirim satu folder lengkap dengan struktur direktori terjaga.
                  </p>
                </div>
              </button>

              {/* Jelajah File Laptop */}
              <button
                onClick={() => {
                  triggerHaptic([30]);
                  onOpenFileExplorer?.(peer);
                }}
                className="ios-pressable flex items-start gap-3.5 p-4 rounded-2xl bg-black/3 dark:bg-white/5 hover:bg-black/6 dark:hover:bg-white/8 border border-black/8 dark:border-white/10 text-left transition cursor-pointer shadow-sm group"
              >
                <div className="p-3 rounded-2xl bg-teal-500/10 text-teal-600 dark:text-teal-400 shrink-0 border border-teal-500/20 group-hover:scale-105 transition-transform">
                  <Folder className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-zinc-900 dark:text-white">Jelajah File PC</h4>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
                    Akses folder laptop dan unduh file langsung ke penyimpanan HP.
                  </p>
                </div>
              </button>
            </div>
          </div>

          {/* Section 3: Sensor, Multimedia & Layar */}
          <div className="apple-card p-4 sm:p-5 shadow-sm flex flex-col gap-3">
            <h3 className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <Camera className="w-4 h-4 text-purple-400" />
              <span>Sensor HP & Multimedia Realtime</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Wireless Webcam */}
              <button
                onClick={() => {
                  triggerHaptic([30]);
                  onStartScreenShare?.(peer.id, 'camera');
                }}
                className="ios-pressable flex items-start gap-3 p-3.5 rounded-2xl bg-black/3 dark:bg-white/5 hover:bg-black/6 dark:hover:bg-white/8 border border-black/8 dark:border-white/10 text-left transition cursor-pointer shadow-sm group"
              >
                <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500 shrink-0 border border-emerald-500/20 group-hover:scale-105 transition-transform">
                  <Camera className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-zinc-900 dark:text-white">Webcam HP (60 FPS)</h4>
                  <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5">Kamera HP jadi webcam PC/OBS</p>
                </div>
              </button>

              {/* Wireless Mic */}
              <button
                onClick={() => {
                  triggerHaptic([30]);
                  onStartScreenShare?.(peer.id, 'mic');
                }}
                className="ios-pressable flex items-start gap-3 p-3.5 rounded-2xl bg-black/3 dark:bg-white/5 hover:bg-black/6 dark:hover:bg-white/8 border border-black/8 dark:border-white/10 text-left transition cursor-pointer shadow-sm group"
              >
                <div className="p-2.5 rounded-xl bg-teal-500/10 text-teal-500 shrink-0 border border-teal-500/20 group-hover:scale-105 transition-transform">
                  <Mic className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-zinc-900 dark:text-white">Mikrofon HP</h4>
                  <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5">AI noise-cancelled mic untuk PC</p>
                </div>
              </button>

              {/* Kirim Teks & Clipboard */}
              <button
                onClick={() => {
                  triggerHaptic([30]);
                  onOpenTextSync?.(peer);
                }}
                className="ios-pressable flex items-start gap-3 p-3.5 rounded-2xl bg-black/3 dark:bg-white/5 hover:bg-black/6 dark:hover:bg-white/8 border border-black/8 dark:border-white/10 text-left transition cursor-pointer shadow-sm group"
              >
                <div className="p-2.5 rounded-xl bg-blue-500/10 text-[#0071e3] shrink-0 border border-blue-500/20 group-hover:scale-105 transition-transform">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-zinc-900 dark:text-white">Kirim Teks & Klip</h4>
                  <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5">Pesan instan & sync clipboard</p>
                </div>
              </button>

              {/* Monitor Layar PC */}
              <button
                onClick={() => {
                  triggerHaptic([30]);
                  onRequestRemoteScreen?.(peer.id);
                }}
                className="ios-pressable flex items-start gap-3 p-3.5 rounded-2xl bg-black/3 dark:bg-white/5 hover:bg-black/6 dark:hover:bg-white/8 border border-black/8 dark:border-white/10 text-left transition cursor-pointer shadow-sm group"
              >
                <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-500 shrink-0 border border-indigo-500/20 group-hover:scale-105 transition-transform">
                  <MonitorPlay className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-zinc-900 dark:text-white">Pantau Layar PC</h4>
                  <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5">Lihat layar laptop realtime</p>
                </div>
              </button>

              {/* Riwayat Clipboard 20 Item */}
              <button
                onClick={() => {
                  triggerHaptic([30]);
                  onOpenTextSync?.(peer);
                }}
                className="ios-pressable flex items-start gap-3 p-3.5 rounded-2xl bg-black/3 dark:bg-white/5 hover:bg-black/6 dark:hover:bg-white/8 border border-black/8 dark:border-white/10 text-left transition cursor-pointer shadow-sm group"
              >
                <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-500 shrink-0 border border-purple-500/20 group-hover:scale-105 transition-transform">
                  <ClipboardList className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-zinc-900 dark:text-white">Riwayat Clipboard</h4>
                  <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5">20 riwayat teks tersimpan</p>
                </div>
              </button>

              {/* Wake-on-LAN */}
              <button
                onClick={() => {
                  triggerHaptic([30]);
                  onOpenWakeOnLan?.(peer);
                }}
                className="ios-pressable flex items-start gap-3 p-3.5 rounded-2xl bg-black/3 dark:bg-white/5 hover:bg-black/6 dark:hover:bg-white/8 border border-black/8 dark:border-white/10 text-left transition cursor-pointer shadow-sm group"
              >
                <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500 shrink-0 border border-amber-500/20 group-hover:scale-105 transition-transform">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-zinc-900 dark:text-white">Bangunkan PC (WoL)</h4>
                  <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5">Nyalakan laptop via LAN</p>
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
