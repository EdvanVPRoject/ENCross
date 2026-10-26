import React, { useState, useRef, useEffect } from 'react';
import { Wifi, ArrowRight, QrCode, Camera, AlertCircle, X, Check } from 'lucide-react';
import { triggerHaptic, playSound } from '../utils/feedback';
import logoImg from '../assets/logo.png';

export function ServerIpModal({ isOpen, onClose, onSave, currentIp, isMobile = false }) {
  const [activeTab, setActiveTab] = useState(isMobile ? 'qr' : 'ip'); // 'qr' | 'ip'
  const [ip, setIp] = useState(currentIp || '');
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState('');
  const [scannedSuccess, setScannedSuccess] = useState(false);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const scanIntervalRef = useRef(null);

  // Stop camera when closing or switching tab
  const stopCamera = () => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsScanning(false);
  };

  useEffect(() => {
    if (isOpen) {
      setActiveTab(isMobile ? 'qr' : 'ip');
      setIp(currentIp || '');
    } else {
      stopCamera();
      setScanError('');
      setScannedSuccess(false);
    }
  }, [isOpen, isMobile, currentIp]);

  useEffect(() => {
    if (activeTab !== 'qr') {
      stopCamera();
    }
  }, [activeTab]);

  // Start live QR scanner
  const startCamera = async () => {
    setScanError('');
    setIsScanning(true);
    triggerHaptic([30]);

    try {
      const constraints = {
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      // Check if BarcodeDetector API is supported (Android Chrome / Modern WebViews)
      if ('BarcodeDetector' in window) {
        const detector = new window.BarcodeDetector({ formats: ['qr_code'] });
        scanIntervalRef.current = setInterval(async () => {
          if (!videoRef.current || videoRef.current.readyState < 2) return;
          try {
            const barcodes = await detector.detect(videoRef.current);
            if (barcodes && barcodes.length > 0) {
              const rawValue = barcodes[0].rawValue || '';
              // Match IP from URL or text
              const ipMatch = rawValue.match(/(?:https?:\/\/)?((?:\d{1,3}\.){3}\d{1,3})/);
              if (ipMatch && ipMatch[1]) {
                const detectedIp = ipMatch[1];
                stopCamera();
                setScannedSuccess(true);
                playSound('complete');
                triggerHaptic([50, 50]);
                setTimeout(() => {
                  onSave(detectedIp);
                }, 400);
              }
            }
          } catch (_) {}
        }, 250);
      } else {
        setScanError('Scanner otomatis tidak didukung browser ini. Silakan scan dengan kamera bawaan HP / Google Lens, atau masukkan IP manual.');
      }
    } catch (err) {
      console.warn('Camera access error:', err);
      setIsScanning(false);
      setScanError('Tidak dapat mengakses kamera. Pastikan izin kamera aktif, atau gunakan opsi Ketik Alamat IP.');
    }
  };

  if (!isOpen) return null;

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (!ip.trim()) return;
    triggerHaptic([30]);
    onSave(ip.trim());
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
      <div className="apple-card border border-black/10 dark:border-white/10 rounded-3xl w-full max-w-sm p-6 shadow-2xl relative text-left animate-ios-sheet smooth-gpu">
        {onClose && (
          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="ios-pressable absolute top-4 right-4 p-1.5 text-zinc-400 hover:text-zinc-900 dark:hover:text-white rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        <div className="text-center mb-5">
          <div className="w-12 h-12 mx-auto mb-2 flex items-center justify-center">
            <img
              src={logoImg}
              alt="ENCross"
              className="w-full h-full object-contain filter drop-shadow-sm select-none"
            />
          </div>
          <h3 className="text-base font-semibold text-zinc-900 dark:text-white">
            {isMobile ? 'Sambungkan ke Laptop' : 'Sambungkan ke Laptop Lain'}
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
            {isMobile
              ? 'Pilih cara menghubungkan HP Anda ke aplikasi laptop:'
              : 'Masukkan alamat IP laptop target untuk terhubung ke sesi yang sama dalam satu jaringan Wi-Fi/LAN:'}
          </p>
        </div>

        {/* 2 Options Switcher Tabs - Apple Segmented Capsule */}
        <div className="grid grid-cols-2 gap-1 bg-black/5 dark:bg-white/8 p-1 rounded-full border border-black/5 dark:border-white/5 mb-4 text-xs font-medium">
          <button
            type="button"
            onClick={() => {
              setActiveTab('ip');
              stopCamera();
            }}
            className={`ios-pressable py-1.5 px-2 rounded-full flex items-center justify-center gap-1.5 transition cursor-pointer ${
              activeTab === 'ip'
                ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-xs font-semibold'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            <Wifi className="w-3.5 h-3.5" />
            <span>Ketik Alamat IP</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('qr');
              setScanError('');
            }}
            className={`ios-pressable py-1.5 px-2 rounded-full flex items-center justify-center gap-1.5 transition cursor-pointer ${
              activeTab === 'qr'
                ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-xs font-semibold'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>Scan QR Code</span>
          </button>
        </div>

        {/* Tab 1: Scan QR Code */}
        {activeTab === 'qr' && (
          <div className="space-y-3">
            {scannedSuccess ? (
              <div className="py-8 text-center text-emerald-500 flex flex-col items-center gap-2">
                <Check className="w-8 h-8 animate-bounce" />
                <span className="text-xs font-medium">QR Berhasil Terdeteksi! Menyambungkan...</span>
              </div>
            ) : isScanning ? (
              <div className="relative rounded-2xl overflow-hidden bg-black aspect-video flex items-center justify-center border border-black/10 dark:border-white/10">
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
                {/* Viewfinder Target */}
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <div className="w-28 h-28 border-2 border-[#0071e3] rounded-2xl animate-pulse" />
                </div>
              </div>
            ) : (
              <div className="bg-black/3 dark:bg-white/5 border border-black/8 dark:border-white/10 rounded-2xl p-4 text-center">
                <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed mb-3">
                  Arahkan kamera ke <strong>QR Code</strong> yang tampil di aplikasi ENCross pada layar laptop Anda.
                </p>
                <button
                  type="button"
                  onClick={startCamera}
                  className="w-full py-2.5 bg-[#0071e3] hover:bg-[#0077ed] text-white rounded-full text-xs font-medium flex items-center justify-center gap-2 transition cursor-pointer active:scale-95 shadow-sm"
                >
                  <Camera className="w-4 h-4" />
                  <span>Buka Kamera Scanner</span>
                </button>
              </div>
            )}

            {scanError && (
              <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 text-xs leading-relaxed flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-500" />
                <span>{scanError}</span>
              </div>
            )}

            {isScanning && (
              <button
                type="button"
                onClick={stopCamera}
                className="w-full py-2 bg-black/5 dark:bg-white/8 hover:bg-black/10 dark:hover:bg-white/12 text-zinc-700 dark:text-zinc-300 rounded-full text-xs font-medium transition cursor-pointer"
              >
                Hentikan Scanner
              </button>
            )}
          </div>
        )}

        {/* Tab 2: Manual IP Input */}
        {activeTab === 'ip' && (
          <form onSubmit={handleManualSubmit} className="space-y-4">
            <div>
              <label className="text-[11px] font-medium text-zinc-600 dark:text-zinc-400 block mb-1">
                {isMobile ? 'Alamat IP Laptop' : 'Alamat IP Laptop Lawan / Host'}
              </label>
              <input
                type="text"
                value={ip}
                onChange={(e) => setIp(e.target.value)}
                placeholder="Contoh: 192.168.1.15 atau 10.0.0.5"
                className="w-full bg-black/5 dark:bg-white/8 border border-black/8 dark:border-white/10 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:border-[#0071e3] font-mono tracking-wide transition"
                autoFocus
              />
              <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-1.5 leading-relaxed">
                {isMobile
                  ? 'Lihat tulisan IP Laptop di pojok atas aplikasi ENCross pada laptop Anda.'
                  : 'Lihat tulisan IP Laptop di pojok atas aplikasi ENCross pada laptop yang ingin Anda hubungkan.'}
              </p>
            </div>

            <div className="flex gap-2 pt-1">
              {onClose && (
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-2.5 bg-black/5 dark:bg-white/8 hover:bg-black/10 dark:hover:bg-white/12 text-zinc-700 dark:text-zinc-300 rounded-full text-xs font-medium transition cursor-pointer"
                >
                  Batal
                </button>
              )}
              <button
                type="submit"
                disabled={!ip.trim()}
                className="flex-1 py-2.5 bg-[#0071e3] hover:bg-[#0077ed] active:scale-95 disabled:opacity-40 text-white rounded-full text-xs font-medium flex items-center justify-center gap-1.5 transition cursor-pointer shadow-sm"
              >
                <span>Sambungkan</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Tombol Reset ke Server Lokal Sendiri jika sedang terhubung ke IP lain */}
            {currentIp && (
              <div className="pt-2 border-t border-black/8 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => onSave('')}
                  className="w-full py-2 bg-black/4 dark:bg-white/6 hover:bg-black/8 dark:hover:bg-white/10 text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 rounded-full text-xs font-medium transition cursor-pointer"
                >
                  Kembalikan ke Server Lokal Sendiri (Reset)
                </button>
              </div>
            )}
          </form>
        )}
      </div>
    </div>
  );
}

export default ServerIpModal;
