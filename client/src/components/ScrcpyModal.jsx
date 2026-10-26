import React, { useState, useEffect } from 'react';
import { Smartphone, MonitorPlay, Wifi, RefreshCw, X, CheckCircle, AlertTriangle, Play, Square, Usb, HelpCircle, ChevronDown, ChevronUp, Sliders, KeyRound, Camera } from 'lucide-react';
import { triggerHaptic } from '../utils/feedback';
import { FEATURE_TOGGLES, SCRCPY_CONFIG, CUSTOM_ACTIONS } from '../config/features';

export function ScrcpyModal({ isOpen, onClose, targetPeer, initialMode = 'display' }) {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [showGuide, setShowGuide] = useState(false);
  const [showPairing, setShowPairing] = useState(false);
  const [targetIp, setTargetIp] = useState('');
  const [pairingIpPort, setPairingIpPort] = useState('');
  const [pairingCode, setPairingCode] = useState('');

  // Scrcpy Quality & Battery Settings
  const [maxSize, setMaxSize] = useState(SCRCPY_CONFIG?.maxSize || 0);
  const [bitRate, setBitRate] = useState(SCRCPY_CONFIG?.bitRate || '8M');
  const [turnScreenOff, setTurnScreenOff] = useState(SCRCPY_CONFIG?.turnScreenOff || false);

  // Mode Selection: 'display' (Screen Mirror) | 'camera' (Webcam 60 FPS)
  const [videoSource, setVideoSource] = useState(initialMode || 'display');
  const [cameraFacing, setCameraFacing] = useState('back');
  const [includeAudio, setIncludeAudio] = useState(true);

  useEffect(() => {
    if (initialMode) {
      setVideoSource(initialMode);
    }
  }, [initialMode]);
  const isElectron = typeof window !== 'undefined' && Boolean(window.electronAPI?.isElectron);

  useEffect(() => {
    if (isOpen) {
      if (targetPeer?.clientIp && targetPeer.clientIp !== '127.0.0.1') {
        setTargetIp(targetPeer.clientIp);
      } else if (targetPeer?.ip && targetPeer.ip !== '127.0.0.1') {
        setTargetIp(targetPeer.ip);
      }
      refreshStatus();
    }
  }, [isOpen, targetPeer]);

  const refreshStatus = async () => {
    if (!isElectron || !window.electronAPI?.getScrcpyStatus) return;
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await window.electronAPI.getScrcpyStatus();
      setStatus(res);
    } catch (err) {
      setErrorMsg('Gagal memuat status Scrcpy: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStartMirror = async (deviceSerial = null) => {
    triggerHaptic([35]);
    if (!isElectron || !window.electronAPI?.startScrcpy) return;
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await window.electronAPI.startScrcpy({
        deviceId: deviceSerial,
        ip: !deviceSerial ? targetIp : null,
        stayAwake: true,
        maxSize: Number(maxSize) || 0,
        bitRate: bitRate || '8M',
        turnScreenOff: Boolean(turnScreenOff),
        videoSource,
        cameraFacing,
        includeAudio
      });

      if (res.success) {
        setSuccessMsg('Mirroring Scrcpy berhasil dimulai! Jendela layar HP telah terbuka.');
        setTimeout(() => refreshStatus(), 1000);
      } else {
        setErrorMsg(res.error || 'Gagal memulai Scrcpy.');
      }
    } catch (err) {
      setErrorMsg(err.message || 'Kesalahan saat menjalankan Scrcpy.');
    } finally {
      setLoading(false);
    }
  };

  const handlePairWifi = async () => {
    if (!pairingIpPort.trim() || !pairingCode.trim()) {
      setErrorMsg('Masukkan IP:Port dan Kode Pairing 6 digit');
      return;
    }
    triggerHaptic([30]);
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const res = await window.electronAPI.pairAdbWifi(pairingIpPort.trim(), pairingCode.trim());
      if (res.success) {
        setSuccessMsg(`Pairing nirkabel ke ${pairingIpPort} berhasil! Perangkat telah dipasangkan.`);
        refreshStatus();
      } else {
        setErrorMsg(`Gagal pairing: ${res.error || 'Periksa IP:Port dan kode pairing di HP'}`);
      }
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStopMirror = async () => {
    triggerHaptic([30]);
    if (!isElectron || !window.electronAPI?.stopScrcpy) return;
    setLoading(true);
    try {
      await window.electronAPI.stopScrcpy();
      setSuccessMsg('Mirroring dihentikan.');
      setTimeout(() => refreshStatus(), 500);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleConnectWifi = async () => {
    if (!targetIp.trim()) {
      setErrorMsg('Masukkan alamat IP HP terlebih dahulu');
      return;
    }
    triggerHaptic([30]);
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await window.electronAPI.connectAdbTcpip(targetIp.trim(), 5555);
      if (res.success) {
        setSuccessMsg(`Berhasil terhubung ke ${targetIp}:5555 via Wi-Fi!`);
        refreshStatus();
      } else {
        setErrorMsg(`Gagal menghubungkan ke ${targetIp}:5555: ${res.error || 'Pastikan USB Debugging aktif di HP'}`);
      }
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEnableTcpip = async () => {
    triggerHaptic([30]);
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const res = await window.electronAPI.enableAdbTcpip(5555);
      if (res.success) {
        setSuccessMsg('Mode Wi-Fi (Port 5555) berhasil diaktifkan pada HP! Anda sekarang bisa mencabut kabel USB.');
        refreshStatus();
      } else {
        setErrorMsg('Gagal mengaktifkan mode Wi-Fi: ' + (res.error || 'Hubungkan HP via kabel USB terlebih dahulu'));
      }
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg p-5 sm:p-6 shadow-2xl relative text-left max-h-[90vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Title */}
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
            <Smartphone className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold text-white">
                Mirroring Layar HP (Scrcpy Hub)
              </h3>
              <span className="text-[10px] bg-sky-500/20 text-sky-400 border border-sky-500/30 px-2 py-0.5 rounded font-mono font-bold">
                60 FPS
              </span>
            </div>
            <p className="text-xs text-zinc-400">
              Mirroring layar Android berkecepatan tinggi dengan kontrol mouse & keyboard
            </p>
          </div>
        </div>

        {/* Not Electron Warning */}
        {!isElectron && (
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs mb-4 flex items-start gap-2.5 leading-relaxed">
            <AlertTriangle className="w-5 h-5 shrink-0 text-amber-400 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-200 mb-1">Jalankan Aplikasi Desktop ENCross</p>
              <p>
                Fitur Scrcpy Mirroring membutuhkan aplikasi Desktop ENCross (versi Windows) agar dapat menjalankan engine Scrcpy secara langsung di laptop Anda.
              </p>
            </div>
          </div>
        )}

        {/* Notifications */}
        {errorMsg && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs mb-4 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
            <span className="break-words leading-relaxed flex-1">{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs mb-4 flex items-start gap-2">
            <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
            <span className="break-words leading-relaxed flex-1">{successMsg}</span>
          </div>
        )}

        {/* Device Status & Mirroring Control */}
        {isElectron && (
          <div className="space-y-4">
            {/* Mode Selector: Layar HP vs Kamera HP */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-zinc-950/70 border border-zinc-800 rounded-xl text-xs font-semibold">
              <button
                type="button"
                onClick={() => {
                  triggerHaptic([20]);
                  setVideoSource('display');
                }}
                className={`flex items-center justify-center gap-1.5 py-2 rounded-lg transition cursor-pointer ${
                  videoSource === 'display'
                    ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40 shadow-xs'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Smartphone className="w-4 h-4 text-sky-400" />
                <span>Mirror Layar HP</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  triggerHaptic([20]);
                  setVideoSource('camera');
                }}
                className={`flex items-center justify-center gap-1.5 py-2 rounded-lg transition cursor-pointer ${
                  videoSource === 'camera'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-xs'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Camera className="w-4 h-4 text-emerald-400" />
                <span>Webcam HP (60 FPS)</span>
              </button>
            </div>

            {videoSource === 'camera' && (
              <div className="bg-emerald-950/20 border border-emerald-500/30 rounded-xl p-3 space-y-2.5 animate-in fade-in">
                <span className="text-[11px] font-bold text-emerald-300 uppercase tracking-wider block">
                  Pilihan Kamera HP (Scrcpy 60 FPS)
                </span>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setCameraFacing('back')}
                    className={`py-1.5 px-2 rounded-lg border text-center transition cursor-pointer ${
                      cameraFacing === 'back'
                        ? 'bg-emerald-500/30 border-emerald-500/60 text-white font-bold'
                        : 'bg-zinc-800 border-zinc-700 text-zinc-400'
                    }`}
                  >
                    📷 Kamera Belakang (Utama)
                  </button>
                  <button
                    type="button"
                    onClick={() => setCameraFacing('front')}
                    className={`py-1.5 px-2 rounded-lg border text-center transition cursor-pointer ${
                      cameraFacing === 'front'
                        ? 'bg-emerald-500/30 border-emerald-500/60 text-white font-bold'
                        : 'bg-zinc-800 border-zinc-700 text-zinc-400'
                    }`}
                  >
                    🤳 Kamera Depan (Selfie)
                  </button>
                </div>
                <label className="flex items-center gap-2 text-[11px] text-zinc-300 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={includeAudio}
                    onChange={(e) => setIncludeAudio(e.target.checked)}
                    className="rounded accent-emerald-500"
                  />
                  <span>Sertakan audio mic ponsel (`--audio-source=mic`)</span>
                </label>
              </div>
            )}
            {/* Scrcpy Quality & Battery Configuration */}
            <div className="p-3.5 rounded-xl bg-zinc-950/80 border border-zinc-800/90 space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-zinc-200">
                <Sliders className="w-4 h-4 text-sky-400" />
                <span>Pengaturan Kualitas & Performa Scrcpy</span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                {/* Max Resolution */}
                <div>
                  <label className="text-[11px] text-zinc-400 block mb-1">Resolusi Layar:</label>
                  <select
                    value={maxSize}
                    onChange={(e) => setMaxSize(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 bg-zinc-900 border border-zinc-700 rounded-lg text-xs text-white focus:outline-hidden focus:border-sky-500"
                  >
                    <option value={0}>Asli (Default)</option>
                    <option value={1080}>1080p (FHD)</option>
                    <option value={720}>720p (HD)</option>
                  </select>
                </div>

                {/* Bitrate */}
                <div>
                  <label className="text-[11px] text-zinc-400 block mb-1">Bitrate Video:</label>
                  <select
                    value={bitRate}
                    onChange={(e) => setBitRate(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-zinc-900 border border-zinc-700 rounded-lg text-xs text-white focus:outline-hidden focus:border-sky-500"
                  >
                    <option value="4M">4 Mbps (Hemat Data)</option>
                    <option value="8M">8 Mbps (Standar Mulus)</option>
                    <option value="16M">16 Mbps (Ultra Jernih)</option>
                  </select>
                </div>
              </div>

              {/* Turn Screen Off Checkbox */}
              <label className="flex items-center gap-2 cursor-pointer pt-1 select-none">
                <input
                  type="checkbox"
                  checked={turnScreenOff}
                  onChange={(e) => setTurnScreenOff(e.target.checked)}
                  className="rounded border-zinc-700 text-sky-500 focus:ring-sky-500/20 bg-zinc-900"
                />
                <span className="text-xs text-zinc-300">
                  Matikan Layar Fisik HP saat Mirroring (Hemat Baterai)
                </span>
              </label>
            </div>

            {/* Status bar */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-950 border border-zinc-800 text-xs">
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${status?.devices?.length > 0 ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                <span className="text-zinc-300 font-medium">
                  {status?.devices?.length > 0
                    ? `${status.devices.length} HP Terdeteksi (ADB)`
                    : 'Belum ada HP terdeteksi via USB / Wi-Fi'}
                </span>
              </div>
              <button
                onClick={refreshStatus}
                disabled={loading}
                className="flex items-center gap-1 text-[11px] text-zinc-400 hover:text-white px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 transition cursor-pointer"
              >
                <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
                <span>Segarkan</span>
              </button>
            </div>

            {/* List of Detected Devices */}
            {status?.devices && status.devices.length > 0 ? (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-zinc-300">Pilih Perangkat untuk Dimirror:</p>
                {status.devices.map((dev) => (
                  <div
                    key={dev.id}
                    className="p-3.5 rounded-xl bg-zinc-800/80 border border-zinc-700 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-bold text-white truncate">{dev.model || dev.id}</h4>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                          dev.status === 'device'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        }`}>
                          {dev.status === 'device' ? 'Siap' : 'Perlu Izin HP'}
                        </span>
                        {dev.isWireless && (
                          <span className="text-[10px] bg-sky-500/20 text-sky-400 px-1 rounded font-mono">
                            Wi-Fi
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-zinc-400 font-mono mt-0.5 truncate">{dev.id}</p>
                    </div>

                    {dev.status === 'device' ? (
                      <button
                        onClick={() => handleStartMirror(dev.id)}
                        disabled={loading}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 active:scale-95 text-zinc-950 font-bold text-xs transition cursor-pointer shrink-0 shadow-sm"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>Mulai Mirror</span>
                      </button>
                    ) : (
                      <span className="text-[11px] text-amber-300 font-medium">
                        Tekan "Izinkan" di HP
                      </span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              /* No Device: Fast Connect Form */
              <div className="p-4 rounded-xl bg-zinc-950/70 border border-zinc-800/80 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold text-white flex items-center gap-1.5">
                    <Wifi className="w-3.5 h-3.5 text-sky-400" />
                    <span>Hubungkan via Wi-Fi (Tanpa Kabel)</span>
                  </h4>
                  {targetPeer && (
                    <span className="text-[10px] text-zinc-400 font-mono">
                      HP Lawan: {targetPeer.name}
                    </span>
                  )}
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={targetIp}
                    onChange={(e) => setTargetIp(e.target.value)}
                    placeholder="Contoh: 192.168.1.15"
                    className="flex-1 px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-hidden focus:border-sky-500 font-mono"
                  />
                  <button
                    onClick={handleConnectWifi}
                    disabled={loading}
                    className="px-3 py-2 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-500/40 text-xs font-semibold transition cursor-pointer active:scale-95 shrink-0"
                  >
                    Hubungkan
                  </button>
                </div>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  Masukkan IP ponsel Anda di jaringan Wi-Fi lokal untuk menghubungkan Scrcpy secara nirkabel.
                </p>
              </div>
            )}

            {/* Quick Actions / USB Helpers */}
            <div className="flex flex-wrap gap-2 pt-1">
              <button
                onClick={handleEnableTcpip}
                disabled={loading}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 active:scale-95 text-zinc-200 border border-zinc-700 text-xs font-medium transition cursor-pointer"
                title="Aktifkan port 5555 pada HP yang dicolok kabel agar bisa dicabut dan tetap nirkabel"
              >
                <Usb className="w-3.5 h-3.5 text-emerald-400" />
                <span>Aktifkan Mode Nirkabel (TCP/IP)</span>
              </button>

              {status?.isMirroringActive && (
                <button
                  onClick={handleStopMirror}
                  disabled={loading}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-500/20 hover:bg-red-500/30 active:scale-95 text-red-300 border border-red-500/40 text-xs font-semibold transition cursor-pointer ml-auto"
                >
                  <Square className="w-3 h-3 fill-current" />
                  <span>Hentikan Scrcpy</span>
                </button>
              )}
            </div>

            {/* Android 11+ Wireless Pairing Section */}
            <div className="border-t border-zinc-800 pt-3">
              <button
                onClick={() => setShowPairing(!showPairing)}
                className="w-full flex items-center justify-between text-xs text-zinc-300 hover:text-white transition cursor-pointer py-1"
              >
                <span className="flex items-center gap-1.5 font-medium">
                  <KeyRound className="w-3.5 h-3.5 text-sky-400" />
                  <span>Pairing Nirkabel Android 11+ (Kode 6 Digit)</span>
                </span>
                {showPairing ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              {showPairing && (
                <div className="mt-2.5 p-3.5 rounded-xl bg-zinc-950/90 border border-zinc-800 space-y-2.5 text-xs">
                  <p className="text-[11px] text-zinc-400 leading-relaxed">
                    Buka <em>Opsi Pengembang &gt; Debugging Nirkabel &gt; Sambungkan perangkat dengan kode pemasangan</em> di HP Anda, lalu masukkan IP:Port dan kode yang tertera:
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={pairingIpPort}
                      onChange={(e) => setPairingIpPort(e.target.value)}
                      placeholder="IP:Port (cth: 192.168.1.5:37281)"
                      className="px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-xs text-white placeholder-zinc-500 font-mono focus:outline-hidden focus:border-sky-500"
                    />
                    <input
                      type="text"
                      value={pairingCode}
                      onChange={(e) => setPairingCode(e.target.value)}
                      placeholder="Kode 6 Digit (cth: 123456)"
                      className="px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-xs text-white placeholder-zinc-500 font-mono focus:outline-hidden focus:border-sky-500"
                    />
                  </div>
                  <button
                    onClick={handlePairWifi}
                    disabled={loading}
                    className="w-full py-2 bg-sky-600 hover:bg-sky-500 active:scale-[0.98] text-white font-semibold rounded-lg text-xs transition cursor-pointer shadow-sm"
                  >
                    Pasangkan (Pair) via Wi-Fi
                  </button>
                </div>
              )}
            </div>

            {/* Step-by-Step Guide Accordion */}
            <div className="border-t border-zinc-800 pt-3">
              <button
                onClick={() => setShowGuide(!showGuide)}
                className="w-full flex items-center justify-between text-xs text-zinc-400 hover:text-zinc-200 transition cursor-pointer py-1"
              >
                <span className="flex items-center gap-1.5">
                  <HelpCircle className="w-3.5 h-3.5 text-sky-400" />
                  <span className="font-medium">Panduan 3 Langkah Mudah Menghubungkan HP</span>
                </span>
                {showGuide ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              {showGuide && (
                <div className="mt-3 p-3.5 rounded-xl bg-zinc-950 border border-zinc-800/80 text-xs space-y-2.5 leading-relaxed text-zinc-300">
                  <div className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-sky-500/20 text-sky-400 flex items-center justify-center font-bold text-[10px] shrink-0">1</span>
                    <p>
                      <strong>Aktifkan USB Debugging:</strong> Buka <em>Pengaturan HP &gt; Tentang Ponsel</em>, ketuk <strong>Nomor Bentukan (Build Number)</strong> 7 kali. Lalu buka <em>Opsi Pengembang &gt; Aktifkan USB Debugging</em>.
                    </p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-sky-500/20 text-sky-400 flex items-center justify-center font-bold text-[10px] shrink-0">2</span>
                    <p>
                      <strong>Hubungkan ke Laptop:</strong> Sambungkan HP ke laptop menggunakan kabel USB (atau aktifkan <em>Debugging Nirkabel</em> jika Android 11+).
                    </p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-sky-500/20 text-sky-400 flex items-center justify-center font-bold text-[10px] shrink-0">3</span>
                    <p>
                      <strong>Tekan Izinkan:</strong> Saat muncul pop-up <em>"Izinkan USB Debugging?"</em> di layar HP, centang <strong>"Selalu izinkan"</strong> lalu tekan <strong>Izinkan</strong>. Jendela layar HP akan langsung tampil mulus di laptop!
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
