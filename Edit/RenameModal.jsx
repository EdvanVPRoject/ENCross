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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-xs p-5 shadow-2xl relative animate-modal-pop smooth-gpu">
        <button
          onClick={onClose}
          className="absolute top-3.5 right-3.5 p-1 text-zinc-400 hover:text-white rounded hover:bg-zinc-800 transition"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2 mb-2 text-white">
          <Edit3 className="w-4 h-4 text-zinc-300" />
          <h3 className="text-sm font-semibold">Ubah Nama Perangkat</h3>
        </div>
        <p className="text-xs text-zinc-400 mb-4 leading-relaxed">
          Nama ini akan terlihat oleh perangkat lain di jaringan yang sama.
        </p>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Contoh: Laptop Van / HP Edvan"
            maxLength={30}
            autoFocus
            className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-hidden focus:border-zinc-500 font-medium"
          />

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg text-xs text-zinc-400 hover:text-white hover:bg-zinc-800"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              className="flex items-center gap-1.5 bg-zinc-100 hover:bg-white text-zinc-950 px-3.5 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-40 transition cursor-pointer"
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
