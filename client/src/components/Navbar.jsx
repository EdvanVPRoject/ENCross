import React from 'react';
import { QrCode, Laptop, Smartphone, Tablet, Radio, Edit2 } from 'lucide-react';
import { triggerHaptic } from '../utils/feedback';

export function Navbar({ selfInfo, localIp, roomId, onOpenQR, onOpenRename }) {
  const getDeviceIcon = () => {
    if (selfInfo?.deviceType === 'mobile') return <Smartphone className="w-3.5 h-3.5 text-zinc-400" />;
    if (selfInfo?.deviceType === 'tablet') return <Tablet className="w-3.5 h-3.5 text-zinc-400" />;
    return <Laptop className="w-3.5 h-3.5 text-zinc-400" />;
  };

  const handleRenameClick = () => {
    triggerHaptic([30]);
    onOpenRename();
  };

  return (
    <header className="border-b border-zinc-800 bg-zinc-950/90 backdrop-blur-md sticky top-0 z-40 px-3 py-2.5 sm:px-6 sm:py-3 w-full max-w-full overflow-hidden">
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-2 w-full">
        {/* Brand */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-zinc-900 border border-zinc-700/80 flex items-center justify-center text-zinc-200">
            <Radio className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-zinc-300" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-sm sm:text-base font-semibold tracking-tight text-white">
              ENCross
            </span>
            <span className="text-[10px] font-mono text-zinc-500 px-1 py-0.2 rounded bg-zinc-900 border border-zinc-800">
              LAN
            </span>
          </div>
        </div>

        {/* Right Actions: Compact & Never Overflowing */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Self Device Badge (Click to Rename) */}
          <button
            onClick={handleRenameClick}
            className="flex items-center gap-1.5 bg-zinc-900 hover:bg-zinc-800/80 active:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 rounded-lg px-2 sm:px-3 py-1.5 text-xs text-zinc-300 transition cursor-pointer max-w-[130px] sm:max-w-[220px]"
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
          <button
            onClick={() => {
              triggerHaptic([30]);
              onOpenQR();
            }}
            className="flex items-center justify-center gap-1.5 bg-zinc-100 hover:bg-white active:bg-zinc-200 text-zinc-950 rounded-lg h-7 px-2 sm:px-3 text-xs font-semibold transition cursor-pointer shrink-0"
            title="Hubungkan HP (Scan QR)"
          >
            <QrCode className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden sm:inline">Hubungkan HP</span>
          </button>
        </div>
      </div>
    </header>
  );
}
