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

    return () => {
      if (video) {
        try {
          video.onloadedmetadata = null;
          video.pause();
          video.srcObject = null;
        } catch (_) {}
      }
    };
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
    triggerHaptic([25]);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        ref={containerRef}
        className="bg-black border-0 sm:border border-black/10 dark:border-white/10 sm:rounded-3xl w-full h-full sm:h-[88vh] sm:max-w-5xl flex flex-col shadow-2xl overflow-hidden relative"
      >
        {/* Top Control Bar */}
        <div
          style={{ paddingTop: 'max(env(safe-area-inset-top, 0px), 0.75rem)' }}
          className="px-4 pb-3 apple-glass border-b border-black/8 dark:border-white/10 flex items-center justify-between z-20 shrink-0 gap-2 flex-wrap sm:flex-nowrap"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 rounded-xl bg-[#0071e3]/10 text-[#0071e3] shrink-0">
              {mode === 'camera' ? (
                <Camera className="w-4 h-4 text-[#0071e3]" />
              ) : (
                <MonitorPlay className="w-4 h-4 text-[#0071e3]" />
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-xs sm:text-sm font-semibold text-zinc-900 dark:text-white truncate">
                  {mode === 'camera' ? 'Wireless Webcam HP' : 'Mirroring Layar'}
                </h3>
                <span className="text-[10px] bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 px-2 py-0.2 rounded-full font-mono uppercase shrink-0 font-medium">
                  LIVE
                </span>
                {mode === 'camera' && (
                  <span className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 px-2 py-0.2 rounded-full font-mono font-medium hidden sm:inline">
                    OBS Ready
                  </span>
                )}
              </div>
              <p className="text-[10px] sm:text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
                Sumber: <span className="text-zinc-800 dark:text-zinc-200 font-medium">{senderName || 'Ponsel'}</span>
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
                  className={`p-2 rounded-full text-xs font-medium border transition cursor-pointer active:scale-95 ${
                    isMirrored
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                      : 'bg-black/5 dark:bg-white/8 hover:bg-black/10 dark:hover:bg-white/12 text-zinc-700 dark:text-zinc-300 border-black/8 dark:border-white/10'
                  }`}
                  title="Cerminkan Horizontal (Mirror)"
                >
                  <FlipHorizontal className="w-3.5 h-3.5" />
                </button>

                {/* Rotate 90° */}
                <button
                  onClick={cycleRotation}
                  className={`p-2 rounded-full text-xs font-medium border transition cursor-pointer active:scale-95 ${
                    rotation !== 0
                      ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
                      : 'bg-black/5 dark:bg-white/8 hover:bg-black/10 dark:hover:bg-white/12 text-zinc-700 dark:text-zinc-300 border-black/8 dark:border-white/10'
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
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/5 dark:bg-white/8 hover:bg-black/10 dark:hover:bg-white/12 active:scale-95 text-[#0071e3] dark:text-blue-400 border border-black/8 dark:border-white/10 text-xs font-medium transition cursor-pointer"
                    title="Ganti Kamera Depan / Belakang"
                  >
                    <SwitchCamera className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline text-[11px]">Ganti Kamera</span>
                  </button>
                )}

                {/* Audio Unmute Toggle */}
                <button
                  onClick={toggleMute}
                  className={`p-2 rounded-full text-xs font-medium border transition cursor-pointer active:scale-95 ${
                    !isMuted
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                      : 'bg-black/5 dark:bg-white/8 hover:bg-black/10 dark:hover:bg-white/12 text-zinc-500 dark:text-zinc-400 border-black/8 dark:border-white/10'
                  }`}
                  title={isMuted ? 'Suara Mic Kamera Mute (Klik untuk Dengar)' : 'Suara Mic Kamera Aktif'}
                >
                  {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5 text-emerald-500" />}
                </button>

                {/* Picture in Picture */}
                <button
                  onClick={togglePiP}
                  className="p-2 rounded-full bg-black/5 dark:bg-white/8 hover:bg-black/10 dark:hover:bg-white/12 text-zinc-700 dark:text-zinc-300 border border-black/8 dark:border-white/10 transition cursor-pointer active:scale-95"
                  title="Picture-in-Picture (Melayang di atas jendela lain)"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>

                {/* OBS / Zoom Guide Button */}
                <button
                  onClick={() => setShowObsGuide(true)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-blue-500/10 hover:bg-blue-500/15 text-[#0071e3] dark:text-blue-400 border border-blue-500/20 text-xs font-medium transition cursor-pointer active:scale-95"
                  title="Panduan OBS & Zoom"
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline text-[11px]">OBS / Zoom</span>
                </button>
              </>
            )}

            <button
              onClick={toggleFullscreen}
              className="p-2 rounded-full text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition cursor-pointer"
              title="Fullscreen"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
            <button
              onClick={() => {
                triggerHaptic([30]);
                onClose();
              }}
              className="p-2 rounded-full text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition cursor-pointer"
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
            <div className="absolute inset-0 bg-black/60 backdrop-blur-md z-30 flex items-center justify-center p-4">
              <div className="apple-card border border-black/10 dark:border-white/10 rounded-3xl max-w-md w-full p-6 text-left shadow-2xl relative">
                <button
                  onClick={() => setShowObsGuide(false)}
                  className="absolute top-4 right-4 p-1.5 text-zinc-400 hover:text-zinc-900 dark:hover:text-white rounded-full hover:bg-black/5 dark:hover:bg-white/10"
                >
                  <X className="w-4 h-4" />
                </button>

                <div className="flex items-center gap-2.5 mb-3">
                  <div className="p-2 rounded-2xl bg-blue-500/10 text-[#0071e3]">
                    <Video className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-zinc-900 dark:text-white">Cara Menggunakan di OBS & Zoom</h4>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400">Jadikan kamera HP sebagai webcam utama Anda</p>
                  </div>
                </div>

                <div className="space-y-3 text-xs text-zinc-700 dark:text-zinc-300">
                  <div className="p-3 bg-black/4 dark:bg-white/5 rounded-2xl border border-black/8 dark:border-white/10">
                    <span className="font-semibold text-[#0071e3] block mb-1">1. OBS Studio (Paling Direkomendasikan):</span>
                    <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed">
                      Buka OBS Studio &gt; Tambah Source (<strong>+</strong>) &gt; Pilih <strong>Window Capture</strong> &gt; Pilih jendela <strong>ENCross</strong>. Anda langsung mendapatkan output kamera HP berkualitas tinggi 60 FPS!
                    </p>
                  </div>

                  <div className="p-3 bg-black/4 dark:bg-white/5 rounded-2xl border border-black/8 dark:border-white/10">
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400 block mb-1">2. Zoom, Google Meet & Discord:</span>
                    <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed">
                      Di OBS Studio, klik <strong>Start Virtual Camera</strong>. Di Zoom/Meet/Discord, pilih kamera: <strong>OBS Virtual Camera</strong>.
                    </p>
                  </div>

                  <div className="p-3 bg-black/4 dark:bg-white/5 rounded-2xl border border-black/8 dark:border-white/10">
                    <span className="font-semibold text-amber-600 dark:text-amber-400 block mb-1">3. Mode Picture-in-Picture (PiP):</span>
                    <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed">
                      Klik ikon <strong>PiP</strong> di bilah atas agar kamera HP melayang di sudut layar laptop Anda saat membuka aplikasi lain.
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setShowObsGuide(false)}
                  className="w-full mt-4 py-2.5 bg-[#0071e3] hover:bg-[#0077ed] text-white font-medium text-xs rounded-full transition cursor-pointer shadow-sm active:scale-95"
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

export default ScreenViewModal;
