import React, { useEffect, useState } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  Shield,
  Smartphone,
  Laptop,
  Tablet,
  Check,
  X,
  RefreshCw,
  Link
} from 'lucide-react';
import { triggerHaptic } from '../utils/feedback';

export function PairingModal({
  isOpen,
  mode = 'requesting', // 'requesting' | 'incoming'
  pin = '0000',
  targetPeer,
  requester,
  onAccept,
  onReject,
  onClose
}) {
  const [countdown, setCountdown] = useState(30);

  useEffect(() => {
    if (!isOpen) {
      setCountdown(30);
      return;
    }

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          if (onClose) onClose();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const getDeviceIcon = (deviceType, className = 'w-6 h-6') => {
    switch (deviceType?.toLowerCase()) {
      case 'mobile':
      case 'smartphone':
        return <Smartphone className={`${className} text-blue-500`} />;
      case 'tablet':
        return <Tablet className={`${className} text-indigo-500`} />;
      case 'desktop':
      case 'laptop':
      default:
        return <Laptop className={`${className} text-emerald-500`} />;
    }
  };

  const digits = (pin || '0000').slice(0, 4).split('');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-md animate-fadeIn">
      <div className="apple-card border border-black/10 dark:border-white/10 rounded-3xl w-full max-w-sm sm:max-w-md p-5 sm:p-6 shadow-2xl relative text-center max-h-[92vh] overflow-y-auto animate-ios-sheet smooth-gpu">
        {/* Close Button */}
        <button
          onClick={() => {
            triggerHaptic([20]);
            if (mode === 'incoming' && onReject) onReject();
            else if (onClose) onClose();
          }}
          className="ios-pressable absolute top-4 right-4 p-1.5 rounded-full text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {mode === 'requesting' ? (
          /* ================= MODE A: SENDER / REQUESTING ================= */
          <div className="flex flex-col items-center">
            {/* Pulsing Icon */}
            <div className="relative mb-3">
              <div className="w-16 h-16 rounded-full bg-blue-500/10 dark:bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                <Link className="w-8 h-8 animate-pulse" />
              </div>
              <span className="absolute bottom-0 right-0 w-4 h-4 rounded-full bg-blue-500 border-2 border-white dark:border-zinc-900 animate-ping" />
            </div>

            <h3 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-white mb-1">
              Menghubungkan & Memasangkan
            </h3>

            <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-4 px-2 leading-relaxed">
              Konfirmasi pairing telah dikirim ke{' '}
              <strong className="text-zinc-800 dark:text-zinc-200">
                {targetPeer?.name || 'Perangkat Tujuan'}
              </strong>
              . Buka perangkat tersebut untuk menyetujui.
            </p>

            {/* Big 4-Digit PIN */}
            <div className="flex items-center justify-center gap-2.5 sm:gap-3.5 my-3">
              {digits.map((d, i) => (
                <div
                  key={i}
                  className="w-12 h-14 sm:w-14 sm:h-16 rounded-2xl bg-black/4 dark:bg-white/6 border-2 border-blue-500/40 dark:border-blue-500/50 flex items-center justify-center text-2xl sm:text-3xl font-mono font-extrabold text-blue-600 dark:text-blue-400 shadow-inner"
                >
                  {d}
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400 font-mono mt-2 mb-5">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-500" />
              <span>Menunggu persetujuan... ({countdown}s)</span>
            </div>

            {/* Cancel Button */}
            <button
              onClick={() => {
                triggerHaptic([25]);
                if (onClose) onClose();
              }}
              className="w-full py-2.5 px-4 rounded-full bg-black/5 hover:bg-black/10 dark:bg-white/8 dark:hover:bg-white/12 text-zinc-700 dark:text-zinc-300 border border-black/8 dark:border-white/10 text-xs font-semibold transition active:scale-95 cursor-pointer"
            >
              Batalkan
            </button>
          </div>
        ) : (
          /* ================= MODE B: RECEIVER / INCOMING ================= */
          <div className="flex flex-col items-center">
            {/* Header Icon */}
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 dark:bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-3 shadow-xs">
              <ShieldCheck className="w-8 h-8 stroke-[2.2]" />
            </div>

            <h3 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-white mb-1">
              Permintaan Pairing Masuk
            </h3>

            <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-4 leading-relaxed">
              Perangkat berikut ingin memasangkan koneksi secara permanen & menyinkronkan status:
            </p>

            {/* Requester Profile Card */}
            <div className="w-full bg-black/4 dark:bg-white/6 border border-black/8 dark:border-white/10 rounded-2xl p-3 mb-4 text-left flex items-center gap-3">
              <div className="p-2.5 bg-black/5 dark:bg-white/8 rounded-xl shrink-0">
                {getDeviceIcon(requester?.deviceType, 'w-6 h-6')}
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="text-sm font-bold text-zinc-900 dark:text-white truncate">
                  {requester?.name || 'Perangkat Baru'}
                </h4>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-mono mt-0.5 truncate">
                  {requester?.os || 'System'} • {requester?.ip || requester?.clientIp || 'Wi-Fi LAN'}
                </p>
              </div>
            </div>

            {/* Big 4-Digit PIN */}
            <div className="w-full bg-blue-500/5 dark:bg-blue-500/10 border border-blue-500/20 rounded-2xl p-3 mb-4">
              <span className="text-[10px] uppercase tracking-wider font-semibold text-blue-600 dark:text-blue-400 block mb-2 font-mono">
                KODE VERIFIKASI PAIRING
              </span>
              <div className="flex items-center justify-center gap-2.5 sm:gap-3.5">
                {digits.map((d, i) => (
                  <div
                    key={i}
                    className="w-11 h-13 sm:w-13 sm:h-15 rounded-xl bg-white dark:bg-zinc-800 border-2 border-blue-500 flex items-center justify-center text-2xl sm:text-3xl font-mono font-extrabold text-blue-600 dark:text-blue-400 shadow-sm"
                  >
                    {d}
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-2 font-sans">
                Pastikan angka PIN di atas sama dengan yang tertera pada layar pengirim.
              </p>
            </div>

            {/* Actions: Tolak / Terima */}
            <div className="grid grid-cols-2 gap-2.5 w-full">
              <button
                onClick={() => {
                  triggerHaptic([25]);
                  if (onReject) onReject();
                }}
                className="py-2.5 px-4 rounded-full bg-red-500/10 hover:bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/20 text-xs font-semibold transition active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
              >
                <X className="w-3.5 h-3.5" />
                <span>Tolak</span>
              </button>

              <button
                onClick={() => {
                  triggerHaptic([35]);
                  if (onAccept) onAccept();
                }}
                className="py-2.5 px-4 rounded-full bg-[#0071e3] hover:bg-[#0077ed] text-white text-xs font-semibold transition active:scale-95 cursor-pointer shadow-md flex items-center justify-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Terima & Pasangkan</span>
              </button>
            </div>

            <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono mt-3">
              Otomatis ditolak dalam {countdown} detik
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
