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
  QrCode,
  Link,
  Clock,
  Trash2,
  FolderOpen,
  ArrowDownLeft,
  ArrowUpRight,
  MousePointer,
  Layers,
  Upload,
  MessageSquare,
  Folder,
  MonitorPlay
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
  onOpenMacroPad,
  onSendFile,
  onOpenTextSync,
  onOpenFileExplorer,
  onStartMirroring
}) {
  const fileInputRef = useRef(null);
  const activeTargetPeerIdRef = useRef(null);
  const [isScanning, setIsScanning] = useState(false);
  const [showHistory, setShowHistory] = useState(true);

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
        return <Laptop className={`${className} text-zinc-600 dark:text-zinc-300`} />;
    }
  };

  const handleRefreshScan = () => {
    triggerHaptic([30]);
    setIsScanning(true);
    if (onRefreshScan) onRefreshScan();
    setTimeout(() => setIsScanning(false), 800);
  };

  const isSelfMobile =
    selfInfo?.deviceType === 'mobile' ||
    selfInfo?.deviceType === 'smartphone' ||
    (typeof navigator !== 'undefined' && /Android|iPhone|iPad/i.test(navigator.userAgent));

  const resolvedLocalIp = isSelfMobile
    ? (selfIp && selfIp !== '127.0.0.1' ? selfIp : (localIp || '127.0.0.1'))
    : (localIp || selfIp || (typeof window !== 'undefined' ? window.location.hostname : '127.0.0.1'));

  return (
    <div className="w-full max-w-4xl mx-auto px-3 sm:px-6 py-4 flex flex-col gap-5 animate-view-enter smooth-gpu">
      {/* 1. Header Card: "Perangkat Ini" (My Device - Apple AirDrop Header) */}
      <div className="apple-card p-4 sm:p-5 shadow-sm relative overflow-hidden transition-all duration-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-black/5 dark:bg-white/5 border border-black/8 dark:border-white/10 rounded-2xl shrink-0 shadow-xs">
              {getDeviceIcon(selfInfo?.deviceType || 'laptop', 'w-6 h-6 sm:w-7 sm:h-7')}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase tracking-wider font-semibold text-zinc-500 dark:text-zinc-400 font-sans">
                  Perangkat Ini
                </span>
                <span className="inline-flex items-center gap-1.5 text-[10px] text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.2 rounded-full font-sans font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Siap Terhubung
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-white truncate flex items-center gap-2">
                {selfInfo?.name || selfInfo?.deviceName || 'ENCross Hub'}
                <button
                  onClick={onOpenRename}
                  className="text-xs text-blue-500 hover:text-blue-600 dark:text-blue-400 font-normal underline cursor-pointer"
                  title="Ganti nama perangkat"
                >
                  Ubah
                </button>
              </h2>
              <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400 font-mono mt-0.5">
                <span className="font-medium text-zinc-700 dark:text-zinc-300">{resolvedLocalIp}</span>
                <span>•</span>
                <span>{selfInfo?.os || 'System'}</span>
              </div>
            </div>
          </div>

          {/* Quick Action Capsule Buttons */}
          <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
            <button
              onClick={onOpenConnect}
              className="flex items-center gap-1.5 bg-black/5 hover:bg-black/10 dark:bg-white/8 dark:hover:bg-white/12 active:scale-95 text-zinc-700 dark:text-zinc-200 border border-black/8 dark:border-white/10 px-3 py-1.5 rounded-full text-xs font-medium transition cursor-pointer shadow-xs"
              title="Hubungkan manual via IP address"
            >
              <Link className="w-3.5 h-3.5 text-blue-500" />
              <span>Input IP</span>
            </button>

            <button
              onClick={onOpenQR}
              className="flex items-center gap-1.5 bg-black/5 hover:bg-black/10 dark:bg-white/8 dark:hover:bg-white/12 active:scale-95 text-zinc-700 dark:text-zinc-200 border border-black/8 dark:border-white/10 px-3 py-1.5 rounded-full text-xs font-medium transition cursor-pointer shadow-xs"
              title="Tampilkan QR code untuk scan dari HP"
            >
              <QrCode className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" />
              <span>QR Code</span>
            </button>

            <button
              onClick={handleRefreshScan}
              className="p-1.5 bg-black/5 hover:bg-black/10 dark:bg-white/8 dark:hover:bg-white/12 active:scale-95 text-zinc-600 dark:text-zinc-300 border border-black/8 dark:border-white/10 rounded-full transition cursor-pointer shadow-xs"
              title="Pindai ulang jaringan lokal"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin text-blue-500' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* 2. Main Section: Discovered / Connected Devices (Apple AirDrop Shelf) */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 tracking-wider uppercase">
              Perangkat di Sekitar ({peers.length})
            </h3>
            <span className="text-[11px] text-zinc-400 dark:text-zinc-500 font-medium hidden sm:inline">
              Pilih perangkat untuk transfer berkas atau kontrol layar
            </span>
          </div>

          <span className="text-[11px] text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Auto-Discovery Aktif
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

        {/* Device List or Quiet Minimal Empty State */}
        {peers.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {peers.map((peer, idx) => {
              const isPeerMobile = peer.deviceType?.toLowerCase() === 'mobile' || peer.deviceType?.toLowerCase() === 'smartphone';
              return (
                <div
                  key={peer.id}
                  onClick={() => {
                    triggerHaptic([35]);
                    onSelectDevice(peer);
                  }}
                  style={{ animationDelay: `${idx * 70}ms` }}
                  className="apple-card ios-card-enter ios-pressable p-4 sm:p-5 cursor-pointer flex flex-col justify-between relative group hover:border-black/20 dark:hover:border-white/20 shadow-sm"
                >
                  <div>
                    {/* Top row: Icon, Type & Online Status */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="p-2.5 bg-black/5 dark:bg-white/5 border border-black/8 dark:border-white/10 rounded-2xl transition-colors">
                        {getDeviceIcon(peer.deviceType, 'w-6 h-6')}
                      </div>

                      <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-black/5 dark:bg-white/5 border border-black/8 dark:border-white/10">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        <span className="font-mono text-[10px] text-zinc-600 dark:text-zinc-400 font-medium">
                          {pingMs ? `${pingMs} ms` : 'LAN Siap'}
                        </span>
                      </div>
                    </div>

                    {/* Device Name & Details */}
                    <h4 className="text-base font-bold text-zinc-900 dark:text-white group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors truncate mb-1">
                      {peer.name}
                    </h4>

                    <div className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400 font-sans mb-3 flex-wrap">
                      <span className="bg-black/5 dark:bg-white/5 px-2 py-0.5 rounded-full text-zinc-700 dark:text-zinc-300 font-mono text-[11px]">
                        {peer.os || 'OS'}
                      </span>
                      <span>•</span>
                      <span className="text-zinc-500 dark:text-zinc-400 text-[11px] font-mono">{peer.ip || 'Wi-Fi LAN'}</span>
                      {peer.battery && typeof peer.battery.level === 'number' && peer.battery.level >= 0 && (
                        <>
                          <span>•</span>
                          <span className="inline-flex items-center gap-1 bg-black/5 dark:bg-white/5 px-2 py-0.5 rounded-full text-zinc-700 dark:text-zinc-300 text-[11px] font-mono">
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

                    {/* Quick 1-Tap Action Feature Bar */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 my-3" onClick={(e) => e.stopPropagation()}>
                      {isPeerMobile ? (
                        <>
                          <button
                            onClick={() => {
                              triggerHaptic([30]);
                              onStartMirroring?.(peer);
                            }}
                            className="flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-[#0071e3] dark:text-blue-400 text-xs font-semibold transition active:scale-95 border border-blue-500/20"
                            title="Buka mirror layar ponsel"
                          >
                            <MonitorPlay className="w-3.5 h-3.5 shrink-0" />
                            <span>Mirror</span>
                          </button>

                          <button
                            onClick={() => {
                              triggerHaptic([30]);
                              if (fileInputRef.current) {
                                activeTargetPeerIdRef.current = peer.id;
                                fileInputRef.current.click();
                              }
                            }}
                            className="flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-xl bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-zinc-800 dark:text-zinc-200 text-xs font-medium transition active:scale-95 border border-black/8 dark:border-white/10"
                            title="Kirim file langsung ke ponsel"
                          >
                            <Upload className="w-3.5 h-3.5 shrink-0 text-emerald-500" />
                            <span>Kirim File</span>
                          </button>

                          <button
                            onClick={() => {
                              triggerHaptic([30]);
                              onOpenFileExplorer?.(peer);
                            }}
                            className="flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-xl bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-zinc-800 dark:text-zinc-200 text-xs font-medium transition active:scale-95 border border-black/8 dark:border-white/10"
                            title="Jelajah berkas ponsel"
                          >
                            <Folder className="w-3.5 h-3.5 shrink-0 text-amber-500" />
                            <span>Jelajah</span>
                          </button>

                          <button
                            onClick={() => {
                              triggerHaptic([30]);
                              onOpenTextSync?.(peer);
                            }}
                            className="flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-xl bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-zinc-800 dark:text-zinc-200 text-xs font-medium transition active:scale-95 border border-black/8 dark:border-white/10"
                            title="Kirim teks / clipboard"
                          >
                            <MessageSquare className="w-3.5 h-3.5 shrink-0 text-purple-400" />
                            <span>Teks</span>
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => {
                              triggerHaptic([30]);
                              onOpenTouchpad?.(peer);
                            }}
                            className="flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold transition active:scale-95 border border-emerald-500/20"
                            title="Buka Touchpad & Mouse PC"
                          >
                            <MousePointer className="w-3.5 h-3.5 shrink-0" />
                            <span>Touchpad</span>
                          </button>

                          <button
                            onClick={() => {
                              triggerHaptic([30]);
                              onOpenMacroPad?.(peer);
                            }}
                            className="flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 dark:text-purple-400 text-xs font-semibold transition active:scale-95 border border-purple-500/20"
                            title="Buka Macro Pad & Shortcut"
                          >
                            <Layers className="w-3.5 h-3.5 shrink-0" />
                            <span>Macro</span>
                          </button>

                          <button
                            onClick={() => {
                              triggerHaptic([30]);
                              if (fileInputRef.current) {
                                activeTargetPeerIdRef.current = peer.id;
                                fileInputRef.current.click();
                              }
                            }}
                            className="flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-xl bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-zinc-800 dark:text-zinc-200 text-xs font-medium transition active:scale-95 border border-black/8 dark:border-white/10"
                            title="Kirim file langsung ke PC"
                          >
                            <Upload className="w-3.5 h-3.5 shrink-0 text-blue-500" />
                            <span>Kirim File</span>
                          </button>

                          <button
                            onClick={() => {
                              triggerHaptic([30]);
                              onOpenTextSync?.(peer);
                            }}
                            className="flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-xl bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-zinc-800 dark:text-zinc-200 text-xs font-medium transition active:scale-95 border border-black/8 dark:border-white/10"
                            title="Kirim pesan / clipboard"
                          >
                            <MessageSquare className="w-3.5 h-3.5 shrink-0 text-sky-400" />
                            <span>Teks</span>
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Bottom Connect Button (Apple Capsule Button) */}
                  <div className="pt-2.5 border-t border-black/8 dark:border-white/10 flex items-center justify-between text-xs">
                    <span className="text-zinc-500 dark:text-zinc-400 font-medium text-[11px]">
                      {isPeerMobile ? 'Mirror Layar & Kontrol Lengkap' : 'Pusat Kontrol & Layar PC'}
                    </span>
                    <div className="flex items-center gap-1.5 bg-[#0071e3] hover:bg-[#0077ed] text-white px-3.5 py-1.5 rounded-full font-semibold transition-all shadow-xs group-hover:shadow-sm">
                      <span>Buka Workspace</span>
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform duration-300" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Empty State: Pure Apple Clean Minimalist Empty State with Organic AirDrop Breathing Beacon */
          <div className="apple-card border-dashed p-8 sm:p-12 text-center flex flex-col items-center justify-center relative overflow-hidden">
            <div className="relative w-18 h-18 flex items-center justify-center mb-3">
              <div className="airdrop-beacon absolute inset-0 border border-blue-500/25" />
              <div className="airdrop-beacon absolute inset-0 border border-blue-500/20" style={{ animationDelay: '1s' }} />
              <div className="w-14 h-14 rounded-full bg-black/5 dark:bg-white/5 border border-black/8 dark:border-white/10 flex items-center justify-center relative z-10 shadow-xs">
                <Smartphone className="w-6 h-6 text-zinc-400 dark:text-zinc-500" />
              </div>
            </div>

            <h4 className="text-base font-semibold text-zinc-900 dark:text-white mb-1">
              Mencari Perangkat di Sekitar
            </h4>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm mx-auto mb-5 leading-relaxed">
              Buka aplikasi ENCross di ponsel atau laptop lain dalam jaringan Wi-Fi lokal yang sama. Perangkat akan otomatis terdeteksi di sini.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-2.5">
              <button
                onClick={onOpenConnect}
                className="ios-pressable flex items-center gap-1.5 bg-black/5 hover:bg-black/10 dark:bg-white/8 dark:hover:bg-white/12 text-zinc-800 dark:text-zinc-200 border border-black/8 dark:border-white/10 px-4 py-1.5 rounded-full text-xs font-medium transition cursor-pointer shadow-xs"
              >
                <Link className="w-3.5 h-3.5 text-blue-500" />
                <span>Hubungkan Manual via IP</span>
              </button>

              <button
                onClick={onOpenQR}
                className="ios-pressable flex items-center gap-1.5 bg-black/5 hover:bg-black/10 dark:bg-white/8 dark:hover:bg-white/12 text-zinc-800 dark:text-zinc-200 border border-black/8 dark:border-white/10 px-4 py-1.5 rounded-full text-xs font-medium transition cursor-pointer shadow-xs"
              >
                <QrCode className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" />
                <span>Pindai QR Code</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 3. Collapsible Session Transfer History (Safari / Finder Download Tray Style) */}
      {transferHistory.length > 0 && (
        <div className="apple-card p-3.5 sm:p-4 shadow-sm animate-view-enter">
          <div className="flex items-center justify-between mb-2.5">
            <button
              onClick={() => {
                triggerHaptic([15]);
                setShowHistory(!showHistory);
              }}
              className="flex items-center gap-2 text-xs font-bold text-zinc-800 dark:text-zinc-200 hover:text-blue-500 transition cursor-pointer"
            >
              <Clock className="w-4 h-4 text-blue-500" />
              <span>Riwayat Pengiriman Sesi ({transferHistory.length})</span>
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
      )}
    </div>
  );
}
export default DeviceDiscoveryView;
