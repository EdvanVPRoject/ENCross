import React, { useState, useEffect } from 'react';
import {
  X,
  AppWindow,
  RefreshCw,
  Search,
  ExternalLink,
  Terminal,
  Folder,
  FileText,
  Calculator,
  Globe,
  Gamepad2,
  Music,
  Play,
  Sparkles,
  Layers,
  ChevronRight,
  Monitor
} from 'lucide-react';
import { triggerHaptic } from '../utils/feedback';

const PRESET_PC_APPS = [
  {
    id: 'chrome',
    name: 'Google Chrome',
    desc: 'Browser web cepat & ekstensi',
    command: 'start chrome',
    icon: Globe,
    color: 'from-blue-500/20 to-sky-500/10 text-blue-400 border-blue-500/30'
  },
  {
    id: 'explorer',
    name: 'File Explorer',
    desc: 'Manajemen file & folder PC',
    command: 'explorer.exe',
    icon: Folder,
    color: 'from-amber-500/20 to-yellow-500/10 text-amber-400 border-amber-500/30'
  },
  {
    id: 'notepad',
    name: 'Notepad',
    desc: 'Catatan teks cepat & kode',
    command: 'notepad.exe',
    icon: FileText,
    color: 'from-emerald-500/20 to-teal-500/10 text-emerald-400 border-emerald-500/30'
  },
  {
    id: 'calc',
    name: 'Kalkulator',
    desc: 'Hitung standar & saintifik',
    command: 'calc.exe',
    icon: Calculator,
    color: 'from-purple-500/20 to-indigo-500/10 text-purple-400 border-purple-500/30'
  },
  {
    id: 'cmd',
    name: 'Terminal CMD',
    desc: 'Command Prompt Windows',
    command: 'cmd.exe',
    icon: Terminal,
    color: 'from-zinc-600/30 to-zinc-800/20 text-zinc-300 border-zinc-600/30'
  },
  {
    id: 'roblox',
    name: 'Roblox Player',
    desc: 'Game Roblox desktop PC',
    command: 'start roblox-player:',
    icon: Gamepad2,
    color: 'from-red-500/20 to-rose-500/10 text-red-400 border-red-500/30'
  },
  {
    id: 'spotify',
    name: 'Spotify',
    desc: 'Musik & podcast PC',
    command: 'start spotify:',
    icon: Music,
    color: 'from-green-500/20 to-emerald-500/10 text-green-400 border-green-500/30'
  }
];

export function PcAppLauncherModal({
  isOpen,
  onClose,
  targetPeer,
  remoteSources = [],
  isLoading = false,
  onRequestRefresh,
  onSelectSource,
  onLaunchApp
}) {
  const [activeTab, setActiveTab] = useState('windows'); // 'windows' | 'launch'
  const [searchQuery, setSearchQuery] = useState('');
  const [customCommand, setCustomCommand] = useState('');
  const [isLaunching, setIsLaunching] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  useEffect(() => {
    if (isOpen) {
      onRequestRefresh?.();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Filter open windows and screens from sources
  const allWindows = (remoteSources || []).filter((s) => s.id && s.id.startsWith('window'));
  const allScreens = (remoteSources || []).filter((s) => s.id && s.id.startsWith('screen'));

  const filteredWindows = allWindows.filter((w) =>
    (w.name || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleChooseSource = (source) => {
    triggerHaptic([30]);
    onSelectSource?.(source);
    onClose();
  };

  const handleExecuteLaunch = async (command, appName) => {
    if (!command) return;
    triggerHaptic([35]);
    setIsLaunching(true);
    setStatusMessage(`Membuka ${appName || 'aplikasi'} di PC...`);

    onLaunchApp?.(command, appName);

    // Give visual feedback and auto-refresh sources
    setTimeout(() => {
      onRequestRefresh?.();
      setStatusMessage(`Menghubungkan stream jendela ${appName || 'aplikasi'}...`);
    }, 1500);

    setTimeout(() => {
      setIsLaunching(false);
      setStatusMessage('');
      onClose();
    }, 2200);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl max-h-[90vh] bg-zinc-900 border border-white/12 rounded-3xl shadow-2xl flex flex-col overflow-hidden text-zinc-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-white/8 shrink-0 bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-purple-500/15 text-purple-400 border border-purple-500/25">
              <AppWindow className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-white">Buka Aplikasi PC di HP</h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  Virtual App
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Pilih jendela aktif atau luncurkan aplikasi Windows untuk tampil di layar HP ini
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 active:scale-95 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Toast Banner when launching */}
        {statusMessage && (
          <div className="px-5 py-2.5 bg-purple-950/60 border-b border-purple-500/30 text-purple-200 text-xs flex items-center justify-between animate-in fade-in">
            <div className="flex items-center gap-2">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-purple-400" />
              <span>{statusMessage}</span>
            </div>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex items-center justify-between px-5 sm:px-6 pt-3 pb-2 border-b border-white/6 shrink-0 gap-2 flex-wrap">
          <div className="flex bg-white/6 p-1 rounded-2xl border border-white/8">
            <button
              onClick={() => {
                triggerHaptic([20]);
                setActiveTab('windows');
              }}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                activeTab === 'windows'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Jendela PC Terbuka ({allWindows.length})</span>
            </button>

            <button
              onClick={() => {
                triggerHaptic([20]);
                setActiveTab('launch');
              }}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                activeTab === 'launch'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Luncurkan Aplikasi Baru</span>
            </button>
          </div>

          {activeTab === 'windows' && (
            <button
              onClick={() => {
                triggerHaptic([20]);
                onRequestRefresh?.();
              }}
              disabled={isLoading}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 transition cursor-pointer flex items-center gap-1.5 text-xs border border-white/8"
              title="Segarkan daftar jendela"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Segarkan</span>
            </button>
          )}
        </div>

        {/* Tab 1: Jendela Aktif */}
        {activeTab === 'windows' && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            {/* Search filter */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari nama jendela / aplikasi PC..."
                className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white/5 border border-white/10 text-xs text-white placeholder-zinc-500 focus:outline-hidden focus:border-purple-500 transition"
              />
            </div>

            {isLoading ? (
              <div className="py-12 flex flex-col items-center justify-center text-center gap-3">
                <RefreshCw className="w-6 h-6 animate-spin text-purple-400" />
                <p className="text-xs text-zinc-400">Mendeteksi jendela aplikasi PC...</p>
              </div>
            ) : filteredWindows.length === 0 ? (
              <div className="py-10 text-center flex flex-col items-center justify-center gap-2 text-zinc-400">
                <AppWindow className="w-8 h-8 opacity-40 text-purple-400" />
                <p className="text-xs font-medium">Tidak ada jendela aplikasi terbuka yang cocok.</p>
                <p className="text-[11px] text-zinc-500">
                  Buka aplikasi di PC atau gunakan tab "Luncurkan Aplikasi Baru".
                </p>
                <button
                  onClick={() => setActiveTab('launch')}
                  className="mt-2 px-3 py-1.5 rounded-xl bg-purple-500/20 text-purple-300 text-xs font-semibold hover:bg-purple-500/30 transition cursor-pointer"
                >
                  Buka Tab Luncurkan Aplikasi
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {filteredWindows.map((win) => (
                  <div
                    key={win.id}
                    onClick={() => handleChooseSource(win)}
                    className="p-3 rounded-2xl bg-white/4 hover:bg-purple-500/10 border border-white/8 hover:border-purple-500/40 transition cursor-pointer flex flex-col gap-2.5 group active:scale-[0.98]"
                  >
                    <div className="w-full aspect-video rounded-xl bg-black/60 overflow-hidden relative border border-white/6 flex items-center justify-center">
                      {win.thumbnail ? (
                        <img
                          src={win.thumbnail}
                          alt={win.name}
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <AppWindow className="w-8 h-8 text-zinc-600" />
                      )}
                      <div className="absolute inset-0 bg-purple-600/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 text-white text-xs font-bold backdrop-blur-2xs">
                        <Play className="w-4 h-4 fill-white" />
                        <span>Tampilkan di HP</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {win.appIcon ? (
                        <img src={win.appIcon} alt="" className="w-4 h-4 shrink-0 rounded" />
                      ) : (
                        <AppWindow className="w-4 h-4 text-purple-400 shrink-0" />
                      )}
                      <span className="text-xs font-medium text-zinc-200 truncate flex-1" title={win.name}>
                        {win.name || 'Jendela Tanpa Nama'}
                      </span>
                      <ChevronRight className="w-3.5 h-3.5 text-zinc-500 group-hover:text-purple-400 transition-colors" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Luncurkan Aplikasi Baru */}
        {activeTab === 'launch' && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-3 flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                <span>Pilih Aplikasi Populer untuk Dibuka di PC</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {PRESET_PC_APPS.map((app) => {
                  const Icon = app.icon;
                  return (
                    <button
                      key={app.id}
                      onClick={() => handleExecuteLaunch(app.command, app.name)}
                      disabled={isLaunching}
                      className="flex items-start gap-3 p-3.5 rounded-2xl bg-white/4 hover:bg-white/8 border border-white/8 hover:border-purple-500/30 text-left transition cursor-pointer active:scale-95 group"
                    >
                      <div className={`p-2.5 rounded-xl bg-gradient-to-br ${app.color} border shrink-0 group-hover:scale-105 transition-transform`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h5 className="text-xs font-semibold text-white truncate">{app.name}</h5>
                          <ExternalLink className="w-3 h-3 text-zinc-500 group-hover:text-purple-400 transition-colors" />
                        </div>
                        <p className="text-[11px] text-zinc-400 mt-0.5 leading-snug">{app.desc}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom Command Launcher */}
            <div className="p-4 rounded-2xl bg-white/3 border border-white/8 space-y-3">
              <h4 className="text-xs font-bold text-white flex items-center gap-2">
                <Terminal className="w-3.5 h-3.5 text-purple-400" />
                <span>Buka Aplikasi Kustom atau Game Lain di PC</span>
              </h4>
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                Ketik nama software, game, atau perintah (contoh: <code className="text-purple-300">vlc</code>, <code className="text-purple-300">steam:</code>, <code className="text-purple-300">mspaint</code>, <code className="text-purple-300">taskmgr</code>, atau path file <code className="text-purple-300">.exe</code>).
              </p>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={customCommand}
                  onChange={(e) => setCustomCommand(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && customCommand.trim()) {
                      handleExecuteLaunch(customCommand.trim(), customCommand.trim());
                    }
                  }}
                  placeholder="Contoh: vlc, steam:, mspaint"
                  className="flex-1 px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-xs text-white placeholder-zinc-500 focus:outline-hidden focus:border-purple-500"
                />
                <button
                  onClick={() => handleExecuteLaunch(customCommand.trim(), customCommand.trim())}
                  disabled={!customCommand.trim() || isLaunching}
                  className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:hover:bg-purple-600 text-white text-xs font-semibold transition cursor-pointer shrink-0"
                >
                  Buka di PC
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="px-5 sm:px-6 py-3 border-t border-white/8 shrink-0 bg-white/[0.02] flex items-center justify-between text-xs text-zinc-400">
          <span>Target PC: <strong className="text-white font-medium">{targetPeer?.name || 'Laptop/PC'}</strong></span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-medium transition cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}

export default PcAppLauncherModal;
