import React, { useState, useEffect, useRef } from 'react';
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
  Monitor,
  Flame,
  Wind,
  Sliders,
  Activity
} from 'lucide-react';
import { triggerHaptic } from '../utils/feedback';

const PRESET_PC_APPS = [
  {
    id: 'win-search',
    name: 'Windows Search (Cari di PC)',
    desc: 'Buka pencarian Windows untuk cari aplikasi & file',
    command: 'win-search',
    icon: Search,
    color: 'from-blue-500/20 to-indigo-500/10 text-blue-400 border-blue-500/30'
  },
  {
    id: 'nitrosense-quiet',
    name: 'NitroSense: Quiet (Senyap)',
    desc: 'Mode hemat daya & kipas sunyi',
    command: 'powercfg /setactive 381b4222-f694-41f0-9685-ff5bb260df2e',
    icon: Wind,
    color: 'from-emerald-500/20 to-teal-500/10 text-emerald-400 border-emerald-500/30'
  },
  {
    id: 'nitrosense-balanced',
    name: 'NitroSense: Balanced (Seimbang)',
    desc: 'Mode seimbang performa & fan Acer',
    command: 'powercfg /setactive 9fbfd299-0038-4da0-a3a6-30a2d4f2c49f',
    icon: Activity,
    color: 'from-blue-500/20 to-cyan-500/10 text-blue-400 border-blue-500/30'
  },
  {
    id: 'nitrosense-performance',
    name: 'NitroSense: Performance (Turbo)',
    desc: 'Mode performa CPU & GPU maksimal',
    command: 'powercfg /setactive e3c6dc3a-e2ec-46e3-8bbe-a432fe1da37e',
    icon: Flame,
    color: 'from-red-500/20 to-amber-500/10 text-red-400 border-red-500/30'
  },
  {
    id: 'nitrosense-app',
    name: 'Buka Acer NitroSense App',
    desc: 'Aplikasi resmi kontrol fan laptop',
    command: 'explorer.exe shell:AppsFolder\\ULICTekInc.NitroSenseforNotebook_nt9dgb7efx6bt!NitroSense',
    icon: Sliders,
    color: 'from-orange-500/20 to-red-500/10 text-orange-400 border-orange-500/30'
  },
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
  },
  {
    id: 'whatsapp',
    name: 'WhatsApp',
    desc: 'Aplikasi chat WhatsApp PC',
    command: 'start whatsapp:',
    icon: ExternalLink,
    color: 'from-teal-500/20 to-emerald-500/10 text-teal-400 border-teal-500/30'
  },
  {
    id: 'vscode',
    name: 'VS Code',
    desc: 'Code editor visual & terminal',
    command: 'code .',
    icon: Terminal,
    color: 'from-sky-500/20 to-blue-500/10 text-sky-400 border-sky-500/30'
  },
  {
    id: 'taskmgr',
    name: 'Task Manager',
    desc: 'Monitor proses & performa PC',
    command: 'taskmgr',
    icon: Monitor,
    color: 'from-rose-500/20 to-red-500/10 text-rose-400 border-rose-500/30'
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
  onLaunchApp,
  initialTab = 'launch'
}) {
  const [activeTab, setActiveTab] = useState(initialTab); // 'windows' | 'launch'
  const [searchQuery, setSearchQuery] = useState('');
  const [customCommand, setCustomCommand] = useState('');
  const [isLaunching, setIsLaunching] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [installedPcApps, setInstalledPcApps] = useState([]);
  const [isAppsLoading, setIsAppsLoading] = useState(false);
  const [launchWindowMode, setLaunchWindowMode] = useState(() => {
    return localStorage.getItem('encross_pc_app_launch_mode') || 'normal'; // 'normal' | 'minimized'
  });
  const searchInputRef = useRef(null);

  // Fetch real indexed PC applications from laptop server
  useEffect(() => {
    if (isOpen && targetPeer) {
      setIsAppsLoading(true);
      const host = targetPeer?.ip || targetPeer?.clientIp || (targetPeer?.ips && targetPeer.ips[0]) || window.location.hostname || '127.0.0.1';
      fetch(`http://${host}:3001/api/pc-installed-apps`)
        .then((res) => res.json())
        .then((data) => {
          if (data?.apps && Array.isArray(data.apps)) {
            setInstalledPcApps(data.apps);
          }
        })
        .catch(() => {})
        .finally(() => setIsAppsLoading(false));
    }
  }, [isOpen, targetPeer]);

  // Swipe gesture detection
  const swipeStartX = useRef(0);
  const swipeStartY = useRef(0);

  const handleSwipeStart = (e) => {
    if (!e.touches || e.touches.length === 0) return;
    swipeStartX.current = e.touches[0].clientX;
    swipeStartY.current = e.touches[0].clientY;
  };

  const handleSwipeEnd = (e) => {
    if (!e.changedTouches || e.changedTouches.length === 0) return;
    const dx = e.changedTouches[0].clientX - swipeStartX.current;
    const dy = e.changedTouches[0].clientY - swipeStartY.current;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) {
      if (dx < 0 && activeTab === 'windows') {
        triggerHaptic([20]);
        setActiveTab('launch');
      } else if (dx > 0 && activeTab === 'launch') {
        triggerHaptic([20]);
        setActiveTab('windows');
      }
    }
  };

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      onRequestRefresh?.();
      // Auto-focus search input so phone keyboard opens & user can immediately search PC apps
      if (searchInputRef.current) {
        searchInputRef.current.focus();
        searchInputRef.current.select?.();
      }
      const timer = setTimeout(() => {
        if (searchInputRef.current) {
          searchInputRef.current.focus();
          searchInputRef.current.select?.();
        }
      }, 100);
      return () => clearTimeout(timer);
    } else {
      setSearchQuery('');
    }
  }, [isOpen, initialTab]);

  if (!isOpen) return null;

  // Filter open windows and screens from sources
  const allWindows = (remoteSources || []).filter((s) => s.id && s.id.startsWith('window'));
  const allScreens = (remoteSources || []).filter((s) => s.id && s.id.startsWith('screen'));

  const filteredWindows = allWindows.filter((w) =>
    (w.name || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Combine presets with universal real PC applications (Steam, Games, Office, etc.)
  const combinedAppsList = [...PRESET_PC_APPS];
  if (installedPcApps.length > 0) {
    for (const realApp of installedPcApps) {
      const alreadyInPreset = PRESET_PC_APPS.some((p) => p.name.toLowerCase() === realApp.name.toLowerCase());
      if (!alreadyInPreset) {
        combinedAppsList.push({
          id: realApp.id || realApp.name,
          name: realApp.name,
          desc: realApp.lnkPath ? 'Shortcut Desktop / Start Menu PC' : 'Aplikasi Windows Terpasang',
          command: realApp.name,
          icon: AppWindow,
          color: 'from-zinc-700/30 to-zinc-800/20 text-zinc-300 border-zinc-600/30'
        });
      }
    }
  }

  const filteredApps = combinedAppsList.filter((app) =>
    (app.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (app.desc || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (app.command || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleChooseSource = (source) => {
    triggerHaptic([30]);
    onSelectSource?.(source);
    onClose();
  };

  const handleExecuteLaunch = async (command, appName, mode = launchWindowMode) => {
    if (!command) return;
    triggerHaptic([35]);
    setIsLaunching(true);
    const modeLabel = mode === 'minimized' ? 'Minimize' : 'Tampil';
    setStatusMessage(`Membuka ${appName || 'aplikasi'} di PC (${modeLabel})...`);

    onLaunchApp?.(command, appName, mode);

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
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-md overflow-hidden animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl h-full sm:h-[85vh] max-h-[720px] bg-zinc-900 border border-white/12 rounded-3xl shadow-2xl flex flex-col overflow-hidden text-zinc-100 animate-ios-sheet smooth-gpu"
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
          <div className="flex items-center gap-2">
            {/* Launch Mode Toggle (Tampil vs Minimize) */}
            <div className="flex items-center p-0.5 bg-white/6 rounded-xl border border-white/8 text-[10px] font-semibold">
              <button
                type="button"
                onClick={() => {
                  triggerHaptic([20]);
                  setLaunchWindowMode('normal');
                  localStorage.setItem('encross_pc_app_launch_mode', 'normal');
                }}
                className={`px-2.5 py-1 rounded-lg transition cursor-pointer flex items-center gap-1 ${
                  launchWindowMode === 'normal'
                    ? 'bg-[#0071e3] text-white shadow-xs'
                    : 'text-zinc-400 hover:text-white'
                }`}
                title="Buka aplikasi langsung aktif di layar laptop"
              >
                <span>🚀 Tampil</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  triggerHaptic([20]);
                  setLaunchWindowMode('minimized');
                  localStorage.setItem('encross_pc_app_launch_mode', 'minimized');
                }}
                className={`px-2.5 py-1 rounded-lg transition cursor-pointer flex items-center gap-1 ${
                  launchWindowMode === 'minimized'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-zinc-400 hover:text-white'
                }`}
                title="Buka aplikasi langsung masuk ke minimize / latar belakang"
              >
                <span>🪟 Minimize</span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 active:scale-95 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Unified Search Input for HP (Auto-focused on open) */}
        <div className="px-5 sm:px-6 pt-3 pb-1 border-b border-white/6 shrink-0 bg-white/[0.01]">
          <div className="relative flex items-center">
            <Search className="w-4 h-4 absolute left-3.5 text-zinc-400 pointer-events-none" />
            <input
              ref={searchInputRef}
              type="search"
              autoFocus
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && searchQuery.trim()) {
                  handleExecuteLaunch(searchQuery.trim(), searchQuery.trim());
                }
              }}
              placeholder="Cari atau ketik nama software / game PC..."
              className="w-full pl-10 pr-24 py-2 rounded-2xl bg-white/6 border border-white/10 text-xs text-white placeholder-zinc-500 focus:outline-hidden focus:border-purple-500 focus:ring-1 focus:ring-purple-500/40 transition shadow-inner"
            />
            {searchQuery.trim() ? (
              <div className="absolute right-1.5 flex items-center gap-1">
                <button
                  onClick={() => handleExecuteLaunch(searchQuery.trim(), searchQuery.trim())}
                  className="px-2.5 py-1 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-[10px] font-semibold transition cursor-pointer shadow-xs active:scale-95"
                  title="Luncurkan perintah di PC"
                >
                  Buka
                </button>
                <button
                  onClick={() => setSearchQuery('')}
                  className="p-1 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white transition cursor-pointer text-xs"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => handleExecuteLaunch('win-search', 'Windows Search')}
                className="absolute right-2 px-2 py-1 rounded-xl bg-white/8 hover:bg-white/12 text-zinc-300 text-[10px] font-medium transition cursor-pointer flex items-center gap-1 border border-white/8"
                title="Buka Pencarian Windows di Laptop"
              >
                <Search className="w-2.5 h-2.5 text-purple-400" />
                <span className="hidden xs:inline">Cari di PC</span>
              </button>
            )}
          </div>
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
          <div className="relative flex bg-white/6 p-1 rounded-2xl border border-white/8 min-w-[280px]">
            {/* Sliding highlight indicator */}
            <div
              className="absolute top-1 bottom-1 rounded-xl bg-purple-600 shadow-md transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] pointer-events-none"
              style={{
                left: activeTab === 'windows' ? '4px' : 'calc(50% + 2px)',
                width: 'calc(50% - 6px)',
              }}
            />
            <button
              onClick={() => {
                triggerHaptic([20]);
                setActiveTab('windows');
              }}
              className={`relative z-10 flex-1 flex items-center justify-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors duration-200 cursor-pointer ${
                activeTab === 'windows' ? 'text-white' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Jendela PC ({allWindows.length})</span>
            </button>

            <button
              onClick={() => {
                triggerHaptic([20]);
                setActiveTab('launch');
              }}
              className={`relative z-10 flex-1 flex items-center justify-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors duration-200 cursor-pointer ${
                activeTab === 'launch' ? 'text-white' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Buka Baru</span>
            </button>
          </div>

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
        </div>

        {/* Content Body: Unified Instant Search vs Normal Tab View */}
        {searchQuery.trim() ? (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
            {/* 1. Quick Launch Action Card */}
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-purple-900/40 to-indigo-900/30 border border-purple-500/30 flex items-center justify-between gap-3 shadow-md">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2.5 rounded-xl bg-purple-500/25 text-purple-300 border border-purple-500/30 shrink-0">
                  <Play className="w-4 h-4 fill-purple-300" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-white truncate">
                    Buka "{searchQuery.trim()}" di Laptop
                  </p>
                  <p className="text-[11px] text-purple-200/70 truncate">
                    Tekan Enter atau ketuk tombol Buka untuk meluncurkan di PC
                  </p>
                </div>
              </div>
              <button
                onClick={() => handleExecuteLaunch(searchQuery.trim(), searchQuery.trim())}
                disabled={isLaunching}
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 active:scale-95 text-white text-xs font-semibold shrink-0 transition shadow-md cursor-pointer flex items-center gap-1.5"
              >
                <span>Buka</span>
                <Play className="w-3 h-3 fill-white" />
              </button>
            </div>

            {/* 2. Matching Preset PC Apps */}
            {filteredApps.length > 0 && (
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-3 flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                  <span>Aplikasi PC yang Siap Diluncurkan ({filteredApps.length})</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {filteredApps.map((app) => {
                    const Icon = app.icon;
                    return (
                      <button
                        key={app.id}
                        onClick={() => handleExecuteLaunch(app.command, app.name, launchWindowMode)}
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
            )}

            {/* 3. Matching Running Windows */}
            {filteredWindows.length > 0 && (
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-3 flex items-center gap-2">
                  <Layers className="w-3.5 h-3.5 text-blue-400" />
                  <span>Jendela PC Sedang Terbuka ({filteredWindows.length})</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-2">
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
              </div>
            )}
          </div>
        ) : (
          /* Slideable Viewport for Tab Content */
        <div
          className="flex-1 overflow-hidden relative"
          onTouchStart={handleSwipeStart}
          onTouchEnd={handleSwipeEnd}
        >
          <div
            className="flex h-full w-[200%] transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]"
            style={{
              transform: activeTab === 'windows' ? 'translateX(0%)' : 'translateX(-50%)',
            }}
          >
            {/* Page 1: Jendela Aktif */}
            <div className="w-1/2 h-full overflow-y-auto p-4 sm:p-6 space-y-4">
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
                    Buka aplikasi di PC atau gunakan tab "Buka Baru".
                  </p>
                  <button
                    onClick={() => setActiveTab('launch')}
                    className="mt-2 px-3 py-1.5 rounded-xl bg-purple-500/20 text-purple-300 text-xs font-semibold hover:bg-purple-500/30 transition cursor-pointer"
                  >
                    Buka Tab Luncurkan Aplikasi
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-2">
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

            {/* Page 2: Luncurkan Aplikasi Baru */}
            <div className="w-1/2 h-full overflow-y-auto p-4 sm:p-6 space-y-5">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-3 flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                  <span>Pilih Aplikasi Populer untuk Dibuka di PC</span>
                </h4>

                {filteredApps.length === 0 ? (
                  <div className="py-6 text-center flex flex-col items-center justify-center gap-2.5 bg-white/3 rounded-2xl border border-white/6 p-4">
                    <Sparkles className="w-6 h-6 text-purple-400 opacity-60" />
                    <div>
                      <p className="text-xs font-semibold text-white">
                        {searchQuery.trim() ? `Tidak ada preset untuk "${searchQuery}"` : 'Tidak ada aplikasi yang cocok'}
                      </p>
                      <p className="text-[11px] text-zinc-400 mt-0.5">
                        Luncurkan perintah atau software ini langsung di PC Anda
                      </p>
                    </div>
                    {searchQuery.trim() && (
                      <button
                        onClick={() => handleExecuteLaunch(searchQuery.trim(), searchQuery.trim())}
                        disabled={isLaunching}
                        className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold transition cursor-pointer shadow-md active:scale-95 flex items-center gap-2"
                      >
                        <Play className="w-3.5 h-3.5 fill-white" />
                        <span>Buka "{searchQuery.trim()}" di PC</span>
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {filteredApps.map((app) => {
                      const Icon = app.icon;
                      return (
                        <button
                          key={app.id}
                          onClick={() => handleExecuteLaunch(app.command, app.name, launchWindowMode)}
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
                )}
              </div>

              {/* Custom Command Launcher */}
              <div className="p-4 rounded-2xl bg-white/3 border border-white/8 space-y-3 pb-2">
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
