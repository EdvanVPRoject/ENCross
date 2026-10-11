import React from 'react';
import { Smartphone, Camera, X } from 'lucide-react';
import { triggerHaptic } from '../utils/feedback';

export function ShareSourceModal({ isOpen, onClose, onSelect }) {
  if (!isOpen) return null;

  const hasNativeCapture = typeof window !== 'undefined' && Boolean(window.AndroidScreenShare?.isScreenCaptureAvailable?.());
  const canShareScreen = (typeof navigator !== 'undefined' && navigator.mediaDevices && Boolean(navigator.mediaDevices.getDisplayMedia)) || hasNativeCapture;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-xs p-5 shadow-2xl relative text-center">
        <button
          onClick={onClose}
          className="absolute top-3.5 right-3.5 p-1 text-zinc-400 hover:text-white rounded hover:bg-zinc-800 cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <h3 className="text-sm font-semibold text-white mb-1">
          Pilih Sumber Siaran
        </h3>
        <p className="text-xs text-zinc-400 mb-4 leading-relaxed">
          Pilih konten yang ingin disiarkan secara live ke perangkat lawan:
        </p>

        <div className="space-y-2.5">
          {/* Layar HP (Screen Mirror) - Primary Option */}
          <button
            onClick={() => {
              triggerHaptic([30]);
              onSelect('screen');
              onClose();
            }}
            className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition active:scale-95 cursor-pointer shadow-xs ${
              canShareScreen
                ? 'bg-sky-500/10 hover:bg-sky-500/20 border-sky-500/30'
                : 'bg-zinc-800/60 hover:bg-zinc-800 border-zinc-700/40 text-zinc-400'
            }`}
          >
            <div className="p-2 rounded-lg bg-sky-500/20 text-sky-400 shrink-0">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h4 className="text-xs font-semibold text-white">Layar HP (Screen Mirror)</h4>
                <span className="text-[9px] bg-sky-500/20 text-sky-400 border border-sky-500/30 px-1 rounded font-medium">Utama</span>
                {hasNativeCapture && (
                  <span className="text-[9px] bg-zinc-800 text-sky-300 border border-zinc-700 px-1 rounded font-mono">Native</span>
                )}
              </div>
              <p className="text-[10px] text-zinc-400 leading-tight">
                {canShareScreen
                  ? 'Bagikan tampilan layar HP secara live ke Laptop'
                  : 'Unduh versi APK untuk siaran layar via MediaProjection'}
              </p>
            </div>
          </button>

          {/* Kamera HP (Wireless Cam) */}
          <button
            onClick={() => {
              triggerHaptic([30]);
              onSelect('camera');
              onClose();
            }}
            className="w-full flex items-center gap-3 p-3 rounded-xl bg-zinc-800 hover:bg-zinc-700/80 border border-zinc-700/60 text-left transition active:scale-95 cursor-pointer shadow-xs"
          >
            <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400 shrink-0">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h4 className="text-xs font-semibold text-white">Kamera HP (Wireless Cam)</h4>
                <span className="text-[9px] bg-emerald-500/20 text-emerald-400 px-1 rounded font-medium">Webcam</span>
              </div>
              <p className="text-[11px] text-zinc-400">Jadikan kamera ponsel sebagai webcam (Depan & Belakang)</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
