import React, { useState, useEffect, useRef } from 'react';
import {
  Presentation,
  X,
  ChevronRight,
  ChevronLeft,
  Play,
  Pause,
  RotateCcw,
  Monitor,
  Maximize2,
  Tv,
  EyeOff,
  Sun,
  MousePointer
} from 'lucide-react';
import { triggerHaptic } from '../utils/feedback';

export function PresentationClickerModal({
  isOpen,
  onClose,
  targetPeer,
  onSendInput
}) {
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const touchAreaRef = useRef(null);
  const lastTouchRef = useRef(null);

  useEffect(() => {
    let interval = null;
    if (isTimerRunning) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTimerRunning]);

  if (!isOpen) return null;

  const formatTimer = (sec) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const handleNextSlide = () => {
    triggerHaptic([40]);
    onSendInput?.('k right');
  };

  const handlePrevSlide = () => {
    triggerHaptic([30]);
    onSendInput?.('k left');
  };

  const handleKeyCommand = (cmd) => {
    triggerHaptic([25]);
    onSendInput?.(cmd);
  };

  // Pointer surface touch handling
  const handleTouchStart = (e) => {
    if (e.touches.length === 1) {
      lastTouchRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
  };

  const handleTouchMove = (e) => {
    if (e.touches.length === 1 && lastTouchRef.current) {
      const dx = Math.round((e.touches[0].clientX - lastTouchRef.current.x) * 1.5);
      const dy = Math.round((e.touches[0].clientY - lastTouchRef.current.y) * 1.5);
      lastTouchRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      if (dx !== 0 || dy !== 0) {
        onSendInput?.(`m ${dx} ${dy}`);
      }
    }
  };

  const handleTouchEnd = () => {
    lastTouchRef.current = null;
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="apple-card border border-black/10 dark:border-white/10 w-full max-w-lg rounded-3xl flex flex-col shadow-2xl overflow-hidden max-h-[92vh]"
      >
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-black/8 dark:border-white/10 flex items-center justify-between bg-black/3 dark:bg-white/3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-orange-500/10 text-orange-500 border border-orange-500/20">
              <Presentation className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-semibold text-zinc-900 dark:text-white">
                Pengendali Presentasi (Clicker)
              </h3>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                Slide PC: <span className="font-semibold text-zinc-800 dark:text-zinc-200">{targetPeer?.name || 'Laptop'}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-5 flex-1 overflow-y-auto space-y-4">
          {/* Presentation Timer Bar */}
          <div className="p-3.5 rounded-2xl bg-black/3 dark:bg-white/5 border border-black/8 dark:border-white/10 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                Timer Bicara
              </p>
              <h4 className="text-2xl font-mono font-bold text-zinc-900 dark:text-white">
                {formatTimer(timerSeconds)}
              </h4>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  triggerHaptic([20]);
                  setIsTimerRunning(!isTimerRunning);
                }}
                className={`p-2.5 rounded-xl border font-semibold text-xs transition cursor-pointer flex items-center gap-1.5 ${
                  isTimerRunning
                    ? 'bg-amber-500/15 text-amber-500 border-amber-500/30'
                    : 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30'
                }`}
              >
                {isTimerRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                <span>{isTimerRunning ? 'Jeda' : 'Mulai'}</span>
              </button>

              <button
                onClick={() => {
                  triggerHaptic([20]);
                  setIsTimerRunning(false);
                  setTimerSeconds(0);
                }}
                className="p-2.5 rounded-xl bg-black/5 dark:bg-white/10 text-zinc-600 dark:text-zinc-300 border border-black/8 dark:border-white/10 hover:bg-black/10 dark:hover:bg-white/15 cursor-pointer"
                title="Reset Timer"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Massive Next & Previous Slide Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Prev Slide */}
            <button
              onClick={handlePrevSlide}
              className="ios-pressable py-6 px-4 rounded-2xl bg-black/4 dark:bg-white/6 hover:bg-black/8 dark:hover:bg-white/10 border border-black/8 dark:border-white/10 text-zinc-800 dark:text-zinc-200 flex flex-col items-center justify-center gap-2 cursor-pointer shadow-sm active:scale-95 transition"
            >
              <div className="p-3 rounded-full bg-black/5 dark:bg-white/8 text-zinc-600 dark:text-zinc-300">
                <ChevronLeft className="w-7 h-7" />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider">Slide Sebelumnya</span>
              <span className="text-[10px] text-zinc-400 font-mono">Panah Kiri</span>
            </button>

            {/* Next Slide (Primary Prominent Button) */}
            <button
              onClick={handleNextSlide}
              className="ios-pressable py-6 px-4 rounded-2xl bg-[#0071e3] hover:bg-[#0077ed] text-white flex flex-col items-center justify-center gap-2 cursor-pointer shadow-lg active:scale-95 transition border border-blue-400/30"
            >
              <div className="p-3 rounded-full bg-white/20 text-white">
                <ChevronRight className="w-7 h-7" />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider">Slide Berikutnya</span>
              <span className="text-[10px] text-blue-100 font-mono">Panah Kanan / Spasi</span>
            </button>
          </div>

          {/* Presentation Control Tools */}
          <div>
            <p className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2">
              Kontrol Presentasi PowerPoint / PDF
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 text-xs">
              <button
                onClick={() => handleKeyCommand('k f5')}
                className="ios-pressable p-2.5 rounded-xl bg-black/4 dark:bg-white/6 hover:bg-black/8 dark:hover:bg-white/10 border border-black/8 dark:border-white/10 text-zinc-800 dark:text-zinc-200 font-medium transition cursor-pointer flex flex-col items-center justify-center gap-1"
                title="Mulai Slide Show dari Slide 1"
              >
                <Tv className="w-4 h-4 text-[#0071e3]" />
                <span className="text-[10px]">Mulai (F5)</span>
              </button>

              <button
                onClick={() => handleKeyCommand('combo shift f5')}
                className="ios-pressable p-2.5 rounded-xl bg-black/4 dark:bg-white/6 hover:bg-black/8 dark:hover:bg-white/10 border border-black/8 dark:border-white/10 text-zinc-800 dark:text-zinc-200 font-medium transition cursor-pointer flex flex-col items-center justify-center gap-1"
                title="Lanjut Slide Show dari slide saat ini"
              >
                <Maximize2 className="w-4 h-4 text-emerald-500" />
                <span className="text-[10px]">Lanjut (Shift+F5)</span>
              </button>

              <button
                onClick={() => handleKeyCommand('k b')}
                className="ios-pressable p-2.5 rounded-xl bg-black/4 dark:bg-white/6 hover:bg-black/8 dark:hover:bg-white/10 border border-black/8 dark:border-white/10 text-zinc-800 dark:text-zinc-200 font-medium transition cursor-pointer flex flex-col items-center justify-center gap-1"
                title="Blank Screen Hitam (B)"
              >
                <EyeOff className="w-4 h-4 text-zinc-500" />
                <span className="text-[10px]">Layar Hitam (B)</span>
              </button>

              <button
                onClick={() => handleKeyCommand('k w')}
                className="ios-pressable p-2.5 rounded-xl bg-black/4 dark:bg-white/6 hover:bg-black/8 dark:hover:bg-white/10 border border-black/8 dark:border-white/10 text-zinc-800 dark:text-zinc-200 font-medium transition cursor-pointer flex flex-col items-center justify-center gap-1"
                title="Blank Screen Putih (W)"
              >
                <Sun className="w-4 h-4 text-amber-500" />
                <span className="text-[10px]">Layar Putih (W)</span>
              </button>

              <button
                onClick={() => handleKeyCommand('k escape')}
                className="ios-pressable p-2.5 rounded-xl bg-black/4 dark:bg-white/6 hover:bg-black/8 dark:hover:bg-white/10 border border-black/8 dark:border-white/10 text-zinc-800 dark:text-zinc-200 font-medium transition cursor-pointer flex flex-col items-center justify-center gap-1"
                title="Keluar dari Slide Show (Esc)"
              >
                <X className="w-4 h-4 text-red-500" />
                <span className="text-[10px]">Keluar (Esc)</span>
              </button>
            </div>
          </div>

          {/* Virtual Pointer Surface */}
          <div className="pt-2 border-t border-black/8 dark:border-white/10">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                <MousePointer className="w-3.5 h-3.5 text-blue-500" />
                <span>Pointer Layar / Laser Virtual</span>
              </span>
              <span className="text-[10px] text-zinc-400">Usap untuk mengarahkan kursor PC</span>
            </div>

            <div
              ref={touchAreaRef}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              className="w-full h-24 rounded-2xl bg-black/5 dark:bg-white/5 border border-dashed border-black/15 dark:border-white/15 flex items-center justify-center text-zinc-400 select-none touch-none cursor-crosshair"
            >
              <span className="text-xs text-zinc-400 dark:text-zinc-500 pointer-events-none">
                Sentuh & Geser Jari di Sini
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
export default PresentationClickerModal;
