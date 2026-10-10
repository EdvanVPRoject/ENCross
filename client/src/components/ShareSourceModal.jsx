import React from 'react';
import { Smartphone, Camera, X } from 'lucide-react';
import { triggerHaptic } from '../utils/feedback';

export function ShareSourceModal({ isOpen, onClose, onSelect }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-xs p-5 shadow-2xl relative text-center">
        <button
          onClick={onClose}
          className="absolute top-3.5 right-3.5 p-1 text-zinc-400 hover:text-white rounded hover:bg-zinc-800"
        >
          <X className="w-4 h-4" />
        </button>

        <h3 className="text-sm font-semibold text-white mb-1">
          Pilih Sumber Siaran
        </h3>
        <p className="text-xs text-zinc-400 mb-4 leading-relaxed">
          Pilih konten yang ingin dibagikan secara live ke perangkat lawan:
        </p>

        <div className="space-y-2.5">
          <button
            onClick={() => {
              triggerHaptic([30]);
              onSelect('screen');
              onClose();
            }}
            className="w-full flex items-center gap-3 p-3 rounded-xl bg-zinc-800 hover:bg-zinc-700/80 border border-zinc-700/60 text-left transition active:scale-95 cursor-pointer"
          >
            <div className="p-2 rounded-lg bg-zinc-900 text-sky-400">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-semibold text-white">Layar HP (Screen Mirror)</h4>
              <p className="text-[11px] text-zinc-400">Bagikan tampilan layar ponsel Anda</p>
            </div>
          </button>

          <button
            onClick={() => {
              triggerHaptic([30]);
              onSelect('camera');
              onClose();
            }}
            className="w-full flex items-center gap-3 p-3 rounded-xl bg-zinc-800 hover:bg-zinc-700/80 border border-zinc-700/60 text-left transition active:scale-95 cursor-pointer"
          >
            <div className="p-2 rounded-lg bg-zinc-900 text-emerald-400">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-semibold text-white">Kamera HP (Wireless Cam)</h4>
              <p className="text-[11px] text-zinc-400">Jadikan HP sebagai siaran kamera laptop</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
