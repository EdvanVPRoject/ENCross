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
  ChevronRight,
  Fan,
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
  Loader2,
  AppWindow,
  Watch,
  Gauge,
  Bell,
  X,
  Plus,
  Globe,
  Image,
  MessageCircle,
  Settings,
  Music,
  Terminal,
  Activity,
  Calculator,
  FileText,
  Wind,
  Flame,
  Sliders,
  Search,
  SkipBack,
  SkipForward,
  Lock,
  Scissors,
  Cpu
} from 'lucide-react';
import { triggerHaptic } from '../utils/feedback';
import { FEATURE_TOGGLES } from '../config/features';
import { formatBytes } from '../utils/deviceInfo';
import { WearOsRemoteModal } from './WearOsRemoteModal';
import { PcHardwareHudModal } from './PcHardwareHudModal';
import { NotificationCenterModal } from './NotificationCenterModal';

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
  autoStartMirror = false,
  onOpenFullScreenMirror,
  onStopIncomingMirror,
  onOpenPcAppLauncher,
  onLaunchPcApp,
  onOpenPhoneAppLauncher,
  onLaunchPhoneApp,
  socket,
  notifications = [],
  onSendQuickReply,
  onClearNotifications,
  isOnline = true,
  onRefreshScan,
  onSendInput
}) {
  const fileInputRef = useRef(null);
  const folderInputRef = useRef(null);
  const mirrorContainerRef = useRef(null);
  const videoRef = useRef(null);
  const clientMirrorVideoRef = useRef(null);
  const rafRef = useRef(null);

  const [showHistory, setShowHistory] = useState(true);
  const [isWearOsModalOpen, setIsWearOsModalOpen] = useState(false);
  const [isHardwareHudOpen, setIsHardwareHudOpen] = useState(false);
  const [isNotifCenterOpen, setIsNotifCenterOpen] = useState(false);
  const [activePowerMode, setActivePowerMode] = useState('performance');
  const [isPowerModeSwitching, setIsPowerModeSwitching] = useState(false);
  const [workspaceTab, setWorkspaceTab] = useState('control');
  const [slideDirection, setSlideDirection] = useState('from-right');
  const [liveStats, setLiveStats] = useState(null);
  const [isCleaningQuickRam, setIsCleaningQuickRam] = useState(false);
  const [lastQuickCmd, setLastQuickCmd] = useState('');
  const touchStartPos = useRef({ x: 0, y: 0, time: 0 });

  useEffect(() => {
    const host = peer?.ip || window.location.hostname || '127.0.0.1';
    let fallbackInterval = null;

    const handleStats = (data) => {
      if (data) setLiveStats(data);
    };

    if (socket && socket.connected) {
      socket.emit('subscribe-pc-stats');
      socket.on('pc-stats-update', handleStats);
    }

    const fetchHttpStats = async () => {
      try {
        const res = await fetch(`http://${host}:3001/api/pc-stats`);
        if (res.ok) {
          const json = await res.json();
          setLiveStats(json);
        }
      } catch (_) {}
    };

    fetchHttpStats();
    fallbackInterval = setInterval(fetchHttpStats, 3000);

    return () => {
      if (socket) {
        socket.emit('unsubscribe-pc-stats');
        socket.off('pc-stats-update', handleStats);
      }
      if (fallbackInterval) clearInterval(fallbackInterval);
    };
  }, [socket, peer?.ip]);

  const sendQuickCommand = (cmd, label) => {
    triggerHaptic([25]);
    setLastQuickCmd(label || cmd);
    setTimeout(() => setLastQuickCmd(''), 900);
    if (onSendInput) {
      onSendInput({ targetId: peer?.id, targetDeviceId: peer?.deviceId, command: cmd });
    } else if (socket && socket.connected) {
      socket.emit('remote-input', { targetId: peer?.id, targetDeviceId: peer?.deviceId, command: cmd });
    }
  };

  const handleQuickCleanRam = async (e) => {
    if (e) e.stopPropagation();
    if (isCleaningQuickRam) return;
    triggerHaptic([35]);
    setIsCleaningQuickRam(true);
    try {
      if (socket && socket.connected) {
        socket.emit('clean-pc-ram');
      } else {
        const host = peer?.ip || window.location.hostname || '127.0.0.1';
        await fetch(`http://${host}:3001/api/clean-ram`, { method: 'POST' });
      }
    } catch (_) {}
    setTimeout(() => setIsCleaningQuickRam(false), 1200);
  };

  const handleNitroSenseMode = (mode, label) => {
    triggerHaptic([30]);
    setIsPowerModeSwitching(true);
    setActivePowerMode(mode);

    if (mode === 'open-app') {
      if (socket && socket.connected) {
        socket.emit('set-pc-power-mode', { action: 'open-nitrosense' });
      }
      onLaunchPcApp?.(peer, 'explorer.exe shell:AppsFolder\\ULICTekInc.NitroSenseforNotebook_nt9dgb7efx6bt!NitroSense', 'Acer NitroSense');
    } else {
      const guidMap = {
        quiet: '381b4222-f694-41f0-9685-ff5bb260df2e',
        balanced: '9fbfd299-0038-4da0-a3a6-30a2d4f2c49f',
        performance: 'e3c6dc3a-e2ec-46e3-8bbe-a432fe1da37e'
      };
      if (socket && socket.connected) {
        socket.emit('set-pc-power-mode', { mode });
      }
      if (guidMap[mode]) {
        onLaunchPcApp?.(peer, `powercfg /setactive ${guidMap[mode]}`, `NitroSense ${label}`);
      }
      const host = peer?.ip || window.location.hostname || '127.0.0.1';
      fetch(`http://${host}:3001/api/pc-power-mode?mode=${mode}`, { method: 'POST' }).catch(() => {});
    }

    setTimeout(() => setIsPowerModeSwitching(false), 600);
  };

  // Shortcut Aplikasi Ponsel (Synced with PhoneAppLauncherModal via localStorage)
  const [phoneShortcuts, setPhoneShortcuts] = useState(() => {
    try {
      const saved = localStorage.getItem('encross_phone_shortcuts');
      if (saved) return JSON.parse(saved);
    } catch (_) {}
    return [
      { name: 'WhatsApp', pkg: 'com.whatsapp', icon: 'MessageCircle', color: 'text-emerald-500 bg-emerald-500/10' },
      { name: 'Kamera', pkg: 'camera', icon: 'Camera', color: 'text-blue-500 bg-blue-500/10' },
      { name: 'Galeri', pkg: 'com.google.android.apps.photos', icon: 'Image', color: 'text-amber-500 bg-amber-500/10' },
      { name: 'YouTube', pkg: 'com.google.android.youtube', icon: 'Play', color: 'text-red-500 bg-red-500/10' },
      { name: 'Chrome', pkg: 'com.android.chrome', icon: 'Globe', color: 'text-orange-500 bg-orange-500/10' },
      { name: 'Pengaturan', pkg: 'settings', icon: 'Settings', color: 'text-zinc-400 bg-zinc-500/10' }
    ];
  });

  useEffect(() => {
    const handleUpdate = () => {
      try {
        const saved = localStorage.getItem('encross_phone_shortcuts');
        if (saved) setPhoneShortcuts(JSON.parse(saved));
      } catch (_) {}
    };
    window.addEventListener('encross_phone_shortcuts_changed', handleUpdate);
    return () => window.removeEventListener('encross_phone_shortcuts_changed', handleUpdate);
  }, []);

  const handleRemovePhoneShortcut = (pkgToRemove, name) => {
    triggerHaptic([25]);
    setPhoneShortcuts((prev) => {
      const next = prev.filter((s) => (s.pkg || s.package) !== pkgToRemove);
      try {
        localStorage.setItem('encross_phone_shortcuts', JSON.stringify(next));
        window.dispatchEvent(new Event('encross_phone_shortcuts_changed'));
      } catch (_) {}
      return next;
    });
  };

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

  // Hook live incoming WebRTC stream for the mobile in-workspace mirror display card
  useEffect(() => {
    const previewEl = clientMirrorVideoRef.current;
    if (incomingStream && previewEl) {
      previewEl.srcObject = incomingStream;
      previewEl.play().catch(console.warn);
    }
    return () => {
      if (previewEl) {
        try {
          previewEl.pause();
          previewEl.srcObject = null;
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
                    <div className={`p-1.5 rounded-lg shrink-0 ${isUpload ? 'bg-blue-500/10 text-blue-500' : 'bg-blue-500/10 text-emerald-500'}`}>
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
      className="w-full max-w-7xl mx-auto px-2 sm:px-4 lg:px-6 py-1 sm:py-2.5 flex-1 min-h-0 flex flex-col gap-2 sm:gap-3 smooth-gpu relative"
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

      {/* 1. Top Bar: Selected Device Info & Status - Tap opens Hardware & Fan Monitor */}
      <div
        onClick={() => {
          triggerHaptic([30]);
          setIsHardwareHudOpen(true);
        }}
        className="apple-card px-3 sm:px-4 py-2 sm:py-2.5 shadow-sm flex items-center justify-between gap-2.5 shrink-0 cursor-pointer hover:bg-black/3 dark:hover:bg-white/5 active:scale-[0.99] transition border border-black/8 dark:border-white/10 group"
        title="Ketuk untuk membuka Monitor Hardware & Pengaturan Kipas PC"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-2 bg-black/5 dark:bg-white/5 border border-black/8 dark:border-white/10 rounded-xl shrink-0 group-hover:scale-105 transition-transform">
            {getDeviceIcon(peer.deviceType, 'w-5 h-5')}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h2 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-white truncate">{peer.name}</h2>
              {isOnline ? (
                <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full font-mono font-medium shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  TERHUBUNG
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full font-mono font-medium shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
                  TERPUTUS / TERTUTUP
                </span>
              )}
              {isOnline ? (
                <span className="inline-flex items-center gap-1 text-[10px] text-blue-600 dark:text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-full font-mono font-medium shrink-0">
                  <ShieldCheck className="w-3 h-3 text-blue-500" />
                  SINKRON
                </span>
              ) : (
                onRefreshScan && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRefreshScan();
                    }}
                    className="inline-flex items-center gap-1 text-[10px] text-zinc-700 dark:text-zinc-200 bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 px-2 py-0.5 rounded-full font-medium transition cursor-pointer"
                    title="Pindai ulang jaringan LAN untuk menghubungkan kembali"
                  >
                    <RefreshCw className="w-2.5 h-2.5" />
                    Hubungkan Ulang
                  </button>
                )
              )}
            </div>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-mono truncate">
              {peer.os || 'OS'} • {peer.ip || 'Wi-Fi LAN'}
              {pingMs ? ` • ${pingMs} ms` : ''}
            </p>
          </div>
        </div>

        {/* Right Action: Hardware & Fan HUD Pill & Battery */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 text-[11px] font-semibold border border-cyan-500/25 transition group-hover:bg-cyan-500/15">
            <Gauge className="w-3.5 h-3.5 text-cyan-500 dark:text-cyan-400 shrink-0" />
            {liveStats ? (
              <span className="font-mono text-[10px] sm:text-[11px]">
                {liveStats.cpu?.temp || 50}°C • RAM {liveStats.ram?.percentage ?? liveStats.ram?.percent ?? 0}%
              </span>
            ) : (
              <span className="hidden xs:inline">Hardware & Kipas</span>
            )}
            <ChevronRight className="w-3 h-3 text-cyan-500/70 shrink-0 group-hover:translate-x-0.5 transition-transform" />
          </div>

          {/* Right: Battery Badge */}
          {peer.battery && typeof peer.battery.level === 'number' && peer.battery.level >= 0 && (
            <div className="flex items-center gap-1 text-xs text-zinc-700 dark:text-zinc-300 font-mono bg-black/5 dark:bg-white/5 px-2.5 py-1 rounded-full border border-black/8 dark:border-white/10 shrink-0">
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
        </div>
      </div>

      {/* 2. Main Workspace Layout */}
      {/* CASE A: Running on PC / Laptop controlling an Android Phone (AnyDesk / StarDesk In-App Mirroring Mode) */}
      {!isMobile && isPeerMobile ? (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5 lg:gap-3.5 flex-1 min-h-0 overflow-hidden">
          {/* LEFT 7-8 COLUMNS: IN-APP SCREEN MIRRORING (Apple iPhone Mirroring style) */}
          <div className="md:col-span-6 lg:col-span-7 xl:col-span-7 2xl:col-span-8 apple-card p-2.5 sm:p-3 flex flex-col justify-between shadow-sm relative overflow-hidden min-h-0">
            {/* Top Toolbar inside Mirroring Box */}
            <div className="flex items-center justify-between pb-2.5 sm:pb-3 border-b border-black/8 dark:border-white/10 gap-2 flex-wrap z-20 shrink-0">
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
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
                    className={`flex items-center gap-1 px-2 sm:px-2.5 py-0.5 rounded-full transition ${
                      mirrorEngine === 'scrcpy'
                        ? 'bg-[#0071e3] text-white font-semibold'
                        : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                    }`}
                  >
                    <Zap className="w-3 h-3 shrink-0" />
                    <span>Scrcpy 60FPS</span>
                  </button>
                  <button
                    onClick={() => {
                      triggerHaptic([20]);
                      setMirrorEngine('webrtc');
                    }}
                    className={`flex items-center gap-1 px-2 sm:px-2.5 py-0.5 rounded-full transition ${
                      mirrorEngine === 'webrtc'
                        ? 'bg-[#0071e3] text-white font-semibold'
                        : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                    }`}
                  >
                    <Globe className="w-3 h-3 shrink-0" />
                    <span>WebRTC</span>
                  </button>
                </div>

                {/* Dock / Pop-out toggle if Scrcpy & Electron */}
                {isElectron && mirrorEngine === 'scrcpy' && (
                  <button
                    onClick={() => {
                      triggerHaptic([20]);
                      setIsDockedMode(!isDockedMode);
                    }}
                    className="flex items-center gap-1 text-[10px] text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white bg-black/5 dark:bg-white/8 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full border border-black/8 dark:border-white/10 font-mono transition"
                    title={isDockedMode ? 'Buka Scrcpy di jendela terpisah' : 'Tempelkan Scrcpy di dalam aplikasi'}
                  >
                    {isDockedMode ? <Maximize2 className="w-3 h-3 shrink-0" /> : <AppWindow className="w-3 h-3 shrink-0" />}
                    <span>{isDockedMode ? 'In-App' : 'Pop-Out'}</span>
                  </button>
                )}
              </div>

              {/* Start / Stop Toggle */}
              <div className="flex items-center gap-2">
                {isMirrorActive ? (
                  <button
                    onClick={handleStopMirroring}
                    className="flex items-center gap-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/20 px-3 sm:px-3.5 py-1 sm:py-1.5 rounded-full text-xs font-medium transition cursor-pointer shadow-sm active:scale-95"
                  >
                    <Pause className="w-3.5 h-3.5" />
                    <span>Hentikan Mirror</span>
                  </button>
                ) : (
                  <button
                    onClick={() => handleStartMirroring()}
                    disabled={isScrcpyStarting}
                    className="flex items-center gap-1.5 bg-[#0071e3] hover:bg-[#0077ed] text-white font-medium px-3.5 sm:px-4 py-1 sm:py-1.5 rounded-full text-xs transition cursor-pointer shadow-sm active:scale-95 disabled:opacity-50"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>{isScrcpyStarting ? 'Menghubungkan...' : 'Mulai Mirroring'}</span>
                  </button>
                )}
              </div>
            </div>

            {/* Error Message if any */}
            {scrcpyError && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs p-2.5 sm:p-3 rounded-2xl my-1.5 sm:my-2 shrink-0">
                {scrcpyError}
              </div>
            )}

            {/* CENTER: PHONE DISPLAY CONTAINER (Scrcpy Win32 Dock or WebRTC Video) */}
            <div className="flex-1 min-h-0 flex items-center justify-center p-1 sm:p-2 relative my-1 sm:my-2">
              <div
                ref={mirrorContainerRef}
                id="scrcpy-container"
                className="h-full max-h-[min(480px,calc(100vh-210px))] min-h-[180px] aspect-[9/19.5] w-auto max-w-[300px] bg-black border-[3px] border-black/20 dark:border-white/20 rounded-[2rem] sm:rounded-[2.25rem] shadow-xl relative overflow-hidden flex flex-col items-center justify-center ring-1 ring-black/5 dark:ring-white/10 mx-auto transition-all"
              >
                {/* Phone Speaker Notch */}
                <div className="absolute top-2 w-16 sm:w-20 h-2.5 sm:h-3 bg-zinc-800 rounded-full z-30 pointer-events-none" />

                {/* If Scrcpy Active: Win32 native window is docked directly at this rectangle! */}
                {isMirrorActive && mirrorEngine === 'scrcpy' ? (
                  <div className="w-full h-full flex flex-col items-center justify-center text-center p-3 sm:p-4">
                    {isDockedMode ? (
                      <p className="text-[10px] sm:text-xs text-zinc-500 font-mono">
                        [Scrcpy 60 FPS Native Docked Inside Frame]
                      </p>
                    ) : (
                      <div className="flex flex-col items-center">
                        <Smartphone className="w-10 h-10 sm:w-12 sm:h-12 text-[#0071e3] mb-2" />
                        <h4 className="text-xs sm:text-sm font-semibold text-white mb-1">Mirroring Aktif (Pop-Out)</h4>
                        <p className="text-[10px] sm:text-[11px] text-zinc-400 max-w-[200px]">
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
                  <div className="text-center p-4 sm:p-6 flex flex-col items-center justify-center animate-in fade-in">
                    <Loader2 className="w-10 h-10 sm:w-12 sm:h-12 text-[#0071e3] animate-spin mb-2 sm:mb-3" />
                    <h4 className="text-xs sm:text-sm font-semibold text-white mb-1">Menghubungkan Mirroring...</h4>
                    <p className="text-[10px] sm:text-[11px] text-zinc-400">Menyiapkan tampilan layar ponsel ke PC...</p>
                  </div>
                ) : (
                  /* Idle / Connect Placeholder */
                  <div className="text-center p-4 sm:p-6 flex flex-col items-center justify-center">
                    <Smartphone className="w-10 h-10 sm:w-12 sm:h-12 text-zinc-600 mb-2 sm:mb-3" />
                    <h4 className="text-xs sm:text-sm font-semibold text-white mb-1">Mirroring Layar HP</h4>
                    <p className="text-[10px] sm:text-[11px] text-zinc-400 leading-relaxed mb-3 sm:mb-4 max-w-[200px]">
                      Tampilan layar ponsel Anda akan muncul dan dapat dikontrol langsung di sini.
                    </p>
                    <button
                      onClick={() => handleStartMirroring()}
                      className="bg-[#0071e3] hover:bg-[#0077ed] text-white text-[11px] sm:text-xs font-medium py-1.5 sm:py-2 px-4 sm:px-5 rounded-full transition cursor-pointer shadow-sm active:scale-95"
                    >
                      Buka Layar HP Sekarang
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Floating Android Navigation Bar (Apple Capsule Floating Style) */}
            <div className="apple-glass rounded-full px-3 sm:px-4 py-1 sm:py-1.5 flex items-center justify-center gap-1.5 sm:gap-3 shrink-0 shadow-sm border border-black/8 dark:border-white/10 self-center mt-1">
              <button
                onClick={() => handleAdbKey(4)}
                className="flex items-center gap-1 p-1.5 sm:p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition cursor-pointer text-xs"
                title="Kembali (Back)"
              >
                <ChevronLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Back</span>
              </button>

              <button
                onClick={() => handleAdbKey(3)}
                className="flex items-center gap-1 p-1.5 sm:p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition cursor-pointer text-xs"
                title="Beranda (Home)"
              >
                <Circle className="w-4 h-4 text-emerald-500" />
                <span className="hidden sm:inline">Home</span>
              </button>

              <button
                onClick={() => handleAdbKey(187)}
                className="flex items-center gap-1 p-1.5 sm:p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition cursor-pointer text-xs"
                title="Aplikasi Terbaru (Recents)"
              >
                <Square className="w-4 h-4 text-blue-500" />
                <span className="hidden sm:inline">Recents</span>
              </button>

              <div className="h-3.5 w-px bg-black/10 dark:bg-white/15" />

              <button
                onClick={() => handleAdbKey(26)}
                className="flex items-center gap-1 p-1.5 sm:p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-zinc-600 dark:text-zinc-400 hover:text-red-500 transition cursor-pointer text-xs"
                title="Tombol Daya / Kunci Layar (Power)"
              >
                <Power className="w-4 h-4 text-red-500" />
                <span className="hidden sm:inline">Power</span>
              </button>

              <button
                onClick={() => handleAdbKey(24)}
                className="p-1.5 sm:p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition cursor-pointer"
                title="Volume Up"
              >
                <Volume2 className="w-4 h-4" />
              </button>

              <button
                onClick={() => handleAdbKey(25)}
                className="p-1.5 sm:p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition cursor-pointer"
                title="Volume Down"
              >
                <Volume1 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* RIGHT 4-5 COLUMNS: FULL FEATURE TOOLBAR FOR THIS PHONE */}
          <div className="md:col-span-6 lg:col-span-5 xl:col-span-5 2xl:col-span-4 flex flex-col min-h-0 gap-2 sm:gap-2.5 overflow-y-auto max-h-[calc(100vh-120px)] pr-1.5 custom-scrollbar">
            {/* 1. Quick Transfer Dropzone */}
            <div className="apple-card p-3 sm:p-3.5 shadow-sm flex flex-col gap-2.5 shrink-0">
              <h4 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                <Upload className="w-4 h-4 text-[#0071e3]" />
                Transfer Cepat ke Ponsel
              </h4>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="ios-pressable flex items-center justify-center gap-1.5 bg-[#0071e3] hover:bg-[#0077ed] text-white font-medium py-2 px-3 rounded-full text-xs transition cursor-pointer shadow-sm"
                >
                  <Upload className="w-4 h-4 shrink-0" />
                  <span>Kirim File</span>
                </button>

                <button
                  onClick={() => folderInputRef.current?.click()}
                  className="ios-pressable flex items-center justify-center gap-1.5 bg-black/5 dark:bg-white/8 hover:bg-black/10 dark:hover:bg-white/12 text-zinc-800 dark:text-zinc-200 border border-black/8 dark:border-white/10 py-2 px-3 rounded-full text-xs font-medium transition cursor-pointer"
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
            <div className="apple-card p-3 sm:p-3.5 shadow-sm flex flex-col gap-2 shrink-0">
              <h4 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                <Folder className="w-4 h-4 text-blue-500" />
                Manajemen Berkas Ponsel
              </h4>

              <button
                onClick={() => {
                  triggerHaptic([30]);
                  onOpenFileExplorer?.(peer);
                }}
                className="ios-pressable w-full flex items-center justify-between p-2.5 rounded-2xl bg-black/3 dark:bg-white/5 hover:bg-black/6 dark:hover:bg-white/8 border border-black/6 dark:border-white/8 text-left transition cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
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
                  className="ios-pressable w-full flex items-center justify-between p-2.5 rounded-2xl bg-blue-500/5 dark:bg-blue-500/10 hover:bg-blue-500/10 dark:hover:bg-blue-500/15 border border-blue-500/15 text-left transition cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded-xl bg-blue-500/20 text-[#0071e3]">
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

            {/* Shortcut Aplikasi Ponsel di Laptop */}
            <div className="apple-card p-3 sm:p-3.5 shadow-sm flex flex-col gap-2.5 shrink-0">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Smartphone className="w-4 h-4 text-blue-500" />
                  Shortcut Aplikasi Ponsel
                </h4>
                <button
                  onClick={() => onOpenPhoneAppLauncher?.(peer)}
                  className="text-[11px] text-[#0071e3] hover:underline font-semibold cursor-pointer"
                >
                  Semua Aplikasi ({'>'})
                </button>
              </div>

              {/* Dynamic grid of top phone apps */}
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5 sm:gap-2">
                {phoneShortcuts.map((app) => {
                  const pkg = app.pkg || app.package;
                  let Icon = AppWindow;
                  if (typeof app.icon === 'function') Icon = app.icon;
                  else if (app.icon === 'MessageCircle' || pkg.includes('whatsapp') || pkg.includes('chat')) Icon = MessageCircle;
                  else if (app.icon === 'Camera' || pkg === 'camera') Icon = Camera;
                  else if (app.icon === 'Image' || pkg.includes('photos') || pkg.includes('gallery')) Icon = Image;
                  else if (app.icon === 'Play' || pkg.includes('youtube')) Icon = Play;
                  else if (app.icon === 'Globe' || pkg.includes('chrome') || pkg.includes('browser')) Icon = Globe;
                  else if (app.icon === 'Settings' || pkg === 'settings') Icon = Settings;
                  else if (app.icon === 'Music' || pkg.includes('spotify')) Icon = Music;

                  return (
                    <div
                      key={pkg}
                      className="relative group/shortcut"
                    >
                      <button
                        onClick={() => {
                          triggerHaptic([20]);
                          onLaunchPhoneApp?.(peer, pkg, app.name);
                        }}
                        className="w-full ios-pressable flex flex-col items-center justify-center gap-1 p-2 rounded-2xl bg-black/3 dark:bg-white/5 hover:bg-black/6 dark:hover:bg-white/8 border border-black/6 dark:border-white/8 transition cursor-pointer group active:scale-95"
                        title={`Buka ${app.name} di ponsel`}
                      >
                        <div className={`p-1.5 rounded-xl ${app.color || 'text-blue-500 bg-blue-500/10'} group-hover:scale-105 transition-transform`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <span className="text-[10px] sm:text-[11px] font-medium text-zinc-700 dark:text-zinc-300 truncate w-full text-center">
                          {app.name}
                        </span>
                      </button>

                      {/* Tombol Hilangkan dari Shortcut */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemovePhoneShortcut(pkg, app.name);
                        }}
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center opacity-0 group-hover/shortcut:opacity-100 transition-opacity cursor-pointer shadow-xs active:scale-90 z-10"
                        title={`Hilangkan ${app.name} dari shortcut`}
                      >
                        <X className="w-3 h-3 stroke-[2.5]" />
                      </button>
                    </div>
                  );
                })}

                {/* Tombol Tambah Shortcut */}
                <button
                  onClick={() => {
                    triggerHaptic([20]);
                    onOpenPhoneAppLauncher?.(peer);
                  }}
                  className="ios-pressable flex flex-col items-center justify-center gap-1 p-2 rounded-2xl border border-dashed border-black/15 dark:border-white/15 hover:border-blue-500/50 hover:bg-blue-500/5 text-zinc-400 hover:text-blue-500 transition cursor-pointer group active:scale-95"
                  title="Tambah aplikasi ke shortcut ponsel"
                >
                  <div className="p-1.5 rounded-xl bg-black/3 dark:bg-white/5 group-hover:bg-blue-500/10 group-hover:scale-105 transition-all">
                    <Plus className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] sm:text-[11px] font-medium truncate w-full text-center">
                    + Tambah
                  </span>
                </button>
              </div>
            </div>

            {/* 3. Multimedia & Utilitas (Webcam, Mic, Ring, Chat) */}
            <div className="apple-card p-3 sm:p-3.5 shadow-sm flex flex-col gap-2 shrink-0">
              <h4 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-0.5">
                Kamera, Audio & Utilitas
              </h4>

              <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
                {/* Wireless Webcam */}
                <button
                  onClick={() => {
                    triggerHaptic([30]);
                    onRequestRemoteCamera?.(peer.id);
                  }}
                  className="ios-pressable flex items-center gap-2 p-2 sm:p-2.5 rounded-2xl bg-black/3 dark:bg-white/5 hover:bg-black/6 dark:hover:bg-white/8 border border-black/6 dark:border-white/8 text-zinc-800 dark:text-zinc-200 text-xs font-medium transition cursor-pointer text-left"
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
                  className="ios-pressable flex items-center gap-2 p-2 sm:p-2.5 rounded-2xl bg-black/3 dark:bg-white/5 hover:bg-black/6 dark:hover:bg-white/8 border border-black/6 dark:border-white/8 text-zinc-800 dark:text-zinc-200 text-xs font-medium transition cursor-pointer text-left"
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
                  className="ios-pressable flex items-center gap-2 p-2 sm:p-2.5 rounded-2xl bg-black/3 dark:bg-white/5 hover:bg-black/6 dark:hover:bg-white/8 border border-black/6 dark:border-white/8 text-zinc-800 dark:text-zinc-200 text-xs font-medium transition cursor-pointer text-left"
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
                  className="ios-pressable flex items-center gap-2 p-2 sm:p-2.5 rounded-2xl bg-red-500/5 dark:bg-red-500/10 hover:bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/15 text-xs font-medium transition cursor-pointer text-left"
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
                    className={`ios-pressable flex items-center gap-2 p-2 sm:p-2.5 rounded-2xl border text-xs font-medium transition cursor-pointer text-left ${
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
                  className="ios-pressable flex items-center gap-2 p-2 sm:p-2.5 rounded-2xl bg-amber-500/5 dark:bg-amber-500/10 hover:bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/15 text-xs font-medium transition cursor-pointer text-left"
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
                    className="ios-pressable flex items-center gap-2 p-2 sm:p-2.5 rounded-2xl bg-sky-500/5 dark:bg-sky-500/10 hover:bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/20 text-xs font-medium transition cursor-pointer text-left"
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
        <div
          onTouchStart={(e) => {
            if (e.touches && e.touches.length === 1) {
              touchStartPos.current = {
                x: e.touches[0].clientX,
                y: e.touches[0].clientY,
                time: Date.now()
              };
            }
          }}
          onTouchEnd={(e) => {
            if (!touchStartPos.current.time) return;
            const touch = e.changedTouches?.[0];
            if (!touch) return;

            const deltaX = touch.clientX - touchStartPos.current.x;
            const deltaY = touch.clientY - touchStartPos.current.y;
            const deltaTime = Date.now() - touchStartPos.current.time;
            touchStartPos.current = { x: 0, y: 0, time: 0 };

            if (deltaTime > 800) return;

            // Predominantly horizontal swipe: deltaX at least 35px and 1.2x deltaY
            if (Math.abs(deltaX) >= 35 && Math.abs(deltaX) > Math.abs(deltaY) * 1.2) {
              const tabIds = ['control', 'transfer', 'apps', 'features'];
              const currentIdx = tabIds.indexOf(workspaceTab);
              if (currentIdx === -1) return;

              if (deltaX < 0 && currentIdx < tabIds.length - 1) {
                // Swiped left (finger moves right-to-left) -> advance to next tab (e.g. Kontrol -> Berkas)
                triggerHaptic([25]);
                setSlideDirection('from-right');
                setWorkspaceTab(tabIds[currentIdx + 1]);
              } else if (deltaX > 0 && currentIdx > 0) {
                // Swiped right (finger moves left-to-right) -> back to previous tab (e.g. Berkas -> Kontrol)
                triggerHaptic([25]);
                setSlideDirection('from-left');
                setWorkspaceTab(tabIds[currentIdx - 1]);
              }
            }
          }}
          className="flex flex-col gap-2.5 sm:gap-3 touch-pan-y"
        >
          {/* Apple-grade Hierarchical Segmented Control Tabs */}
          <div className="flex items-center gap-1 p-1 bg-black/5 dark:bg-white/8 backdrop-blur-md rounded-2xl border border-black/8 dark:border-white/10 w-full shadow-xs select-none">
            {[
              { id: 'control', label: 'Kontrol & Layar', shortLabel: 'Kontrol', icon: MousePointer, badge: (incomingStream && (incomingStreamMode === 'second-display' || incomingStreamMode === 'screen')) ? 'Live' : null },
              { id: 'transfer', label: 'Berkas & File', shortLabel: 'Berkas', icon: Folder, count: transferHistory.length },
              { id: 'apps', label: 'Aplikasi & Sistem', shortLabel: 'Aplikasi', icon: AppWindow },
              { id: 'features', label: 'Sensor & Fitur', shortLabel: 'Fitur', icon: Sparkles, count: notifications.length }
            ].map((tab, idx) => {
              const Icon = tab.icon;
              const isActive = workspaceTab === tab.id;
              const tabIds = ['control', 'transfer', 'apps', 'features'];
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    triggerHaptic([20]);
                    const currentIdx = tabIds.indexOf(workspaceTab);
                    setSlideDirection(idx >= currentIdx ? 'from-right' : 'from-left');
                    setWorkspaceTab(tab.id);
                  }}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-1 sm:px-3 rounded-xl text-xs font-semibold transition-all cursor-pointer relative ${
                    isActive
                      ? 'bg-white dark:bg-zinc-800 text-[#0071e3] dark:text-blue-400 shadow-xs ring-1 ring-black/5 dark:ring-white/10'
                      : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-blue-500' : ''}`} />
                  <span className="hidden sm:inline truncate">{tab.label}</span>
                  <span className="inline sm:hidden truncate">{tab.shortLabel}</span>
                  {tab.badge && (
                    <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse shrink-0" title="Mirror Aktif" />
                  )}
                  {typeof tab.count === 'number' && tab.count > 0 && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-blue-500/15 text-blue-600 dark:text-blue-400 font-bold shrink-0">
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* TAB 1: KONTROL & LAYAR */}
          {workspaceTab === 'control' && (
            <div key="tab-control" className={`flex flex-col gap-3 ${slideDirection === 'from-right' ? 'animate-in slide-in-from-right-8 duration-200 fade-in' : 'animate-in slide-in-from-left-8 duration-200 fade-in'}`}>
              <div className="apple-card p-3.5 sm:p-4 shadow-sm flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                    <MousePointer className="w-4 h-4 text-blue-500" />
                    <span>Navigasi & Kontrol Input PC</span>
                  </h3>
                  <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full font-semibold">
                    60Hz Ready
                  </span>
                </div>

                {/* Unified Remote Input with Direct Interactive Mode Launchers */}
                <div className="p-3.5 rounded-2xl bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-indigo-500/10 border border-blue-500/25 flex flex-col gap-3 shadow-xs">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="p-2.5 rounded-xl bg-[#0071e3] text-white shrink-0 shadow-sm">
                        <MousePointer className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-sm font-bold text-zinc-900 dark:text-white truncate">
                          Remote Input Terpadu
                        </h4>
                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
                          Pilih mode kontrol langsung ke {peer.name}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        triggerHaptic([30]);
                        onOpenTouchpad?.(peer);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-[#0071e3] hover:bg-[#0077ed] text-white text-xs font-semibold transition cursor-pointer shrink-0 active:scale-95"
                    >
                      Buka Penuh
                    </button>
                  </div>

                  {/* 3 Direct Interactive Mode Buttons (Replacing non-clickable bullet points) */}
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        triggerHaptic([25]);
                        onOpenTouchpad?.(peer);
                      }}
                      className="ios-pressable flex flex-col items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl bg-white/80 dark:bg-zinc-900/70 hover:bg-white dark:hover:bg-zinc-800 border border-black/8 dark:border-white/10 transition cursor-pointer active:scale-95"
                    >
                      <MousePointer className="w-4 h-4 text-[#0071e3] dark:text-blue-400" />
                      <span className="text-[11px] font-semibold text-zinc-800 dark:text-zinc-200 truncate">Touchpad</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        triggerHaptic([25]);
                        onOpenRemoteKeyboard?.(peer);
                      }}
                      className="ios-pressable flex flex-col items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl bg-white/80 dark:bg-zinc-900/70 hover:bg-white dark:hover:bg-zinc-800 border border-black/8 dark:border-white/10 transition cursor-pointer active:scale-95"
                    >
                      <Keyboard className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
                      <span className="text-[11px] font-semibold text-zinc-800 dark:text-zinc-200 truncate">Keyboard</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        triggerHaptic([25]);
                        onOpenMacroPad?.(peer);
                      }}
                      className="ios-pressable flex flex-col items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl bg-white/80 dark:bg-zinc-900/70 hover:bg-white dark:hover:bg-zinc-800 border border-black/8 dark:border-white/10 transition cursor-pointer active:scale-95"
                    >
                      <Layers className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
                      <span className="text-[11px] font-semibold text-zinc-800 dark:text-zinc-200 truncate">MacroPad</span>
                    </button>
                  </div>
                </div>

                {/* Secondary Display & Presentation Deck */}
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic([30]);
                      onOpenPresentationClicker?.(peer);
                    }}
                    className="ios-pressable flex items-center gap-3 p-3 rounded-2xl bg-black/3 dark:bg-white/5 hover:bg-black/6 dark:hover:bg-white/8 border border-black/8 dark:border-white/10 text-left transition cursor-pointer group active:scale-[0.98]"
                  >
                    <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0 border border-amber-500/20">
                      <Presentation className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs sm:text-sm font-semibold text-zinc-900 dark:text-white truncate">
                        Presentasi
                      </h4>
                      <p className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
                        Slide Clicker & Timer
                      </p>
                    </div>
                  </button>

                  {FEATURE_TOGGLES.enableSecondDisplay !== false && (
                    <button
                      type="button"
                      onClick={() => {
                        triggerHaptic([30]);
                        onOpenSecondDisplay?.(peer);
                      }}
                      className="ios-pressable flex items-center gap-3 p-3 rounded-2xl bg-black/3 dark:bg-white/5 hover:bg-black/6 dark:hover:bg-white/8 border border-black/8 dark:border-white/10 text-left transition cursor-pointer group active:scale-[0.98]"
                    >
                      <div className="p-2.5 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 shrink-0 border border-sky-500/20">
                        <Tv className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs sm:text-sm font-semibold text-zinc-900 dark:text-white truncate">
                          Monitor Layar
                        </h4>
                        <p className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
                          Layar ke-2 & Mirror 60FPS
                        </p>
                      </div>
                    </button>
                  )}
                </div>

                {/* Live Active Mirroring Card underneath Mirror & Monitor Layar */}
                {incomingStream && (incomingStreamMode === 'second-display' || incomingStreamMode === 'screen') && (
                  <div className="mt-1 p-3.5 rounded-2xl bg-gradient-to-br from-sky-500/15 via-blue-500/5 to-indigo-500/10 border border-sky-500/30 shadow-lg animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="flex items-center justify-between mb-2.5">
                      <div className="flex items-center gap-2">
                        <span className="relative flex h-2.5 w-2.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500"></span>
                        </span>
                        <span className="text-xs font-bold text-sky-600 dark:text-sky-300 uppercase tracking-wider">
                          Siaran Layar Aktif
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-600 dark:text-sky-300 border border-sky-500/30">
                        <Tv className="w-3 h-3" />
                        <span>60 FPS</span>
                      </div>
                    </div>

                    <div
                      onClick={onOpenFullScreenMirror}
                      className="relative w-full aspect-video rounded-xl bg-black overflow-hidden border border-black/10 dark:border-white/10 group cursor-pointer shadow-inner mb-3 flex items-center justify-center"
                      title="Ketuk untuk membuka tampilan layar penuh"
                    >
                      <video
                        ref={clientMirrorVideoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-contain pointer-events-none"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 text-white text-xs font-semibold backdrop-blur-2xs">
                        <Maximize2 className="w-4 h-4 text-sky-400" />
                        <span>Buka Layar Penuh</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={onOpenFullScreenMirror}
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 active:scale-95 text-white text-xs font-semibold transition cursor-pointer shadow-sm"
                      >
                        <Maximize2 className="w-3.5 h-3.5" />
                        <span>Layar Penuh</span>
                      </button>

                      <button
                        onClick={() => onOpenTouchpad?.(peer)}
                        className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15 active:scale-95 text-zinc-800 dark:text-zinc-200 text-xs font-medium transition cursor-pointer border border-black/8 dark:border-white/10"
                      >
                        <MousePointer className="w-3.5 h-3.5 text-emerald-500" />
                        <span>Input</span>
                      </button>

                      <button
                        onClick={onStopIncomingMirror}
                        className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-red-500/15 hover:bg-red-500/25 active:scale-95 text-red-600 dark:text-red-300 text-xs font-medium transition cursor-pointer border border-red-500/30"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Stop</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* INTERACTIVE QUICK MEDIA, VOLUME & SYSTEM CONTROL DECK */}
              <div className="apple-card p-3.5 sm:p-4 shadow-sm flex flex-col gap-2.5">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                    <Volume2 className="w-4 h-4 text-blue-500" />
                    <span>Deck Media, Volume & Pintasan Cepat</span>
                  </h4>
                  {lastQuickCmd ? (
                    <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full animate-in fade-in">
                      Terkirim: {lastQuickCmd}
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono text-zinc-400">1-Tap Instant</span>
                  )}
                </div>

                {/* Row 1: Volume & Media Playback (6 Interactive Buttons) */}
                <div className="grid grid-cols-6 gap-1.5">
                  <button
                    type="button"
                    onClick={() => sendQuickCommand('media voldown', 'Vol -')}
                    className="ios-pressable flex flex-col items-center justify-center gap-1 py-2.5 rounded-xl bg-black/4 dark:bg-white/5 hover:bg-black/8 dark:hover:bg-white/10 border border-black/6 dark:border-white/8 text-zinc-700 dark:text-zinc-200 transition cursor-pointer active:scale-92"
                    title="Turunkan Volume PC"
                  >
                    <Volume1 className="w-4 h-4 text-blue-500" />
                    <span className="text-[10px] font-semibold">Vol -</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => sendQuickCommand('media mute', 'Mute')}
                    className="ios-pressable flex flex-col items-center justify-center gap-1 py-2.5 rounded-xl bg-black/4 dark:bg-white/5 hover:bg-black/8 dark:hover:bg-white/10 border border-black/6 dark:border-white/8 text-zinc-700 dark:text-zinc-200 transition cursor-pointer active:scale-92"
                    title="Bisukan Audio PC"
                  >
                    <VolumeX className="w-4 h-4 text-rose-500" />
                    <span className="text-[10px] font-semibold">Mute</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => sendQuickCommand('media volup', 'Vol +')}
                    className="ios-pressable flex flex-col items-center justify-center gap-1 py-2.5 rounded-xl bg-black/4 dark:bg-white/5 hover:bg-black/8 dark:hover:bg-white/10 border border-black/6 dark:border-white/8 text-zinc-700 dark:text-zinc-200 transition cursor-pointer active:scale-92"
                    title="Naikkan Volume PC"
                  >
                    <Volume2 className="w-4 h-4 text-blue-500" />
                    <span className="text-[10px] font-semibold">Vol +</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => sendQuickCommand('media prev', 'Prev')}
                    className="ios-pressable flex flex-col items-center justify-center gap-1 py-2.5 rounded-xl bg-black/4 dark:bg-white/5 hover:bg-black/8 dark:hover:bg-white/10 border border-black/6 dark:border-white/8 text-zinc-700 dark:text-zinc-200 transition cursor-pointer active:scale-92"
                    title="Lagu Sebelumnya"
                  >
                    <SkipBack className="w-4 h-4 text-indigo-500" />
                    <span className="text-[10px] font-semibold">Prev</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => sendQuickCommand('media playpause', 'Play/Pause')}
                    className="ios-pressable flex flex-col items-center justify-center gap-1 py-2.5 rounded-xl bg-blue-500/12 hover:bg-blue-500/20 border border-blue-500/25 text-[#0071e3] dark:text-blue-400 transition cursor-pointer active:scale-92"
                    title="Putar / Jeda Media"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    <span className="text-[10px] font-bold">Play</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => sendQuickCommand('media next', 'Next')}
                    className="ios-pressable flex flex-col items-center justify-center gap-1 py-2.5 rounded-xl bg-black/4 dark:bg-white/5 hover:bg-black/8 dark:hover:bg-white/10 border border-black/6 dark:border-white/8 text-zinc-700 dark:text-zinc-200 transition cursor-pointer active:scale-92"
                    title="Lagu Berikutnya"
                  >
                    <SkipForward className="w-4 h-4 text-indigo-500" />
                    <span className="text-[10px] font-semibold">Next</span>
                  </button>
                </div>

                {/* Row 2: System Shortcuts (4 Interactive Buttons) */}
                <div className="grid grid-cols-4 gap-1.5">
                  <button
                    type="button"
                    onClick={() => sendQuickCommand('combo win d', 'Desktop')}
                    className="ios-pressable flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl bg-black/4 dark:bg-white/5 hover:bg-black/8 dark:hover:bg-white/10 border border-black/6 dark:border-white/8 text-zinc-700 dark:text-zinc-300 text-[11px] font-medium transition cursor-pointer active:scale-95"
                  >
                    <AppWindow className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                    <span className="truncate">Desktop</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => sendQuickCommand('combo win shift s', 'Snipping')}
                    className="ios-pressable flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl bg-black/4 dark:bg-white/5 hover:bg-black/8 dark:hover:bg-white/10 border border-black/6 dark:border-white/8 text-zinc-700 dark:text-zinc-300 text-[11px] font-medium transition cursor-pointer active:scale-95"
                  >
                    <Scissors className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span className="truncate">Screenshot</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => sendQuickCommand('combo ctrl shift escape', 'TaskMgr')}
                    className="ios-pressable flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl bg-black/4 dark:bg-white/5 hover:bg-black/8 dark:hover:bg-white/10 border border-black/6 dark:border-white/8 text-zinc-700 dark:text-zinc-300 text-[11px] font-medium transition cursor-pointer active:scale-95"
                  >
                    <Activity className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <span className="truncate">TaskMgr</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => sendQuickCommand('lock', 'Kunci PC')}
                    className="ios-pressable flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl bg-red-500/8 hover:bg-red-500/15 border border-red-500/20 text-red-600 dark:text-red-400 text-[11px] font-semibold transition cursor-pointer active:scale-95"
                  >
                    <Lock className="w-3.5 h-3.5 text-red-500 shrink-0" />
                    <span className="truncate">Kunci PC</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: BERKAS & FILE */}
          {workspaceTab === 'transfer' && (
            <div key="tab-transfer" className={`flex flex-col gap-3 ${slideDirection === 'from-right' ? 'animate-in slide-in-from-right-8 duration-200 fade-in' : 'animate-in slide-in-from-left-8 duration-200 fade-in'}`}>
              <div className="apple-card p-3.5 sm:p-4 shadow-sm flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                    <Upload className="w-4 h-4 text-blue-500" />
                    <span>Transfer P2P & Manajemen Berkas</span>
                  </h3>
                  <span className="text-[10px] font-mono text-zinc-400">Tanpa Kompresi</span>
                </div>

                {/* Interactive Drop & Tap Zone */}
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="ios-pressable p-4 rounded-2xl border-2 border-dashed border-blue-500/30 hover:border-blue-500/60 bg-blue-500/5 hover:bg-blue-500/10 flex items-center justify-between gap-3 cursor-pointer transition group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2.5 rounded-xl bg-[#0071e3] text-white shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                      <Upload className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-white truncate">
                        Ketuk untuk Kirim File ke {peer.name}
                      </h4>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
                        Foto, video, APK, atau dokumen ukuran bebas via jalur lokal
                      </p>
                    </div>
                  </div>
                  <span className="px-3 py-1.5 rounded-xl bg-[#0071e3] text-white text-xs font-semibold shrink-0">
                    Pilih File
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => folderInputRef.current?.click()}
                    className="ios-pressable flex flex-col items-center justify-center gap-1.5 p-3 rounded-2xl bg-black/3 dark:bg-white/5 hover:bg-black/6 dark:hover:bg-white/8 border border-black/8 dark:border-white/10 transition cursor-pointer active:scale-95"
                  >
                    <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                      <FolderUp className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-semibold text-zinc-900 dark:text-white truncate">Kirim Folder</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic([30]);
                      onOpenFileExplorer?.(peer);
                    }}
                    className="ios-pressable flex flex-col items-center justify-center gap-1.5 p-3 rounded-2xl bg-black/3 dark:bg-white/5 hover:bg-black/6 dark:hover:bg-white/8 border border-black/8 dark:border-white/10 transition cursor-pointer active:scale-95"
                  >
                    <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                      <Folder className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-semibold text-zinc-900 dark:text-white truncate">Explorer PC</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic([30]);
                      onOpenTextSync?.(peer);
                    }}
                    className="ios-pressable flex flex-col items-center justify-center gap-1.5 p-3 rounded-2xl bg-black/3 dark:bg-white/5 hover:bg-black/6 dark:hover:bg-white/8 border border-black/8 dark:border-white/10 transition cursor-pointer active:scale-95"
                  >
                    <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                      <ClipboardList className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-semibold text-zinc-900 dark:text-white truncate">Clipboard</span>
                  </button>
                </div>
              </div>

              {renderTransferHistory()}
            </div>
          )}

          {/* TAB 3: APLIKASI & SISTEM */}
          {workspaceTab === 'apps' && (
            <div key="tab-apps" className={`flex flex-col gap-3 ${slideDirection === 'from-right' ? 'animate-in slide-in-from-right-8 duration-200 fade-in' : 'animate-in slide-in-from-left-8 duration-200 fade-in'}`}>
              <div className="apple-card p-3.5 sm:p-4 shadow-sm flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-blue-500/10 text-[#0071e3] dark:text-blue-400 border border-blue-500/20">
                      <AppWindow className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-1.5">
                        <span>Shortcut Aplikasi PC</span>
                      </h4>
                      <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
                        Luncurkan software di {peer.name}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      triggerHaptic([30]);
                      onOpenPcAppLauncher?.(peer, 'launch');
                    }}
                    className="text-xs font-semibold text-[#0071e3] dark:text-blue-400 hover:underline cursor-pointer"
                  >
                    Semua ({'>'})
                  </button>
                </div>

                <div
                  onClick={() => {
                    triggerHaptic([30]);
                    onOpenPcAppLauncher?.(peer, 'launch');
                  }}
                  className="ios-pressable flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-black/4 dark:bg-white/6 hover:bg-black/6 dark:hover:bg-white/10 border border-black/8 dark:border-white/10 text-zinc-400 cursor-pointer transition group"
                >
                  <Search className="w-4 h-4 text-[#0071e3] dark:text-blue-400 shrink-0" />
                  <span className="text-xs text-zinc-500 dark:text-zinc-400 flex-1 truncate">
                    Cari & buka aplikasi laptop (Chrome, Steam, VS Code)...
                  </span>
                  <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-lg bg-blue-500/15 text-[#0071e3] dark:text-blue-400 shrink-0">
                    Cari
                  </span>
                </div>

                {/* Ergonomic 3-column mobile / 5-column desktop grid */}
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                  {[
                    { name: 'Cari PC', cmd: 'win-search', icon: Search, color: 'text-violet-500 bg-violet-500/10' },
                    { name: 'Chrome', cmd: 'start chrome', icon: Globe, color: 'text-red-500 bg-red-500/10' },
                    { name: 'Explorer', cmd: 'explorer', icon: Folder, color: 'text-amber-500 bg-amber-500/10' },
                    { name: 'VS Code', cmd: 'code .', icon: Terminal, color: 'text-blue-500 bg-blue-500/10' },
                    { name: 'TaskMgr', cmd: 'taskmgr', icon: Activity, color: 'text-emerald-500 bg-emerald-500/10' },
                    { name: 'Spotify', cmd: 'start spotify:', icon: Music, color: 'text-green-500 bg-green-500/10' },
                    { name: 'Kalkulator', cmd: 'calc', icon: Calculator, color: 'text-sky-500 bg-sky-500/10' },
                    { name: 'Notepad', cmd: 'notepad', icon: FileText, color: 'text-indigo-500 bg-indigo-500/10' },
                    { name: 'WhatsApp', cmd: 'start whatsapp:', icon: MessageCircle, color: 'text-teal-500 bg-teal-500/10' },
                  ].map((app) => {
                    const Icon = app.icon;
                    return (
                      <button
                        key={app.name}
                        onClick={() => {
                          triggerHaptic([20]);
                          onLaunchPcApp?.(peer, app.cmd, app.name);
                        }}
                        className="ios-pressable flex items-center gap-2 p-2.5 rounded-xl bg-black/3 dark:bg-white/5 hover:bg-black/6 dark:hover:bg-white/8 border border-black/6 dark:border-white/8 transition cursor-pointer group active:scale-95 text-left"
                        title={`Buka ${app.name} di PC`}
                      >
                        <div className={`p-1.5 rounded-lg ${app.color} shrink-0 group-hover:scale-105 transition-transform`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <span className="text-[11px] font-semibold text-zinc-800 dark:text-zinc-200 truncate">
                          {app.name}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div className="pt-2.5 border-t border-black/6 dark:border-white/6 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Sliders className="w-3.5 h-3.5 text-blue-500" />
                      <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                        Mode Performa NitroSense
                      </span>
                    </div>
                    <button
                      onClick={() => handleNitroSenseMode('open-app', 'NitroSense App')}
                      className="text-[11px] font-medium text-[#0071e3] hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-1 cursor-pointer"
                      title="Buka NitroSense di PC"
                    >
                      <span>Buka App</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => handleNitroSenseMode('quiet', 'Quiet (Senyap)')}
                      disabled={isPowerModeSwitching}
                      className={`ios-pressable py-2 px-2 rounded-xl flex items-center justify-center gap-1.5 border transition cursor-pointer text-xs font-semibold ${
                        activePowerMode === 'quiet'
                          ? 'bg-emerald-500/15 border-emerald-500/35 text-emerald-600 dark:text-emerald-400 shadow-xs ring-1 ring-emerald-500/25'
                          : 'bg-black/3 dark:bg-white/4 border-black/6 dark:border-white/8 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                      }`}
                    >
                      <Wind className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <span>Quiet</span>
                    </button>

                    <button
                      onClick={() => handleNitroSenseMode('balanced', 'Balanced (Seimbang)')}
                      disabled={isPowerModeSwitching}
                      className={`ios-pressable py-2 px-2 rounded-xl flex items-center justify-center gap-1.5 border transition cursor-pointer text-xs font-semibold ${
                        activePowerMode === 'balanced'
                          ? 'bg-blue-500/15 border-blue-500/35 text-blue-600 dark:text-blue-400 shadow-xs ring-1 ring-blue-500/25'
                          : 'bg-black/3 dark:bg-white/4 border-black/6 dark:border-white/8 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                      }`}
                    >
                      <Activity className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                      <span>Balanced</span>
                    </button>

                    <button
                      onClick={() => handleNitroSenseMode('performance', 'Performance (Turbo)')}
                      disabled={isPowerModeSwitching}
                      className={`ios-pressable py-2 px-2 rounded-xl flex items-center justify-center gap-1.5 border transition cursor-pointer text-xs font-semibold ${
                        activePowerMode === 'performance'
                          ? 'bg-gradient-to-r from-amber-500/15 to-red-500/15 border-red-500/35 text-red-600 dark:text-red-400 shadow-xs ring-1 ring-red-500/25'
                          : 'bg-black/3 dark:bg-white/4 border-black/6 dark:border-white/8 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                      }`}
                    >
                      <Flame className="w-3.5 h-3.5 text-red-500 shrink-0" />
                      <span>Turbo</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Interactive Live Hardware Telemetry Card + 1-Tap RAM Boost */}
              <div
                onClick={() => {
                  triggerHaptic([30]);
                  setIsHardwareHudOpen(true);
                }}
                className="apple-card p-3.5 sm:p-4 shadow-sm flex flex-col gap-3 cursor-pointer hover:bg-black/3 dark:hover:bg-white/5 transition group"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20 shrink-0">
                      <Gauge className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-1.5">
                        <span>Telemetri Hardware & RAM PC</span>
                        <ArrowRight className="w-3.5 h-3.5 text-zinc-400 group-hover:translate-x-0.5 transition-transform" />
                      </h4>
                      <p className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate">
                        Ketuk untuk grafik 12-Thread & kontrol kipas penuh
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleQuickCleanRam}
                    disabled={isCleaningQuickRam}
                    className="px-3 py-1.5 rounded-xl bg-emerald-500/12 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25 text-[11px] font-bold transition cursor-pointer shrink-0 active:scale-95 disabled:opacity-50"
                  >
                    {isCleaningQuickRam ? 'Membersihkan...' : 'Boost RAM'}
                  </button>
                </div>

                {/* Live Mini Progress Bars */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="p-2.5 rounded-xl bg-black/3 dark:bg-white/4 border border-black/6 dark:border-white/8">
                    <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500 dark:text-zinc-400 mb-1">
                      <span>CPU</span>
                      <span className="font-bold text-zinc-900 dark:text-white">
                        {liveStats ? `${liveStats.cpu?.usage ?? liveStats.cpu?.load ?? 0}% • ${liveStats.cpu?.temp || 50}°C` : '--%'}
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-black/10 dark:bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full transition-all duration-300"
                        style={{ width: `${Math.min(100, liveStats?.cpu?.usage ?? liveStats?.cpu?.load ?? 18)}%` }}
                      />
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-black/3 dark:bg-white/4 border border-black/6 dark:border-white/8">
                    <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500 dark:text-zinc-400 mb-1">
                      <span>GPU</span>
                      <span className="font-bold text-zinc-900 dark:text-white">
                        {liveStats ? `${liveStats.gpu?.usage ?? liveStats.gpu?.load ?? 0}% • ${liveStats.gpu?.temp || 46}°C` : '--%'}
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-black/10 dark:bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-indigo-500 rounded-full transition-all duration-300"
                        style={{ width: `${Math.min(100, liveStats?.gpu?.usage ?? liveStats?.gpu?.load ?? 12)}%` }}
                      />
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-black/3 dark:bg-white/4 border border-black/6 dark:border-white/8">
                    <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500 dark:text-zinc-400 mb-1">
                      <span>RAM</span>
                      <span className="font-bold text-zinc-900 dark:text-white">
                        {liveStats ? `${liveStats.ram?.percentage ?? liveStats.ram?.percent ?? 0}%` : '--%'}
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-black/10 dark:bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                        style={{ width: `${Math.min(100, liveStats?.ram?.percentage ?? liveStats?.ram?.percent ?? 45)}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: SENSOR & FITUR */}
          {workspaceTab === 'features' && (
            <div key="tab-features" className={`flex flex-col gap-3 ${slideDirection === 'from-right' ? 'animate-in slide-in-from-right-8 duration-200 fade-in' : 'animate-in slide-in-from-left-8 duration-200 fade-in'}`}>
              <div className="apple-card p-3.5 sm:p-4 shadow-sm flex flex-col gap-3">
                <h3 className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-blue-500" />
                  <span>Sensor HP & Fitur Perangkat</span>
                </h3>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <button
                    onClick={() => {
                      triggerHaptic([30]);
                      onStartScreenShare?.(peer.id, 'camera');
                    }}
                    className="ios-pressable flex items-center gap-2.5 p-3 rounded-2xl bg-black/3 dark:bg-white/5 hover:bg-black/6 dark:hover:bg-white/8 border border-black/8 dark:border-white/10 text-left transition cursor-pointer group"
                  >
                    <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0 border border-emerald-500/20">
                      <Camera className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-semibold text-zinc-900 dark:text-white truncate">Webcam HP</h4>
                      <p className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate mt-0.5">Kamera 60FPS ke PC</p>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      triggerHaptic([30]);
                      onStartScreenShare?.(peer.id, 'mic');
                    }}
                    className="ios-pressable flex items-center gap-2.5 p-3 rounded-2xl bg-black/3 dark:bg-white/5 hover:bg-black/6 dark:hover:bg-white/8 border border-black/8 dark:border-white/10 text-left transition cursor-pointer group"
                  >
                    <div className="p-2 rounded-xl bg-blue-500/10 text-[#0071e3] dark:text-blue-400 shrink-0 border border-blue-500/20">
                      <Mic className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-semibold text-zinc-900 dark:text-white truncate">Mikrofon HP</h4>
                      <p className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate mt-0.5">Audio Mic ke PC</p>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      triggerHaptic([30]);
                      onOpenTextSync?.(peer);
                    }}
                    className="ios-pressable flex items-center gap-2.5 p-3 rounded-2xl bg-black/3 dark:bg-white/5 hover:bg-black/6 dark:hover:bg-white/8 border border-black/8 dark:border-white/10 text-left transition cursor-pointer group"
                  >
                    <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 shrink-0 border border-indigo-500/20">
                      <MessageSquare className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-semibold text-zinc-900 dark:text-white truncate">Clipboard</h4>
                      <p className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate mt-0.5">Teks & Screenshot</p>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      triggerHaptic([30]);
                      onOpenWakeOnLan?.(peer);
                    }}
                    className="ios-pressable flex items-center gap-2.5 p-3 rounded-2xl bg-black/3 dark:bg-white/5 hover:bg-black/6 dark:hover:bg-white/8 border border-black/8 dark:border-white/10 text-left transition cursor-pointer group"
                  >
                    <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0 border border-amber-500/20">
                      <Zap className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-semibold text-zinc-900 dark:text-white truncate">Wake-on-LAN</h4>
                      <p className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate mt-0.5">Bangunkan PC LAN</p>
                    </div>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <button
                  onClick={() => {
                    triggerHaptic([30]);
                    setIsWearOsModalOpen(true);
                  }}
                  className="ios-pressable flex items-center gap-3 p-3.5 rounded-2xl bg-black/3 dark:bg-white/5 hover:bg-black/6 dark:hover:bg-white/8 border border-black/8 dark:border-white/10 text-left transition cursor-pointer shadow-sm group"
                >
                  <div className="p-2.5 rounded-xl bg-blue-500/10 text-[#0071e3] dark:text-blue-400 shrink-0 border border-blue-500/20">
                    <Watch className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1.5">
                      <h4 className="text-xs sm:text-sm font-semibold text-zinc-900 dark:text-white truncate">
                        Remote Smartwatch (Wear OS)
                      </h4>
                      <ArrowRight className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                    </div>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
                      Kontrol media, slide & kunci PC dari jam tangan
                    </p>
                  </div>
                </button>

                <button
                  onClick={() => {
                    triggerHaptic([30]);
                    setIsNotifCenterOpen(true);
                  }}
                  className="ios-pressable flex items-center gap-3 p-3.5 rounded-2xl bg-black/3 dark:bg-white/5 hover:bg-black/6 dark:hover:bg-white/8 border border-black/8 dark:border-white/10 text-left transition cursor-pointer shadow-sm group"
                >
                  <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 shrink-0 border border-blue-500/20">
                    <Bell className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1.5">
                      <h4 className="text-xs sm:text-sm font-semibold text-zinc-900 dark:text-white truncate">
                        Pusat Notifikasi & Balas Cepat
                      </h4>
                      {notifications.length > 0 ? (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/30 shrink-0">
                          {notifications.length} Baru
                        </span>
                      ) : (
                        <ArrowRight className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                      )}
                    </div>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
                      Sinkronisasi notifikasi WhatsApp & pesan secara instan
                    </p>
                  </div>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Wear OS Smartwatch Remote Modal */}
      <WearOsRemoteModal
        isOpen={isWearOsModalOpen}
        onClose={() => setIsWearOsModalOpen(false)}
        serverIp={peer?.ip}
      />

      {/* PC Hardware Monitor (HUD) Modal */}
      <PcHardwareHudModal
        isOpen={isHardwareHudOpen}
        onClose={() => setIsHardwareHudOpen(false)}
        targetPeer={peer}
        socket={socket}
      />

      {/* Phone Notification Center Modal */}
      <NotificationCenterModal
        isOpen={isNotifCenterOpen}
        onClose={() => setIsNotifCenterOpen(false)}
        notifications={notifications}
        onReply={onSendQuickReply}
        onClear={onClearNotifications}
      />
    </div>
  );
}
export default DeviceWorkspace;
