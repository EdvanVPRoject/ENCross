import React, { useRef } from 'react';
import { Laptop, Smartphone, Tablet, Upload, MessageSquare, MonitorPlay, QrCode } from 'lucide-react';

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
        return <Smartphone className="w-6 h-6 text-zinc-300" />;
      case 'tablet':
        return <Tablet className="w-6 h-6 text-zinc-300" />;
      default:
        return <Laptop className="w-6 h-6 text-zinc-300" />;
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto py-10 px-4 sm:px-6">
      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
      />

      {peers.length === 0 ? (
        /* Waiting / Empty State */
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-14 h-14 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 mb-5">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-zinc-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-zinc-500" />
            </span>
          </div>

          <h2 className="text-xl font-semibold text-white mb-2 tracking-tight">
            Menunggu Perangkat Lain
          </h2>
          <p className="text-zinc-400 text-xs max-w-sm mb-6 leading-relaxed">
            Pastikan kedua perangkat berada di jaringan Wi-Fi yang sama, lalu scan QR Code di bawah menggunakan smartphone.
          </p>

          <button
            onClick={onOpenQR}
            className="flex items-center gap-2 bg-zinc-100 hover:bg-white text-zinc-950 font-medium px-4 py-2.5 rounded-lg text-xs transition cursor-pointer"
          >
            <QrCode className="w-4 h-4" />
            <span>Tampilkan QR Code</span>
          </button>
        </div>
      ) : (
        /* Connected Peers Grid */
        <div>
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-zinc-800">
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-lg font-semibold text-white tracking-tight">
                  Perangkat Terdeteksi
                </h2>
                <span className="text-[11px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-md font-mono">
                  {peers.length} Online
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-1">
                Pilih aksi pada perangkat di bawah untuk transfer file, teks, atau berbagi layar.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {peers.map((peer) => (
              <div
                key={peer.id}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const file = e.dataTransfer.files?.[0];
                  if (file) onSendFile(peer.id, file);
                }}
                className="bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-xl p-5 transition-colors flex flex-col justify-between"
              >
                <div>
                  {/* Top Bar: Icon & Status */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="p-2.5 bg-zinc-800/80 border border-zinc-700/60 rounded-lg">
                      {getDeviceIcon(peer.deviceType)}
                    </div>
                    <div className="flex items-center gap-1.5 text-zinc-400 text-xs">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      <span className="font-mono text-[11px]">P2P Ready</span>
                    </div>
                  </div>

                  {/* Device Name & Details */}
                  <h3 className="text-base font-semibold text-white truncate mb-1">
                    {peer.name}
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-zinc-400 mb-6 font-mono">
                    <span>{peer.os}</span>
                    <span>•</span>
                    <span>{peer.browser}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="space-y-2 pt-3 border-t border-zinc-800">
                  {/* Send File Button */}
                  <button
                    onClick={() => handleFileSelect(peer.id)}
                    className="w-full flex items-center justify-center gap-2 bg-zinc-100 hover:bg-white text-zinc-950 font-medium py-2 px-3 rounded-lg text-xs transition cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Kirim File</span>
                  </button>

                  <div className="grid grid-cols-2 gap-2">
                    {/* Send Text */}
                    <button
                      onClick={() => onOpenTextSync(peer)}
                      className="flex items-center justify-center gap-1.5 bg-zinc-800 hover:bg-zinc-700/80 text-zinc-200 border border-zinc-700/60 py-2 px-2.5 rounded-lg text-xs font-medium transition cursor-pointer"
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-zinc-400" />
                      <span>Kirim Teks</span>
                    </button>

                    {/* Screen Share */}
                    <button
                      onClick={() => onStartScreenShare(peer.id)}
                      className="flex items-center justify-center gap-1.5 bg-zinc-800 hover:bg-zinc-700/80 text-zinc-200 border border-zinc-700/60 py-2 px-2.5 rounded-lg text-xs font-medium transition cursor-pointer"
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
