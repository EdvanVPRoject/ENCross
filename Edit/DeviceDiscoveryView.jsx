import React, { useState, useRef } from 'react';
import {
  Laptop,
  Smartphone,
  Tablet,
  Wifi,
  Battery,
  BatteryCharging,
  BatteryWarning,
  ArrowRight,
  RefreshCw,
  Clock,
  Trash2,
  FolderOpen,
  ArrowDownLeft,
  ArrowUpRight,
  MousePointer,
  Upload,
  MessageSquare,
  Folder,
  MonitorPlay,
  Keyboard,
  Tv,
  ShieldCheck,
  Shield,
  QrCode,
  Activity,
  Sliders
} from 'lucide-react';
import { triggerHaptic } from '../utils/feedback';
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

export function DeviceDiscoveryView({
  peers = [],
  selfInfo,
  localIp,
  selfIp,
  pingMs,
  onSelectDevice,
  onOpenQR,
  onOpenConnect,
  onOpenRename,
  transferHistory = [],
  onClearTransferHistory,
  onOpenFolder,
  onRefreshScan,
  onOpenTouchpad,
  onOpenRemoteKeyboard,
  onOpenSecondDisplay,
  onSendFile,
  onOpenTextSync,
  onOpenFileExplorer,
  onStartMirroring,
  pairedDevices = [],
  activePeerConnection,
  onPairDevice,
  onUnpairDevice
}) {
  const fileInputRef = useRef(null);
  const activeTargetPeerIdRef = useRef(null);
  const [isScanning, setIsScanning] = useState(false);
  const [showHistory, setShowHistory] = useState(true);
  const [isDragOverHub, setIsDragOverHub] = useState(false);

  const getDeviceIcon = (deviceType, className = 'w-6 h-6') => {
    switch (deviceType?.toLowerCase()) {
      case 'mobile':
      case 'smartphone':
        return <Smartphone className={`${className} text-blue-500`} />;
      case 'tablet':
        return <Tablet className={`${className} text-indigo-500`} />;
      case 'desktop':
      case 'laptop':
      default:
        return <Laptop className={`${className} text-blue-500 dark:text-blue-400`} />;
    }
  };

  const handleRefreshScan = () => {
    triggerHaptic([30]);
    setIsScanning(true);
    if (onRefreshScan) onRefreshScan();
    setTimeout(() => setIsScanning(false), 750);
  };

  const isSelfMobile =
    selfInfo?.deviceType === 'mobile' ||
    selfInfo?.deviceType === 'smartphone' ||
    (typeof navigator !== 'undefined' && /Android|iPhone|iPad/i.test(navigator.userAgent));

  const resolvedLocalIp = isSelfMobile
    ? (selfIp && selfIp !== '127.0.0.1' ? selfIp : (localIp || '127.0.0.1'))
    : (localIp || selfIp || (typeof window !== 'undefined' ? window.location.hostname : '127.0.0.1'));

  const primaryPeer = peers[0] || null;

  return (
    <div className="w-full max-w-4xl mx-auto px-3 sm:px-6 py-3.5 sm:py-5 flex flex-col gap-4 animate-view-enter smooth-gpu">
      {/* 1. Header Card: "Perangkat Ini" */}
      <div className="apple-card px-4 py-3 sm:px-5 sm:py-3.5 shadow-sm relative overflow-hidden transition-all duration-200">
        <div className="flex items-center justify-between gap-3 relative z-10">
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative shrink-0">
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-blue-500/10 dark:bg-blue-500/12 border border-blue-500/20 flex items-center justify-center text-blue-500 dark:text-blue-400 shadow-xs">
                {getDeviceIcon(selfInfo?.deviceType || 'laptop', 'w-5 h-5 sm:w-6 sm:h-6')}
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 border-2 border-white dark:border-zinc-900 rounded-full" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] uppercase tracking-wider font-semibold text-zinc-500 dark:text-zinc-400 font-sans">
                  Perangkat Ini
                </span>
                <span className="inline-flex items-center gap-1 text-[9px] text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.2 rounded-full font-medium">
                  <span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                  Aktif
                </span>
              </div>
              <h2 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-white truncate flex items-center gap-1.5">
                <span>{selfInfo?.name || selfInfo?.deviceName || 'ENCross Hub'}</span>
                <button
                  type="button"
                  onClick={onOpenRename}
                  className="text-[11px] text-blue-500 hover:text-blue-600 dark:text-blue-400 font-medium hover:underline cursor-pointer px-1"
                  title="Ganti nama perangkat"
                >
                  Ubah
                </button>
              </h2>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-mono truncate mt-0.5">
                {resolvedLocalIp} • {selfInfo?.os || 'System'}
              </p>
            </div>
          </div>

          {/* Right Actions: IP Host & Pindai Ulang */}
          <div className="flex items-center gap-1.5 shrink-0">
            {onOpenConnect && (
              <button
                type="button"
                onClick={() => {
                  triggerHaptic([20]);
                  onOpenConnect();
                }}
                className="flex items-center gap-1.5 bg-black/5 hover:bg-black/10 dark:bg-white/6 dark:hover:bg-white/12 active:scale-95 text-zinc-700 dark:text-zinc-300 border border-black/8 dark:border-white/10 px-2.5 py-1.5 rounded-full text-xs font-medium transition cursor-pointer shadow-xs"
                title="Atur IP Server / Host Manual"
              >
                <Sliders className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" />
                <span className="hidden sm:inline">IP Host</span>
              </button>
            )}
            <button
              type="button"
              onClick={handleRefreshScan}
              className="flex items-center gap-1.5 bg-black/5 hover:bg-black/10 dark:bg-white/8 dark:hover:bg-white/12 active:scale-95 text-zinc-700 dark:text-zinc-200 border border-black/8 dark:border-white/10 px-3 py-1.5 rounded-full text-xs font-medium transition cursor-pointer shadow-xs"
              title="Pindai ulang jaringan lokal untuk mendeteksi perangkat"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin text-blue-500' : 'text-zinc-500 dark:text-zinc-400'}`} />
              <span className="hidden xs:inline">Pindai</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Main Section: Discovered / Connected Devices */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 tracking-wider uppercase">
              Perangkat Terdeteksi ({peers.length})
            </h3>
          </div>

          <span className="text-[11px] text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            LAN Auto-Discovery
          </span>
        </div>

        {/* Hidden file input for quick direct transfer from discovery cards */}
        <input
          type="file"
          ref={fileInputRef}
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length > 0 && activeTargetPeerIdRef.current && onSendFile) {
              onSendFile(activeTargetPeerIdRef.current, Array.from(e.target.files));
            }
            e.target.value = '';
          }}
        />

        {/* Device List or Radar Empty State */}
        {peers.length > 0 ? (
          <div className="grid grid-cols-1 gap-3.5">
            {peers.map((peer, idx) => {
              const isPeerMobile =
                peer.deviceType?.toLowerCase() === 'mobile' ||
                peer.deviceType?.toLowerCase() === 'smartphone';
              const isPaired = pairedDevices.some(
                (p) => (p.deviceId && p.deviceId === peer.deviceId) || (p.id && p.id === peer.id)
              );
              const isConnectedActive =
                activePeerConnection?.peer &&
                ((activePeerConnection.peer.deviceId &&
                  activePeerConnection.peer.deviceId === peer.deviceId) ||
                  activePeerConnection.peer.id === peer.id);

              return (
                <div
                  key={peer.id}
                  onClick={() => {
                    triggerHaptic([35]);
                    if (isPaired) {
                      onSelectDevice(peer);
                    } else if (onPairDevice) {
                      onPairDevice(peer);
                    }
                  }}
                  style={{ animationDelay: `${idx * 60}ms` }}
                  className={`apple-card ios-card-enter p-4 sm:p-5 cursor-pointer flex flex-col justify-between relative group shadow-sm transition-all duration-200 ${
                    isConnectedActive
                      ? 'border-2 border-emerald-500/45'
                      : isPaired
                      ? 'hover:border-blue-500/40'
                      : 'hover:border-amber-500/40'
                  }`}
                >
                  {/* Top row: Icon, Device Info & Status Badges */}
                  <div className="flex items-start justify-between gap-3 mb-3.5">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="p-3 bg-blue-500/10 dark:bg-blue-500/12 border border-blue-500/20 rounded-2xl shrink-0 group-hover:scale-105 transition-transform">
                        {getDeviceIcon(peer.deviceType, 'w-6 h-6')}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-white group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors truncate">
                          {peer.name}
                        </h4>
                        <div className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400 font-sans mt-0.5 flex-wrap">
                          <span className="bg-black/5 dark:bg-white/8 px-2 py-0.5 rounded-md text-zinc-700 dark:text-zinc-300 font-mono text-[11px] font-medium">
                            {peer.os || 'OS'}
                          </span>
                          <span>•</span>
                          <span className="text-zinc-500 dark:text-zinc-400 text-[11px] font-mono">
                            {peer.ip || 'Wi-Fi LAN'}
                          </span>
                          {pingMs && (
                            <>
                              <span>•</span>
                              <span className="text-emerald-600 dark:text-emerald-400 text-[11px] font-mono font-semibold">
                                {pingMs} ms
                              </span>
                            </>
                          )}
                          {peer.battery && typeof peer.battery.level === 'number' && peer.battery.level >= 0 && (
                            <>
                              <span>•</span>
                              <span className="inline-flex items-center gap-1 bg-black/5 dark:bg-white/8 px-2 py-0.5 rounded-md text-zinc-700 dark:text-zinc-300 text-[11px] font-mono">
                                {peer.battery.isCharging ? (
                                  <BatteryCharging className="w-3 h-3 text-emerald-500" />
                                ) : peer.battery.level <= 20 ? (
                                  <BatteryWarning className="w-3 h-3 text-amber-500" />
                                ) : (
                                  <Battery className="w-3 h-3 text-zinc-500 dark:text-zinc-400" />
                                )}
                                <span>{peer.battery.level}%</span>
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {isPaired ? (
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/12 border border-emerald-500/25">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          <span className="font-mono text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                            TERHUBUNG
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                          <span className="font-mono text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                            BELUM PAIR
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Interactive 1-Tap Quick Action Strip (Only for Paired Devices) */}
                  {isPaired && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="grid grid-cols-4 gap-2 mb-3.5 pt-1"
                    >
                      {!isPeerMobile ? (
                        <button
                          type="button"
                          onClick={() => {
                            triggerHaptic([25]);
                            onOpenTouchpad?.(peer);
                          }}
                          className="ios-pressable flex flex-col sm:flex-row items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl bg-black/4 dark:bg-white/6 hover:bg-blue-500/12 dark:hover:bg-blue-500/15 border border-black/6 dark:border-white/8 hover:border-blue-500/30 text-zinc-800 dark:text-zinc-200 transition cursor-pointer active:scale-95"
                          title="Buka Touchpad & Mouse PC"
                        >
                          <MousePointer className="w-4 h-4 text-blue-500 shrink-0" />
                          <span className="text-[11px] font-semibold truncate">Touchpad</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            triggerHaptic([25]);
                            onStartMirroring?.(peer);
                          }}
                          className="ios-pressable flex flex-col sm:flex-row items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl bg-black/4 dark:bg-white/6 hover:bg-blue-500/12 dark:hover:bg-blue-500/15 border border-black/6 dark:border-white/8 hover:border-blue-500/30 text-zinc-800 dark:text-zinc-200 transition cursor-pointer active:scale-95"
                          title="Mirror Layar HP ke PC"
                        >
                          <MonitorPlay className="w-4 h-4 text-blue-500 shrink-0" />
                          <span className="text-[11px] font-semibold truncate">Mirror HP</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          triggerHaptic([25]);
                          activeTargetPeerIdRef.current = peer.id;
                          fileInputRef.current?.click();
                        }}
                        className="ios-pressable flex flex-col sm:flex-row items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl bg-black/4 dark:bg-white/6 hover:bg-emerald-500/12 dark:hover:bg-emerald-500/15 border border-black/6 dark:border-white/8 hover:border-emerald-500/30 text-zinc-800 dark:text-zinc-200 transition cursor-pointer active:scale-95"
                        title="Kirim Berkas Langsung"
                      >
                        <Upload className="w-4 h-4 text-emerald-500 shrink-0" />
                        <span className="text-[11px] font-semibold truncate">Kirim File</span>
                      </button>

                      {!isPeerMobile ? (
                        <button
                          type="button"
                          onClick={() => {
                            triggerHaptic([25]);
                            onOpenSecondDisplay?.(peer);
                          }}
                          className="ios-pressable flex flex-col sm:flex-row items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl bg-black/4 dark:bg-white/6 hover:bg-sky-500/12 dark:hover:bg-sky-500/15 border border-black/6 dark:border-white/8 hover:border-sky-500/30 text-zinc-800 dark:text-zinc-200 transition cursor-pointer active:scale-95"
                          title="Mirror Layar PC ke HP"
                        >
                          <Tv className="w-4 h-4 text-sky-500 shrink-0" />
                          <span className="text-[11px] font-semibold truncate">Layar PC</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            triggerHaptic([25]);
                            onOpenFileExplorer?.(peer);
                          }}
                          className="ios-pressable flex flex-col sm:flex-row items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl bg-black/4 dark:bg-white/6 hover:bg-amber-500/12 dark:hover:bg-amber-500/15 border border-black/6 dark:border-white/8 hover:border-amber-500/30 text-zinc-800 dark:text-zinc-200 transition cursor-pointer active:scale-95"
                          title="Jelajah Berkas Perangkat"
                        >
                          <Folder className="w-4 h-4 text-amber-500 shrink-0" />
                          <span className="text-[11px] font-semibold truncate">Explorer</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          triggerHaptic([25]);
                          onOpenTextSync?.(peer);
                        }}
                        className="ios-pressable flex flex-col sm:flex-row items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl bg-black/4 dark:bg-white/6 hover:bg-indigo-500/12 dark:hover:bg-indigo-500/15 border border-black/6 dark:border-white/8 hover:border-indigo-500/30 text-zinc-800 dark:text-zinc-200 transition cursor-pointer active:scale-95"
                        title="Sinkronisasi Clipboard & Teks"
                      >
                        <MessageSquare className="w-4 h-4 text-indigo-500 shrink-0" />
                        <span className="text-[11px] font-semibold truncate">Clipboard</span>
                      </button>
                    </div>
                  )}

                  {/* Bottom Connect / Pair Bar */}
                  <div className="pt-3 border-t border-black/8 dark:border-white/10 flex items-center justify-between text-xs">
                    {isPaired ? (
                      <>
                        <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400 font-medium text-[11px]">
                          <ShieldCheck className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                          <span>Sinkronisasi P2P Siap</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              triggerHaptic([20]);
                              if (onUnpairDevice) onUnpairDevice(peer);
                            }}
                            className="text-zinc-400 hover:text-red-500 underline text-[10px] cursor-pointer ml-1"
                            title="Hapus status pairing perangkat ini"
                          >
                            Lepas
                          </button>
                        </div>
                        <div className="flex items-center gap-1.5 bg-[#0071e3] hover:bg-[#0077ed] text-white px-4 py-1.5 rounded-full font-semibold transition-all shadow-xs group-hover:shadow-sm">
                          <span>Buka Workspace</span>
                          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform duration-200" />
                        </div>
                      </>
                    ) : (
                      <>
                        <span className="text-amber-600 dark:text-amber-400 font-medium text-[11px] flex items-center gap-1">
                          <Shield className="w-3.5 h-3.5 text-amber-500" />
                          <span>Konfirmasi akses pertama kali</span>
                        </span>
                        <div className="flex items-center gap-1.5 bg-[#0071e3] hover:bg-[#0077ed] text-white px-4 py-1.5 rounded-full font-semibold transition-all shadow-xs">
                          <ShieldCheck className="w-3.5 h-3.5 stroke-[2.2]" />
                          <span>Pasangkan</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Empty State: Radar Scanner Beacon */
          <div className="apple-card border border-dashed border-black/10 dark:border-white/10 p-8 sm:p-10 text-center flex flex-col items-center justify-center relative overflow-hidden">
            <div className="relative w-18 h-18 flex items-center justify-center mb-3.5">
              <div className="absolute inset-0 rounded-full border border-blue-500/25 airdrop-beacon" />
              <div className="absolute inset-0 rounded-full border border-blue-500/20 airdrop-beacon" style={{ animationDelay: '1s' }} />
              <div className="w-13 h-13 rounded-full bg-blue-500/10 border border-blue-500/25 flex items-center justify-center relative z-10 shadow-xs">
                <Wifi className="w-6 h-6 text-blue-500 animate-pulse" />
              </div>
            </div>

            <h4 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-white mb-1">
              Memindai Perangkat di Jaringan LAN...
            </h4>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm mx-auto leading-relaxed">
              Pastikan laptop dan ponsel berada di jaringan Wi-Fi atau Hotspot yang sama.
            </p>

            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
              {onOpenConnect && (
                <button
                  type="button"
                  onClick={onOpenConnect}
                  className="ios-pressable flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#0071e3] text-white text-xs font-semibold shadow-xs cursor-pointer"
                >
                  <Sliders className="w-3.5 h-3.5" />
                  <span>Masukkan IP Manual</span>
                </button>
              )}
              {onOpenQR && (
                <button
                  type="button"
                  onClick={onOpenQR}
                  className="ios-pressable flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-black/5 dark:bg-white/8 text-zinc-700 dark:text-zinc-200 border border-black/8 dark:border-white/10 text-xs font-semibold cursor-pointer"
                >
                  <QrCode className="w-3.5 h-3.5 text-blue-500" />
                  <span>Kode QR</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 3. Interactive Quick Transfer & LAN Telemetry Bento Grid (Eliminates empty dead space when connected) */}
      {primaryPeer && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {/* Card A: Instant Dropzone & File/Clipboard Dispatch */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragOverHub(true);
            }}
            onDragLeave={() => setIsDragOverHub(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragOverHub(false);
              if (e.dataTransfer.files?.length > 0 && onSendFile) {
                triggerHaptic([35]);
                onSendFile(primaryPeer.id, Array.from(e.dataTransfer.files));
              }
            }}
            className={`apple-card p-4 flex flex-col justify-between gap-3 transition-all ${
              isDragOverHub ? 'border-2 border-blue-500 bg-blue-500/5' : ''
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                  <Upload className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-zinc-900 dark:text-white">
                    Kirim Instan ke {primaryPeer.name}
                  </h4>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    Transfer berkas & teks P2P tanpa kompresi
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  triggerHaptic([25]);
                  activeTargetPeerIdRef.current = primaryPeer.id;
                  fileInputRef.current?.click();
                }}
                className="ios-pressable flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-[#0071e3] hover:bg-[#0077ed] text-white text-xs font-semibold transition cursor-pointer shadow-xs active:scale-95"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Pilih Berkas</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  triggerHaptic([25]);
                  onOpenTextSync?.(primaryPeer);
                }}
                className="ios-pressable flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-black/5 dark:bg-white/8 hover:bg-black/10 dark:hover:bg-white/12 text-zinc-800 dark:text-zinc-200 border border-black/8 dark:border-white/10 text-xs font-semibold transition cursor-pointer active:scale-95"
              >
                <MessageSquare className="w-3.5 h-3.5 text-blue-500" />
                <span>Kirim Teks</span>
              </button>
            </div>
          </div>

          {/* Card B: Live LAN Telemetry & Quick Keyboard/Explorer */}
          <div className="apple-card p-4 flex flex-col justify-between gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500 border border-blue-500/20">
                  <Activity className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-zinc-900 dark:text-white">
                    Status Jaringan & Kontrol
                  </h4>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-mono">
                    WebRTC P2P • {pingMs ? `${pingMs} ms` : 'Direct LAN'}
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-semibold">
                Stabil
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  triggerHaptic([25]);
                  onOpenFileExplorer?.(primaryPeer);
                }}
                className="ios-pressable flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-black/5 dark:bg-white/8 hover:bg-black/10 dark:hover:bg-white/12 text-zinc-800 dark:text-zinc-200 border border-black/8 dark:border-white/10 text-xs font-semibold transition cursor-pointer active:scale-95"
              >
                <Folder className="w-3.5 h-3.5 text-amber-500" />
                <span>Jelajah File</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  triggerHaptic([25]);
                  onOpenRemoteKeyboard?.(primaryPeer);
                }}
                className="ios-pressable flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-black/5 dark:bg-white/8 hover:bg-black/10 dark:hover:bg-white/12 text-zinc-800 dark:text-zinc-200 border border-black/8 dark:border-white/10 text-xs font-semibold transition cursor-pointer active:scale-95"
              >
                <Keyboard className="w-3.5 h-3.5 text-indigo-500" />
                <span>Keyboard PC</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Collapsible Session Transfer History */}
      {transferHistory.length > 0 && (
        <div className="apple-card p-3.5 sm:p-4 shadow-sm animate-view-enter">
          <div className="flex items-center justify-between mb-2.5">
            <button
              type="button"
              onClick={() => {
                triggerHaptic([15]);
                setShowHistory(!showHistory);
              }}
              className="flex items-center gap-2 text-xs font-bold text-zinc-800 dark:text-zinc-200 hover:text-blue-500 transition cursor-pointer"
            >
              <Clock className="w-4 h-4 text-blue-500" />
              <span>Riwayat Transfer ({transferHistory.length})</span>
              <span className="text-[10px] text-zinc-500 font-normal">
                [{showHistory ? 'Tutup' : 'Buka'}]
              </span>
            </button>

            <div className="flex items-center gap-1.5">
              {onOpenFolder && showHistory && (
                <button
                  type="button"
                  onClick={onOpenFolder}
                  className="text-[11px] text-zinc-600 dark:text-zinc-300 hover:text-blue-500 transition cursor-pointer flex items-center gap-1 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 px-2.5 py-1 rounded-full border border-black/8 dark:border-white/10"
                  title="Buka Folder Unduhan"
                >
                  <FolderOpen className="w-3.5 h-3.5 text-amber-500" />
                  <span className="hidden sm:inline">Folder</span>
                </button>
              )}
              {onClearTransferHistory && showHistory && (
                <button
                  type="button"
                  onClick={onClearTransferHistory}
                  className="text-[11px] text-zinc-500 hover:text-red-500 transition cursor-pointer flex items-center gap-1 bg-black/5 dark:bg-white/5 hover:bg-red-500/10 px-2.5 py-1 rounded-full border border-black/8 dark:border-white/10"
                  title="Hapus riwayat sesi"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Bersihkan</span>
                </button>
              )}
            </div>
          </div>

          {showHistory && (
            <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
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
                        <p className="truncate font-semibold text-zinc-900 dark:text-zinc-100 text-xs" title={name}>
                          {name}
                        </p>
                        <p className="text-[10px] text-zinc-500 flex items-center gap-1.5">
                          {sizeStr && <span>{sizeStr}</span>}
                          {sizeStr && <span>•</span>}
                          <span className={isUpload ? 'text-blue-500 font-medium' : 'text-emerald-500 font-medium'}>
                            {statusLabel}
                          </span>
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
      )}
    </div>
  );
}
export default DeviceDiscoveryView;
