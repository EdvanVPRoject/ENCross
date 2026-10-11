import React, { useState } from 'react';
import { Wifi, ArrowRight } from 'lucide-react';

export function ServerIpModal({ isOpen, onClose, onSave, currentIp }) {
  const [ip, setIp] = useState(currentIp || '192.168.18.');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (ip && ip.trim()) {
      onSave(ip.trim());
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-sm p-6 shadow-2xl">
        <div className="w-12 h-12 rounded-xl bg-zinc-800 border border-zinc-700/80 flex items-center justify-center text-zinc-100 mb-4">
          <Wifi className="w-6 h-6 text-emerald-400 animate-pulse" />
        </div>

        <h3 className="text-lg font-semibold text-white mb-1.5">
          Sambungkan ke Laptop
        </h3>
        <p className="text-xs text-zinc-400 mb-5 leading-relaxed">
          Masukkan alamat IP Laptop yang terhubung ke jaringan Wi-Fi yang sama (lihat IP di pojok atas aplikasi VNCross laptop):
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-[11px] font-medium text-zinc-400 block mb-1.5">
              Alamat IP Laptop
            </label>
            <input
              type="text"
              value={ip}
              onChange={(e) => setIp(e.target.value)}
              placeholder="192.168.18.4"
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500/60 font-mono tracking-wide"
              autoFocus
            />
          </div>

          <div className="flex gap-2 pt-1">
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 bg-zinc-800 hover:bg-zinc-700/80 text-zinc-300 rounded-xl text-xs font-medium transition cursor-pointer"
              >
                Batal
              </button>
            )}
            <button
              type="submit"
              className="flex-1 py-2.5 bg-zinc-100 hover:bg-white active:bg-zinc-200 text-zinc-950 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
            >
              <span>Sambungkan</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
