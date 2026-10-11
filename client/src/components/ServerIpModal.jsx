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
        // If BarcodeDetector is not natively supported in this environment
        setScanError('Scanner otomatis tidak didukung browser ini. Silakan scan dengan kamera bawaan HP / Google Lens, atau masukkan IP manual.');
      }
    } catch (err) {
      console.warn('Camera access error:', err);
      setIsScanning(false);
      setScanError('Tidak dapat mengakses kamera. Pastikan izin kamera aktif, atau gunakan opsi Ketik Alamat IP.');
    }
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (ip && ip.trim()) {
      triggerHaptic([35]);
      // Sanitize input (strip http:// or port if user pasted a full URL)
      let cleanIp = ip.trim().replace(/^https?:\/\//i, '');
      cleanIp = cleanIp.split(':')[0].split('/')[0];
      if (cleanIp) {
        onSave(cleanIp);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-sm p-5 shadow-2xl relative">
        {onClose && (
          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="absolute top-4 right-4 p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        <div className="text-center mb-4">
          <div className="w-14 h-14 mx-auto mb-2 flex items-center justify-center">
            <img
              src={logoImg}
              alt="ENCross"
              className="w-full h-full object-contain filter drop-shadow-sm select-none"
            />
          </div>
          <h3 className="text-base font-semibold text-white">
            {isMobile ? 'Sambungkan ke Laptop' : 'Sambungkan ke Laptop Lain'}
          </h3>
          <p className="text-[11px] text-zinc-400 mt-1">
            {isMobile
              ? 'Pilih cara menghubungkan HP Anda ke aplikasi laptop:'
              : 'Masukkan alamat IP laptop target untuk terhubung ke sesi yang sama dalam satu jaringan Wi-Fi/LAN:'}
          </p>
        </div>

        {/* 2 Options Switcher Tabs */}
        <div className="grid grid-cols-2 gap-1.5 bg-zinc-950 p-1 rounded-xl border border-zinc-800 mb-4">
          <button
            type="button"
            onClick={() => {
              setActiveTab('ip');
              stopCamera();
            }}
            className={`py-2 px-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition cursor-pointer ${
              activeTab === 'ip'
                ? 'bg-zinc-800 text-white shadow-xs'
                : 'text-zinc-400 hover:text-zinc-200'
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
            className={`py-2 px-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition cursor-pointer ${
              activeTab === 'qr'
                ? 'bg-zinc-800 text-white shadow-xs'
                : 'text-zinc-400 hover:text-zinc-200'
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
              <div className="py-8 text-center text-emerald-400 flex flex-col items-center gap-2">
                <Check className="w-8 h-8 animate-bounce" />
                <span className="text-xs font-medium">QR Berhasil Terdeteksi! Menyambungkan...</span>
              </div>
            ) : isScanning ? (
              <div className="relative rounded-xl overflow-hidden bg-black aspect-video flex items-center justify-center border border-zinc-700">
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
                {/* Viewfinder Target */}
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <div className="w-28 h-28 border-2 border-emerald-400/80 rounded-lg animate-pulse" />
                </div>
              </div>
            ) : (
              <div className="bg-zinc-950 border border-zinc-800/80 rounded-xl p-3.5 text-center">
                <p className="text-xs text-zinc-300 leading-relaxed mb-3">
                  Arahkan kamera ke <strong>QR Code</strong> yang tampil di aplikasi ENCross pada layar laptop Anda.
                </p>
                <button
                  type="button"
                  onClick={startCamera}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition cursor-pointer active:scale-98 shadow-sm"
                >
                  <Camera className="w-4 h-4" />
                  <span>Buka Kamera Scanner</span>
                </button>
              </div>
            )}

            {scanError && (
              <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px] leading-relaxed flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
                <span>{scanError}</span>
              </div>
            )}

            {isScanning && (
              <button
                type="button"
                onClick={stopCamera}
                className="w-full py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-xs font-medium transition cursor-pointer"
              >
                Hentikan Scanner
              </button>
            )}
          </div>
        )}

        {/* Tab 2: Manual IP Input */}
        {activeTab === 'ip' && (
          <form onSubmit={handleManualSubmit} className="space-y-3.5">
            <div>
              <label className="text-[11px] font-medium text-zinc-400 block mb-1">
                {isMobile ? 'Alamat IP Laptop' : 'Alamat IP Laptop Lawan / Host'}
              </label>
              <input
                type="text"
                value={ip}
                onChange={(e) => setIp(e.target.value)}
                placeholder="Contoh: 192.168.1.15 atau 10.0.0.5"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500/60 font-mono tracking-wide"
                autoFocus
              />
              <p className="text-[10px] text-zinc-500 mt-1.5 leading-relaxed">
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
                  className="flex-1 py-2.5 bg-zinc-800 hover:bg-zinc-700/80 text-zinc-300 rounded-xl text-xs font-medium transition cursor-pointer"
                >
                  Batal
                </button>
              )}
              <button
                type="submit"
                disabled={!ip.trim()}
                className="flex-1 py-2.5 bg-zinc-100 hover:bg-white active:bg-zinc-200 disabled:opacity-40 text-zinc-950 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <span>Sambungkan</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Tombol Reset ke Server Lokal Sendiri jika sedang terhubung ke IP lain */}
            {currentIp && (
              <div className="pt-2 border-t border-zinc-800/80">
                <button
                  type="button"
                  onClick={() => onSave('')}
                  className="w-full py-2 bg-zinc-800/70 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 rounded-xl text-xs font-medium transition cursor-pointer"
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
