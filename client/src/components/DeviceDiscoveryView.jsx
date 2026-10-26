import React, { useRef, useState } from 'react';
import {
  Laptop,
  Smartphone,
  Tablet,
  Wifi,
  Activity,
  Battery,
  BatteryCharging,
  BatteryWarning,
  ArrowRight,
  RefreshCw,
  QrCode,
  Link,
  ChevronRight,
  Clock,
  Trash2,
  FolderOpen,
  ArrowDownLeft,
  ArrowUpRight,
  Sparkles,
  ShieldCheck,
  Monitor
} from 'lucide-react';
import { triggerHaptic } from '../utils/feedback';
import { formatBytes } from '../utils/deviceInfo';
import logoImg from '../assets/logo.png';

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
  onOpenFolder
}) {
  const [isScanning, setIsScanning] = useState(false);
  const [showHistory, setShowHistory] = useState(true);

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

  const handleRefreshScan = () => {
    triggerHaptic([30]);
    setIsScanning(true);
    setTimeout(() => setIsScanning(false), 1200);
  };

  const resolvedLocalIp = localIp || selfIp || (typeof window !== 'undefined' ? window.location.hostname : '127.0.0.1');

  return (
    <div className="w-full max-w-4xl mx-auto px-3 sm:px-6 py-4 flex flex-col gap-6 animate-view-enter smooth-gpu">
      {/* 1. Header Card: "Perangkat Ini" (My Device - AnyDesk style) */}
      <div className="bg-zinc-900/90 border border-zinc-800 rounded-3xl p-4 sm:p-5 shadow-xl backdrop-blur-md relative overflow-hidden transition-all duration-300 hover:border-zinc-700/80">
        <div className="absolute top-0 right-0 w-64 h-32 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-zinc-800/90 border border-zinc-700/70 rounded-2xl shrink-0 shadow-inner group-hover:scale-105 transition-transform">
              {getDeviceIcon(selfInfo?.deviceType || 'laptop', 'w-7 h-7')}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase tracking-wider font-semibold text-zinc-400 font-mono">
                  Perangkat Ini (This Device)
                </span>
                <span className="inline-flex items-center gap-1.5 text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full font-mono font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse-glow" />
                  ONLINE LAN
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-bold text-white truncate flex items-center gap-2">
                {selfInfo?.deviceName || 'ENCross Hub'}
                <button
                  onClick={onOpenRename}
                  className="text-xs text-zinc-400 hover:text-emerald-400 font-normal underline cursor-pointer"
                  title="Ganti nama perangkat"
                >
                  Ubah
                </button>
              </h2>
              <div className="flex items-center gap-2 text-xs text-zinc-400 font-mono mt-0.5">
                <span className="text-zinc-300 font-medium">{resolvedLocalIp}</span>
                <span>•</span>
                <span>{selfInfo?.os || 'System'}</span>
              </div>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
            <button
              onClick={onOpenConnect}
              className="flex items-center gap-1.5 bg-zinc-800 hover:bg-zinc-700 active:scale-95 text-zinc-200 border border-zinc-700 px-3 py-2 rounded-xl text-xs font-semibold transition cursor-pointer shadow-sm"
              title="Hubungkan manual via IP address"
            >
              <Link className="w-3.5 h-3.5 text-cyan-400" />
              <span>Input IP</span>
            </button>

            <button
              onClick={onOpenQR}
              className="flex items-center gap-1.5 bg-zinc-800 hover:bg-zinc-700 active:scale-95 text-zinc-200 border border-zinc-700 px-3 py-2 rounded-xl text-xs font-semibold transition cursor-pointer shadow-sm"
              title="Tampilkan QR code untuk scan dari HP"
            >
              <QrCode className="w-3.5 h-3.5 text-purple-400" />
              <span>QR Code</span>
            </button>

            <button
              onClick={handleRefreshScan}
              className="p-2 bg-zinc-800 hover:bg-zinc-700 active:scale-95 text-zinc-300 border border-zinc-700 rounded-xl transition cursor-pointer shadow-sm"
              title="Pindai ulang jaringan lokal"
            >
              <RefreshCw className={`w-4 h-4 ${isScanning ? 'animate-spin text-emerald-400' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* 2. Main Section: Discovered / Connected Devices (AnyDesk / RustDesk list) */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-zinc-200 tracking-wide uppercase">
              Perangkat Terhubung ({peers.length})
            </h3>
            <span className="text-[11px] text-zinc-500 font-medium hidden sm:inline">
              Klik salah satu perangkat untuk membuka fitur & kontrol penuh
            </span>
          </div>

          <span className="text-[11px] text-emerald-400/80 font-mono flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Auto-Discovery Aktif
          </span>
        </div>

        {/* Device List or Empty Discovery Radar */}
        {peers.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {peers.map((peer) => {
              const isPeerMobile = peer.deviceType?.toLowerCase() === 'mobile' || peer.deviceType?.toLowerCase() === 'smartphone';
              return (
                <div
                  key={peer.id}
                  onClick={() => {
                    triggerHaptic([35]);
                    onSelectDevice(peer);
                  }}
                  className="group bg-zinc-900/90 hover:bg-zinc-850 border border-zinc-800/90 hover:border-emerald-500/60 rounded-2xl p-4 transition-all duration-200 ease-out cursor-pointer shadow-lg hover:shadow-emerald-950/20 hover:-translate-y-0.5 active:scale-[0.985] flex flex-col justify-between relative overflow-hidden smooth-gpu"
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/0 group-hover:bg-emerald-500/5 rounded-full blur-2xl transition-all" />

                  <div>
                    {/* Top row: Icon, Type & Online Status */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="p-2.5 bg-zinc-800/90 group-hover:bg-zinc-800 border border-zinc-700/60 rounded-xl transition-colors">
                        {getDeviceIcon(peer.deviceType, 'w-6 h-6')}
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        <span className="font-mono text-[11px] text-emerald-400 font-medium">
                          {pingMs ? `${pingMs} ms` : 'LAN Siap'}
                        </span>
                      </div>
                    </div>

                    {/* Device Name & Details */}
                    <h4 className="text-base font-bold text-white group-hover:text-emerald-300 transition-colors truncate mb-1">
                      {peer.name}
                    </h4>

                    <div className="flex items-center gap-2 text-xs text-zinc-400 font-mono mb-4 flex-wrap">
                      <span className="bg-zinc-800 px-2 py-0.5 rounded text-zinc-300">{peer.os || 'OS'}</span>
                      <span>•</span>
                      <span className="text-zinc-400">{peer.ip || 'Wi-Fi LAN'}</span>
                      {peer.battery && typeof peer.battery.level === 'number' && peer.battery.level >= 0 && (
                        <>
                          <span>•</span>
                          <span className="inline-flex items-center gap-1 bg-zinc-800/90 px-1.5 py-0.5 rounded text-zinc-300">
                            {peer.battery.isCharging ? (
                              <BatteryCharging className="w-3.5 h-3.5 text-emerald-400" />
                            ) : peer.battery.level <= 20 ? (
                              <BatteryWarning className="w-3.5 h-3.5 text-amber-400" />
                            ) : (
                              <Battery className="w-3.5 h-3.5 text-zinc-300" />
                            )}
                            <span>{peer.battery.level}%</span>
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Bottom Connect Button (AnyDesk style) */}
                  <div className="pt-3 border-t border-zinc-800/80 flex items-center justify-between text-xs">
                    <span className="text-zinc-500 font-medium group-hover:text-zinc-400 transition-colors">
                      {isPeerMobile ? 'Mirroring, File, Kamera & Mic' : 'Remote Touchpad, File & Kontrol'}
                    </span>
                    <div className="flex items-center gap-1.5 bg-emerald-500/15 group-hover:bg-emerald-500 text-emerald-400 group-hover:text-zinc-950 px-3 py-1.5 rounded-xl font-bold transition-all shadow-sm">
                      <span>Buka Kontrol</span>
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Empty State: Sleek Radar Pulse Discovery */
          <div className="bg-zinc-900/60 border border-dashed border-zinc-800 rounded-3xl p-8 sm:p-12 text-center flex flex-col items-center justify-center relative overflow-hidden">
            {/* Radar Animation */}
            <div className="relative w-32 h-32 flex items-center justify-center mb-6">
              <div className="absolute inset-0 rounded-full border border-emerald-500/20 animate-ping" />
              <div className="absolute inset-4 rounded-full border border-emerald-500/30 animate-pulse" />
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/40 flex items-center justify-center shadow-lg shadow-emerald-950/40">
                <Wifi className="w-8 h-8 text-emerald-400 animate-pulse" />
              </div>
            </div>

            <h4 className="text-base sm:text-lg font-bold text-white mb-2">
              Mencari Perangkat di Jaringan Wi-Fi...
            </h4>
            <p className="text-xs sm:text-sm text-zinc-400 max-w-md mx-auto mb-6 leading-relaxed">
              Buka aplikasi ENCross di ponsel atau laptop lain yang terhubung ke jaringan Wi-Fi yang sama atau kabel USB. Perangkat akan otomatis muncul di sini.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                onClick={onOpenConnect}
                className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 px-4 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer shadow-sm active:scale-95"
              >
                <Link className="w-4 h-4 text-cyan-400" />
                <span>Hubungkan Manual via IP</span>
              </button>

              <button
                onClick={onOpenQR}
                className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 px-4 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer shadow-sm active:scale-95"
              >
                <QrCode className="w-4 h-4 text-purple-400" />
                <span>Pindai QR Code Ponsel</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 3. Collapsible Session Transfer History */}
      {transferHistory.length > 0 && (
        <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-3.5 backdrop-blur-sm animate-view-enter">
          <div className="flex items-center justify-between mb-2.5">
            <button
              onClick={() => {
                triggerHaptic([15]);
                setShowHistory(!showHistory);
              }}
              className="flex items-center gap-2 text-xs font-bold text-zinc-300 hover:text-white transition cursor-pointer"
            >
              <Clock className="w-4 h-4 text-cyan-400" />
              <span>Riwayat Pengiriman Sesi Ini ({transferHistory.length})</span>
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
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
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
      )}
    </div>
  );
}
export default DeviceDiscoveryView;
