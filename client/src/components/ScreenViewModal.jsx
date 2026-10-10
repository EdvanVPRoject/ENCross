import React, { useEffect, useRef, useState } from 'react';
import { X, Maximize2, Minimize2, MonitorPlay, Play, RotateCw } from 'lucide-react';
import { triggerHaptic } from '../utils/feedback';

export function ScreenViewModal({ stream, senderName, onClose }) {
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [needsGesture, setNeedsGesture] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (video && stream) {
      video.srcObject = stream;
      video.muted = true; // Crucial for Android / mobile browser autoplay policy

      const attemptPlay = () => {
        video.play()
          .then(() => {
            setIsPlaying(true);
            setNeedsGesture(false);
          })
          .catch((err) => {
            console.warn('[ScreenView] Autoplay blocked by mobile browser, requiring user tap:', err);
            setNeedsGesture(true);
          });
      };

      video.onloadedmetadata = attemptPlay;
      attemptPlay();
    }
  }, [stream]);

  if (!stream) return null;

  const handleManualPlay = () => {
    triggerHaptic([30]);
    if (videoRef.current) {
      videoRef.current.muted = true;
      videoRef.current.play()
        .then(() => {
          setIsPlaying(true);
          setNeedsGesture(false);
        })
        .catch(console.error);
    }
  };

  const toggleFullscreen = () => {
    triggerHaptic([30]);
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen?.();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.();
      setIsFullscreen(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-200">
      <div
        ref={containerRef}
        className="bg-zinc-950 border-0 sm:border sm:border-zinc-800 sm:rounded-2xl w-full h-full sm:h-[88vh] sm:max-w-5xl flex flex-col shadow-2xl overflow-hidden relative"
      >
        {/* Top Control Bar */}
        <div className="p-3 bg-zinc-900/95 border-b border-zinc-800 flex items-center justify-between z-20 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <div className="p-1.5 rounded-lg bg-zinc-800 text-emerald-400 shrink-0">
              <MonitorPlay className="w-4 h-4 animate-pulse" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h3 className="text-xs font-semibold text-white truncate">
                  Mirroring Layar
                </h3>
                <span className="text-[10px] bg-red-500/15 text-red-400 border border-red-500/30 px-1.5 py-0.2 rounded font-mono uppercase shrink-0 font-bold">
                  LIVE
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-zinc-400 truncate">
                Dari: {senderName || 'PC'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={toggleFullscreen}
              className="p-2 rounded-lg text-zinc-300 hover:text-white hover:bg-zinc-800 transition cursor-pointer"
              title="Fullscreen"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
            <button
              onClick={() => {
                triggerHaptic([30]);
                onClose();
              }}
              className="p-2 rounded-lg text-zinc-300 hover:text-white hover:bg-zinc-800 transition cursor-pointer"
              title="Tutup Mirroring"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Video Canvas */}
        <div className="flex-1 bg-black flex items-center justify-center relative overflow-hidden">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-contain cursor-pointer"
            onClick={needsGesture ? handleManualPlay : undefined}
          />

          {/* Autoplay Fallback Overlay for Mobile Chrome */}
          {needsGesture && (
            <div
              onClick={handleManualPlay}
              className="absolute inset-0 bg-black/75 flex flex-col items-center justify-center cursor-pointer p-4 text-center z-10"
            >
              <div className="w-16 h-16 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white mb-3 shadow-lg active:scale-95 transition-transform">
                <Play className="w-7 h-7 ml-1 fill-white" />
              </div>
              <p className="text-sm font-semibold text-white mb-1">
                Ketuk Layar untuk Menonton
              </p>
              <p className="text-xs text-zinc-400">
                Browser HP memerlukan satu ketukan untuk memulai live stream
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
