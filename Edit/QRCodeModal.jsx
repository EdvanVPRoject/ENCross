import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X, Copy, Check, Download, ExternalLink, Laptop, Wifi, Plus } from 'lucide-react';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-md animate-fadeIn">
      <div className="apple-card border border-black/10 dark:border-white/10 rounded-3xl w-full max-w-sm p-5 sm:p-6 shadow-2xl relative text-center max-h-[92vh] overflow-y-auto animate-ios-sheet smooth-gpu">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="ios-pressable absolute top-4 right-4 p-1.5 rounded-full text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Title */}
        <div className="flex items-center justify-center gap-2 mb-1.5">
          <div className="p-1.5 rounded-full bg-[#0071e3]/10 text-[#0071e3]">
            <Plus className="w-4 h-4 stroke-[2.5]" />
          </div>
          <h3 className="text-base font-semibold text-zinc-900 dark:text-white">
            Tambahkan Perangkat
          </h3>
        </div>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-4 leading-relaxed">
          Hubungkan ponsel atau laptop lain di Wi-Fi yang sama untuk transfer file cepat & kendali jarak jauh.
        </p>

        {/* QR Code */}
        <div className="bg-white p-3.5 rounded-2xl inline-block mx-auto mb-3 shadow-md border border-black/5">
          <QRCodeSVG
            value={displayUrl}
            size={165}
            level="M"
            includeMargin={false}
          />
        </div>
        <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mb-3.5">
          📱 <strong>HP / Tablet:</strong> Scan QR Code dengan kamera ponsel
        </p>

        {/* Copyable Web URL for Other Laptop / PC */}
        <div className="bg-black/4 dark:bg-white/5 border border-black/8 dark:border-white/10 rounded-2xl p-3 mb-3 text-left">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] text-zinc-600 dark:text-zinc-400 font-medium flex items-center gap-1.5">
              <Laptop className="w-3.5 h-3.5 text-[#0071e3]" />
              Untuk Laptop / PC Lain:
            </span>
            <span className="text-[10px] text-zinc-400 dark:text-zinc-500">Buka di browser</span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <div className="truncate text-xs text-[#0071e3] dark:text-blue-400 font-mono flex-1 font-medium">
              {displayUrl}
            </div>
            <button
              onClick={handleCopy}
              className="ios-pressable py-1 px-3 bg-white dark:bg-white/10 hover:bg-zinc-50 dark:hover:bg-white/15 text-zinc-800 dark:text-zinc-200 rounded-full text-xs flex items-center gap-1 transition cursor-pointer shrink-0 border border-black/8 dark:border-white/10 shadow-xs"
              title="Salin tautan"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
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
            className="ios-pressable w-full mb-3 py-2 px-3 bg-black/4 dark:bg-white/5 hover:bg-black/8 dark:hover:bg-white/10 text-zinc-700 dark:text-zinc-300 border border-black/8 dark:border-white/10 rounded-full text-xs font-medium flex items-center justify-center gap-1.5 transition cursor-pointer"
          >
            <Wifi className="w-3.5 h-3.5 text-[#0071e3] shrink-0" />
            <span>Masukkan IP Laptop Lain (Koneksi Antar-PC)</span>
          </button>
        )}

        {/* Action Buttons: Direct APK & GitHub */}
        <div className="grid grid-cols-2 gap-2 mb-3">
          {/* Direct APK Download via LAN */}
          <a
            href="/api/download-apk"
            download="ENCross.apk"
            className="ios-pressable flex items-center justify-center gap-1.5 bg-[#0071e3] hover:bg-[#0077ed] text-white font-medium py-2.5 px-3 rounded-full text-xs transition cursor-pointer shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Unduh APK HP</span>
          </a>

          {/* GitHub Releases Link */}
          <a
            href="https://github.com/EdvanVPRoject/ENCross"
            target="_blank"
            rel="noreferrer"
            className="ios-pressable flex items-center justify-center gap-1.5 bg-black/5 dark:bg-white/8 hover:bg-black/10 dark:hover:bg-white/12 text-zinc-800 dark:text-zinc-200 border border-black/8 dark:border-white/10 font-medium py-2.5 px-3 rounded-full text-xs transition cursor-pointer"
          >
            <ExternalLink className="w-3.5 h-3.5 text-zinc-500" />
            <span>GitHub</span>
          </a>
        </div>

        {/* Developer Credit */}
        <div className="pt-2.5 border-t border-black/8 dark:border-white/10 text-[10px] text-zinc-400 dark:text-zinc-500 flex items-center justify-center gap-1">
          <span>Dikembangkan oleh</span>
          <span className="text-zinc-700 dark:text-zinc-300 font-medium">Edvan</span>
          <span>•</span>
          <span className="font-mono">ENCross</span>
        </div>
      </div>
    </div>
  );
}
