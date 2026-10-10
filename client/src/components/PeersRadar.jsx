import React, { useRef } from 'react';
import { Laptop, Smartphone, Tablet, Upload, MessageSquare, MonitorPlay, QrCode, Wifi, Activity } from 'lucide-react';
import { triggerHaptic } from '../utils/feedback';

export function PeersRadar({
  peers,
  onSendFile,
  onOpenTextSync,
  onStartScreenShare,
  onOpenQR
}) {
  const fileInputRef = useRef(null);
  const selectedPeerRef = useRef(null);

  const handleFileSelect = (peerId) => {
    triggerHaptic([35]);
    selectedPeerRef.current = peerId;
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file && selectedPeerRef.current) {
      onSendFile(selectedPeerRef.current, file);
    }
  };

  const getDeviceIcon = (type) => {
    switch (type) {
      case 'mobile':
        return <Smartphone className="w-5 h-5 sm:w-6 sm:h-6 text-zinc-300" />;
      case 'tablet':
        return <Tablet className="w-5 h-5 sm:w-6 sm:h-6 text-zinc-300" />;
      default:
        return <Laptop className="w-5 h-5 sm:w-6 sm:h-6 text-zinc-300" />;
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto py-4 sm:py-8 px-3 sm:px-6">
      {/* Hidden file input with mobile photo/document capture */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
      />

      {peers.length === 0 ? (
        /* Waiting / Empty State */
        <div className="flex flex-col items-center justify-center py-12 sm:py-20 text-center">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 mb-4">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-zinc-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-zinc-500" />
            </span>
          </div>

          <h2 className="text-base sm:text-lg font-semibold text-white mb-1.5 tracking-tight">
            Menunggu Perangkat Lain
          </h2>
          <p className="text-zinc-400 text-xs max-w-xs sm:max-w-sm mb-5 leading-relaxed px-2">
            Pastikan kedua perangkat di Wi-Fi yang sama, lalu scan QR Code di bawah menggunakan smartphone.
          </p>

          <button
            onClick={() => {
              triggerHaptic([30]);
              onOpenQR();
            }}
            className="flex items-center gap-2 bg-zinc-100 hover:bg-white active:bg-zinc-200 text-zinc-950 font-medium px-4 py-2.5 rounded-lg text-xs transition cursor-pointer"
          >
            <QrCode className="w-4 h-4" />
            <span>Tampilkan QR Code</span>
          </button>
        </div>
      ) : (
        /* Connected Peers Grid */
        <div>
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-zinc-800">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-semibold text-white tracking-tight">
                  Perangkat Terdeteksi
                </h2>
                <span className="text-[10px] sm:text-[11px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.2 rounded-md font-mono">
                  {peers.length} Online
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                Kirim file, teks, atau pantau layar secara real-time.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {peers.map((peer) => (
              <div
                key={peer.id}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const file = e.dataTransfer.files?.[0];
                  if (file) onSendFile(peer.id, file);
                }}
                className="bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-xl p-4 sm:p-5 transition-all flex flex-col justify-between shadow-sm"
              >
                <div>
                  {/* Top Bar: Icon & Ping Status */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="p-2 sm:p-2.5 bg-zinc-800/90 border border-zinc-700/60 rounded-lg">
                      {getDeviceIcon(peer.deviceType)}
                    </div>
                    <div className="flex items-center gap-1.5 text-zinc-400 text-xs">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="font-mono text-[11px] text-emerald-400">P2P LAN</span>
                    </div>
                  </div>

                  {/* Device Name & Details */}
                  <h3 className="text-sm sm:text-base font-semibold text-white truncate mb-1">
                    {peer.name}
                  </h3>
                  <div className="flex items-center gap-2 text-[11px] text-zinc-400 mb-4 font-mono">
                    <span className="bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-300">{peer.os}</span>
                    <span>•</span>
                    <span className="bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-300">{peer.browser}</span>
                  </div>
                </div>

                {/* Actions with Large Tactile Touch Targets */}
                <div className="space-y-2 pt-3 border-t border-zinc-800">
                  {/* Send File Button */}
                  <button
                    onClick={() => handleFileSelect(peer.id)}
                    className="w-full flex items-center justify-center gap-2 bg-zinc-100 hover:bg-white active:scale-[0.98] text-zinc-950 font-semibold py-2.5 px-3 rounded-lg text-xs transition cursor-pointer shadow-sm"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Kirim File / Foto</span>
                  </button>

                  <div className="grid grid-cols-2 gap-2">
                    {/* Send Text */}
                    <button
                      onClick={() => {
                        triggerHaptic([30]);
                        onOpenTextSync(peer);
                      }}
                      className="flex items-center justify-center gap-1.5 bg-zinc-800 hover:bg-zinc-700 active:scale-[0.98] text-zinc-200 border border-zinc-700/60 py-2 px-2 rounded-lg text-xs font-medium transition cursor-pointer"
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-zinc-400" />
                      <span>Kirim Teks</span>
                    </button>

                    {/* Screen Share */}
                    <button
                      onClick={() => {
                        triggerHaptic([30]);
                        onStartScreenShare(peer.id);
                      }}
                      className="flex items-center justify-center gap-1.5 bg-zinc-800 hover:bg-zinc-700 active:scale-[0.98] text-zinc-200 border border-zinc-700/60 py-2 px-2 rounded-lg text-xs font-medium transition cursor-pointer"
                    >
                      <MonitorPlay className="w-3.5 h-3.5 text-zinc-400" />
                      <span>Bagi Layar</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
