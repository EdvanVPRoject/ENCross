import React from 'react';
import { QrCode, Laptop, Smartphone, Tablet, Edit2, Sun, Moon, ChevronLeft, Info } from 'lucide-react';
import { triggerHaptic } from '../utils/feedback';
import logoImg from '../assets/logo.png';

export function Navbar({
  selfInfo,
  localIp,
  selfIp,
  onOpenQR,
  onOpenRename,
  theme = 'dark',
  onToggleTheme,
  canGoBack = false,
  onBack,
  onOpenAbout
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
          {canGoBack && onBack && (
            <button
              type="button"
              onClick={() => {
                triggerHaptic([30]);
                onBack();
              }}
              className="flex items-center gap-1 h-8 px-3 rounded-full bg-blue-500/12 hover:bg-blue-500/20 active:scale-95 text-[#0071e3] dark:text-[#2997ff] border border-blue-500/25 text-xs font-semibold transition cursor-pointer shadow-xs shrink-0 animate-ios-pop"
              title="Mundur Selangkah (Kembali)"
            >
              <ChevronLeft className="w-4 h-4 stroke-[2.5]" />
              <span>Kembali</span>
            </button>
          )}

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

          {/* Prominent IP Badge on Desktop */}
          {displayIp && displayIp !== '127.0.0.1' && (
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 h-7 rounded-full bg-black/5 dark:bg-zinc-900/90 border border-black/8 dark:border-white/10 text-xs font-mono text-zinc-700 dark:text-zinc-300 shadow-xs shrink-0">
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

        {/* Right Actions: Ergonomic 32px+ Touch Targets */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* About Developer (About Me) */}
          {onOpenAbout && (
            <button
              type="button"
              onClick={() => {
                triggerHaptic([20]);
                onOpenAbout();
              }}
              className="ios-pressable w-8 h-8 flex items-center justify-center rounded-full bg-black/5 hover:bg-black/10 dark:bg-zinc-900 dark:hover:bg-zinc-850 border border-black/8 dark:border-white/10 text-zinc-600 dark:text-zinc-300 transition cursor-pointer shrink-0 shadow-xs active:scale-95"
              title="Tentang Pengembang (About Me)"
              aria-label="Tentang Pengembang"
            >
              <Info className="w-4 h-4 text-blue-500 dark:text-blue-400" />
            </button>
          )}

          {/* Theme Toggle Button (Light/Dark Mode) */}
          {onToggleTheme && (
            <button
              type="button"
              onClick={() => {
                triggerHaptic([20]);
                onToggleTheme();
              }}
              className="ios-pressable w-8 h-8 flex items-center justify-center rounded-full bg-black/5 hover:bg-black/10 dark:bg-zinc-900 dark:hover:bg-zinc-850 border border-black/8 dark:border-white/10 text-zinc-600 dark:text-zinc-300 transition cursor-pointer shrink-0 shadow-xs active:scale-95"
              title={theme === 'light' ? 'Beralih ke Dark Mode (Hitam AMOLED)' : 'Beralih ke Light Mode (Pristine Silver)'}
              aria-label="Ubah Tema Tampilan"
            >
              {theme === 'light' ? (
                <Moon className="w-4 h-4 text-zinc-700" />
              ) : (
                <Sun className="w-4 h-4 text-amber-400" />
              )}
            </button>
          )}

          {/* Self Device Badge (Desktop only) */}
          <button
            type="button"
            onClick={handleRenameClick}
            className="ios-pressable hidden sm:flex items-center gap-1.5 bg-black/5 hover:bg-black/10 dark:bg-zinc-900 dark:hover:bg-zinc-850 border border-black/8 dark:border-white/10 rounded-full px-3 h-8 text-xs text-zinc-700 dark:text-zinc-300 transition cursor-pointer max-w-[180px] shrink-0"
            title="Klik untuk mengubah nama perangkat Anda"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
            {getDeviceIcon()}
            <span className="font-medium truncate text-xs text-zinc-800 dark:text-zinc-200">
              {selfInfo?.name || 'Perangkat Ini'}
            </span>
            <Edit2 className="w-2.5 h-2.5 text-zinc-400 dark:text-zinc-500 shrink-0" />
          </button>

          {/* Connect / Hubungkan Button */}
          {onOpenQR && (
            <button
              type="button"
              onClick={() => {
                triggerHaptic([30]);
                onOpenQR();
              }}
              className="ios-pressable flex items-center justify-center gap-1.5 bg-[#0071e3] hover:bg-[#0077ed] text-white rounded-full h-8 px-3.5 text-xs font-semibold transition cursor-pointer shrink-0 shadow-xs active:scale-95"
              title="Hubungkan Perangkat (Scan QR / Link LAN)"
            >
              <QrCode className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline">Hubungkan</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
export default Navbar;
