import React from 'react';
import { QrCode, Laptop, Smartphone, Tablet, Radio, Edit2, Wifi, Plus, Sun, Moon } from 'lucide-react';
import { triggerHaptic } from '../utils/feedback';
import logoImg from '../assets/logo.png';

export function Navbar({
  selfInfo,
  localIp,
  selfIp,
  roomId,
  onOpenQR,
  onOpenRename,
  onOpenConnect,
  theme = 'dark',
  onToggleTheme
}) {
  const getDeviceIcon = () => {
    if (selfInfo?.deviceType === 'mobile') return <Smartphone className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" />;
    if (selfInfo?.deviceType === 'tablet') return <Tablet className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" />;
    return <Laptop className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" />;
  };

  const handleRenameClick = () => {
    triggerHaptic([30]);
    onOpenRename();
  };

  const isMobile =
    selfInfo?.deviceType === 'mobile' ||
    selfInfo?.deviceType === 'tablet' ||
    (typeof navigator !== 'undefined' && /Android|iPhone|iPad/i.test(navigator.userAgent));

  const displayIp = isMobile ? (selfIp || localIp) : localIp;

  return (
    <header
      style={{
        paddingTop: 'max(env(safe-area-inset-top, 0px), 0.625rem)'
      }}
      className="border-b border-black/8 dark:border-white/10 bg-white/75 dark:bg-black/85 backdrop-blur-2xl sticky top-0 z-40 px-3 pb-2.5 sm:px-6 sm:pb-3 w-full max-w-full overflow-hidden transition-colors duration-200"
    >
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-2 w-full">
        {/* Brand & Device IP Badge */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <img
              src={logoImg}
              alt="ENCross"
              className="w-7 h-7 sm:w-8 sm:h-8 object-contain shrink-0 select-none filter drop-shadow-xs"
            />
            <div className="flex items-baseline gap-1.5">
              <span className="text-sm sm:text-base font-bold tracking-tight text-zinc-900 dark:text-white font-sans">
                ENCross
              </span>
              <span className="text-[10px] font-mono text-zinc-500 dark:text-zinc-400 px-1.5 py-0.2 rounded-full bg-black/5 dark:bg-zinc-900 border border-black/8 dark:border-white/10">
                LAN
              </span>
            </div>
          </div>

          {/* Prominent IP Badge: Shows 'IP HP' on phone, 'IP Laptop' on desktop */}
          {displayIp && displayIp !== '127.0.0.1' && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/5 dark:bg-zinc-900/90 border border-black/8 dark:border-white/10 text-xs font-mono text-zinc-700 dark:text-zinc-300 shadow-xs shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
              <span className="text-zinc-500 dark:text-zinc-400 text-[10px] font-sans font-medium">
                {isMobile ? 'IP HP:' : 'IP Laptop:'}
              </span>
              <span className="text-zinc-900 dark:text-white font-semibold text-[11px] sm:text-xs">
                {displayIp}
              </span>
            </div>
          )}
        </div>

        {/* Right Actions: Compact & Clean Apple Pills */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Theme Toggle Button (Light/Dark Mode) */}
          {onToggleTheme && (
            <button
              onClick={() => {
                triggerHaptic([20]);
                onToggleTheme();
              }}
              className="p-1.5 rounded-full bg-black/5 hover:bg-black/10 dark:bg-zinc-900 dark:hover:bg-zinc-850 border border-black/8 dark:border-white/10 text-zinc-600 dark:text-zinc-300 transition cursor-pointer shrink-0 shadow-xs active:scale-95"
              title={theme === 'light' ? 'Beralih ke Dark Mode (Hitam AMOLED)' : 'Beralih ke Light Mode (Pristine Silver)'}
            >
              {theme === 'light' ? (
                <Moon className="w-3.5 h-3.5 text-zinc-700" />
              ) : (
                <Sun className="w-3.5 h-3.5 text-amber-400" />
              )}
            </button>
          )}

          {/* Connection / IP Config Button */}
          {onOpenConnect && (
            <button
              onClick={() => {
                triggerHaptic([30]);
                onOpenConnect();
              }}
              className="flex items-center gap-1.5 bg-black/5 hover:bg-black/10 dark:bg-zinc-900 dark:hover:bg-zinc-850 border border-black/8 dark:border-white/10 rounded-full h-7 px-2.5 sm:px-3 text-xs text-zinc-700 dark:text-zinc-300 transition cursor-pointer shrink-0"
              title={isMobile ? 'Sambungkan ke IP Laptop' : 'Hubungkan ke Laptop Lain (Koneksi Antar-PC via IP)'}
            >
              <Wifi className="w-3.5 h-3.5 text-blue-500 shrink-0" />
              <span className="text-[11px] font-medium hidden sm:inline">
                Sambung IP
              </span>
              <span className="text-[11px] font-medium sm:hidden">IP</span>
            </button>
          )}

          {/* Self Device Badge (Click to Rename) */}
          <button
            onClick={handleRenameClick}
            className="flex items-center gap-1.5 bg-black/5 hover:bg-black/10 dark:bg-zinc-900 dark:hover:bg-zinc-850 border border-black/8 dark:border-white/10 rounded-full px-2.5 sm:px-3 py-1 text-xs text-zinc-700 dark:text-zinc-300 transition cursor-pointer max-w-[85px] sm:max-w-[180px] shrink-0"
            title="Klik untuk mengubah nama perangkat Anda"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
            {getDeviceIcon()}
            <span className="font-medium truncate text-[11px] sm:text-xs text-zinc-800 dark:text-zinc-200">
              {selfInfo?.name || 'Perangkat Ini'}
            </span>
            <Edit2 className="w-2.5 h-2.5 text-zinc-400 dark:text-zinc-500 shrink-0 hidden sm:inline" />
          </button>

          {/* Connect / Hubungkan Button */}
          {onOpenQR && (
            <button
              onClick={() => {
                triggerHaptic([30]);
                onOpenQR();
              }}
              className="flex items-center justify-center gap-1.5 bg-[#0071e3] hover:bg-[#0077ed] text-white rounded-full h-7 px-3 sm:px-3.5 text-xs font-semibold transition cursor-pointer shrink-0 shadow-xs active:scale-95"
              title="Hubungkan Perangkat (Scan QR / Link LAN)"
            >
              <QrCode className="w-3.5 h-3.5 shrink-0" />
              <span>Hubungkan</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
export default Navbar;
