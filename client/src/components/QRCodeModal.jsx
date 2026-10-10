import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X, Copy, Check, Smartphone, Wifi, ExternalLink } from 'lucide-react';

export function QRCodeModal({ isOpen, onClose, joinUrl, roomId, localIp }) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(joinUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-sm p-6 shadow-2xl relative text-center">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="inline-flex p-3 rounded-2xl bg-indigo-500/10 text-indigo-400 mb-3 border border-indigo-500/20">
          <Smartphone className="w-6 h-6 animate-bounce" />
        </div>

        <h3 className="text-lg font-bold text-white mb-1">
          Hubungkan Smartphone
        </h3>
        <p className="text-xs text-slate-400 mb-5 leading-relaxed">
          Buka kamera HP atau browser di HP, lalu scan kode QR di bawah untuk terhubung secara instan.
        </p>

        {/* QR Code Container */}
        <div className="bg-white p-4 rounded-xl inline-block shadow-inner mx-auto mb-4 border border-slate-200">
          <QRCodeSVG
            value={joinUrl || window.location.href}
            size={190}
            level="M"
            includeMargin={false}
          />
        </div>

        {/* LAN Info Badge */}
        <div className="flex items-center justify-center gap-1.5 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 py-1.5 px-3 rounded-lg mb-4">
          <Wifi className="w-3.5 h-3.5" />
          <span>Pastikan HP & Laptop di Wi-Fi yang sama</span>
        </div>

        {/* Copyable URL */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-2.5 flex items-center justify-between gap-2 text-left">
          <div className="truncate text-xs text-slate-300 font-mono flex-1">
            {joinUrl || window.location.href}
          </div>
          <button
            onClick={handleCopy}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs flex items-center gap-1 transition cursor-pointer shrink-0"
            title="Salin tautan"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span className="text-[11px]">{copied ? 'Tersalin' : 'Salin'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
