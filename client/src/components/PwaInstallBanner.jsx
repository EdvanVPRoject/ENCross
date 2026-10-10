import React, { useState, useEffect } from 'react';
import { Download, Smartphone, X, Check, HelpCircle } from 'lucide-react';
import { triggerHaptic, playSound } from '../utils/feedback';

export function PwaInstallBanner({ selfInfo }) {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  // ONLY show this banner on Mobile (HP Android), NEVER on PC/Laptop
  const isMobile = selfInfo?.deviceType === 'mobile' || /Android|iPhone/i.test(navigator.userAgent);

  useEffect(() => {
    // Check if already running standalone (as installed app)
    if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true) {
      setIsInstalled(true);
      return;
    }

    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handler);

    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      playSound('complete');
    });

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    triggerHaptic([40]);
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    } else {
      // Show Android installation instructions
      setShowGuide(true);
    }
  };

  // If on laptop/PC desktop, or already installed, do not render
  if (!isMobile || isInstalled || dismissed) return null;

  return (
    <>
      <div className="w-full max-w-6xl mx-auto px-3 sm:px-6 mb-2">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 flex items-center justify-between gap-2 shadow-sm">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700/60 flex items-center justify-center text-emerald-400 shrink-0">
              <Smartphone className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h4 className="text-xs font-semibold text-white truncate">
                Pasang Aplikasi di HP Android
              </h4>
              <p className="text-[11px] text-zinc-400 truncate">
                Akses cepat dari Home Screen tanpa URL bar browser
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={handleInstallClick}
              className="flex items-center gap-1.5 bg-zinc-100 hover:bg-white active:scale-95 text-zinc-950 font-semibold px-2.5 py-1.5 rounded-lg text-xs transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Pasang App</span>
            </button>
            <button
              onClick={() => setDismissed(true)}
              className="p-1.5 text-zinc-400 hover:text-white rounded hover:bg-zinc-800 transition"
              title="Tutup banner"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Android Manual Install Guide Modal */}
      {showGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 max-w-sm w-full relative">
            <button
              onClick={() => setShowGuide(false)}
              className="absolute top-3.5 right-3.5 p-1 text-zinc-400 hover:text-white rounded hover:bg-zinc-800"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2 mb-3">
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <Smartphone className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-semibold text-white">
                Cara Pasang di HP Android
              </h3>
            </div>

            <div className="space-y-3 text-xs text-zinc-300 mb-5">
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-[11px] font-mono shrink-0 text-white">
                  1
                </span>
                <p>
                  Ketuk ikon <strong>titik tiga (⋮)</strong> di pojok kanan atas browser Chrome Android Anda.
                </p>
              </div>

              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-[11px] font-mono shrink-0 text-white">
                  2
                </span>
                <p>
                  Pilih menu <strong>"Tambahkan ke Layar Utama"</strong> atau <strong>"Pasang Aplikasi"</strong>.
                </p>
              </div>

              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-[11px] font-mono shrink-0 text-white">
                  3
                </span>
                <p>
                  Aplikasi <strong>VanCross</strong> akan otomatis terpasang di menu utama HP Anda layaknya aplikasi native!
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowGuide(false)}
              className="w-full bg-zinc-100 hover:bg-white text-zinc-950 font-semibold py-2 rounded-lg text-xs transition"
            >
              Mengerti & Siap Pasang
            </button>
          </div>
        </div>
      )}
    </>
  );
}
