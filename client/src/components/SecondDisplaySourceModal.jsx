import React, { useState, useEffect } from 'react';
import {
  Monitor,
  AppWindow,
  X,
  Play,
  RefreshCw,
  Sparkles,
  ExternalLink,
  Laptop,
  Check,
  HelpCircle,
  Maximize2,
  Tv,
  Loader2,
  Zap
} from 'lucide-react';
import { triggerHaptic } from '../utils/feedback';

export function SecondDisplaySourceModal({
  isOpen,
  onClose,
  targetPeer,
  onStartStreaming,
  isRemote = false,
  remoteSources = null,
  isLoadingRemote = false,
  onRequestRefreshSources = null
}) {
  const [activeTab, setActiveTab] = useState('window'); // 'screen' | 'window'
  const [sources, setSources] = useState([]);
  const [selectedSourceId, setSelectedSourceId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [qualityPreset, setQualityPreset] = useState('60fps'); // '60fps' | 'balanced'
  const [showDriverGuide, setShowDriverGuide] = useState(false);

  // Sync sources from remote or local Electron API
  const fetchSources = async () => {
    if (isRemote) {
      if (onRequestRefreshSources) {
        onRequestRefreshSources();
      }
      return;
    }

    if (!window.electronAPI?.getDesktopSources) return;
    setIsLoading(true);
    try {
      const result = await window.electronAPI.getDesktopSources(['screen', 'window']);
      setSources(result || []);
      if (!selectedSourceId && result && result.length > 0) {
        const def = result.find((s) => s.id.startsWith('screen:1')) || result.find((s) => s.id.startsWith('window:')) || result[0];
        if (def) setSelectedSourceId(def.id);
      }
    } catch (err) {
      console.error('Failed to get sources:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      if (isRemote && remoteSources) {
        setSources(remoteSources);
        if (remoteSources.length > 0) {
          const screensList = remoteSources.filter((s) => s.id.startsWith('screen:'));
          const windowsList = remoteSources.filter((s) => !s.id.startsWith('screen:'));
          if (activeTab === 'window' && windowsList.length === 0 && screensList.length > 0) {
            setActiveTab('screen');
          }
          const def = remoteSources.find((s) => s.id.startsWith('screen:1')) || remoteSources.find((s) => s.id.startsWith('screen:0')) || remoteSources[0];
          if (def) setSelectedSourceId(def.id);
        }
      } else if (!isRemote) {
        fetchSources();
      }
    }
  }, [isOpen, isRemote, remoteSources]);

  // Update when remoteSources prop changes while open
  useEffect(() => {
    if (isOpen && isRemote && Array.isArray(remoteSources)) {
      setSources(remoteSources);
      if (remoteSources.length > 0 && !selectedSourceId) {
        const def = remoteSources.find((s) => s.id.startsWith('screen:1')) || remoteSources.find((s) => s.id.startsWith('screen:0')) || remoteSources[0];
        if (def) setSelectedSourceId(def.id);
      }
    }
  }, [remoteSources, isOpen, isRemote]);

  if (!isOpen) return null;

  const screens = sources.filter((s) => s.id.startsWith('screen:'));
  const windows = sources.filter((s) => !s.id.startsWith('screen:'));
  const displayedItems = activeTab === 'screen' ? screens : windows;
  const selectedItem = sources.find((s) => s.id === selectedSourceId);
  const loadingActive = isRemote ? isLoadingRemote : isLoading;

  const handleConfirmStart = async () => {
    triggerHaptic([30]);
    if (!isRemote && window.electronAPI?.setTargetDisplaySource && selectedSourceId) {
      await window.electronAPI.setTargetDisplaySource(selectedSourceId);
    }
    onStartStreaming?.(selectedItem || (selectedSourceId ? { id: selectedSourceId } : null), qualityPreset);
    onClose();
  };

  const handleQuickDefaultStart = () => {
    triggerHaptic([30]);
    onStartStreaming?.(null, qualityPreset);
    onClose();
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl bg-[#121214]/95 dark:bg-black/95 text-white rounded-3xl border border-white/12 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden backdrop-blur-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-white/8 shrink-0 bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-sky-500/20 to-blue-600/30 text-sky-400 border border-sky-500/30 flex items-center justify-center shadow-inner shrink-0">
              <Tv className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                {isRemote ? 'Pilih Tampilan Mirror Layar PC' : 'Monitor Tambahan Nirkabel'}
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-sky-500/15 text-sky-300 border border-sky-500/30">
                  {isRemote ? 'Dari HP' : 'Dual Screen'}
                </span>
              </h2>
              <p className="text-[11px] sm:text-xs text-zinc-400 line-clamp-1">
                {isRemote ? (
                  <>Pilih layar atau jendela <span className="text-zinc-200 font-semibold">{targetPeer?.name || 'PC / Laptop'}</span> untuk dimirror</>
                ) : (
                  <>Alirkan layar monitor atau jendela ke <span className="text-zinc-200 font-semibold">{targetPeer?.name || 'HP / Tablet'}</span></>
                )}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 active:scale-90 flex items-center justify-center text-zinc-400 hover:text-white transition cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Selection & Controls */}
        <div className="flex items-center justify-between px-5 sm:px-6 pt-3.5 pb-2 shrink-0 gap-2 flex-wrap">
          <div className="flex bg-white/6 p-1 rounded-2xl border border-white/8">
            <button
              onClick={() => {
                triggerHaptic([20]);
                setActiveTab('window');
              }}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                activeTab === 'window'
                  ? 'bg-[#0071e3] text-white shadow-xs'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <AppWindow className="w-3.5 h-3.5" />
              <span>Jendela ({windows.length})</span>
            </button>

            <button
              onClick={() => {
                triggerHaptic([20]);
                setActiveTab('screen');
              }}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                activeTab === 'screen'
                  ? 'bg-[#0071e3] text-white shadow-xs'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Monitor className="w-3.5 h-3.5" />
              <span>Layar Penuh ({screens.length})</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchSources}
              disabled={loadingActive}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 transition cursor-pointer flex items-center gap-1.5 text-xs border border-white/8"
              title="Segarkan daftar layar"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingActive ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Segarkan</span>
            </button>

            {!isRemote && (
              <button
                onClick={() => setShowDriverGuide(!showDriverGuide)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 text-xs font-medium transition cursor-pointer border border-white/8"
              >
                <HelpCircle className="w-3.5 h-3.5 text-sky-400" />
                <span className="hidden sm:inline">Mode 2 Layar OS</span>
              </button>
            )}
          </div>
        </div>

        {/* Optional Virtual Display Driver Guide Banner for Desktop */}
        {showDriverGuide && !isRemote && (
          <div className="mx-5 sm:mx-6 my-2 p-3.5 rounded-2xl bg-sky-950/40 border border-sky-500/30 text-xs space-y-2 animate-in fade-in">
            <div className="flex items-center justify-between text-sky-300 font-semibold">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-sky-400" />
                Ingin Dual Monitor Workspace Penuh di Windows?
              </span>
              <button
                onClick={() => setShowDriverGuide(false)}
                className="text-zinc-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            <p className="text-[11px] text-zinc-300 leading-relaxed">
              Jika laptop hanya memiliki 1 layar fisik dan Anda ingin Windows memiliki Display 2 virtual terpisah, Anda dapat memasang{' '}
              <a
                href="https://github.com/VirtualDrivers/Virtual-Display-Driver/releases"
                target="_blank"
                rel="noreferrer"
                className="text-sky-400 underline font-semibold inline-flex items-center gap-1"
              >
                Virtual Display Driver
                <ExternalLink className="w-3 h-3" />
              </a>
              . Driver ini gratis dan otomatis menambahkan Monitor Virtual di Windows.
            </p>
          </div>
        )}

        {/* Source Items Grid / Loading / Empty States */}
        <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-3 space-y-4 min-h-[200px]">
          {loadingActive && sources.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-sky-500/10 text-sky-400 flex items-center justify-center border border-sky-500/20">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
              <div>
                <p className="text-sm font-semibold text-zinc-200">
                  {isRemote ? `Mengambil daftar layar & jendela dari ${targetPeer?.name || 'PC'}...` : 'Memuat sumber layar...'}
                </p>
                <p className="text-xs text-zinc-400 mt-1 max-w-sm">
                  Sedang membaca jendela aktif dan monitor yang tersedia secara langsung.
                </p>
              </div>

              {isRemote && (
                <button
                  onClick={handleQuickDefaultStart}
                  className="mt-2 flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-600/30 hover:bg-sky-600/50 text-sky-200 border border-sky-500/40 text-xs font-semibold transition active:scale-95 cursor-pointer shadow-sm"
                >
                  <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                  <span>Alirkan Layar Utama Langsung (Cepat)</span>
                </button>
              )}
            </div>
          ) : displayedItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-zinc-500">
                <AppWindow className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-zinc-300">
                {activeTab === 'window' ? 'Tidak ada jendela aplikasi terbuka' : 'Tidak ada layar tambahan'}
              </p>
              <p className="text-xs text-zinc-500 max-w-xs">
                {activeTab === 'window'
                  ? 'Buka aplikasi di PC laptop atau pilih tab Layar Penuh di atas.'
                  : 'Gunakan layar utama atau sambungkan monitor tambahan.'}
              </p>
              {isRemote && (
                <button
                  onClick={handleQuickDefaultStart}
                  className="mt-3 flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-600/30 hover:bg-sky-600/50 text-sky-200 border border-sky-500/40 text-xs font-semibold transition active:scale-95 cursor-pointer"
                >
                  <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                  <span>Alirkan Layar Utama (Otomatis)</span>
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {displayedItems.map((item) => {
                const isSelected = item.id === selectedSourceId;
                return (
                  <div
                    key={item.id}
                    onClick={() => {
                      triggerHaptic([15]);
                      setSelectedSourceId(item.id);
                    }}
                    className={`group relative p-2.5 sm:p-3 rounded-2xl border transition-all cursor-pointer flex flex-col gap-2 overflow-hidden ${
                      isSelected
                        ? 'bg-sky-500/15 border-sky-500/70 shadow-lg shadow-sky-950/40 ring-1 ring-sky-500/50'
                        : 'bg-white/[0.03] hover:bg-white/[0.06] border-white/8 hover:border-white/16'
                    }`}
                  >
                    {/* Thumbnail Box */}
                    <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-black/60 border border-white/6 flex items-center justify-center">
                      {item.thumbnail ? (
                        <img
                          src={item.thumbnail}
                          alt={item.name}
                          className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300"
                        />
                      ) : (
                        <Monitor className="w-8 h-8 text-zinc-600" />
                      )}

                      {/* Selected Checkmark Badge */}
                      {isSelected && (
                        <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-[#0071e3] text-white flex items-center justify-center shadow-md animate-in zoom-in-75 duration-150">
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </div>
                      )}
                    </div>

                    {/* Meta Info */}
                    <div className="flex items-center gap-2 px-0.5">
                      {item.appIcon ? (
                        <img src={item.appIcon} alt="" className="w-4 h-4 shrink-0 rounded" />
                      ) : (
                        <div className="w-4 h-4 rounded bg-white/10 flex items-center justify-center shrink-0">
                          <Monitor className="w-2.5 h-2.5 text-zinc-400" />
                        </div>
                      )}
                      <span className="text-xs font-semibold text-zinc-200 truncate flex-1 group-hover:text-white transition">
                        {item.name || 'Layar / Jendela PC'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-5 sm:px-6 py-3.5 border-t border-white/8 shrink-0 bg-white/[0.02] flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Quality Presets */}
          <div className="flex items-center gap-2 self-start sm:self-auto text-xs text-zinc-400">
            <span className="text-[11px] font-medium">Kualitas:</span>
            <div className="flex bg-white/6 p-0.5 rounded-xl border border-white/8">
              <button
                onClick={() => setQualityPreset('60fps')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition cursor-pointer ${
                  qualityPreset === '60fps'
                    ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                60 FPS Lancar
              </button>
              <button
                onClick={() => setQualityPreset('balanced')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition cursor-pointer ${
                  qualityPreset === 'balanced'
                    ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Seimbang
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              onClick={onClose}
              className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-white/6 hover:bg-white/10 text-zinc-300 text-xs font-semibold transition cursor-pointer border border-white/8 active:scale-95 text-center"
            >
              Batal
            </button>
            <button
              onClick={handleConfirmStart}
              disabled={!selectedSourceId && displayedItems.length > 0}
              className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-[#0071e3] hover:bg-[#0077ed] active:scale-95 disabled:opacity-40 disabled:pointer-events-none text-white text-xs font-bold transition cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{isRemote ? 'Mulai Mirroring ke HP' : 'Alirkan Monitor Tambahan'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
