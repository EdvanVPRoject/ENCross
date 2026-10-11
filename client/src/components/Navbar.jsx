import React from 'react';
import { QrCode, Laptop, Smartphone, Tablet, Radio, Edit2, Wifi } from 'lucide-react';
import { triggerHaptic } from '../utils/feedback';

export function Navbar({ selfInfo, localIp, roomId, onOpenQR, onOpenRename, onOpenConnect }) {
  const getDeviceIcon = () => {
    if (selfInfo?.deviceType === 'mobile') return <Smartphone className="w-3.5 h-3.5 text-zinc-400" />;
    if (selfInfo?.deviceType === 'tablet') return <Tablet className="w-3.5 h-3.5 text-zinc-400" />;
    return <Laptop className="w-3.5 h-3.5 text-zinc-400" />;
  };

  const handleRenameClick = () => {
    triggerHaptic([30]);
    onOpenRename();
  };

  const isMobile = selfInfo?.deviceType === 'mobile';

  return (
    <header
      style={{ paddingTop: 'max(env(safe-area-inset-top, 0px), 0.625rem)' }}
      className="border-b border-zinc-800 bg-zinc-950/90 backdrop-blur-md sticky top-0 z-40 px-3 pb-2.5 sm:px-6 sm:pb-3 w-full max-w-full overflow-hidden"
    >
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-2 w-full">
        {/* Brand & Laptop IP Badge */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-black border border-zinc-800 flex flex-col items-center justify-center select-none shadow-xs">
              <span className="text-[9px] font-black tracking-tight text-white leading-[10px]">EN</span>
              <span className="text-[9px] font-black tracking-tight text-white leading-[10px]">CS</span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-sm sm:text-base font-bold tracking-tight text-white">
                ENCS
              </span>
              <span className="text-[10px] font-mono text-zinc-500 px-1 py-0.2 rounded bg-zinc-900 border border-zinc-800">
                LAN
              </span>
            </div>
          </div>

          {/* Prominent Laptop IP Badge on Website / Desktop */}
          {localIp && localIp !== '127.0.0.1' && (
            <div className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-xs font-mono text-zinc-300 shadow-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
              <span className="text-zinc-500 text-[10px] hidden md:inline font-sans font-medium">IP Laptop:</span>
              <span className="text-emerald-400 font-semibold text-[11px] sm:text-xs">{localIp}</span>
            </div>
          )}
        </div>

        {/* Right Actions: Compact & Never Overflowing */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Mobile Connection Button */}
          {isMobile && onOpenConnect && (
            <button
              onClick={() => {
                triggerHaptic([30]);
                onOpenConnect();
              }}
              className="flex items-center gap-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 rounded-lg h-7 px-2.5 text-xs text-zinc-300 transition cursor-pointer"
              title="Sambungkan / Ganti IP Laptop"
            >
              <Wifi className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="text-[11px] font-medium">IP Laptop</span>
            </button>
          )}

          {/* Self Device Badge (Click to Rename) */}
          <button
            onClick={handleRenameClick}
            className="flex items-center gap-1.5 bg-zinc-900 hover:bg-zinc-800/80 active:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 rounded-lg px-2 sm:px-3 py-1.5 text-xs text-zinc-300 transition cursor-pointer max-w-[120px] sm:max-w-[200px]"
            title="Klik untuk mengubah nama perangkat Anda"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
            {getDeviceIcon()}
            <span className="font-medium truncate text-[11px] sm:text-xs">
              {selfInfo?.name || 'Perangkat Ini'}
            </span>
            <Edit2 className="w-2.5 h-2.5 text-zinc-500 shrink-0 hidden sm:inline" />
          </button>

          {/* QR Button */}
          {onOpenQR && (
            <button
              onClick={() => {
                triggerHaptic([30]);
                onOpenQR();
              }}
              className="flex items-center justify-center gap-1.5 bg-zinc-100 hover:bg-white active:bg-zinc-200 text-zinc-950 rounded-lg h-7 px-2 sm:px-3 text-xs font-semibold transition cursor-pointer shrink-0"
              title="Hubungkan HP (Tampilkan QR Code)"
            >
              <QrCode className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline">Hubungkan HP</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
