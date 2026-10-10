import React, { useRef } from 'react';
import { Laptop, Smartphone, Tablet, Upload, MessageSquare, MonitorPlay, QrCode, ShieldCheck, Zap } from 'lucide-react';

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
        return <Smartphone className="w-8 h-8 text-sky-400" />;
      case 'tablet':
        return <Tablet className="w-8 h-8 text-violet-400" />;
      default:
        return <Laptop className="w-8 h-8 text-indigo-400" />;
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto py-8 px-4 sm:px-6">
      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
      />

      {peers.length === 0 ? (
        /* Radar / Waiting State */
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="relative w-64 h-64 flex items-center justify-center mb-8">
            {/* Radar rings */}
            <div className="absolute inset-0 rounded-full border border-indigo-500/20 animate-ping opacity-25" />
            <div className="absolute inset-8 rounded-full border border-indigo-500/30" />
            <div className="absolute inset-16 rounded-full border border-indigo-500/40" />
            <div className="absolute inset-24 rounded-full border border-indigo-500/50" />
            {/* Center Pulsing Hub */}
            <div className="relative w-20 h-20 rounded-full bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center shadow-xl shadow-indigo-500/30">
              <Zap className="w-9 h-9 text-white animate-pulse" />
            </div>
          </div>

          <h2 className="text-2xl font-bold text-white mb-2">
            Mencari Perangkat di Jaringan Lokal...
          </h2>
          <p className="text-slate-400 text-sm max-w-md mb-6 leading-relaxed">
            Buka link ini di smartphone Anda atau scan QR Code untuk mendeteksi perangkat secara instan.
          </p>

          <button
            onClick={onOpenQR}
            className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 via-violet-600 to-pink-600 hover:opacity-90 text-white font-semibold px-6 py-3 rounded-xl shadow-lg shadow-indigo-600/25 transition cursor-pointer active:scale-95"
          >
            <QrCode className="w-5 h-5" />
            <span>Tampilkan QR Code untuk HP</span>
          </button>
        </div>
      ) : (
        /* Connected Peers Grid */
        <div>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <span>Perangkat Terdeteksi</span>
                <span className="text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-medium">
                  {peers.length} Online
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Pilih perangkat di bawah untuk mengirim file, bertukar teks, atau berbagi layar.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {peers.map((peer) => (
              <div
                key={peer.id}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const file = e.dataTransfer.files?.[0];
                  if (file) onSendFile(peer.id, file);
                }}
                className="group relative bg-slate-900/80 border border-slate-800 hover:border-indigo-500/50 rounded-2xl p-5 shadow-lg transition-all hover:shadow-indigo-500/10 flex flex-col justify-between"
              >
                <div>
                  {/* Top Bar: Icon & Status */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="p-3 bg-slate-800/80 border border-slate-700/60 rounded-xl group-hover:scale-105 transition-transform">
                      {getDeviceIcon(peer.deviceType)}
                    </div>
                    <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] px-2.5 py-1 rounded-full font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      <span>P2P Ready</span>
                    </div>
                  </div>

                  {/* Device Name & Details */}
                  <h3 className="text-lg font-bold text-white group-hover:text-indigo-300 transition-colors truncate mb-1">
                    {peer.name}
                  </h3>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 mb-5">
                    <span className="bg-slate-800/70 px-2 py-0.5 rounded text-slate-300">
                      {peer.os}
                    </span>
                    <span>•</span>
                    <span className="bg-slate-800/70 px-2 py-0.5 rounded text-slate-300">
                      {peer.browser}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="space-y-2 pt-2 border-t border-slate-800/70">
                  {/* Send File Button */}
                  <button
                    onClick={() => handleFileSelect(peer.id)}
                    className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-medium py-2.5 px-3 rounded-xl text-xs shadow-md shadow-indigo-600/15 transition cursor-pointer active:scale-95"
                  >
                    <Upload className="w-4 h-4" />
                    <span>Kirim File (Drag / Pilih)</span>
                  </button>

                  <div className="grid grid-cols-2 gap-2">
                    {/* Send Text / Clipboard */}
                    <button
                      onClick={() => onOpenTextSync(peer)}
                      className="flex items-center justify-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 py-2 px-2.5 rounded-xl text-xs font-medium transition cursor-pointer active:scale-95"
                      title="Kirim Catatan / Link Cepat"
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-sky-400" />
                      <span>Kirim Teks</span>
                    </button>

                    {/* Screen Share / Monitor */}
                    <button
                      onClick={() => onStartScreenShare(peer.id)}
                      className="flex items-center justify-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 py-2 px-2.5 rounded-xl text-xs font-medium transition cursor-pointer active:scale-95"
                      title="Bagikan Tampilan Layar ke Perangkat Ini"
                    >
                      <MonitorPlay className="w-3.5 h-3.5 text-pink-400" />
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
