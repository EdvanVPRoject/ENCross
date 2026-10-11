import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X, Copy, Check, Download, ExternalLink, Smartphone, Wifi, Radio } from 'lucide-react';

export function QRCodeModal({ isOpen, onClose, joinUrl, roomId, localIp }) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(joinUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-sm p-4 sm:p-5 shadow-2xl relative text-center max-h-[92vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3.5 right-3.5 p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Title & Auto-Close Badge */}
        <div className="flex items-center justify-center gap-2 mb-1">
          <Smartphone className="w-4 h-4 text-emerald-400" />
          <h3 className="text-sm sm:text-base font-semibold text-white">
            Hubungkan HP Android
          </h3>
        </div>
        <p className="text-[11px] text-zinc-400 mb-3.5 leading-relaxed">
          Scan QR Code untuk membuka ENCross langsung di HP Anda.
        </p>

        {/* QR Code */}
        <div className="bg-white p-3 rounded-xl inline-block mx-auto mb-3 shadow-md border border-zinc-200">
          <QRCodeSVG
            value={joinUrl || window.location.href}
            size={165}
            level="M"
            includeMargin={false}
          />
        </div>

        {/* Auto Close Indicator Badge */}
        <div className="flex items-center justify-center gap-1.5 text-[10px] text-zinc-400 bg-zinc-950/80 border border-zinc-800 py-1 px-2.5 rounded-md mb-3 font-mono">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>Otomatis tertutup begitu HP terhubung</span>
        </div>

        {/* Action Buttons: Direct APK & GitHub */}
        <div className="grid grid-cols-2 gap-2 mb-3">
          {/* Direct APK Download via LAN */}
          <a
            href="/api/download-apk"
            download="ENCross.apk"
            className="flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-2 px-2.5 rounded-xl text-xs transition cursor-pointer shadow-sm active:scale-95"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Unduh APK</span>
          </a>

          {/* GitHub Releases Link */}
          <a
            href="https://github.com/EdvanVPRoject/ENCross"
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-center gap-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700/60 font-medium py-2 px-2.5 rounded-xl text-xs transition cursor-pointer active:scale-95"
          >
            <ExternalLink className="w-3.5 h-3.5 text-zinc-400" />
            <span>GitHub</span>
          </a>
        </div>

        {/* Copyable Web URL */}
        <div className="bg-zinc-950 border border-zinc-800/80 rounded-xl p-2 flex items-center justify-between gap-2 text-left">
          <div className="truncate text-[11px] text-zinc-400 font-mono flex-1">
            {joinUrl || window.location.href}
          </div>
          <button
            onClick={handleCopy}
            className="py-1 px-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-xs flex items-center gap-1 transition cursor-pointer shrink-0 border border-zinc-700/60"
            title="Salin tautan"
          >
            {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            <span className="text-[11px] font-medium">{copied ? 'Tersalin' : 'Salin'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
