import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X, Copy, Check, Smartphone, Wifi } from 'lucide-react';

export function QRCodeModal({ isOpen, onClose, joinUrl, roomId, localIp }) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(joinUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-sm p-6 shadow-2xl relative text-center">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-800 transition cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <h3 className="text-base font-semibold text-white mb-1">
          Hubungkan Smartphone
        </h3>
        <p className="text-xs text-zinc-400 mb-5 leading-relaxed">
          Arahkan kamera HP ke QR Code berikut untuk menghubungkan perangkat secara instan.
        </p>

        {/* QR Code */}
        <div className="bg-white p-3.5 rounded-lg inline-block mx-auto mb-4 border border-zinc-200">
          <QRCodeSVG
            value={joinUrl || window.location.href}
            size={180}
            level="M"
            includeMargin={false}
          />
        </div>

        {/* LAN Info Badge */}
        <div className="flex items-center justify-center gap-1.5 text-xs text-zinc-300 bg-zinc-800/80 border border-zinc-700/60 py-1.5 px-3 rounded-lg mb-4 font-mono">
          <Wifi className="w-3.5 h-3.5 text-emerald-400" />
          <span>Wi-Fi yang sama: {localIp}</span>
        </div>

        {/* Copyable URL */}
        <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-2 flex items-center justify-between gap-2 text-left">
          <div className="truncate text-xs text-zinc-400 font-mono flex-1">
            {joinUrl || window.location.href}
          </div>
          <button
            onClick={handleCopy}
            className="p-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded text-xs flex items-center gap-1 transition cursor-pointer shrink-0"
            title="Salin tautan"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span className="text-[11px] font-medium">{copied ? 'Tersalin' : 'Salin'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
