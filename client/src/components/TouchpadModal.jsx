import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  MousePointer,
  Hash,
  Sliders,
  Volume2,
  VolumeX,
  Volume1,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Monitor,
  Delete,
  CornerDownLeft,
  Lock,
  Layers
} from 'lucide-react';

export function TouchpadModal({ targetPeer, onSendInput, onClose, onOpenMacroPad }) {
  const [activeTab, setActiveTab] = useState('touchpad'); // 'touchpad' | 'numpad' | 'media'
  const [sensitivity, setSensitivity] = useState(1.4);
  const touchAreaRef = useRef(null);
  const touchState = useRef({
    startX: 0,
    startY: 0,
    lastX: 0,
    lastY: 0,
    startTime: 0,
    isTwoFinger: false,
    lastTwoFingerY: 0,
    moved: false
  });

  const triggerHaptic = (ms = 15) => {
    try {
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(ms);
      }
    } catch (_) {}
  };

  const sendCommand = (cmdStr) => {
    if (onSendInput && typeof onSendInput === 'function') {
      onSendInput(cmdStr);
    }
  };

  // Touchpad Event Listeners with Touch Action None
  const handleTouchStart = (e) => {
    if (e.touches.length === 1) {
      const t = e.touches[0];
      touchState.current = {
        startX: t.clientX,
        startY: t.clientY,
        lastX: t.clientX,
        lastY: t.clientY,
        startTime: Date.now(),
        isTwoFinger: false,
        lastTwoFingerY: 0,
        moved: false
      };
    } else if (e.touches.length === 2) {
      touchState.current.isTwoFinger = true;
      touchState.current.lastTwoFingerY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
    }
  };

  const handleTouchMove = (e) => {
    e.preventDefault(); // Prevent accidental mobile pull-to-refresh
    if (e.touches.length === 1 && !touchState.current.isTwoFinger) {
      const t = e.touches[0];
      const dx = (t.clientX - touchState.current.lastX) * sensitivity;
      const dy = (t.clientY - touchState.current.lastY) * sensitivity;

      touchState.current.lastX = t.clientX;
      touchState.current.lastY = t.clientY;

      if (Math.abs(dx) > 0.4 || Math.abs(dy) > 0.4) {
        touchState.current.moved = true;
        const roundX = Math.round(dx);
        const roundY = Math.round(dy);
        if (roundX !== 0 || roundY !== 0) {
          sendCommand(`m ${roundX} ${roundY}`);
        }
      }
    } else if (e.touches.length === 2) {
      const currentY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
      const deltaY = currentY - touchState.current.lastTwoFingerY;
      touchState.current.lastTwoFingerY = currentY;

      if (Math.abs(deltaY) > 2) {
        // Invert scroll direction to match standard natural scrolling
        const wheelDelta = Math.round(deltaY * 3);
        sendCommand(`w ${wheelDelta}`);
      }
    }
  };

  const handleTouchEnd = (e) => {
    const elapsed = Date.now() - touchState.current.startTime;
    // Tap to Click: if single touch lasted under 250ms and cursor didn't move significantly
    if (!touchState.current.isTwoFinger && !touchState.current.moved && elapsed < 250) {
      triggerHaptic(20);
      sendCommand('c left');
    }
    // Two-finger tap: Right Click
    if (touchState.current.isTwoFinger && !touchState.current.moved && elapsed < 300) {
      triggerHaptic(25);
      sendCommand('c right');
    }
    if (e.touches.length === 0) {
      touchState.current.isTwoFinger = false;
      touchState.current.moved = false;
    }
  };

  // Keyboard and Button handlers
  const handleKeyClick = (key) => {
    triggerHaptic(15);
    sendCommand(`k ${key}`);
  };

  const handleComboClick = (mod, key) => {
    triggerHaptic(25);
    sendCommand(`combo ${mod} ${key}`);
  };

  const handleMediaClick = (mediaCmd) => {
    triggerHaptic(20);
    sendCommand(`media ${mediaCmd}`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
      <div className="apple-card border border-black/10 dark:border-white/10 rounded-3xl w-full max-w-md h-[88vh] max-h-[680px] flex flex-col shadow-2xl overflow-hidden select-none animate-ios-sheet smooth-gpu">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-black/8 dark:border-white/10 bg-black/3 dark:bg-white/3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 rounded-xl bg-[#0071e3]/10 text-[#0071e3]">
              <MousePointer className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-white truncate">
                Virtual Remote PC
              </h3>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
                Terkoneksi ke: <span className="text-[#0071e3] font-medium">{targetPeer?.name || 'PC'}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-900 dark:hover:text-white rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition cursor-pointer ios-pressable"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher - Apple Segmented Capsule */}
        <div className="grid grid-cols-3 gap-1 p-1 m-3 rounded-full bg-black/5 dark:bg-white/8 border border-black/5 dark:border-white/5 text-xs font-medium">
          <button
            onClick={() => setActiveTab('touchpad')}
            className={`flex items-center justify-center gap-1.5 py-1.5 rounded-full transition cursor-pointer ios-pressable ${
              activeTab === 'touchpad'
                ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-xs font-semibold'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            <MousePointer className="w-3.5 h-3.5" />
            <span>Touchpad</span>
          </button>
          <button
            onClick={() => setActiveTab('numpad')}
            className={`flex items-center justify-center gap-1.5 py-1.5 rounded-full transition cursor-pointer ios-pressable ${
              activeTab === 'numpad'
                ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-xs font-semibold'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            <Hash className="w-3.5 h-3.5" />
            <span>Numpad</span>
          </button>
          <button
            onClick={() => setActiveTab('media')}
            className={`flex items-center justify-center gap-1.5 py-1.5 rounded-full transition cursor-pointer ios-pressable ${
              activeTab === 'media'
                ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-xs font-semibold'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Pintasan</span>
          </button>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col p-3.5 min-h-0 pt-0">
          {activeTab === 'touchpad' && (
            <div className="flex-1 flex flex-col gap-3 min-h-0">
              {/* Touchpad Area */}
              <div
                ref={touchAreaRef}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                className="flex-1 rounded-2xl bg-black/4 dark:bg-white/5 border border-black/8 dark:border-white/10 flex flex-col items-center justify-center text-center p-4 relative overflow-hidden cursor-crosshair active:border-[#0071e3] transition-colors"
                style={{ touchAction: 'none' }}
              >
                {/* Subtle tactile grid lines */}
                <div className="absolute inset-0 opacity-[0.03] bg-[radial-gradient(#000_1px,transparent_1px)] dark:bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]" />
                <MousePointer className="w-8 h-8 text-zinc-400 dark:text-zinc-600 mb-2 pointer-events-none" />
                <p className="text-xs text-zinc-600 dark:text-zinc-400 font-medium pointer-events-none">
                  Sentuh & Geser untuk Menggerakkan Kursor
                </p>
                <p className="text-[11px] text-zinc-400 dark:text-zinc-500 pointer-events-none mt-1">
                  1 Jari: Gerak & Klik • 2 Jari: Scroll Layar
                </p>
              </div>

              {/* Mouse Buttons */}
              <div className="grid grid-cols-2 gap-2 h-20 shrink-0">
                <button
                  onClick={() => {
                    triggerHaptic(20);
                    sendCommand('c left');
                  }}
                  className="rounded-2xl bg-black/4 dark:bg-white/6 hover:bg-black/8 dark:hover:bg-white/10 border border-black/8 dark:border-white/10 text-zinc-900 dark:text-white font-medium text-sm transition cursor-pointer flex flex-col items-center justify-center ios-pressable"
                >
                  <span>Klik Kiri</span>
                  <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-normal">Left Click</span>
                </button>
                <button
                  onClick={() => {
                    triggerHaptic(20);
                    sendCommand('c right');
                  }}
                  className="rounded-2xl bg-black/4 dark:bg-white/6 hover:bg-black/8 dark:hover:bg-white/10 border border-black/8 dark:border-white/10 text-zinc-900 dark:text-white font-medium text-sm transition cursor-pointer flex flex-col items-center justify-center ios-pressable"
                >
                  <span>Klik Kanan</span>
                  <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-normal">Right Click</span>
                </button>
              </div>
            </div>
          )}

          {activeTab === 'numpad' && (
            <div className="flex-1 flex flex-col justify-center gap-2 max-w-xs mx-auto w-full">
              {/* Row 1 */}
              <div className="grid grid-cols-4 gap-2">
                <button
                  onClick={() => handleKeyClick('esc')}
                  className="py-3 rounded-xl bg-black/4 dark:bg-white/6 hover:bg-black/8 dark:hover:bg-white/10 text-zinc-700 dark:text-zinc-300 font-semibold text-xs border border-black/8 dark:border-white/10 cursor-pointer active:scale-95 transition"
                >
                  ESC
                </button>
                <button
                  onClick={() => handleKeyClick('tab')}
                  className="py-3 rounded-xl bg-black/4 dark:bg-white/6 hover:bg-black/8 dark:hover:bg-white/10 text-zinc-700 dark:text-zinc-300 font-semibold text-xs border border-black/8 dark:border-white/10 cursor-pointer active:scale-95 transition"
                >
                  TAB
                </button>
                <button
                  onClick={() => handleKeyClick('back')}
                  className="py-3 rounded-xl bg-black/4 dark:bg-white/6 hover:bg-black/8 dark:hover:bg-white/10 text-amber-500 font-semibold text-xs border border-black/8 dark:border-white/10 cursor-pointer active:scale-95 transition flex items-center justify-center"
                >
                  <Delete className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleKeyClick('divide')}
                  className="py-3 rounded-xl bg-black/4 dark:bg-white/6 hover:bg-black/8 dark:hover:bg-white/10 text-zinc-700 dark:text-zinc-300 font-semibold text-sm border border-black/8 dark:border-white/10 cursor-pointer active:scale-95 transition"
                >
                  ÷
                </button>
              </div>

              {/* Row 2 */}
              <div className="grid grid-cols-4 gap-2">
                {['7', '8', '9'].map((n) => (
                  <button
                    key={n}
                    onClick={() => handleKeyClick(`num${n}`)}
                    className="py-3.5 rounded-xl bg-white dark:bg-white/8 hover:bg-zinc-100 dark:hover:bg-white/12 text-zinc-900 dark:text-white font-semibold text-base border border-black/8 dark:border-white/10 cursor-pointer active:scale-95 transition shadow-xs"
                  >
                    {n}
                  </button>
                ))}
                <button
                  onClick={() => handleKeyClick('multiply')}
                  className="py-3.5 rounded-xl bg-black/4 dark:bg-white/6 hover:bg-black/8 dark:hover:bg-white/10 text-zinc-700 dark:text-zinc-300 font-semibold text-sm border border-black/8 dark:border-white/10 cursor-pointer active:scale-95 transition"
                >
                  ×
                </button>
              </div>

              {/* Row 3 */}
              <div className="grid grid-cols-4 gap-2">
                {['4', '5', '6'].map((n) => (
                  <button
                    key={n}
                    onClick={() => handleKeyClick(`num${n}`)}
                    className="py-3.5 rounded-xl bg-white dark:bg-white/8 hover:bg-zinc-100 dark:hover:bg-white/12 text-zinc-900 dark:text-white font-semibold text-base border border-black/8 dark:border-white/10 cursor-pointer active:scale-95 transition shadow-xs"
                  >
                    {n}
                  </button>
                ))}
                <button
                  onClick={() => handleKeyClick('minus')}
                  className="py-3.5 rounded-xl bg-black/4 dark:bg-white/6 hover:bg-black/8 dark:hover:bg-white/10 text-zinc-700 dark:text-zinc-300 font-semibold text-sm border border-black/8 dark:border-white/10 cursor-pointer active:scale-95 transition"
                >
                  -
                </button>
              </div>

              {/* Row 4 */}
              <div className="grid grid-cols-4 gap-2">
                {['1', '2', '3'].map((n) => (
                  <button
                    key={n}
                    onClick={() => handleKeyClick(`num${n}`)}
                    className="py-3.5 rounded-xl bg-white dark:bg-white/8 hover:bg-zinc-100 dark:hover:bg-white/12 text-zinc-900 dark:text-white font-semibold text-base border border-black/8 dark:border-white/10 cursor-pointer active:scale-95 transition shadow-xs"
                  >
                    {n}
                  </button>
                ))}
                <button
                  onClick={() => handleKeyClick('plus')}
                  className="py-3.5 rounded-xl bg-black/4 dark:bg-white/6 hover:bg-black/8 dark:hover:bg-white/10 text-zinc-700 dark:text-zinc-300 font-semibold text-sm border border-black/8 dark:border-white/10 cursor-pointer active:scale-95 transition"
                >
                  +
                </button>
              </div>

              {/* Row 5 */}
              <div className="grid grid-cols-4 gap-2">
                <button
                  onClick={() => handleKeyClick('num0')}
                  className="col-span-2 py-3.5 rounded-xl bg-white dark:bg-white/8 hover:bg-zinc-100 dark:hover:bg-white/12 text-zinc-900 dark:text-white font-semibold text-base border border-black/8 dark:border-white/10 cursor-pointer active:scale-95 transition shadow-xs"
                >
                  0
                </button>
                <button
                  onClick={() => handleKeyClick('decimal')}
                  className="py-3.5 rounded-xl bg-white dark:bg-white/8 hover:bg-zinc-100 dark:hover:bg-white/12 text-zinc-900 dark:text-white font-semibold text-base border border-black/8 dark:border-white/10 cursor-pointer active:scale-95 transition shadow-xs"
                >
                  .
                </button>
                <button
                  onClick={() => handleKeyClick('enter')}
                  className="py-3.5 rounded-xl bg-[#0071e3] hover:bg-[#0077ed] active:bg-blue-600 text-white font-semibold text-sm border border-[#0071e3] cursor-pointer active:scale-95 transition flex items-center justify-center shadow-xs"
                >
                  <CornerDownLeft className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {activeTab === 'media' && (
            <div className="flex-1 flex flex-col justify-around py-2 max-w-xs mx-auto w-full gap-3">
              {/* Volume Controls */}
              <div className="bg-black/4 dark:bg-white/5 p-3.5 rounded-2xl border border-black/8 dark:border-white/10">
                <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 block mb-2 uppercase tracking-wider">
                  Kontrol Volume PC
                </span>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => handleMediaClick('voldown')}
                    className="py-2.5 rounded-xl bg-white dark:bg-white/8 hover:bg-zinc-100 dark:hover:bg-white/12 text-zinc-800 dark:text-zinc-200 text-xs font-medium border border-black/8 dark:border-white/10 flex flex-col items-center justify-center gap-1 cursor-pointer active:scale-95 transition shadow-xs"
                  >
                    <Volume1 className="w-4 h-4" />
                    <span>Vol -</span>
                  </button>
                  <button
                    onClick={() => handleMediaClick('mute')}
                    className="py-2.5 rounded-xl bg-white dark:bg-white/8 hover:bg-zinc-100 dark:hover:bg-white/12 text-zinc-800 dark:text-zinc-200 text-xs font-medium border border-black/8 dark:border-white/10 flex flex-col items-center justify-center gap-1 cursor-pointer active:scale-95 transition shadow-xs"
                  >
                    <VolumeX className="w-4 h-4 text-amber-500" />
                    <span>Mute</span>
                  </button>
                  <button
                    onClick={() => handleMediaClick('volup')}
                    className="py-2.5 rounded-xl bg-white dark:bg-white/8 hover:bg-zinc-100 dark:hover:bg-white/12 text-zinc-800 dark:text-zinc-200 text-xs font-medium border border-black/8 dark:border-white/10 flex flex-col items-center justify-center gap-1 cursor-pointer active:scale-95 transition shadow-xs"
                  >
                    <Volume2 className="w-4 h-4" />
                    <span>Vol +</span>
                  </button>
                </div>
              </div>

              {/* Playback Controls */}
              <div className="bg-black/4 dark:bg-white/5 p-3.5 rounded-2xl border border-black/8 dark:border-white/10">
                <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 block mb-2 uppercase tracking-wider">
                  Pemutar Media PC
                </span>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => handleMediaClick('prev')}
                    className="py-2.5 rounded-xl bg-white dark:bg-white/8 hover:bg-zinc-100 dark:hover:bg-white/12 text-zinc-800 dark:text-zinc-200 text-xs font-medium border border-black/8 dark:border-white/10 flex items-center justify-center cursor-pointer active:scale-95 transition shadow-xs"
                  >
                    <SkipBack className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleMediaClick('playpause')}
                    className="py-2.5 rounded-xl bg-[#0071e3] hover:bg-[#0077ed] text-white text-xs font-medium border border-[#0071e3] flex items-center justify-center cursor-pointer active:scale-95 transition shadow-xs"
                  >
                    <Play className="w-4 h-4 fill-white" />
                  </button>
                  <button
                    onClick={() => handleMediaClick('next')}
                    className="py-2.5 rounded-xl bg-white dark:bg-white/8 hover:bg-zinc-100 dark:hover:bg-white/12 text-zinc-800 dark:text-zinc-200 text-xs font-medium border border-black/8 dark:border-white/10 flex items-center justify-center cursor-pointer active:scale-95 transition shadow-xs"
                  >
                    <SkipForward className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Quick Windows Shortcuts */}
              <div className="bg-black/4 dark:bg-white/5 p-3.5 rounded-2xl border border-black/8 dark:border-white/10">
                <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 block mb-2 uppercase tracking-wider">
                  Pintasan Windows
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleComboClick('win', 'd')}
                    className="py-2.5 rounded-xl bg-white dark:bg-white/8 hover:bg-zinc-100 dark:hover:bg-white/12 text-zinc-800 dark:text-zinc-200 text-xs font-medium border border-black/8 dark:border-white/10 flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition shadow-xs"
                  >
                    <Monitor className="w-3.5 h-3.5 text-[#0071e3]" />
                    <span>Show Desktop</span>
                  </button>
                  <button
                    onClick={() => {
                      triggerHaptic(20);
                      sendCommand('lock');
                    }}
                    className="py-2.5 rounded-xl bg-white dark:bg-white/8 hover:bg-zinc-100 dark:hover:bg-white/12 text-zinc-800 dark:text-zinc-200 text-xs font-medium border border-black/8 dark:border-white/10 flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition shadow-xs"
                  >
                    <Lock className="w-3.5 h-3.5 text-red-500" />
                    <span>Lock PC</span>
                  </button>
                  <button
                    onClick={() => handleKeyClick('prtscn')}
                    className="py-2.5 rounded-xl bg-white dark:bg-white/8 hover:bg-zinc-100 dark:hover:bg-white/12 text-zinc-800 dark:text-zinc-200 text-xs font-medium border border-black/8 dark:border-white/10 flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition shadow-xs"
                  >
                    <span>Screenshot</span>
                  </button>
                  <button
                    onClick={() => handleKeyClick('space')}
                    className="py-2.5 rounded-xl bg-white dark:bg-white/8 hover:bg-zinc-100 dark:hover:bg-white/12 text-zinc-800 dark:text-zinc-200 text-xs font-medium border border-black/8 dark:border-white/10 flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition shadow-xs"
                  >
                    <span>Spasi</span>
                  </button>
                  {onOpenMacroPad && (
                    <button
                      onClick={() => {
                        triggerHaptic(25);
                        onClose();
                        onOpenMacroPad(targetPeer);
                      }}
                      className="col-span-2 py-2.5 rounded-full bg-purple-500/10 hover:bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/20 text-xs font-medium flex items-center justify-center gap-2 cursor-pointer active:scale-95 transition"
                    >
                      <Layers className="w-4 h-4 text-purple-500" />
                      <span>Buka Full Stream Deck / Macro Pad</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
