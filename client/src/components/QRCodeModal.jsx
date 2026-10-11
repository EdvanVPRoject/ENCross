import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X, Copy, Check, Download, ExternalLink, Smartphone, Laptop, Wifi, Radio, Plus } from 'lucide-react';

export function QRCodeModal({ isOpen, onClose, joinUrl, roomId, localIp, onOpenManualIp }) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(joinUrl || window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const displayUrl = joinUrl || window.location.href;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-sm p-4 sm:p-5 shadow-2xl relative text-center max-h-[92vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3.5 right-3.5 p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Title */}
        <div className="flex items-center justify-center gap-2 mb-1">
          <div className="p-1 rounded-lg bg-emerald-500/15 text-emerald-400">
            <Plus className="w-4 h-4 stroke-[2.5]" />
          </div>
          <h3 className="text-sm sm:text-base font-semibold text-white">
            Tambahkan Perangkat
          </h3>
        </div>
        <p className="text-[11px] text-zinc-400 mb-3.5 leading-relaxed">
          Hubungkan HP, Laptop, atau Tablet lain di Wi-Fi yang sama untuk transfer file & siaran.
        </p>

        {/* QR Code */}
        <div className="bg-white p-3 rounded-xl inline-block mx-auto mb-2.5 shadow-md border border-zinc-200">
          <QRCodeSVG
            value={displayUrl}
            size={165}
            level="M"
            includeMargin={false}
          />
        </div>
        <p className="text-[10px] text-zinc-400 mb-3">
          📱 <strong>HP / Tablet:</strong> Scan QR Code dengan kamera ponsel
        </p>

        {/* Copyable Web URL for Other Laptop / PC */}
        <div className="bg-zinc-950 border border-zinc-800/80 rounded-xl p-2.5 mb-3 text-left">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-zinc-400 font-semibold flex items-center gap-1">
              <Laptop className="w-3 h-3 text-emerald-400" />
              Untuk Laptop / PC Lain:
            </span>
            <span className="text-[9px] text-zinc-500">Buka di browser</span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <div className="truncate text-[11px] text-emerald-400 font-mono flex-1">
              {displayUrl}
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

        {/* Option to Connect to Another Laptop via IP */}
        {onOpenManualIp && (
          <button
            onClick={() => {
              onClose();
              onOpenManualIp();
            }}
            className="w-full mb-3 py-2 px-3 bg-zinc-950 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 hover:border-zinc-700 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 transition cursor-pointer active:scale-98"
          >
            <Wifi className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>Masukkan IP Laptop Lain (Koneksi Antar-PC)</span>
          </button>
        )}

        {/* Action Buttons: Direct APK & GitHub */}
        <div className="grid grid-cols-2 gap-2 mb-3">
          {/* Direct APK Download via LAN */}
          <a
            href="/api/download-apk"
            download="ENCross.apk"
            className="flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-2 px-2.5 rounded-xl text-xs transition cursor-pointer shadow-sm active:scale-95"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Unduh APK HP</span>
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

        {/* Developer Credit */}
        <div className="pt-2 border-t border-zinc-800/80 text-[10px] text-zinc-500 flex items-center justify-center gap-1">
          <span>Dikembangkan oleh</span>
          <span className="text-zinc-300 font-semibold">Edvan</span>
          <span className="text-zinc-600">•</span>
          <span className="text-zinc-400 font-mono">ENCross</span>
        </div>
      </div>
    </div>
  );
}
