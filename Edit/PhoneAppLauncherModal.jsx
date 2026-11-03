import React, { useState, useEffect, useRef } from 'react';
import {
  Smartphone,
  X,
  Search,
  ExternalLink,
  Camera,
  Image,
  Globe,
  Play,
  Settings,
  Music,
  Video,
  MapPin,
  Folder,
  ShoppingBag,
  Gamepad2,
  Box,
  MessageCircle,
  Terminal,
  Sparkles,
  Plus,
  Trash2,
  Star,
  Check,
  CheckCircle2,
  RefreshCw,
  AppWindow,
  Send,
  CreditCard,
  Layers,
  ChevronRight
} from 'lucide-react';
import { triggerHaptic } from '../utils/feedback';

const InstagramIcon = (props) => (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
  </svg>
);

export const DEFAULT_PHONE_SHORTCUTS = [
  { id: 'whatsapp', name: 'WhatsApp', package: 'com.whatsapp', icon: 'MessageCircle', color: 'from-emerald-500/20 to-teal-600/30 text-emerald-400 border-emerald-500/30' },
  { id: 'camera', name: 'Kamera HP', package: 'camera', icon: 'Camera', color: 'from-blue-500/20 to-indigo-600/30 text-blue-400 border-blue-500/30' },
  { id: 'photos', name: 'Galeri', package: 'com.google.android.apps.photos', icon: 'Image', color: 'from-amber-500/20 to-yellow-600/30 text-amber-400 border-amber-500/30' },
  { id: 'youtube', name: 'YouTube', package: 'com.google.android.youtube', icon: 'Play', color: 'from-red-600/20 to-rose-600/30 text-rose-400 border-rose-500/30' },
  { id: 'chrome', name: 'Google Chrome', package: 'com.android.chrome', icon: 'Globe', color: 'from-orange-500/20 to-amber-600/30 text-orange-400 border-orange-500/30' },
  { id: 'settings', name: 'Pengaturan', package: 'settings', icon: 'Settings', color: 'from-zinc-500/20 to-neutral-600/30 text-zinc-300 border-zinc-500/30' }
];

export const PRESET_PHONE_APPS = [
  {
    id: 'whatsapp',
    name: 'WhatsApp',
    desc: 'Buka percakapan & chat instan',
    package: 'com.whatsapp',
    icon: MessageCircle,
    color: 'from-emerald-500/20 to-teal-600/30 text-emerald-400 border-emerald-500/30'
  },
  {
    id: 'camera',
    name: 'Kamera HP',
    desc: 'Buka kamera foto & video ponsel',
    package: 'camera',
    icon: Camera,
    color: 'from-blue-500/20 to-indigo-600/30 text-blue-400 border-blue-500/30'
  },
  {
    id: 'photos',
    name: 'Galeri & Foto',
    desc: 'Lihat koleksi foto & album HP',
    package: 'com.google.android.apps.photos',
    icon: Image,
    color: 'from-amber-500/20 to-yellow-600/30 text-amber-400 border-amber-500/30'
  },
  {
    id: 'youtube',
    name: 'YouTube',
    desc: 'Nonton video & streaming di HP',
    package: 'com.google.android.youtube',
    icon: Play,
    color: 'from-red-600/20 to-rose-600/30 text-rose-400 border-rose-500/30'
  },
  {
    id: 'chrome',
    name: 'Google Chrome',
    desc: 'Browser web di ponsel',
    package: 'com.android.chrome',
    icon: Globe,
    color: 'from-red-500/20 to-orange-600/30 text-red-400 border-red-500/30'
  },
  {
    id: 'settings',
    name: 'Pengaturan HP',
    desc: 'Konfigurasi sistem & Wi-Fi ponsel',
    package: 'settings',
    icon: Settings,
    color: 'from-zinc-500/20 to-neutral-600/30 text-zinc-300 border-zinc-500/30'
  },
  {
    id: 'spotify',
    name: 'Spotify',
    desc: 'Putar musik & playlist di HP',
    package: 'com.spotify.music',
    icon: Music,
    color: 'from-green-500/20 to-emerald-600/30 text-green-400 border-green-500/30'
  },
  {
    id: 'instagram',
    name: 'Instagram',
    desc: 'Feed, DM, & Stories Instagram',
    package: 'com.instagram.android',
    icon: InstagramIcon,
    color: 'from-fuchsia-500/20 to-pink-600/30 text-pink-400 border-pink-500/30'
  },
  {
    id: 'tiktok',
    name: 'TikTok',
    desc: 'Video pendek & hiburan',
    package: 'com.ss.android.ugc.trill',
    icon: Video,
    color: 'from-cyan-500/20 to-blue-600/30 text-cyan-400 border-cyan-500/30'
  },
  {
    id: 'telegram',
    name: 'Telegram',
    desc: 'Pesan cepat & grup obrolan',
    package: 'org.telegram.messenger',
    icon: Send,
    color: 'from-sky-500/20 to-blue-600/30 text-sky-400 border-sky-500/30'
  },
  {
    id: 'discord',
    name: 'Discord',
    desc: 'Komunitas & obrolan suara',
    package: 'com.discord',
    icon: MessageCircle,
    color: 'from-indigo-500/20 to-violet-600/30 text-indigo-400 border-indigo-500/30'
  },
  {
    id: 'mobilelegends',
    name: 'Mobile Legends: Bang Bang',
    desc: 'Luncurkan game MLBB di ponsel',
    package: 'com.mobile.legends',
    icon: Gamepad2,
    color: 'from-indigo-500/20 to-blue-600/30 text-indigo-400 border-indigo-500/30'
  },
  {
    id: 'minecraft',
    name: 'Minecraft PE',
    desc: 'Game sandbox petualangan',
    package: 'com.mojang.minecraftpe',
    icon: Box,
    color: 'from-emerald-600/20 to-green-700/30 text-emerald-400 border-emerald-500/30'
  },
  {
    id: 'roblox',
    name: 'Roblox HP',
    desc: 'Luncurkan game Roblox di ponsel',
    package: 'com.roblox.client',
    icon: Box,
    color: 'from-purple-500/20 to-violet-600/30 text-purple-400 border-purple-500/30'
  },
  {
    id: 'shopee',
    name: 'Shopee',
    desc: 'Belanja online & pembayaran',
    package: 'com.shopee.id',
    icon: ShoppingBag,
    color: 'from-orange-500/20 to-red-600/30 text-orange-400 border-orange-500/30'
  },
  {
    id: 'tokopedia',
    name: 'Tokopedia',
    desc: 'Belanja online marketplace',
    package: 'com.tokopedia.tkpd',
    icon: ShoppingBag,
    color: 'from-emerald-500/20 to-teal-600/30 text-emerald-400 border-emerald-500/30'
  },
  {
    id: 'gojek',
    name: 'Gojek',
    desc: 'Transportasi & pesan makanan',
    package: 'com.gojek.app',
    icon: Smartphone,
    color: 'from-green-500/20 to-emerald-600/30 text-green-400 border-green-500/30'
  },
  {
    id: 'grab',
    name: 'Grab',
    desc: 'Layanan harian, ride & food',
    package: 'com.grabtaxi.passenger',
    icon: Smartphone,
    color: 'from-emerald-600/20 to-teal-600/30 text-emerald-300 border-emerald-500/30'
  },
  {
    id: 'dana',
    name: 'DANA Indonesia',
    desc: 'Dompet digital & pembayaran QRIS',
    package: 'id.dana',
    icon: CreditCard,
    color: 'from-blue-600/20 to-sky-600/30 text-blue-400 border-blue-500/30'
  },
  {
    id: 'chatgpt',
    name: 'ChatGPT',
    desc: 'Asisten kecerdasan buatan OpenAI',
    package: 'com.openai.chatgpt',
    icon: Sparkles,
    color: 'from-teal-500/20 to-emerald-600/30 text-teal-300 border-teal-500/30'
  },
  {
    id: 'claude',
    name: 'Claude AI',
    desc: 'Asisten AI Anthropic',
    package: 'com.anthropic.claude',
    icon: Sparkles,
    color: 'from-amber-600/20 to-orange-600/30 text-amber-300 border-amber-500/30'
  },
  {
    id: 'enlife',
    name: 'ENLife (Smart Life OS)',
    desc: 'Pelacak kebiasaan & produktivitas',
    package: 'com.edvan.enlife',
    icon: Sparkles,
    color: 'from-blue-500/20 to-cyan-600/30 text-blue-400 border-blue-500/30'
  },
  {
    id: 'maps',
    name: 'Google Maps',
    desc: 'Peta & navigasi rute ponsel',
    package: 'com.google.android.apps.maps',
    icon: MapPin,
    color: 'from-sky-500/20 to-teal-600/30 text-sky-400 border-sky-500/30'
  },
  {
    id: 'files',
    name: 'File Manager',
    desc: 'Jelajah berkas lokal HP',
    package: 'com.google.android.documentsui',
    icon: Folder,
    color: 'from-amber-600/20 to-orange-600/30 text-amber-300 border-amber-500/30'
  },
  {
    id: 'playstore',
    name: 'Google Play Store',
    desc: 'Pasang & perbarui aplikasi HP',
    package: 'com.android.vending',
    icon: ShoppingBag,
    color: 'from-teal-500/20 to-emerald-600/30 text-teal-300 border-teal-500/30'
  }
];

export function PhoneAppLauncherModal({
  isOpen,
  onClose,
  targetPeer,
  onLaunchPhoneApp
}) {
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'shortcuts'
  const [searchQuery, setSearchQuery] = useState('');
  const [customName, setCustomName] = useState('');
  const [customPackage, setCustomPackage] = useState('');
  const [isLaunching, setIsLaunching] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [detectedPackages, setDetectedPackages] = useState([]);
  const searchInputRef = useRef(null);

  // Load pinned shortcuts from localStorage
  const [phoneShortcuts, setPhoneShortcuts] = useState(() => {
    try {
      const saved = localStorage.getItem('encross_phone_shortcuts');
      if (saved) return JSON.parse(saved);
    } catch (_) {}
    return DEFAULT_PHONE_SHORTCUTS;
  });

  // Listen for external shortcut changes
  useEffect(() => {
    const handleUpdate = () => {
      try {
        const saved = localStorage.getItem('encross_phone_shortcuts');
        if (saved) setPhoneShortcuts(JSON.parse(saved));
      } catch (_) {}
    };
    window.addEventListener('encross_phone_shortcuts_changed', handleUpdate);
    return () => window.removeEventListener('encross_phone_shortcuts_changed', handleUpdate);
  }, []);

  // Fetch installed packages from ADB if in Electron desktop
  useEffect(() => {
    if (!isOpen) return;
    if (window.electronAPI?.getPhoneInstalledAppsAdb) {
      window.electronAPI.getPhoneInstalledAppsAdb({
        deviceId: targetPeer?.deviceId || targetPeer?.adbSerial || null
      }).then((res) => {
        if (res?.success && Array.isArray(res.packages)) {
          setDetectedPackages(res.packages);
        }
      }).catch(() => {});
    }
  }, [isOpen, targetPeer]);

  // Focus search input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 150);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Check if an app package is pinned in shortcuts
  const isShortcutPinned = (pkg) => {
    if (!pkg) return false;
    return phoneShortcuts.some(
      (s) => (s.package || s.pkg || '').toLowerCase() === pkg.toLowerCase()
    );
  };

  // Toggle shortcut pin/unpin
  const handleToggleShortcut = (app) => {
    triggerHaptic([25]);
    const pkg = app.package || app.pkg;
    if (!pkg) return;

    setPhoneShortcuts((prev) => {
      let next;
      const alreadyPinned = prev.some(
        (s) => (s.package || s.pkg || '').toLowerCase() === pkg.toLowerCase()
      );

      if (alreadyPinned) {
        // Hilangkan dari shortcut
        next = prev.filter(
          (s) => (s.package || s.pkg || '').toLowerCase() !== pkg.toLowerCase()
        );
        setStatusMessage(`Shortcut ${app.name} telah dihilangkan dari shortcut ponsel`);
      } else {
        // Tambahkan ke shortcut
        const newEntry = {
          id: app.id || pkg,
          name: app.name,
          pkg: pkg,
          package: pkg,
          color: app.color || 'from-blue-500/20 to-indigo-600/30 text-blue-400 border-blue-500/30'
        };
        next = [...prev, newEntry];
        setStatusMessage(`Shortcut ${app.name} berhasil ditambahkan ke shortcut ponsel!`);
      }

      try {
        localStorage.setItem('encross_phone_shortcuts', JSON.stringify(next));
        window.dispatchEvent(new Event('encross_phone_shortcuts_changed'));
      } catch (_) {}

      setTimeout(() => setStatusMessage(''), 2500);
      return next;
    });
  };

  // Add custom package to shortcuts
  const handleAddCustomShortcut = () => {
    const pkg = customPackage.trim();
    const name = customName.trim() || pkg;
    if (!pkg) return;

    handleToggleShortcut({
      id: pkg,
      name,
      package: pkg,
      color: 'from-blue-500/20 to-cyan-600/30 text-blue-400 border-blue-500/30'
    });

    setCustomName('');
    setCustomPackage('');
  };

  // Execute / Launch App directly
  const handleExecute = (pkg, name) => {
    if (!pkg) return;
    triggerHaptic([35]);
    setIsLaunching(true);
    setStatusMessage(`Membuka ${name || pkg} langsung di ${targetPeer?.name || 'ponsel'}...`);

    onLaunchPhoneApp?.(targetPeer, pkg, name);

    setTimeout(() => {
      setIsLaunching(false);
      setStatusMessage('');
      onClose();
    }, 1200);
  };

  // Merge presets with any detected custom packages
  const allAvailableApps = [...PRESET_PHONE_APPS];
  if (detectedPackages.length > 0) {
    detectedPackages.forEach((pkg) => {
      const exists = allAvailableApps.some((a) => a.package.toLowerCase() === pkg.toLowerCase());
      if (!exists) {
        const parts = pkg.split('.');
        const rawName = parts[parts.length - 1];
        const formattedName = rawName.charAt(0).toUpperCase() + rawName.slice(1);
        allAvailableApps.push({
          id: pkg,
          name: formattedName,
          desc: `Aplikasi terpasang (${pkg})`,
          package: pkg,
          icon: AppWindow,
          color: 'from-zinc-500/20 to-slate-600/30 text-zinc-300 border-zinc-500/30'
        });
      }
    });
  }

  // Filter based on active tab
  const baseApps = activeTab === 'shortcuts'
    ? allAvailableApps.filter((app) => isShortcutPinned(app.package))
    : allAvailableApps;

  // STRICT SEARCH FILTER: FILTER HANYA BERDASARKAN NAMA APLIKASINYA SAJA (User Rule)
  const q = searchQuery.trim().toLowerCase();
  const filteredApps = baseApps.filter((app) => {
    if (!q) return true;
    return (app.name || '').toLowerCase().includes(q);
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md overflow-hidden animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl h-full sm:h-[88vh] max-h-[760px] bg-zinc-900 border border-white/12 rounded-3xl shadow-2xl flex flex-col overflow-hidden text-zinc-100 animate-ios-sheet smooth-gpu"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-white/8 shrink-0 bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-blue-500/15 text-blue-400 border border-blue-500/25">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-white">Shortcut Aplikasi Ponsel</h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  Langsung Buka di HP
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Buka aplikasi di <strong className="text-zinc-200">{targetPeer?.name || 'Ponsel'}</strong> & kelola shortcut beranda
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 active:scale-95 transition cursor-pointer"
            title="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Toast Banner */}
        {statusMessage && (
          <div className="px-5 py-2.5 bg-blue-950/80 border-b border-blue-500/30 text-blue-200 text-xs flex items-center justify-between animate-in fade-in">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping" />
              <span className="font-medium">{statusMessage}</span>
            </div>
            <button
              onClick={() => setStatusMessage('')}
              className="text-blue-300 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Search Bar & Tabs */}
        <div className="px-5 sm:px-6 pt-3.5 pb-2 shrink-0 space-y-2.5">
          {/* Strict Name Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama aplikasi HP saja (WhatsApp, Kamera, YouTube, Shopee)..."
              className="w-full pl-10 pr-9 py-2.5 rounded-2xl bg-white/5 border border-white/10 text-xs text-white placeholder-zinc-500 focus:outline-hidden focus:border-blue-500 transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white p-1"
                title="Hapus pencarian"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Segmented Filter Control */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-black/40 border border-white/8 shrink-0">
              <button
                onClick={() => {
                  triggerHaptic([20]);
                  setActiveTab('all');
                }}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'all'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Semua Aplikasi ({allAvailableApps.length})</span>
              </button>
              <button
                onClick={() => {
                  triggerHaptic([20]);
                  setActiveTab('shortcuts');
                }}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'shortcuts'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                <span>Shortcut Tersimpan ({phoneShortcuts.length})</span>
              </button>
            </div>

            <span className="text-[11px] text-zinc-400 hidden sm:inline">
              {filteredApps.length} aplikasi ditemukan
            </span>
          </div>
        </div>

        {/* App Grid */}
        <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-2.5 space-y-4">
          <div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {filteredApps.map((app) => {
                const Icon = app.icon || AppWindow;
                const isPinned = isShortcutPinned(app.package);

                return (
                  <div
                    key={app.id || app.package}
                    className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-white/4 hover:bg-white/7 border border-white/8 hover:border-white/15 transition group"
                  >
                    {/* Left: Icon & Click to Launch */}
                    <button
                      onClick={() => handleExecute(app.package, app.name)}
                      disabled={isLaunching}
                      className="flex items-center gap-3 min-w-0 flex-1 text-left cursor-pointer active:scale-98 transition-transform"
                      title={`Klik untuk langsung buka ${app.name} di HP`}
                    >
                      <div className={`p-2.5 rounded-xl bg-gradient-to-br ${app.color || 'from-blue-500/20 to-indigo-600/30 text-blue-400 border-blue-500/30'} border shrink-0 group-hover:scale-105 transition-transform shadow-xs`}>
                        <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <h5 className="text-xs font-semibold text-white truncate group-hover:text-blue-400 transition-colors">
                            {app.name}
                          </h5>
                          {isPinned && (
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 shrink-0">
                              ★ Shortcut
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-zinc-400 truncate mt-0.5 font-mono">
                          {app.package}
                        </p>
                      </div>
                    </button>

                    {/* Right: Action Buttons (Launch + Add/Remove Shortcut) */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      {/* Buka Langsung di HP Button */}
                      <button
                        onClick={() => handleExecute(app.package, app.name)}
                        disabled={isLaunching}
                        className="px-2.5 py-1.5 rounded-xl bg-white/8 hover:bg-blue-600 text-zinc-200 hover:text-white text-[11px] font-medium transition cursor-pointer flex items-center gap-1 active:scale-95 shadow-xs"
                        title="Buka langsung di layar HP"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Buka</span>
                      </button>

                      {/* Tambahkan atau Hilangkan dari Shortcut Button */}
                      {isPinned ? (
                        <button
                          onClick={() => handleToggleShortcut(app)}
                          className="px-2.5 py-1.5 rounded-xl bg-red-500/15 hover:bg-red-500/30 text-red-400 border border-red-500/30 text-[11px] font-semibold transition cursor-pointer flex items-center gap-1 active:scale-95 shadow-xs"
                          title="Hilangkan dari shortcut aplikasi ponsel"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Hilangkan</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => handleToggleShortcut(app)}
                          className="px-2.5 py-1.5 rounded-xl bg-blue-500/15 hover:bg-blue-500/30 text-blue-400 border border-blue-500/30 text-[11px] font-semibold transition cursor-pointer flex items-center gap-1 active:scale-95 shadow-xs"
                          title="Tambahkan ke shortcut aplikasi ponsel"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Shortcut</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {filteredApps.length === 0 && (
              <div className="py-12 flex flex-col items-center justify-center text-center gap-2 text-zinc-400">
                <Search className="w-8 h-8 text-zinc-600" />
                <p className="text-xs font-semibold text-zinc-300">
                  Tidak ada aplikasi bernama "{searchQuery}"
                </p>
                <p className="text-[11px] text-zinc-500 max-w-xs">
                  Gunakan form di bawah untuk meluncurkan atau menyimpan aplikasi kustom via nama paket.
                </p>
              </div>
            )}
          </div>

          {/* Custom Package Launcher & Shortcut Adder */}
          <div className="p-4 rounded-2xl bg-white/3 border border-white/8 space-y-3">
            <h4 className="text-xs font-bold text-white flex items-center gap-2">
              <Terminal className="w-3.5 h-3.5 text-blue-400" />
              <span>Tambah Aplikasi Lain ke Shortcut (via Nama Paket)</span>
            </h4>
            <p className="text-[11px] text-zinc-400 leading-relaxed">
              Tambahkan aplikasi apa saja ke beranda shortcut ponsel dengan memasukkan nama dan nama paketnya.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input
                type="text"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="Nama Aplikasi (contoh: Shopee, Canva, MLBB)"
                className="px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-white placeholder-zinc-500 focus:outline-hidden focus:border-blue-500"
              />
              <input
                type="text"
                value={customPackage}
                onChange={(e) => setCustomPackage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddCustomShortcut();
                }}
                placeholder="Nama Paket (contoh: com.shopee.id)"
                className="px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-white placeholder-zinc-500 focus:outline-hidden focus:border-blue-500 font-mono"
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                onClick={() => handleExecute(customPackage.trim(), customName.trim() || customPackage.trim())}
                disabled={!customPackage.trim() || isLaunching}
                className="px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 disabled:opacity-40 text-white text-xs font-semibold transition cursor-pointer flex items-center gap-1.5"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Buka di HP</span>
              </button>
              <button
                onClick={handleAddCustomShortcut}
                disabled={!customPackage.trim()}
                className="px-4 py-1.5 rounded-xl bg-[#0071e3] hover:bg-[#0077ed] disabled:opacity-40 text-white text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Simpan ke Shortcut</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 sm:px-6 py-3 border-t border-white/8 shrink-0 bg-white/[0.02] flex items-center justify-between text-xs text-zinc-400">
          <span>Target Ponsel: <strong className="text-white font-medium">{targetPeer?.name || 'Ponsel'}</strong></span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-white/8 hover:bg-white/12 text-zinc-200 transition cursor-pointer font-medium"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
