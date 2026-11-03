import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X, Copy, Check, ExternalLink, Watch, Play, Tv, Lock, Smartphone, Wifi, Radio } from 'lucide-react';
import { triggerHaptic } from '../utils/feedback';

export function WearOsRemoteModal({ isOpen, onClose, serverIp, port = 3001 }) {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState('qr'); // 'qr' | 'preview'

  if (!isOpen) return null;

  const currentHost = serverIp || window.location.hostname || '192.168.18.4';
  const watchUrl = `http://${currentHost}:${port}/watch`;

  const handleCopy = () => {
    triggerHaptic([30]);
    navigator.clipboard?.writeText(watchUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md rounded-3xl bg-white dark:bg-zinc-900 border border-black/10 dark:border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-ios-sheet smooth-gpu">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-black/5 dark:border-white/5 bg-zinc-50/50 dark:bg-zinc-800/40">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              <Watch className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                <span>Wear OS Remote</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  Siap Pakai
                </span>
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                Kendalikan PC dari pergelangan tangan Anda
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              triggerHaptic([20]);
              onClose();
            }}
            className="p-2 rounded-xl text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-black/5 dark:hover:bg-white/5 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex p-2 gap-2 bg-zinc-100/70 dark:bg-zinc-950/40 border-b border-black/5 dark:border-white/5">
          <button
            onClick={() => {
              triggerHaptic([20]);
              setActiveTab('qr');
            }}
            className={`flex-1 py-2 text-xs font-semibold rounded-xl transition cursor-pointer ${
              activeTab === 'qr'
                ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm'
                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200'
            }`}
          >
            QR & Panduan Jam
          </button>
          <button
            onClick={() => {
              triggerHaptic([20]);
              setActiveTab('preview');
            }}
            className={`flex-1 py-2 text-xs font-semibold rounded-xl transition cursor-pointer ${
              activeTab === 'preview'
                ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm'
                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200'
            }`}
          >
            Simulator Layar Jam
          </button>
        </div>

        {/* Body Content */}
        <div className="p-5 overflow-y-auto space-y-4">
          {activeTab === 'qr' ? (
            <>
              {/* QR Code Container */}
              <div className="flex flex-col items-center justify-center p-6 bg-zinc-50 dark:bg-black/40 rounded-2xl border border-black/5 dark:border-white/5 shadow-inner">
                <div className="p-3 bg-white rounded-2xl shadow-md border border-zinc-200">
                  <QRCodeSVG
                    value={watchUrl}
                    size={170}
                    level="M"
                    includeMargin={false}
                  />
                </div>
                <div className="flex items-center gap-1.5 mt-3 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>Scan langsung via browser atau kamera jam tangan</span>
                </div>
              </div>

              {/* URL Box & Copy */}
              <div className="flex items-center gap-2 p-2.5 rounded-2xl bg-zinc-100 dark:bg-zinc-800/60 border border-black/5 dark:border-white/5">
                <div className="flex-1 px-2 font-mono text-xs text-zinc-700 dark:text-zinc-300 truncate select-all">
                  {watchUrl}
                </div>
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-95 text-white font-semibold text-xs transition cursor-pointer shadow-sm"
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Tersalin' : 'Salin'}</span>
                </button>
                <a
                  href={watchUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="p-1.5 rounded-xl text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-black/5 dark:hover:bg-white/5 transition"
                  title="Buka di tab baru"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>

              {/* How to use Guide */}
              <div className="space-y-2.5 pt-2">
                <h4 className="text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
                  Cara Membuka di Jam Tangan Wear OS:
                </h4>
                <div className="space-y-2 text-xs text-zinc-600 dark:text-zinc-400">
                  <div className="flex items-start gap-2.5 p-2 rounded-xl bg-black/3 dark:bg-white/5 border border-black/5 dark:border-white/5">
                    <span className="w-5 h-5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold flex items-center justify-center shrink-0 text-[11px]">
                      1
                    </span>
                    <span>Pastikan jam tangan Wear OS terhubung ke jaringan Wi-Fi yang sama dengan PC.</span>
                  </div>
                  <div className="flex items-start gap-2.5 p-2 rounded-xl bg-black/3 dark:bg-white/5 border border-black/5 dark:border-white/5">
                    <span className="w-5 h-5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold flex items-center justify-center shrink-0 text-[11px]">
                      2
                    </span>
                    <span>Buka browser di jam (misalnya <b>Samsung Internet</b> atau <b>Wear Browser</b>).</span>
                  </div>
                  <div className="flex items-start gap-2.5 p-2 rounded-xl bg-black/3 dark:bg-white/5 border border-black/5 dark:border-white/5">
                    <span className="w-5 h-5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold flex items-center justify-center shrink-0 text-[11px]">
                      3
                    </span>
                    <span>Buka link di atas, lalu <b>Bookmark</b> atau tambahkan ke layar utama jam tangan agar bisa dibuka dalam 1 ketukan kapan saja!</span>
                  </div>
                </div>
              </div>
            </>
          ) : (
            /* Circular Watch Simulator Preview */
            <div className="flex flex-col items-center justify-center py-2">
              <div className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-3">
                Preview tampilan interaktif di jam tangan:
              </div>
              {/* Outer Watch Bezel */}
              <div className="relative w-72 h-72 rounded-full p-2 bg-gradient-to-b from-zinc-700 via-zinc-900 to-zinc-950 shadow-2xl border-4 border-zinc-800 flex items-center justify-center">
                <div className="w-full h-full rounded-full overflow-hidden bg-black shadow-inner">
                  <iframe
                    src={watchUrl}
                    title="Wear OS Simulator"
                    className="w-full h-full border-0 select-none"
                  />
                </div>
              </div>
              <div className="text-[11px] text-zinc-400 mt-3 text-center">
                Geser (swipe) kiri/kanan di dalam layar jam untuk berganti antara <b>Media</b>, <b>Slide Clicker</b>, <b>Aksi PC</b>, dan <b>Touchpad</b>.
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-black/5 dark:border-white/5 bg-zinc-50/50 dark:bg-zinc-800/40 flex justify-end">
          <button
            onClick={() => {
              triggerHaptic([20]);
              onClose();
            }}
            className="px-5 py-2 rounded-xl bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300 dark:hover:bg-zinc-600 text-zinc-800 dark:text-zinc-200 text-xs font-semibold transition cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
