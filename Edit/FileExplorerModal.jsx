import React, { useState } from 'react';
import {
  Folder,
  FileText,
  Download,
  ArrowLeft,
  RefreshCw,
  X,
  HardDrive,
  ShieldAlert,
  Smartphone,
  Laptop,
  Image as ImageIcon,
  Film,
  Music,
  FileCode,
  FileArchive,
  ChevronRight,
  Play,
  Eye
} from 'lucide-react';
import { triggerHaptic } from '../utils/feedback';

export function FileExplorerModal({
  isOpen,
  onClose,
  targetPeer,
  currentPath = '/',
  items = [],
  loading = false,
  error = null,
  onNavigate,
  onRefresh,
  onPullFile,
  onStreamMedia,
  onRequestPermission
}) {
  const [previewItem, setPreviewItem] = useState(null);

  if (!isOpen) return null;

  const isTargetMobile =
    targetPeer?.deviceType === 'mobile' ||
    /Android|iPhone|iPad/i.test(targetPeer?.os || '');

  const formatFileSize = (bytes) => {
    if (!bytes || bytes <= 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i] || 'B'}`;
  };

  const formatDate = (ms) => {
    if (!ms) return '';
    try {
      const d = new Date(ms);
      return d.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return '';
    }
  };

  const isImageFile = (fileName = '') => {
    const ext = fileName.split('.').pop()?.toLowerCase() || '';
    return ['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp', 'svg'].includes(ext);
  };

  const getFileUrl = (item) => {
    if (!item?.path) return '';
    const host = window.location.hostname || 'localhost';
    if (isTargetMobile) {
      const phoneIp = targetPeer?.clientIp || targetPeer?.ip || host;
      return `http://${phoneIp}:8088/stream?path=${encodeURIComponent(item.path)}`;
    } else {
      return `http://${host}:3001/api/pc-files/stream?path=${encodeURIComponent(item.path)}`;
    }
  };

  const getFileProxyUrl = (item) => {
    if (!item?.path) return '';
    const host = window.location.hostname || 'localhost';
    if (isTargetMobile) {
      const phoneIp = targetPeer?.clientIp || targetPeer?.ip || host;
      return `http://${host}:3001/api/media-stream-proxy?targetIp=${encodeURIComponent(phoneIp)}&path=${encodeURIComponent(item.path)}`;
    } else {
      return `http://${host}:3001/api/pc-files/stream?path=${encodeURIComponent(item.path)}`;
    }
  };

  const getFileIcon = (fileName = '') => {
    const ext = fileName.split('.').pop()?.toLowerCase() || '';
    if (['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg', 'bmp'].includes(ext)) {
      return <ImageIcon className="w-4 h-4 text-emerald-400 shrink-0" />;
    }
    if (['mp4', 'mkv', 'mov', 'webm', 'avi', 'flv'].includes(ext)) {
      return <Film className="w-4 h-4 text-purple-400 shrink-0" />;
    }
    if (['mp3', 'wav', 'ogg', 'm4a', 'flac', 'aac'].includes(ext)) {
      return <Music className="w-4 h-4 text-pink-400 shrink-0" />;
    }
    if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) {
      return <FileArchive className="w-4 h-4 text-amber-400 shrink-0" />;
    }
    if (['js', 'jsx', 'ts', 'tsx', 'html', 'css', 'json', 'py', 'java', 'c', 'cpp'].includes(ext)) {
      return <FileCode className="w-4 h-4 text-blue-400 shrink-0" />;
    }
    return <FileText className="w-4 h-4 text-zinc-400 shrink-0" />;
  };

  const isMediaFile = (fileName = '') => {
    const ext = fileName.split('.').pop()?.toLowerCase() || '';
    return ['mp4', 'mkv', 'mov', 'webm', 'avi', '3gp', 'ts', 'mp3', 'wav', 'ogg', 'm4a', 'flac', 'aac', 'opus'].includes(ext);
  };

  const handleGoUp = () => {
    triggerHaptic([25]);
    if (!currentPath || currentPath === '/' || currentPath === '.') return;
    if (/^[a-zA-Z]:[/]?$/.test(currentPath)) {
      if (onNavigate) onNavigate('/');
      return;
    }
    const clean = currentPath.replace(/\/+$/, '');
    const parts = clean.split('/').filter(Boolean);
    parts.pop();
    if (parts.length === 0) {
      if (onNavigate) onNavigate('/');
    } else if (parts.length === 1 && /^[a-zA-Z]:$/.test(parts[0])) {
      if (onNavigate) onNavigate(parts[0] + '/');
    } else {
      const up = (clean.startsWith('/') ? '/' : '') + parts.join('/');
      if (onNavigate) onNavigate(up);
    }
  };

  const shortcuts = isTargetMobile
    ? [
        { label: 'Download', path: '/Download' },
        { label: 'Kamera (DCIM)', path: '/DCIM/Camera' },
        { label: 'Foto (Pictures)', path: '/Pictures' },
        { label: 'Dokumen', path: '/Documents' }
      ]
    : [
        { label: 'Semua Drive', path: '/' },
        { label: 'Drive C:', path: 'C:/' },
        { label: 'Drive D:', path: 'D:/' },
        { label: 'Downloads', path: '/Downloads' },
        { label: 'Documents', path: '/Documents' }
      ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[88vh] text-left overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-zinc-800 flex items-center justify-between gap-3 bg-zinc-950/40">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
              {isTargetMobile ? <Smartphone className="w-5 h-5" /> : <Laptop className="w-5 h-5" />}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold text-white truncate">
                  Jelajahi File: {targetPeer?.name || 'Perangkat'}
                </h3>
                <span className="text-[10px] bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded font-mono border border-zinc-700">
                  {isTargetMobile ? 'Internal HP' : 'PC Storage'}
                </span>
              </div>
              <p className="text-xs text-zinc-400 truncate font-mono mt-0.5">
                {currentPath || '/'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => {
                triggerHaptic([25]);
                if (onRefresh) onRefresh();
              }}
              title="Segarkan daftar file"
              disabled={loading}
              className="p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
            </button>
            <button
              onClick={onClose}
              title="Tutup explorer"
              className="p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation Toolbar & Quick Shortcuts */}
        <div className="px-4 py-2.5 border-b border-zinc-800 bg-zinc-900/60 flex flex-wrap items-center justify-between gap-2 text-xs">
          {/* Back Button */}
          <button
            onClick={handleGoUp}
            disabled={!currentPath || currentPath === '/' || currentPath === '.'}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 transition cursor-pointer disabled:opacity-40 disabled:pointer-events-none active:scale-[0.98]"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Naik 1 Folder</span>
          </button>

          {/* Quick Folder Shortcuts */}
          <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 max-w-full">
            <span className="text-[11px] text-zinc-500 font-medium shrink-0">Pintas:</span>
            {shortcuts.map((sc) => (
              <button
                key={sc.path}
                onClick={() => {
                  triggerHaptic([25]);
                  if (onNavigate) onNavigate(sc.path);
                }}
                className={`px-2 py-1 rounded-md text-[11px] transition shrink-0 cursor-pointer border ${
                  currentPath === sc.path
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-semibold'
                    : 'bg-zinc-800/80 hover:bg-zinc-800 text-zinc-300 border-zinc-700/60'
                }`}
              >
                {sc.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {/* Permission Required Banner */}
          {error && (error.includes('PERMISSION') || error.includes('Izin')) ? (
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 space-y-3 my-2 text-xs">
              <div className="flex items-start gap-2.5">
                <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-white">Izin Akses Penyimpanan Dibutuhkan</h4>
                  <p className="mt-1 leading-relaxed text-zinc-300">
                    Aplikasi ENCross di HP memerlukan izin pengelolaan semua file (All Files Access) agar Laptop dapat membaca folder dan file di HP secara nirkabel.
                  </p>
                </div>
              </div>
              {onRequestPermission && (
                <button
                  onClick={() => {
                    triggerHaptic([30]);
                    onRequestPermission();
                  }}
                  className="w-full sm:w-auto px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-semibold rounded-lg text-xs transition cursor-pointer shadow-sm active:scale-[0.98]"
                >
                  Beri Izin Penyimpanan di HP
                </button>
              )}
            </div>
          ) : error ? (
            <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center justify-between gap-2">
              <span>{error}</span>
              {onRefresh && (
                <button
                  onClick={onRefresh}
                  className="px-2.5 py-1 bg-red-600/40 hover:bg-red-600 text-white rounded-md text-[11px] cursor-pointer"
                >
                  Coba Lagi
                </button>
              )}
            </div>
          ) : null}

          {/* Loading Indicator */}
          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center text-zinc-400 space-y-2">
              <RefreshCw className="w-6 h-6 animate-spin text-emerald-400" />
              <p className="text-xs">Membaca isi berkas dari {targetPeer?.name}...</p>
            </div>
          ) : items.length === 0 && !error ? (
            <div className="py-16 flex flex-col items-center justify-center text-zinc-500 space-y-2 text-center">
              <HardDrive className="w-8 h-8 text-zinc-600 stroke-[1.5]" />
              <p className="text-xs">Folder ini kosong atau belum memiliki file yang didukung.</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {items.map((item, index) => (
                <div
                  key={`${item.path}_${index}`}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-800/40 hover:bg-zinc-800/90 border border-zinc-800/70 hover:border-zinc-700 transition group"
                >
                  {/* Left: Icon & Name */}
                  <div
                    onClick={() => {
                      if (item.isDirectory) {
                        triggerHaptic([25]);
                        if (onNavigate) onNavigate(item.path);
                      }
                    }}
                    className={`flex items-center gap-3 min-w-0 flex-1 pr-2 ${
                      item.isDirectory ? 'cursor-pointer' : ''
                    }`}
                  >
                    <div className="shrink-0">
                      {item.isDrive ? (
                        <div className="w-10 h-10 rounded-lg bg-zinc-800 border border-zinc-700/60 flex items-center justify-center shrink-0">
                          <HardDrive className="w-5 h-5 text-cyan-400 shrink-0" />
                        </div>
                      ) : item.isDirectory ? (
                        <div className="w-10 h-10 rounded-lg bg-zinc-800 border border-zinc-700/60 flex items-center justify-center shrink-0">
                          <Folder className="w-5 h-5 text-emerald-400 shrink-0" />
                        </div>
                      ) : isImageFile(item.name) ? (
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            triggerHaptic([20]);
                            setPreviewItem(item);
                          }}
                          className="w-11 h-11 rounded-lg bg-zinc-900 border border-zinc-700/80 overflow-hidden shrink-0 relative group/thumb cursor-pointer shadow-sm flex items-center justify-center hover:border-emerald-500/80 transition"
                          title="Klik untuk melihat foto lebih besar"
                        >
                          <img
                            src={getFileUrl(item)}
                            alt={item.name}
                            loading="lazy"
                            className="w-full h-full object-cover transition duration-200 group-hover/thumb:scale-110"
                            onError={(e) => {
                              const proxyUrl = getFileProxyUrl(item);
                              if (e.currentTarget.src !== proxyUrl) {
                                e.currentTarget.src = proxyUrl;
                              } else {
                                e.currentTarget.style.display = 'none';
                                e.currentTarget.nextElementSibling?.classList.remove('hidden');
                              }
                            }}
                          />
                          <div className="hidden absolute inset-0 flex items-center justify-center bg-zinc-800 text-emerald-400">
                            <ImageIcon className="w-4 h-4" />
                          </div>
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/thumb:opacity-100 flex items-center justify-center transition">
                            <Eye className="w-4 h-4 text-white drop-shadow" />
                          </div>
                        </div>
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-zinc-800 border border-zinc-700/60 flex items-center justify-center shrink-0">
                          {getFileIcon(item.name)}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p
                        className={`text-xs truncate font-medium ${
                          item.isDirectory
                            ? 'text-zinc-100 group-hover:text-emerald-300 font-semibold'
                            : 'text-zinc-200'
                        }`}
                      >
                        {item.name}
                      </p>
                      <div className="flex items-center gap-2 text-[10px] text-zinc-400 font-mono mt-0.5">
                        {item.isDrive ? (
                          <span className="text-cyan-400 font-semibold">Drive Windows</span>
                        ) : item.isDirectory ? (
                          <span className="text-emerald-400/90">Folder</span>
                        ) : (
                          <>
                            <span>{formatFileSize(item.size)}</span>
                            {item.lastModified ? (
                              <>
                                <span>•</span>
                                <span>{formatDate(item.lastModified)}</span>
                              </>
                            ) : null}
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="shrink-0 flex items-center gap-1.5">
                    {item.isDirectory ? (
                      <button
                        onClick={() => {
                          triggerHaptic([25]);
                          if (onNavigate) onNavigate(item.path);
                        }}
                        className="p-1.5 text-zinc-400 group-hover:text-white rounded-lg hover:bg-zinc-700 transition cursor-pointer"
                        title="Buka Folder"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        {isImageFile(item.name) && (
                          <button
                            onClick={() => {
                              triggerHaptic([25]);
                              setPreviewItem(item);
                            }}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 active:scale-[0.98] text-white font-semibold text-xs transition cursor-pointer shadow-sm"
                            title="Pratinjau / Perbesar Foto"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Lihat</span>
                          </button>
                        )}
                        {isMediaFile(item.name) && (
                          <button
                            onClick={() => {
                              triggerHaptic([30]);
                              if (onStreamMedia) onStreamMedia(item);
                            }}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 active:scale-[0.98] text-white font-semibold text-xs transition cursor-pointer shadow-sm"
                            title="Putar streaming langsung tanpa unduh"
                          >
                            <Play className="w-3.5 h-3.5 fill-current" />
                            <span className="hidden sm:inline">Putar</span>
                          </button>
                        )}
                        <button
                          onClick={() => {
                            triggerHaptic([35]);
                            if (onPullFile) onPullFile(item);
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white font-semibold text-xs transition cursor-pointer shadow-sm"
                          title="Tarik & simpan file ini ke perangkat Anda"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Ambil File</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="px-4 py-2.5 border-t border-zinc-800 bg-zinc-950/60 text-[11px] text-zinc-400 flex items-center justify-between font-mono">
          <span>{items.length} item</span>
          <span className="text-zinc-400">ENCross P2P File System</span>
        </div>
      </div>

      {/* Fullscreen Image Lightbox Preview Modal */}
      {previewItem && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/90 backdrop-blur-md p-3 sm:p-6 animate-fadeIn"
          onClick={() => setPreviewItem(null)}
        >
          <div
            className="relative max-w-4xl max-h-[92vh] w-full flex flex-col bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl p-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800 mb-3 px-1 shrink-0">
              <div className="min-w-0 flex-1 pr-3">
                <h4 className="text-sm font-semibold text-white truncate">{previewItem.name}</h4>
                <p className="text-[11px] text-zinc-400 font-mono mt-0.5">
                  {formatFileSize(previewItem.size)} • {previewItem.path}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => {
                    triggerHaptic([35]);
                    if (onPullFile) onPullFile(previewItem);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white text-xs font-semibold transition cursor-pointer shadow-sm"
                  title="Unduh & simpan file ini"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Ambil File</span>
                </button>
                <button
                  onClick={() => setPreviewItem(null)}
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition cursor-pointer"
                  title="Tutup Pratinjau"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Image Canvas */}
            <div className="relative flex-1 w-full flex items-center justify-center overflow-hidden min-h-[280px] max-h-[75vh] rounded-xl bg-zinc-950/80 border border-zinc-800/80 p-2">
              <img
                src={getFileUrl(previewItem)}
                alt={previewItem.name}
                className="max-h-[72vh] max-w-full object-contain rounded-lg shadow-2xl transition duration-200"
                onError={(e) => {
                  const proxyUrl = getFileProxyUrl(previewItem);
                  if (e.currentTarget.src !== proxyUrl) {
                    e.currentTarget.src = proxyUrl;
                  }
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default FileExplorerModal;
