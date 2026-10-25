import React, { useState, useEffect } from 'react';
import {
  Film,
  Music,
  X,
  Download,
  Copy,
  Check,
  ExternalLink,
  AlertTriangle,
  RefreshCw,
  Smartphone,
  Laptop
} from 'lucide-react';
import { triggerHaptic } from '../utils/feedback';

export function MediaStreamingModal({
  isOpen,
  onClose,
  mediaItem,
  targetPeer,
  serverHost,
  onDownloadFile
}) {
  if (!isOpen || !mediaItem) return null;

  const [useProxy, setUseProxy] = useState(false);
  const [streamError, setStreamError] = useState(false);
  const [copied, setCopied] = useState(false);

  // Reset proxy state when media item changes
  useEffect(() => {
    setUseProxy(false);
    setStreamError(false);
  }, [mediaItem?.path]);

  const fileName = mediaItem.name || 'Media';
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  const isVideo = ['mp4', 'mkv', 'webm', 'mov', 'avi', '3gp', 'ts'].includes(ext);
  const isAudio = ['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac', 'opus'].includes(ext);

  const isTargetMobile =
    targetPeer?.deviceType === 'mobile' ||
    ['Android', 'iOS'].includes(targetPeer?.os);

  // Compute stream URL based on source device
  const host = serverHost || window.location.hostname || 'localhost';
  let streamUrl = '';

  if (isTargetMobile) {
    const phoneIp = targetPeer?.clientIp || targetPeer?.address || host;
    if (useProxy) {
      streamUrl = `http://${host}:3001/api/media-stream-proxy?targetIp=${encodeURIComponent(
        phoneIp
      )}&path=${encodeURIComponent(mediaItem.path)}`;
    } else {
      streamUrl = `http://${phoneIp}:8088/stream?path=${encodeURIComponent(
        mediaItem.path
      )}`;
    }
  } else {
    streamUrl = `http://${host}:3001/api/pc-files/stream?path=${encodeURIComponent(
      mediaItem.path
    )}`;
  }

  const handleMediaError = () => {
    if (isTargetMobile && !useProxy) {
      // Auto-fallback to local proxy if direct connection to phone fails
      setUseProxy(true);
    } else {
      setStreamError(true);
    }
  };

  const handleCopyLink = () => {
    triggerHaptic([25]);
    if (navigator.clipboard) {
      navigator.clipboard.writeText(streamUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes || bytes <= 0) return '';
    const units = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i] || 'B'}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden text-left">
        {/* Header */}
        <div className="p-3.5 sm:p-4 border-b border-zinc-800 flex items-center justify-between gap-3 bg-zinc-950/70">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 shrink-0">
              {isVideo ? <Film className="w-5 h-5" /> : <Music className="w-5 h-5" />}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold text-white truncate">
                  {fileName}
                </h3>
                <span className="text-[10px] bg-purple-950/80 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded font-mono uppercase font-bold">
                  {ext || 'MEDIA'}
                </span>
                {mediaItem.size ? (
                  <span className="text-[11px] text-zinc-400 font-mono hidden sm:inline">
                    ({formatFileSize(mediaItem.size)})
                  </span>
                ) : null}
              </div>
              <div className="flex items-center gap-2 text-xs text-zinc-400 mt-0.5">
                <span className="flex items-center gap-1 text-zinc-300">
                  {isTargetMobile ? <Smartphone className="w-3.5 h-3.5" /> : <Laptop className="w-3.5 h-3.5" />}
                  <span>{targetPeer?.name || 'Perangkat Lawan'}</span>
                </span>
                <span>•</span>
                <span className="text-emerald-400 font-mono text-[11px]">
                  HTTP Range Seek
                </span>
                {useProxy && (
                  <>
                    <span>•</span>
                    <span className="text-amber-400 font-mono text-[10px] bg-amber-950/60 px-1.5 py-0.2 rounded border border-amber-600/40">
                      Mode Proxy
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          <button
            onClick={() => {
              triggerHaptic([20]);
              onClose();
            }}
            className="text-zinc-400 hover:text-white p-2 rounded-xl hover:bg-zinc-800 transition cursor-pointer shrink-0"
            title="Tutup Player"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Player Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 flex flex-col items-center justify-center bg-black/40">
          {isVideo ? (
            <div className="w-full flex flex-col items-center justify-center relative">
              <video
                key={streamUrl}
                src={streamUrl}
                controls
                autoPlay
                playsInline
                onError={handleMediaError}
                className="w-full max-h-[58vh] rounded-xl bg-black border border-zinc-800 shadow-2xl object-contain"
              />
            </div>
          ) : (
            <div className="w-full max-w-md py-8 px-6 bg-zinc-950/80 border border-zinc-800 rounded-2xl flex flex-col items-center text-center shadow-xl">
              <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-purple-600 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/20 mb-5 animate-pulse">
                <Music className="w-12 h-12 text-white" />
              </div>
              <h4 className="text-base font-semibold text-white truncate max-w-full mb-1">
                {fileName}
              </h4>
              <p className="text-xs text-zinc-400 font-mono mb-5">
                {formatFileSize(mediaItem.size)} • Streaming Audio
              </p>
              <audio
                key={streamUrl}
                src={streamUrl}
                controls
                autoPlay
                onError={handleMediaError}
                className="w-full"
              />
            </div>
          )}

          {/* Error & Fallback Banner */}
          {streamError && (
            <div className="mt-4 p-3.5 bg-red-950/60 border border-red-500/40 rounded-xl text-red-200 text-xs flex items-center justify-between gap-3 w-full max-w-xl">
              <div className="flex items-center gap-2 min-w-0">
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                <span className="truncate">
                  Format media tidak dapat diputar langsung oleh browser ini, atau koneksi stream terputus.
                </span>
              </div>
              {isTargetMobile && !useProxy && (
                <button
                  onClick={() => {
                    setStreamError(false);
                    setUseProxy(true);
                  }}
                  className="px-2.5 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded font-medium text-[11px] shrink-0 flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" />
                  Coba Proxy
                </button>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-3 sm:p-4 border-t border-zinc-800 bg-zinc-950/70 flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyLink}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700/80 active:scale-[0.98] text-zinc-300 font-medium text-xs transition cursor-pointer border border-zinc-700/60"
              title="Salin URL streaming HTTP langsung"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Tersalin!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Salin URL</span>
                </>
              )}
            </button>

            <a
              href={streamUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700/80 active:scale-[0.98] text-zinc-300 font-medium text-xs transition cursor-pointer border border-zinc-700/60"
              title="Buka player di tab browser terpisah"
            >
              <ExternalLink className="w-3.5 h-3.5 text-zinc-400" />
              <span className="hidden sm:inline">Tab Baru</span>
            </a>
          </div>

          <div className="flex items-center gap-2">
            {onDownloadFile && (
              <button
                onClick={() => {
                  triggerHaptic([35]);
                  onDownloadFile(mediaItem);
                }}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white font-semibold text-xs transition cursor-pointer shadow-sm"
                title="Unduh seluruh file ke penyimpanan lokal Anda"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Unduh File Penuh</span>
              </button>
            )}

            <button
              onClick={() => {
                triggerHaptic([20]);
                onClose();
              }}
              className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium transition cursor-pointer"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default MediaStreamingModal;
