import React, { useState, useEffect } from 'react';
import { X, Check, Edit3 } from 'lucide-react';
import { triggerHaptic } from '../utils/feedback';

export function RenameModal({ isOpen, onClose, currentName, onSave }) {
  const [name, setName] = useState(currentName || '');

  useEffect(() => {
    if (isOpen) {
      setName(currentName || '');
    }
  }, [isOpen, currentName]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (name.trim()) {
      triggerHaptic([30]);
      onSave(name.trim());
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
      <div className="apple-card border border-black/10 dark:border-white/10 rounded-3xl w-full max-w-xs p-6 shadow-2xl relative animate-modal-pop smooth-gpu">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-zinc-400 hover:text-zinc-900 dark:hover:text-white rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2 mb-1.5 text-zinc-900 dark:text-white">
          <Edit3 className="w-4 h-4 text-[#0071e3]" />
          <h3 className="text-sm font-semibold">Ubah Nama Perangkat</h3>
        </div>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-4 leading-relaxed">
          Nama ini akan terlihat oleh perangkat lain di jaringan yang sama.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Contoh: Laptop Van / HP Edvan"
            maxLength={30}
            autoFocus
            className="w-full bg-black/5 dark:bg-white/8 border border-black/8 dark:border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-zinc-900 dark:text-white focus:outline-hidden focus:border-[#0071e3] font-medium transition"
          />

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-full text-xs text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/8 transition"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              className="flex items-center gap-1.5 bg-[#0071e3] hover:bg-[#0077ed] text-white px-4 py-1.5 rounded-full text-xs font-medium disabled:opacity-40 transition cursor-pointer shadow-sm active:scale-95"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Simpan</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
