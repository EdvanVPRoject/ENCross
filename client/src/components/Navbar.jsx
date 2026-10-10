import React from 'react';
import { Wifi, QrCode, Laptop, Smartphone, Tablet, Radio } from 'lucide-react';

export function Navbar({ selfInfo, localIp, roomId, onOpenQR }) {
  const getDeviceIcon = () => {
    if (selfInfo?.deviceType === 'mobile') return <Smartphone className="w-4 h-4 text-emerald-400" />;
    if (selfInfo?.deviceType === 'tablet') return <Tablet className="w-4 h-4 text-emerald-400" />;
    return <Laptop className="w-4 h-4 text-emerald-400" />;
  };

  return (
    <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md sticky top-0 z-40 px-4 py-3 sm:px-6">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-violet-600 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Radio className="w-5 h-5 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-white font-sans">
                Van<span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-pink-400">Cross</span>
              </h1>
              <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                P2P LAN
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">
              Cross-Device Local File & Stream Hub
            </p>
          </div>
        </div>

        {/* Network & Device Info Pill */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Self Device Badge */}
          <div className="flex items-center gap-2 bg-slate-800/70 border border-slate-700/60 rounded-lg px-3 py-1.5 text-xs text-slate-300">
            {getDeviceIcon()}
            <span className="font-medium truncate max-w-[120px] sm:max-w-[160px]">
              {selfInfo?.name || 'Perangkat Ini'}
            </span>
          </div>

          {/* QR Code Button */}
          <button
            onClick={onOpenQR}
            className="flex items-center gap-1.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white rounded-lg px-3 py-1.5 text-xs font-semibold shadow-md shadow-indigo-600/20 transition-all cursor-pointer active:scale-95"
            title="Scan QR dengan HP"
          >
            <QrCode className="w-4 h-4" />
            <span className="hidden sm:inline">Hubungkan HP (QR)</span>
            <span className="sm:hidden">QR</span>
          </button>
        </div>
      </div>
    </header>
  );
}
