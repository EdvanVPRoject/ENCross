import React from 'react';
import { QrCode, Laptop, Smartphone, Tablet, Radio } from 'lucide-react';

export function Navbar({ selfInfo, localIp, roomId, onOpenQR }) {
  const getDeviceIcon = () => {
    if (selfInfo?.deviceType === 'mobile') return <Smartphone className="w-4 h-4 text-zinc-400" />;
    if (selfInfo?.deviceType === 'tablet') return <Tablet className="w-4 h-4 text-zinc-400" />;
    return <Laptop className="w-4 h-4 text-zinc-400" />;
  };

  return (
    <header className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-40 px-4 py-3 sm:px-6">
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-700/80 flex items-center justify-center text-zinc-200">
            <Radio className="w-4 h-4 text-zinc-300" />
          </div>
          <div className="flex items-baseline gap-2.5">
            <span className="text-base font-semibold tracking-tight text-white">
              VanCross
            </span>
            <span className="text-[11px] font-mono text-zinc-500 px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800">
              P2P LAN
            </span>
            <span className="text-xs text-zinc-400 hidden md:inline">
              Local File & Stream
            </span>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2.5">
          {/* Self Device Badge */}
          <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-300">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            {getDeviceIcon()}
            <span className="font-medium truncate max-w-[130px] sm:max-w-[180px]">
              {selfInfo?.name || 'Perangkat Ini'}
            </span>
          </div>

          {/* QR Button */}
          <button
            onClick={onOpenQR}
            className="flex items-center gap-1.5 bg-zinc-100 hover:bg-white text-zinc-950 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer"
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>Hubungkan HP</span>
          </button>
        </div>
      </div>
    </header>
  );
}
