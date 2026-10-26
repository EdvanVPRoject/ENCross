import React, { useEffect, useRef, useState } from 'react';
import {
  X,
  Maximize2,
  Minimize2,
  MonitorPlay,
  Camera,
  Play,
  RotateCw,
  SwitchCamera,
  FlipHorizontal,
  ExternalLink,
  Volume2,
  VolumeX,
  HelpCircle,
  Video
} from 'lucide-react';
import { triggerHaptic } from '../utils/feedback';

export function ScreenViewModal({ stream, senderName, onClose, mode, onSwitchCamera }) {
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [needsGesture, setNeedsGesture] = useState(false);
  const [isMirrored, setIsMirrored] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [isMuted, setIsMuted] = useState(true);
  const [showObsGuide, setShowObsGuide] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (video && stream) {
      video.srcObject = stream;
      video.muted = isMuted;

      const attemptPlay = () => {
        video.play()
          .then(() => {
            setIsPlaying(true);
            setNeedsGesture(false);
          })
          .catch((err) => {
            console.warn('[ScreenView] Autoplay blocked, requiring user tap:', err);
            setNeedsGesture(true);
          });
      };

      video.onloadedmetadata = attemptPlay;
      attemptPlay();
    }
  }, [stream]);

  if (!stream) return null;

  const handleManualPlay = () => {
    triggerHaptic([30]);
    if (videoRef.current) {
      videoRef.current.muted = isMuted;
      videoRef.current.play()
        .then(() => {
          setIsPlaying(true);
          setNeedsGesture(false);
        })
        .catch(console.error);
    }
  };

  const toggleMute = () => {
    triggerHaptic([20]);
    if (videoRef.current) {
      const nextMuted = !isMuted;
      videoRef.current.muted = nextMuted;
      setIsMuted(nextMuted);
    }
  };

  const togglePiP = async () => {
    triggerHaptic([30]);
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else if (videoRef.current && videoRef.current.requestPictureInPicture) {
        await videoRef.current.requestPictureInPicture();
      }
    } catch (err) {
      console.warn('[PiP] Picture-in-picture error:', err);
    }
  };

  const toggleFullscreen = () => {
    triggerHaptic([30]);
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen?.();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.();
      setIsFullscreen(false);
    }
  };

  const cycleRotation = () => {
    triggerHaptic([25]);
    setRotation((prev) => (prev + 90) % 360);
  };

  const toggleMirror = () => {
    triggerHaptic([25]);
    setIsMirrored((prev) => !prev);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-200">
      <div
        ref={containerRef}
        className="bg-zinc-950 border-0 sm:border sm:border-zinc-800 sm:rounded-2xl w-full h-full sm:h-[88vh] sm:max-w-5xl flex flex-col shadow-2xl overflow-hidden relative"
      >
        {/* Top Control Bar */}
        <div
          style={{ paddingTop: 'max(env(safe-area-inset-top, 0px), 0.75rem)' }}
          className="px-3 pb-3 bg-zinc-900/95 border-b border-zinc-800 flex items-center justify-between z-20 shrink-0 gap-2 flex-wrap sm:flex-nowrap"
        >
          <div className="flex items-center gap-2 min-w-0">
            <div className="p-1.5 rounded-lg bg-zinc-800 text-emerald-400 shrink-0">
              {mode === 'camera' ? (
                <Camera className="w-4 h-4 text-emerald-400 animate-pulse" />
              ) : (
                <MonitorPlay className="w-4 h-4 animate-pulse" />
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h3 className="text-xs font-semibold text-white truncate">
                  {mode === 'camera' ? 'Wireless Webcam HP' : 'Mirroring Layar'}
                </h3>
                <span className="text-[10px] bg-red-500/15 text-red-400 border border-red-500/30 px-1.5 py-0.2 rounded font-mono uppercase shrink-0 font-bold">
                  LIVE
                </span>
                {mode === 'camera' && (
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-1.5 py-0.2 rounded font-mono font-medium hidden sm:inline">
                    OBS Ready
                  </span>
                )}
              </div>
              <p className="text-[10px] sm:text-[11px] text-zinc-400 truncate">
                Sumber: <span className="text-zinc-200 font-medium">{senderName || 'Ponsel'}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
            {/* Camera Specific Tools */}
            {mode === 'camera' && (
              <>
                {/* Mirror Toggle */}
                <button
                  onClick={toggleMirror}
                  className={`p-2 rounded-lg text-xs font-medium border transition cursor-pointer active:scale-95 ${
                    isMirrored
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border-zinc-700/60'
                  }`}
                  title="Cerminkan Horizontal (Mirror)"
                >
                  <FlipHorizontal className="w-3.5 h-3.5" />
                </button>

                {/* Rotate 90° */}
                <button
                  onClick={cycleRotation}
                  className={`p-2 rounded-lg text-xs font-medium border transition cursor-pointer active:scale-95 ${
                    rotation !== 0
                      ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                      : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border-zinc-700/60'
                  }`}
                  title={`Putar Layar (${rotation}°)`}
                >
                  <RotateCw className="w-3.5 h-3.5" />
                </button>

                {/* Switch Camera */}
                {onSwitchCamera && (
                  <button
                    onClick={() => {
                      triggerHaptic([30]);
                      onSwitchCamera();
                    }}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 active:scale-95 text-emerald-400 hover:text-emerald-300 border border-zinc-700/70 text-xs font-medium transition cursor-pointer"
                    title="Ganti Kamera Depan / Belakang"
                  >
                    <SwitchCamera className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline text-[11px]">Ganti Kamera</span>
                  </button>
                )}

                {/* Audio Unmute Toggle */}
                <button
                  onClick={toggleMute}
                  className={`p-2 rounded-lg text-xs font-medium border transition cursor-pointer active:scale-95 ${
                    !isMuted
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-400 border-zinc-700/60'
                  }`}
                  title={isMuted ? 'Suara Mic Kamera Mute (Klik untuk Dengar)' : 'Suara Mic Kamera Aktif'}
                >
                  {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5 text-emerald-400" />}
                </button>

                {/* Picture in Picture */}
                <button
                  onClick={togglePiP}
                  className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700/60 transition cursor-pointer active:scale-95"
                  title="Picture-in-Picture (Melayang di atas jendela lain)"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>

                {/* OBS / Zoom Guide Button */}
                <button
                  onClick={() => setShowObsGuide(true)}
                  className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 text-sky-300 border border-sky-500/30 text-xs font-medium transition cursor-pointer active:scale-95"
                  title="Panduan OBS & Zoom"
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline text-[11px]">OBS / Zoom</span>
                </button>
              </>
            )}

            <button
              onClick={toggleFullscreen}
              className="p-2 rounded-lg text-zinc-300 hover:text-white hover:bg-zinc-800 transition cursor-pointer"
              title="Fullscreen"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
            <button
              onClick={() => {
                triggerHaptic([30]);
                onClose();
              }}
              className="p-2 rounded-lg text-zinc-300 hover:text-white hover:bg-zinc-800 transition cursor-pointer"
              title="Tutup Siaran"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Video Canvas */}
        <div className="flex-1 bg-black flex items-center justify-center relative overflow-hidden">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted={isMuted}
            className="w-full h-full object-contain cursor-pointer transition-transform duration-200"
            style={{
              transform: `${isMirrored ? 'scaleX(-1)' : ''} rotate(${rotation}deg)`
            }}
            onClick={needsGesture ? handleManualPlay : undefined}
          />

          {/* Autoplay Fallback Overlay for Mobile Chrome */}
          {needsGesture && (
            <div
              onClick={handleManualPlay}
              className="absolute inset-0 bg-black/75 flex flex-col items-center justify-center cursor-pointer p-4 text-center z-10"
            >
              <div className="w-16 h-16 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white mb-3 shadow-lg active:scale-95 transition-transform">
                <Play className="w-7 h-7 ml-1 fill-white" />
              </div>
              <p className="text-sm font-semibold text-white mb-1">
                Ketuk Layar untuk Menonton
              </p>
              <p className="text-xs text-zinc-400">
                Browser HP memerlukan satu ketukan untuk memulai live stream
              </p>
            </div>
          )}

          {/* OBS / Zoom Integration Guide Modal */}
          {showObsGuide && (
            <div className="absolute inset-0 bg-black/85 backdrop-blur-sm z-30 flex items-center justify-center p-4">
              <div className="bg-zinc-900 border border-zinc-700 rounded-2xl max-w-md w-full p-5 text-left shadow-2xl relative">
                <button
                  onClick={() => setShowObsGuide(false)}
                  className="absolute top-4 right-4 p-1 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800"
                >
                  <X className="w-4 h-4" />
                </button>

                <div className="flex items-center gap-2 mb-3">
                  <div className="p-2 rounded-xl bg-sky-500/20 text-sky-400">
                    <Video className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">Cara Menggunakan di OBS & Zoom</h4>
                    <p className="text-[11px] text-zinc-400">Jadikan kamera HP sebagai webcam utama Anda</p>
                  </div>
                </div>

                <div className="space-y-3 text-xs text-zinc-300">
                  <div className="p-3 bg-zinc-950/70 rounded-xl border border-zinc-800">
                    <span className="font-semibold text-sky-400 block mb-1">1. OBS Studio (Paling Direkomendasikan):</span>
                    <p className="text-zinc-400 leading-relaxed">
                      Buka OBS Studio &gt; Tambah Source (<strong>+</strong>) &gt; Pilih <strong>Window Capture</strong> &gt; Pilih jendela <strong>ENCross Hub</strong>. Anda langsung mendapatkan output kamera HP berkualitas tinggi 60 FPS!
                    </p>
                  </div>

                  <div className="p-3 bg-zinc-950/70 rounded-xl border border-zinc-800">
                    <span className="font-semibold text-emerald-400 block mb-1">2. Zoom, Google Meet & Discord:</span>
                    <p className="text-zinc-400 leading-relaxed">
                      Di OBS Studio, klik <strong>Start Virtual Camera</strong>. Di Zoom/Meet/Discord, pilih kamera: <strong>OBS Virtual Camera</strong>.
                    </p>
                  </div>

                  <div className="p-3 bg-zinc-950/70 rounded-xl border border-zinc-800">
                    <span className="font-semibold text-amber-400 block mb-1">3. Mode Picture-in-Picture (PiP):</span>
                    <p className="text-zinc-400 leading-relaxed">
                      Klik ikon <strong>PiP</strong> di bilah atas agar kamera HP melayang di sudut layar laptop Anda saat membuka aplikasi lain.
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setShowObsGuide(false)}
                  className="w-full mt-4 py-2.5 bg-sky-600 hover:bg-sky-500 active:bg-sky-700 text-white font-semibold text-xs rounded-xl transition cursor-pointer"
                >
                  Mengerti
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
