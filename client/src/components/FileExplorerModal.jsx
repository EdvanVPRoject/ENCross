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
      return <ImageIcon className="w-4 h-4 text-emerald-500 shrink-0" />;
    }
    if (['mp4', 'mkv', 'mov', 'webm', 'avi', 'flv'].includes(ext)) {
      return <Film className="w-4 h-4 text-purple-500 shrink-0" />;
    }
    if (['mp3', 'wav', 'aac', 'flac', 'ogg', 'm4a'].includes(ext)) {
      return <Music className="w-4 h-4 text-amber-500 shrink-0" />;
    }
    if (['js', 'ts', 'jsx', 'tsx', 'html', 'css', 'json', 'py', 'java', 'c', 'cpp', 'rs', 'go'].includes(ext)) {
      return <FileCode className="w-4 h-4 text-[#0071e3] shrink-0" />;
    }
    if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) {
      return <FileArchive className="w-4 h-4 text-rose-500 shrink-0" />;
    }
    return <FileText className="w-4 h-4 text-zinc-400 shrink-0" />;
  };

  const isMediaFile = (fileName = '') => {
    const ext = fileName.split('.').pop()?.toLowerCase() || '';
    return ['mp4', 'mkv', 'webm', 'mov', 'mp3', 'wav', 'ogg', 'm4a', 'flac'].includes(ext);
  };

  const handleGoUp = () => {
    triggerHaptic([20]);
    if (!currentPath || currentPath === '/' || currentPath === '.') return;
    const clean = currentPath.replace(/\\/g, '/').replace(/\/+$/, '');
    const parts = clean.split('/');
    parts.pop();
    if (parts.length === 0 || (parts.length === 1 && parts[0] === '')) {
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
      <div className="apple-card border border-black/10 dark:border-white/10 rounded-3xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[88vh] text-left overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-black/8 dark:border-white/10 flex items-center justify-between gap-3 bg-black/3 dark:bg-white/3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2.5 rounded-2xl bg-[#0071e3]/10 text-[#0071e3] shrink-0">
              {isTargetMobile ? <Smartphone className="w-5 h-5" /> : <Laptop className="w-5 h-5" />}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-semibold text-zinc-900 dark:text-white truncate">
                  Jelajahi File: {targetPeer?.name || 'Perangkat'}
                </h3>
                <span className="text-[10px] bg-black/5 dark:bg-white/8 text-zinc-600 dark:text-zinc-400 px-2.5 py-0.5 rounded-full font-mono border border-black/8 dark:border-white/10">
                  {isTargetMobile ? 'Internal HP' : 'PC Storage'}
                </span>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate font-mono mt-0.5">
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
              className="p-2 text-zinc-400 hover:text-zinc-900 dark:hover:text-white rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#0071e3]' : ''}`} />
            </button>
            <button
              onClick={onClose}
              title="Tutup explorer"
              className="p-2 text-zinc-400 hover:text-zinc-900 dark:hover:text-white rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation Toolbar & Quick Shortcuts */}
        <div className="px-4 py-2.5 border-b border-black/8 dark:border-white/10 bg-black/2 dark:bg-white/2 flex flex-wrap items-center justify-between gap-2 text-xs">
          {/* Back Button */}
          <button
            onClick={handleGoUp}
            disabled={!currentPath || currentPath === '/' || currentPath === '.'}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/5 dark:bg-white/8 hover:bg-black/10 dark:hover:bg-white/12 text-zinc-700 dark:text-zinc-300 border border-black/8 dark:border-white/10 transition cursor-pointer disabled:opacity-30 disabled:pointer-events-none active:scale-[0.98]"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Naik 1 Folder</span>
          </button>

          {/* Quick Folder Shortcuts */}
          <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 max-w-full">
            <span className="text-[11px] text-zinc-400 font-medium shrink-0">Pintas:</span>
            {shortcuts.map((sc) => (
              <button
                key={sc.path}
                onClick={() => {
                  triggerHaptic([25]);
                  if (onNavigate) onNavigate(sc.path);
                }}
                className={`px-3 py-1 rounded-full text-[11px] transition shrink-0 cursor-pointer border ${
                  currentPath === sc.path
                    ? 'bg-[#0071e3] text-white border-[#0071e3] font-medium shadow-xs'
                    : 'bg-black/4 dark:bg-white/6 hover:bg-black/8 dark:hover:bg-white/10 text-zinc-700 dark:text-zinc-300 border-black/6 dark:border-white/8'
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
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-200 space-y-3 my-2 text-xs">
              <div className="flex items-start gap-2.5">
                <ShieldAlert className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-zinc-900 dark:text-white">Izin Akses Penyimpanan Dibutuhkan</h4>
                  <p className="mt-1 leading-relaxed text-zinc-600 dark:text-zinc-300">
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
                  className="w-full sm:w-auto px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-medium rounded-full text-xs transition cursor-pointer shadow-sm active:scale-[0.98]"
                >
                  Beri Izin Penyimpanan di HP
                </button>
              )}
            </div>
          ) : error ? (
            <div className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs flex items-center justify-between gap-2">
              <span>{error}</span>
              {onRefresh && (
                <button
                  onClick={onRefresh}
                  className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white rounded-full text-[11px] cursor-pointer"
                >
                  Coba Lagi
                </button>
              )}
            </div>
          ) : null}

          {/* Loading Indicator */}
          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center text-zinc-500 dark:text-zinc-400 space-y-2">
              <RefreshCw className="w-6 h-6 animate-spin text-[#0071e3]" />
              <p className="text-xs">Membaca isi berkas dari {targetPeer?.name}...</p>
            </div>
          ) : items.length === 0 && !error ? (
            <div className="py-16 flex flex-col items-center justify-center text-zinc-400 dark:text-zinc-500 space-y-2 text-center">
              <HardDrive className="w-8 h-8 text-zinc-400 dark:text-zinc-600 stroke-[1.5]" />
              <p className="text-xs">Folder ini kosong atau belum memiliki file yang didukung.</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {items.map((item, index) => (
                <div
                  key={`${item.path}_${index}`}
                  className="flex items-center justify-between p-2.5 rounded-2xl bg-black/2 dark:bg-white/4 hover:bg-black/5 dark:hover:bg-white/8 border border-black/5 dark:border-white/8 transition group"
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
                        <div className="w-10 h-10 rounded-xl bg-[#0071e3]/10 border border-[#0071e3]/20 flex items-center justify-center shrink-0">
                          <HardDrive className="w-5 h-5 text-[#0071e3] shrink-0" />
                        </div>
                      ) : item.isDirectory ? (
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                          <Folder className="w-5 h-5 text-emerald-500 shrink-0" />
                        </div>
                      ) : isImageFile(item.name) ? (
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            triggerHaptic([20]);
                            setPreviewItem(item);
                          }}
                          className="w-11 h-11 rounded-xl bg-black/5 dark:bg-white/5 border border-black/8 dark:border-white/10 overflow-hidden shrink-0 relative group/thumb cursor-pointer shadow-xs flex items-center justify-center hover:border-[#0071e3] transition"
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
                          <div className="hidden absolute inset-0 flex items-center justify-center bg-black/5 dark:bg-white/5 text-[#0071e3]">
                            <ImageIcon className="w-4 h-4" />
                          </div>
                          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover/thumb:opacity-100 flex items-center justify-center transition">
                            <Eye className="w-4 h-4 text-white drop-shadow" />
                          </div>
                        </div>
                      ) : (
                        <div className="w-10 h-10 rounded-xl bg-black/5 dark:bg-white/5 border border-black/8 dark:border-white/10 flex items-center justify-center shrink-0">
                          {getFileIcon(item.name)}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p
                        className={`text-xs truncate font-medium ${
                          item.isDirectory
                            ? 'text-zinc-900 dark:text-zinc-100 group-hover:text-[#0071e3] font-semibold'
                            : 'text-zinc-800 dark:text-zinc-200'
                        }`}
                      >
                        {item.name}
                      </p>
                      <div className="flex items-center gap-2 text-[10px] text-zinc-500 dark:text-zinc-400 font-mono mt-0.5">
                        {item.isDrive ? (
                          <span className="text-[#0071e3] font-semibold">Drive Windows</span>
                        ) : item.isDirectory ? (
                          <span className="text-emerald-500 font-medium">Folder</span>
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
                        className="p-1.5 text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-white rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition cursor-pointer"
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
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/5 dark:bg-white/8 hover:bg-black/10 dark:hover:bg-white/12 active:scale-[0.98] text-[#0071e3] dark:text-blue-400 font-medium text-xs transition cursor-pointer"
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
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-purple-500/10 hover:bg-purple-500/15 active:scale-[0.98] text-purple-600 dark:text-purple-400 font-medium text-xs transition cursor-pointer"
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
                          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#0071e3] hover:bg-[#0077ed] active:scale-[0.98] text-white font-medium text-xs transition cursor-pointer shadow-xs"
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
        <div className="px-5 py-3 border-t border-black/8 dark:border-white/10 bg-black/2 dark:bg-white/2 text-[11px] text-zinc-500 dark:text-zinc-400 flex items-center justify-between font-mono">
          <span>{items.length} item</span>
          <span>ENCross P2P File System</span>
        </div>
      </div>

      {/* Fullscreen Image Lightbox Preview Modal */}
      {previewItem && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-6 animate-fadeIn"
          onClick={() => setPreviewItem(null)}
        >
          <div
            className="relative max-w-4xl max-h-[92vh] w-full flex flex-col apple-card border border-black/10 dark:border-white/10 rounded-3xl overflow-hidden shadow-2xl p-5"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-3.5 border-b border-black/8 dark:border-white/10 mb-3 px-1 shrink-0">
              <div className="min-w-0 flex-1 pr-3">
                <h4 className="text-sm font-semibold text-zinc-900 dark:text-white truncate">{previewItem.name}</h4>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-mono mt-0.5">
                  {formatFileSize(previewItem.size)} • {previewItem.path}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => {
                    triggerHaptic([35]);
                    if (onPullFile) onPullFile(previewItem);
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#0071e3] hover:bg-[#0077ed] active:scale-[0.98] text-white text-xs font-medium transition cursor-pointer shadow-xs"
                  title="Unduh & simpan file ini"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Ambil File</span>
                </button>
                <button
                  onClick={() => setPreviewItem(null)}
                  className="p-1.5 rounded-full text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition cursor-pointer"
                  title="Tutup Pratinjau"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Image Canvas */}
            <div className="relative flex-1 w-full flex items-center justify-center overflow-hidden min-h-[280px] max-h-[75vh] rounded-2xl bg-black/5 dark:bg-white/5 border border-black/8 dark:border-white/10 p-2">
              <img
                src={getFileUrl(previewItem)}
                alt={previewItem.name}
                className="max-h-[72vh] max-w-full object-contain rounded-xl shadow-2xl transition duration-200"
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
