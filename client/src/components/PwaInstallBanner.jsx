import React, { useState } from 'react';
import { Download, Smartphone, X } from 'lucide-react';

export function PwaInstallBanner({ selfInfo }) {
  const [dismissed, setDismissed] = useState(false);

  // Check if running inside native Android app (Capacitor) or installed standalone PWA
  const isNativeApp =
    (typeof window !== 'undefined' && window.Capacitor?.isNativePlatform()) ||
    window.location.protocol === 'capacitor:' ||
    (window.location.hostname === 'localhost' && /Android/i.test(navigator.userAgent));

  const isStandalone =
    typeof window !== 'undefined' &&
    (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true);

  // ONLY show on mobile web browser. If inside native app, standalone, laptop/PC, or dismissed, do NOT render!
  const isMobile = selfInfo?.deviceType === 'mobile' || /Android|iPhone/i.test(navigator.userAgent);

  if (isNativeApp || isStandalone || !isMobile || dismissed) {
    return null;
  }

  return (
    <div className="w-full max-w-6xl mx-auto px-3 sm:px-6 mb-2">
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 flex items-center justify-between gap-2 shadow-sm">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700/60 flex items-center justify-center text-emerald-400 shrink-0">
            <Smartphone className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h4 className="text-xs font-semibold text-white truncate">
              Unduh Aplikasi Android (APK)
            </h4>
            <p className="text-[11px] text-zinc-400 truncate">
              Pasang aplikasi native ENCross untuk akses cepat dan stabil
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <a
            href="/api/download-apk"
            download="ENCross.apk"
            className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-3 py-1.5 rounded-lg text-xs transition cursor-pointer shadow-xs active:scale-95"
            title="Unduh file APK langsung"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Unduh APK</span>
          </a>
          <button
            onClick={() => setDismissed(true)}
            className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition cursor-pointer"
            title="Tutup banner"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
