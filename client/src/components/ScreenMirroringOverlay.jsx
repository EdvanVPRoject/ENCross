import React, { useState, useEffect, useRef } from 'react';
import {
  Monitor,
  AppWindow,
  Maximize2,
  Minimize2,
  X,
  RefreshCw,
  Smartphone,
  Tv,
  Laptop,
  ChevronDown,
  ChevronUp,
  Radio,
  Play,
  Square,
  Volume2,
  VolumeX,
  ExternalLink
} from 'lucide-react';
import { triggerHaptic } from '../utils/feedback';

export function ScreenMirroringOverlay({
  stream,
  targetPeer,
  mode = 'second-display',
  onStop,
  onSwitchSource
}) {
  const videoRef = useRef(null);
  const modalVideoRef = useRef(null);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isExpandedModal, setIsExpandedModal] = useState(false);
  const [isMuted, setIsMuted] = useState(true);

  // Bind stream to video elements
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(() => {});
    }
  }, [stream, isMinimized]);

  useEffect(() => {
    if (modalVideoRef.current && stream && isExpandedModal) {
      modalVideoRef.current.srcObject = stream;
      modalVideoRef.current.play().catch(() => {});
    }
  }, [stream, isExpandedModal]);

  const targetName = targetPeer?.name || 'HP / Tablet';
  const targetDeviceType = targetPeer?.deviceType?.toLowerCase() || 'mobile';

  return (
    <>
      {/* 1. FLOATING PIP MONITOR CARD (BOTTOM-RIGHT) */}
      <div className="fixed bottom-4 right-4 z-50 select-none animate-in fade-in slide-in-from-bottom-3 duration-200 pointer-events-auto">
        {isMinimized ? (
          /* Minimized Capsule Bar */
          <div className="apple-card px-3.5 py-2 rounded-full border border-blue-500/30 shadow-xl flex items-center gap-2.5 bg-zinc-900/95 backdrop-blur-xl text-white">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>

            <button
              onClick={() => {
                triggerHaptic([15]);
                setIsMinimized(false);
              }}
              className="text-xs font-semibold hover:text-blue-400 flex items-center gap-1.5 cursor-pointer"
            >
              <Monitor className="w-3.5 h-3.5 text-blue-400" />
              <span>Mirroring ke {targetName}</span>
              <ChevronUp className="w-3.5 h-3.5 text-zinc-400" />
            </button>

            <button
              onClick={() => {
                triggerHaptic([25]);
                onStop?.();
              }}
              className="p-1 text-zinc-400 hover:text-red-400 rounded-full hover:bg-white/10 transition cursor-pointer"
              title="Hentikan Mirroring"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          /* Expanded Floating Picture-in-Picture Card */
          <div className="apple-card w-80 sm:w-96 rounded-2xl border border-blue-500/30 shadow-2xl overflow-hidden bg-zinc-950/95 backdrop-blur-2xl flex flex-col">
            {/* Top Bar inside Floating Card */}
            <div className="px-3 py-2 bg-black/40 border-b border-white/10 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="relative flex h-2 w-2 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="text-xs font-bold text-white truncate">
                  Mirroring Layar PC
                </span>
                <span className="text-[10px] font-mono font-semibold text-blue-400 bg-blue-500/15 border border-blue-500/30 px-1.5 py-0.2 rounded shrink-0">
                  60 FPS
                </span>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                {/* Fullscreen / Modal Expand */}
                <button
                  onClick={() => {
                    triggerHaptic([20]);
                    setIsExpandedModal(true);
                  }}
                  className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-white/10 transition cursor-pointer"
                  title="Perbesar Tampilan Preview"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                </button>

                {/* Minimize to capsule */}
                <button
                  onClick={() => {
                    triggerHaptic([15]);
                    setIsMinimized(true);
                  }}
                  className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-white/10 transition cursor-pointer"
                  title="Kecilkan Monitor"
                >
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>

                {/* Stop */}
                <button
                  onClick={() => {
                    triggerHaptic([25]);
                    onStop?.();
                  }}
                  className="p-1.5 text-zinc-400 hover:text-red-400 rounded-lg hover:bg-red-500/15 transition cursor-pointer"
                  title="Hentikan Mirroring"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Live Video Preview Surface */}
            <div
              onClick={() => setIsExpandedModal(true)}
              className="relative h-44 sm:h-52 bg-black flex items-center justify-center overflow-hidden cursor-pointer group"
            >
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted={isMuted}
                className="w-full h-full object-contain pointer-events-none"
              />

              {/* Hover overlay hint */}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 pointer-events-none">
                <span className="px-3 py-1.5 rounded-full bg-white/20 backdrop-blur-md text-white text-xs font-medium flex items-center gap-1.5 shadow-lg">
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span>Klik untuk Layar Penuh</span>
                </span>
              </div>

              {/* Live Badge Top-Left of Video */}
              <div className="absolute top-2 left-2 pointer-events-none">
                <span className="px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md text-emerald-400 text-[10px] font-mono font-bold flex items-center gap-1 border border-emerald-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  LIVE
                </span>
              </div>
            </div>

            {/* Bottom Target Device & Control Strip */}
            <div className="p-2.5 bg-black/30 border-t border-white/5 flex items-center justify-between gap-2">
              <div className="min-w-0 pr-1">
                <p className="text-[11px] font-semibold text-zinc-200 truncate">
                  Terkirim ke: <span className="text-[#0071e3]">{targetName}</span>
                </p>
                <p className="text-[10px] text-zinc-500 truncate">
                  Tampilan layar laptop aktif dialirkan
                </p>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {onSwitchSource && (
                  <button
                    onClick={() => {
                      triggerHaptic([20]);
                      onSwitchSource();
                    }}
                    className="px-2.5 py-1 rounded-xl bg-white/10 hover:bg-white/15 text-zinc-200 text-xs font-medium transition cursor-pointer flex items-center gap-1 border border-white/10 active:scale-95"
                    title="Ganti Sumber Layar / Window"
                  >
                    <Monitor className="w-3.5 h-3.5 text-blue-400" />
                    <span className="hidden sm:inline">Ganti Layar</span>
                  </button>
                )}

                <button
                  onClick={() => {
                    triggerHaptic([25]);
                    onStop?.();
                  }}
                  className="px-2.5 py-1 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-400 text-xs font-semibold transition cursor-pointer flex items-center gap-1 border border-red-500/30 active:scale-95"
                  title="Hentikan Mirroring"
                >
                  <Square className="w-3 h-3 fill-current" />
                  <span>Hentikan</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 2. FULL PREVIEW MODAL (WHEN USER EXPANDS ON PC) */}
      {isExpandedModal && (
        <div
          onClick={() => setIsExpandedModal(false)}
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200 select-none"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="apple-card border border-white/15 rounded-3xl w-full max-w-5xl max-h-[92vh] flex flex-col bg-zinc-950 shadow-2xl overflow-hidden animate-ios-sheet"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-white/10 bg-black/40 shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="p-2 rounded-xl bg-[#0071e3] text-white shadow-xs">
                  <Monitor className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-white truncate">
                      Tampilan Layar Mirroring PC
                    </h3>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-mono text-[10px] font-bold">
                      ● LIVE 60FPS
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-400 truncate">
                    Mengalirkan layar laptop ke: <span className="text-[#0071e3] font-semibold">{targetName}</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {onSwitchSource && (
                  <button
                    onClick={() => {
                      triggerHaptic([20]);
                      onSwitchSource();
                    }}
                    className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer border border-white/10"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-blue-400" />
                    <span>Ganti Layar / Window</span>
                  </button>
                )}

                <button
                  onClick={() => {
                    triggerHaptic([25]);
                    setIsExpandedModal(false);
                    onStop?.();
                  }}
                  className="px-3 py-1.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-400 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer border border-red-500/30"
                >
                  <Square className="w-3 h-3 fill-current" />
                  <span>Hentikan Mirroring</span>
                </button>

                <button
                  onClick={() => setIsExpandedModal(false)}
                  className="p-2 text-zinc-400 hover:text-white rounded-full hover:bg-white/10 transition cursor-pointer"
                  title="Tutup Preview Penuh"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Large Video Display Surface */}
            <div className="flex-1 bg-black flex items-center justify-center relative overflow-hidden min-h-[360px] sm:min-h-[480px]">
              <video
                ref={modalVideoRef}
                autoPlay
                playsInline
                muted={isMuted}
                className="w-full h-full object-contain"
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default ScreenMirroringOverlay;
