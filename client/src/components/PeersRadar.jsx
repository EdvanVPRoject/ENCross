import React, { useRef } from 'react';
import { Laptop, Smartphone, Tablet, Upload, MessageSquare, MonitorPlay, QrCode, Wifi, Activity, SwitchCamera, Plus } from 'lucide-react';
import { triggerHaptic } from '../utils/feedback';
import logoImg from '../assets/logo.png';

export function PeersRadar({
  peers,
  localIp,
  selfIp,
  activeSharingPeerId,
  activeSharingMode,
  cameraFacingMode,
  onSwitchCamera,
  unreadPeerId,
  onSendFile,
  onOpenTextSync,
  onStartScreenShare,
  onOpenQR,
  isMobile,
  onOpenConnect
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
          <div className="w-16 h-16 sm:w-20 sm:h-20 mb-4 relative flex items-center justify-center">
            <img
              src={logoImg}
              alt="ENCross"
              className="w-full h-full object-contain filter drop-shadow-md select-none"
            />
            <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500" />
            </span>
          </div>

          <h2 className="text-base sm:text-lg font-semibold text-white mb-1.5 tracking-tight">
            Menunggu Perangkat Lain
          </h2>
          <p className="text-zinc-400 text-xs max-w-xs sm:max-w-sm mb-5 leading-relaxed px-2">
            {isMobile
              ? 'Pastikan HP dan Laptop terhubung ke Wi-Fi yang sama, lalu sambungkan via Scan QR atau ketik IP Laptop.'
              : 'Pastikan kedua perangkat di Wi-Fi yang sama, lalu scan QR Code di bawah menggunakan smartphone.'}
          </p>

          <div className="flex flex-col items-center gap-2.5">
            {isMobile && onOpenConnect ? (
              <button
                onClick={() => {
                  triggerHaptic([30]);
                  onOpenConnect();
                }}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-semibold px-4 py-2.5 rounded-xl text-xs transition cursor-pointer shadow-sm active:scale-98"
              >
                <Wifi className="w-4 h-4" />
                <span>Sambungkan ke Laptop (Scan QR / IP)</span>
              </button>
            ) : null}

            {((isMobile && (selfIp || localIp)) || (!isMobile && localIp && localIp !== '127.0.0.1')) && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs font-mono text-zinc-300 mt-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-zinc-500 font-sans text-[11px]">{isMobile ? 'IP HP:' : 'IP Laptop:'}</span>
                <span className="text-emerald-400 font-semibold">{isMobile ? (selfIp || localIp) : localIp}</span>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Connected Peers Layout */
        <div className="w-full">
          {/* Bagian Atas: Logo ENCross & Perangkat Terdeteksi */}
          <div className="flex flex-col items-center justify-center mb-6 sm:mb-8 text-center">
            {/* Logo ENCross */}
            <div className="w-14 h-14 sm:w-16 sm:h-16 mb-2 relative flex items-center justify-center">
              <img
                src={logoImg}
                alt="ENCross"
                className="w-full h-full object-contain filter drop-shadow-md select-none"
              />
              <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500" />
              </span>
            </div>

            {/* Perangkat Terdeteksi di bawah Logo */}
            <div className="flex items-center gap-2 mb-2">
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                Perangkat Terdeteksi
              </h2>
              <span className="text-[10px] sm:text-[11px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-mono font-medium">
                {peers.length} Online
              </span>
            </div>

            {/* Tulisan Kirim File, Teks, Layar Dipanjangkan ke Samping */}
            <div className="w-full max-w-4xl py-2 px-4 rounded-xl bg-zinc-900/90 border border-zinc-800 text-xs text-zinc-300 flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 shadow-xs">
              <span className="flex items-center gap-1.5">
                <Upload className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="font-medium">Kirim File & Foto</span>
              </span>
              <span className="text-zinc-600 hidden sm:inline">•</span>
              <span className="flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                <span className="font-medium">Kirim Pesan Teks</span>
              </span>
              <span className="text-zinc-600 hidden sm:inline">•</span>
              <span className="flex items-center gap-1.5">
                <MonitorPlay className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                <span className="font-medium">Bagi Layar / Webcam</span>
              </span>
              <span className="text-zinc-600 hidden sm:inline">•</span>
              <span className="text-zinc-400 text-[11px] font-mono">Real-time P2P LAN</span>
            </div>
          </div>

          {/* Helper render kartu perangkat */}
          {(() => {
            const isPc = (peer) => peer.deviceType === 'desktop' || ['Windows', 'macOS', 'Linux'].includes(peer.os);
            const pcPeers = peers.filter(isPc);
            const mobilePeers = peers.filter((p) => !isPc(p));

            const renderPeerCard = (peer) => (
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

                {/* Actions */}
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
                      className={`flex items-center justify-center gap-1.5 active:scale-[0.98] py-2 px-2 rounded-lg text-xs font-medium transition cursor-pointer ${
                        unreadPeerId === peer.id || (peer.deviceId && unreadPeerId === peer.deviceId)
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30 ring-1 ring-emerald-500/30'
                          : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700/60'
                      }`}
                    >
                      <MessageSquare
                        className={`w-3.5 h-3.5 ${
                          unreadPeerId === peer.id || (peer.deviceId && unreadPeerId === peer.deviceId)
                            ? 'text-emerald-400 animate-bounce'
                            : 'text-zinc-400'
                        }`}
                      />
                      <span>
                        {unreadPeerId === peer.id || (peer.deviceId && unreadPeerId === peer.deviceId)
                          ? 'Pesan Baru'
                          : 'Kirim Teks'}
                      </span>
                    </button>

                    {/* Screen Share / Stop Share */}
                    <button
                      onClick={() => {
                        triggerHaptic([30]);
                        onStartScreenShare(peer.id);
                      }}
                      className={`flex items-center justify-center gap-1.5 active:scale-[0.98] py-2 px-2 rounded-lg text-xs font-medium transition cursor-pointer ${
                        activeSharingPeerId === peer.id
                          ? 'bg-red-500/20 text-red-300 border border-red-500/40 hover:bg-red-500/30'
                          : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700/60'
                      }`}
                    >
                      <MonitorPlay className={`w-3.5 h-3.5 ${activeSharingPeerId === peer.id ? 'text-red-400 animate-pulse' : 'text-zinc-400'}`} />
                      <span>
                        {activeSharingPeerId === peer.id
                          ? (activeSharingMode === 'camera' ? 'Stop Kamera' : 'Stop Layar')
                          : (isMobile ? 'Kamera / Layar' : 'Bagi Layar')}
                      </span>
                    </button>
                  </div>

                  {/* Quick Switch Camera Button on Peer Card when Camera Streaming */}
                  {activeSharingPeerId === peer.id && activeSharingMode === 'camera' && onSwitchCamera && (
                    <button
                      onClick={() => {
                        triggerHaptic([30]);
                        onSwitchCamera();
                      }}
                      className="w-full mt-2 flex items-center justify-center gap-1.5 active:scale-[0.98] py-2 px-2 rounded-lg text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30 transition cursor-pointer"
                    >
                      <SwitchCamera className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Ganti Kamera ({cameraFacingMode === 'user' ? 'Depan' : 'Belakang'})</span>
                    </button>
                  )}
                </div>
              </div>
            );

            return (
              <div className="space-y-6">
                {/* Kelompok 1: Laptop & Komputer (PC) di Atas */}
                <section className="space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-zinc-800/80">
                    <div className="flex items-center gap-2">
                      <Laptop className="w-4 h-4 text-emerald-400" />
                      <h3 className="text-xs sm:text-sm font-semibold text-zinc-200 tracking-tight uppercase">
                        Laptop & Komputer (PC)
                      </h3>
                      <span className="text-[10px] font-mono text-zinc-400 bg-zinc-800 px-2 py-0.5 rounded">
                        {pcPeers.length} Perangkat
                      </span>
                    </div>
                  </div>

                  {pcPeers.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                      {pcPeers.map(renderPeerCard)}
                    </div>
                  ) : (
                    <div className="py-4 px-4 rounded-xl bg-zinc-900/30 border border-dashed border-zinc-800 text-center text-xs text-zinc-500">
                      Belum ada Laptop/PC lain yang terhubung
                    </div>
                  )}
                </section>

                {/* Garis Pemisah Antara Kelompok PC dan HP */}
                <div className="relative my-6 sm:my-8">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-zinc-800" />
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="bg-zinc-950 px-3 py-0.5 text-zinc-500 font-mono text-[11px] uppercase tracking-wider rounded border border-zinc-800/80">
                      Pemisah Perangkat (PC / HP)
                    </span>
                  </div>
                </div>

                {/* Kelompok 2: Smartphone & HP di Bawah */}
                <section className="space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-zinc-800/80">
                    <div className="flex items-center gap-2">
                      <Smartphone className="w-4 h-4 text-cyan-400" />
                      <h3 className="text-xs sm:text-sm font-semibold text-zinc-200 tracking-tight uppercase">
                        Smartphone & HP (Android / iOS)
                      </h3>
                      <span className="text-[10px] font-mono text-zinc-400 bg-zinc-800 px-2 py-0.5 rounded">
                        {mobilePeers.length} Perangkat
                      </span>
                    </div>
                  </div>

                  {mobilePeers.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                      {mobilePeers.map(renderPeerCard)}
                    </div>
                  ) : (
                    <div className="py-4 px-4 rounded-xl bg-zinc-900/30 border border-dashed border-zinc-800 text-center text-xs text-zinc-500">
                      Belum ada Smartphone/HP yang terhubung (Gunakan tombol "Hubungkan" di atas untuk scan QR)
                    </div>
                  )}
                </section>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}
