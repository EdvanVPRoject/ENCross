import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Maximize2,
  Minimize2,
  MousePointer,
  Fingerprint,
  Keyboard,
  Send,
  RotateCw,
  Sparkles,
  Volume2,
  VolumeX,
  Tv
} from 'lucide-react';
import { triggerHaptic } from '../utils/feedback';

export function SecondDisplayViewerModal({
  stream,
  senderName = 'Laptop',
  onClose,
  onSendInput
}) {
  const videoRef = useRef(null);
  const containerRef = useRef(null);

  const [inputMode, setInputMode] = useState('touch'); // 'touch' (direct tap) | 'trackpad'
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const [inputText, setInputText] = useState('');
  const [isMuted, setIsMuted] = useState(false);
  const [fitMode, setFitMode] = useState('contain'); // 'contain' | 'cover'
  const [showControls, setShowControls] = useState(true);
  const hideTimerRef = useRef(null);

  const touchStartRef = useRef({ x: 0, y: 0, time: 0 });
  const lastTouchRef = useRef({ x: 0, y: 0 });
  const lastScrollYRef = useRef(0);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(() => {});
    }
  }, [stream]);

  // Auto-hide toolbar after 4 seconds of inactivity
  const resetHideTimer = () => {
    setShowControls(true);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => {
      setShowControls(false);
    }, 4000);
  };

  useEffect(() => {
    resetHideTimer();
    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, []);

  if (!stream) return null;

  // Toggle browser fullscreen
  const toggleFullscreen = () => {
    triggerHaptic([20]);
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen?.().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // Direct Touch / Tap Interaction Mapping
  const handleTouchStart = (e) => {
    resetHideTimer();
    if (e.touches.length === 1) {
      const t = e.touches[0];
      touchStartRef.current = { x: t.clientX, y: t.clientY, time: Date.now() };
      lastTouchRef.current = { x: t.clientX, y: t.clientY };
    } else if (e.touches.length === 2) {
      lastScrollYRef.current = (e.touches[0].clientY + e.touches[1].clientY) / 2;
    }
  };

  const handleTouchMove = (e) => {
    resetHideTimer();
    if (e.touches.length === 1) {
      const t = e.touches[0];
      const dx = t.clientX - lastTouchRef.current.x;
      const dy = t.clientY - lastTouchRef.current.y;
      lastTouchRef.current = { x: t.clientX, y: t.clientY };

      if (inputMode === 'trackpad') {
        const roundX = Math.round(dx * 1.5);
        const roundY = Math.round(dy * 1.5);
        if (roundX !== 0 || roundY !== 0) {
          onSendInput?.(`m ${roundX} ${roundY}`);
        }
      }
    } else if (e.touches.length === 2) {
      // Two finger scroll
      const currentY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
      const deltaY = currentY - lastScrollYRef.current;
      lastScrollYRef.current = currentY;

      if (Math.abs(deltaY) > 2) {
        const scrollDelta = Math.round(deltaY * 3);
        onSendInput?.(`w ${scrollDelta}`);
      }
    }
  };

  const handleTouchEnd = (e) => {
    const elapsed = Date.now() - touchStartRef.current.time;
    if (e.changedTouches.length === 1 && elapsed < 300) {
      const t = e.changedTouches[0];
      const dist = Math.hypot(t.clientX - touchStartRef.current.x, t.clientY - touchStartRef.current.y);

      // It was a crisp tap!
      if (dist < 10) {
        if (inputMode === 'touch' && videoRef.current) {
          const rect = videoRef.current.getBoundingClientRect();
          if (
            t.clientX >= rect.left &&
            t.clientX <= rect.right &&
            t.clientY >= rect.top &&
            t.clientY <= rect.bottom
          ) {
            const relX = (t.clientX - rect.left) / rect.width;
            const relY = (t.clientY - rect.top) / rect.height;
            triggerHaptic([20]);
            onSendInput?.(`tap_rel ${relX.toFixed(4)} ${relY.toFixed(4)}`);
          }
        } else if (inputMode === 'trackpad') {
          triggerHaptic([15]);
          onSendInput?.('c left');
        }
      }
    }
  };

  const handleSendTextToScreen = (e) => {
    e?.preventDefault();
    if (!inputText) return;
    triggerHaptic([30]);
    onSendInput?.(`type:${inputText}`);
    setInputText('');
  };

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center select-none overflow-hidden touch-none"
      onClick={resetHideTimer}
    >
      {/* Video Canvas Layer */}
      <div
        className="relative w-full h-full flex items-center justify-center"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isMuted}
          className={`w-full h-full pointer-events-none transition-all duration-200 ${
            fitMode === 'cover' ? 'object-cover' : 'object-contain'
          }`}
        />
      </div>

      {/* Floating Top Header Pill */}
      <div
        className={`absolute top-4 inset-x-4 flex items-center justify-between pointer-events-none transition-all duration-300 ${
          showControls ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'
        }`}
      >
        <div className="flex items-center gap-2 bg-black/75 backdrop-blur-xl border border-white/12 px-3.5 py-1.5 rounded-full pointer-events-auto shadow-2xl">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <Tv className="w-3.5 h-3.5 text-sky-400" />
          <span className="text-xs font-bold text-white tracking-wide">
            {senderName} • Monitor Tambahan
          </span>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30">
            60 FPS
          </span>
        </div>

        <button
          onClick={() => {
            triggerHaptic([30]);
            onClose();
          }}
          className="w-9 h-9 rounded-full bg-red-500/80 hover:bg-red-500 text-white flex items-center justify-center pointer-events-auto transition active:scale-90 shadow-lg cursor-pointer"
          title="Tutup Monitor Tambahan"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Floating Bottom Control Hub */}
      <div
        className={`absolute bottom-6 inset-x-4 flex flex-col items-center gap-3 pointer-events-none transition-all duration-300 ${
          showControls ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
        }`}
      >
        {/* Quick Keyboard Input Surface if open */}
        {isKeyboardOpen && (
          <form
            onSubmit={handleSendTextToScreen}
            className="w-full max-w-md bg-[#121214]/90 backdrop-blur-2xl border border-white/16 p-2 rounded-2xl flex items-center gap-2 pointer-events-auto shadow-2xl animate-in fade-in zoom-in-95 duration-150"
          >
            <input
              type="text"
              autoFocus
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Ketik teks langsung ke layar laptop..."
              className="flex-1 bg-transparent px-3 py-1.5 text-xs text-white placeholder-zinc-500 outline-none"
            />
            <button
              type="submit"
              disabled={!inputText}
              className="px-3 py-1.5 rounded-xl bg-[#0071e3] hover:bg-[#0077ed] disabled:opacity-40 text-white text-xs font-semibold flex items-center gap-1.5 transition active:scale-95"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Kirim</span>
            </button>
          </form>
        )}

        {/* Action Buttons Pill */}
        <div className="flex items-center gap-2 bg-[#121214]/85 backdrop-blur-2xl border border-white/14 p-1.5 rounded-full pointer-events-auto shadow-2xl">
          {/* Touch vs Trackpad Toggle */}
          <button
            onClick={() => {
              triggerHaptic([20]);
              setInputMode(inputMode === 'touch' ? 'trackpad' : 'touch');
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition active:scale-95 cursor-pointer ${
              inputMode === 'touch'
                ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                : 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
            }`}
            title="Ganti mode input sentuh / trackpad"
          >
            {inputMode === 'touch' ? (
              <>
                <Fingerprint className="w-3.5 h-3.5" />
                <span>Sentuh Langsung</span>
              </>
            ) : (
              <>
                <MousePointer className="w-3.5 h-3.5" />
                <span>Trackpad Kursor</span>
              </>
            )}
          </button>

          {/* Quick Keyboard Toggle */}
          <button
            onClick={() => {
              triggerHaptic([20]);
              setIsKeyboardOpen(!isKeyboardOpen);
            }}
            className={`p-2 rounded-full transition active:scale-95 cursor-pointer ${
              isKeyboardOpen
                ? 'bg-white/20 text-white'
                : 'bg-white/6 hover:bg-white/12 text-zinc-300'
            }`}
            title="Ketik teks ke PC"
          >
            <Keyboard className="w-4 h-4" />
          </button>

          {/* Fit vs Cover Ratio */}
          <button
            onClick={() => {
              triggerHaptic([20]);
              setFitMode(fitMode === 'contain' ? 'cover' : 'contain');
            }}
            className="p-2 rounded-full bg-white/6 hover:bg-white/12 text-zinc-300 transition active:scale-95 cursor-pointer"
            title="Ubah rasio tampilan (Fit / Fill)"
          >
            <RotateCw className="w-4 h-4" />
          </button>

          {/* Mute Audio */}
          <button
            onClick={() => {
              triggerHaptic([20]);
              setIsMuted(!isMuted);
            }}
            className="p-2 rounded-full bg-white/6 hover:bg-white/12 text-zinc-300 transition active:scale-95 cursor-pointer"
            title={isMuted ? 'Buka Suara' : 'Bisukan Suara'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-zinc-300" />}
          </button>

          {/* Fullscreen Toggle */}
          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-full bg-white/6 hover:bg-white/12 text-zinc-300 transition active:scale-95 cursor-pointer"
            title="Layar Penuh"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}
