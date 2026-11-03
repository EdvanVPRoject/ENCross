import React, { useState } from 'react';
import {
  X,
  ExternalLink,
  Mail,
  Globe,
  ShieldCheck,
  Copy,
  Check,
  Sparkles,
  Laptop,
  Smartphone,
  Layers,
  Cpu,
  Zap,
  MonitorPlay,
  MousePointer,
  ClipboardList,
  Fan,
  Camera,
  FolderSync,
  Radio,
  FileCheck2,
  HardDrive
} from 'lucide-react';
import { triggerHaptic } from '../utils/feedback';
import logoImg from '../assets/logo.png';

function GithubIcon(props) {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" {...props}>
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
    </svg>
  );
}

export function AboutModal({ isOpen, onClose }) {
  const [activeTab, setActiveTab] = useState('features'); // 'features' | 'contact' | 'architecture'
  const [copiedKey, setCopiedKey] = useState(null);

  if (!isOpen) return null;

  const handleCopy = (text, key) => {
    try {
      navigator.clipboard.writeText(text);
      triggerHaptic([25]);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    } catch (_) {}
  };

  const handleTabSwitch = (tab) => {
    triggerHaptic([20]);
    setActiveTab(tab);
  };

  const features = [
    {
      title: 'Direct WebRTC P2P Transfer',
      desc: 'Pertukaran berkas & folder tanpa batasan ukuran antar-perangkat via LAN berkecepatan penuh. Murni point-to-point tanpa transit ke cloud server pihak ketiga.',
      icon: FolderSync,
      badge: 'Zero Cloud',
      color: 'from-emerald-500/20 to-teal-500/10 text-emerald-500 border-emerald-500/20'
    },
    {
      title: 'Low-Latency Screen Mirroring (60 FPS)',
      desc: 'Streaming tampilan layar ponsel ke PC atau monitor sekunder secara realtime dengan latensi rendah (<15 ms), dilengkapi opsi Scrcpy hardware rendering dan kontrol sentuh/mouse.',
      icon: MonitorPlay,
      badge: '60 FPS Ultra-Low Latency',
      color: 'from-blue-500/20 to-indigo-500/10 text-blue-500 border-blue-500/20'
    },
    {
      title: 'Remote Input & Universal Touchpad',
      desc: 'Simulasi mouse presisi (trackpad multisentuh 2 jari), input keyboard hardware realtime, dan pintasan makro PC yang dapat dikendalikan langsung dari ponsel.',
      icon: MousePointer,
      badge: 'Interactive Input',
      color: 'from-purple-500/20 to-pink-500/10 text-purple-500 border-purple-500/20'
    },
    {
      title: 'Sinkronisasi Clipboard Lintas Platform',
      desc: 'Sinkronisasi teks dan tangkapan layar (screenshot) dua arah secara otomatis. Dilengkapi proteksi Gaming DND agar tidak memicu pop-up saat bermain game fullscreen.',
      icon: ClipboardList,
      badge: 'Gaming DND Guard',
      color: 'from-amber-500/20 to-orange-500/10 text-amber-500 border-amber-500/20'
    },
    {
      title: 'NitroSense CDP & Telemetri Performa',
      desc: 'Pemantauan CPU, GPU, RAM, serta kontrol profil performa dan kecepatan kipas Acer NitroSense via Chrome DevTools Protocol (CDP) port 9993 & Windows WMI.',
      icon: Fan,
      badge: 'Hardware Telemetry',
      color: 'from-red-500/20 to-rose-500/10 text-red-500 border-red-500/20'
    },
    {
      title: 'Pembersihan Memori Standby OS Terverifikasi',
      desc: 'Pembersihan standby list memori Windows berbasis skrip resmi OS (clean-ram.ps1) dengan pembacaan kapasitas riil yang akurat sesuai Task Manager.',
      icon: HardDrive,
      badge: 'OS Native API',
      color: 'from-cyan-500/20 to-blue-500/10 text-cyan-500 border-cyan-500/20'
    },
    {
      title: 'Universal App Launcher & Shortcut Manager',
      desc: 'Luncurkan software laptop (Steam, Game, Browser, Explorer) dan aplikasi Android langsung dengan pencarian nama instan serta pengelolaan pin/unpin shortcut beranda.',
      icon: Zap,
      badge: 'Universal Bridge',
      color: 'from-indigo-500/20 to-sky-500/10 text-indigo-500 border-indigo-500/20'
    },
    {
      title: 'Wireless Camera & Audio Streaming',
      desc: 'Jadikan kamera ponsel sebagai webcam nirkabel PC dan mikrofon HP sebagai input suara berkualitas tinggi tanpa perlu kabel fisik.',
      icon: Camera,
      badge: 'Wireless AV',
      color: 'from-teal-500/20 to-emerald-500/10 text-teal-500 border-teal-500/20'
    }
  ];

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md overflow-hidden animate-in fade-in duration-200 font-sans"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-xl bg-white dark:bg-[#121318] border border-black/10 dark:border-white/12 rounded-3xl shadow-2xl flex flex-col overflow-hidden text-zinc-900 dark:text-zinc-100 animate-ios-sheet smooth-gpu max-h-[92vh] h-full sm:h-auto"
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 border-b border-black/8 dark:border-white/10 shrink-0 bg-black/[0.02] dark:bg-white/[0.02]">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 rounded-2xl bg-gradient-to-tr from-blue-500/20 to-emerald-500/20 text-[#0071e3] dark:text-blue-400 border border-blue-500/30 shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-white truncate">
                Tentang Pengembang & Fitur
              </h3>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
                Edvan (EdvanVProject) • Software Engineer
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              triggerHaptic([20]);
              onClose();
            }}
            className="p-1.5 rounded-full text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition cursor-pointer shrink-0"
            title="Tutup"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Hero Profile Card */}
        <div className="p-4 sm:p-5 border-b border-black/6 dark:border-white/8 bg-gradient-to-br from-blue-500/8 via-emerald-500/5 to-purple-500/8 shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="relative shrink-0">
              <div className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-[#0071e3] via-blue-600 to-emerald-500 text-white font-black text-lg flex items-center justify-center shadow-md ring-2 ring-white/30 dark:ring-white/10">
                EV
              </div>
              <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white dark:border-[#121318]" title="Status Aktif" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="text-base sm:text-lg font-black text-zinc-900 dark:text-white tracking-tight">
                  Edvan
                </h4>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-semibold border border-emerald-500/30">
                  @EdvanVProject
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-600 dark:text-blue-400 font-semibold border border-blue-500/30">
                  Indonesia
                </span>
              </div>
              <p className="text-xs text-zinc-700 dark:text-zinc-300 mt-1 font-semibold leading-snug">
                Software Engineer & Systems Developer
              </p>
              <div className="flex items-center gap-2 mt-1 text-[11px] text-zinc-500 dark:text-zinc-400 flex-wrap">
                <span>Windows Native</span>
                <span>•</span>
                <span>Android Native</span>
                <span>•</span>
                <span>WebRTC P2P</span>
              </div>
            </div>
          </div>
        </div>

        {/* App Meta Pill Bar */}
        <div className="px-4 py-2 border-b border-black/6 dark:border-white/8 bg-black/[0.01] dark:bg-white/[0.01] flex items-center justify-between text-xs shrink-0">
          <div className="flex items-center gap-2">
            <img src={logoImg} alt="ENCross" className="w-4 h-4 object-contain" />
            <span className="font-bold text-zinc-900 dark:text-white">ENCross</span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-blue-500/15 text-blue-600 dark:text-blue-400 font-bold border border-blue-500/20">
              v1.0.0
            </span>
          </div>
          <span className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium">
            Direct WebRTC LAN P2P Hub
          </span>
        </div>

        {/* Tab Buttons */}
        <div className="px-3 sm:px-5 py-2 border-b border-black/6 dark:border-white/8 shrink-0 bg-black/[0.01] dark:bg-white/[0.01]">
          <div className="grid grid-cols-3 gap-1.5">
            {[
              { id: 'features', label: 'Fitur & Fungsi', icon: Layers },
              { id: 'contact', label: 'Kontak & Portofolio', icon: Globe },
              { id: 'architecture', label: 'Arsitektur & Privasi', icon: ShieldCheck }
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabSwitch(tab.id)}
                  className={`py-1.5 px-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer border ${
                    isActive
                      ? 'bg-[#0071e3] text-white border-[#0071e3] shadow-xs'
                      : 'bg-black/3 dark:bg-white/4 hover:bg-black/6 dark:hover:bg-white/8 text-zinc-600 dark:text-zinc-400 border-black/6 dark:border-white/8'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab Content (Scrollable) */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-3.5 flex-1 smooth-gpu text-sm leading-relaxed">
          {/* TAB 1: FITUR & FUNGSI */}
          {activeTab === 'features' && (
            <div className="space-y-2.5 animate-in fade-in duration-150">
              <div className="flex items-center justify-between px-1">
                <h5 className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  Fungsi & Fitur Utama ENCross
                </h5>
                <span className="text-[10px] font-mono text-zinc-400">
                  {features.length} Fitur Terintegrasi
                </span>
              </div>

              <div className="space-y-2">
                {features.map((f, i) => {
                  const Icon = f.icon;
                  return (
                    <div
                      key={i}
                      className="p-3.5 rounded-2xl bg-black/3 dark:bg-white/4 border border-black/8 dark:border-white/10 flex items-start gap-3 hover:bg-black/5 dark:hover:bg-white/7 transition"
                    >
                      <div className={`p-2 rounded-xl bg-gradient-to-br ${f.color} border shrink-0 mt-0.5 shadow-xs`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <h6 className="text-xs font-bold text-zinc-900 dark:text-white">
                            {f.title}
                          </h6>
                          <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-black/5 dark:bg-white/8 text-zinc-600 dark:text-zinc-300 border border-black/6 dark:border-white/10 shrink-0">
                            {f.badge}
                          </span>
                        </div>
                        <p className="text-[11px] text-zinc-600 dark:text-zinc-300 mt-1 leading-relaxed">
                          {f.desc}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: KONTAK & PORTOFOLIO */}
          {activeTab === 'contact' && (
            <div className="space-y-3 animate-in fade-in duration-150">
              <h5 className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 px-1">
                Tautan Resmi & Kontak Langsung
              </h5>

              {/* 1. Website Portofolio */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-blue-500/10 to-indigo-500/10 border border-blue-500/30 flex items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2.5 rounded-xl bg-blue-500 text-white shrink-0 shadow-xs">
                    <Globe className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs font-bold text-zinc-900 dark:text-white truncate">
                        Portofolio Web
                      </p>
                      <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-600 dark:text-blue-300 border border-blue-500/30">
                        Resmi
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-mono truncate mt-0.5">
                      edvan-portofolio.vercel.app
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => handleCopy('https://edvan-portofolio.vercel.app', 'portfolio')}
                    className="p-1.5 rounded-lg bg-black/5 dark:bg-white/8 hover:bg-black/10 dark:hover:bg-white/12 text-zinc-600 dark:text-zinc-300 transition cursor-pointer"
                    title="Salin Link Portofolio"
                  >
                    {copiedKey === 'portfolio' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                  <a
                    href="https://edvan-portofolio.vercel.app"
                    target="_blank"
                    rel="noreferrer"
                    className="ios-pressable flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#0071e3] hover:bg-[#0077ed] text-white text-xs font-semibold transition cursor-pointer shadow-xs"
                  >
                    <span>Buka</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>

              {/* 2. Email Resmi */}
              <div className="p-3.5 rounded-2xl bg-black/3 dark:bg-white/4 border border-black/8 dark:border-white/10 flex items-center justify-between gap-3 hover:bg-black/5 dark:hover:bg-white/7 transition">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2.5 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 shrink-0 border border-emerald-500/30">
                    <Mail className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-zinc-900 dark:text-white truncate">
                      Email Kontak
                    </p>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-mono truncate mt-0.5">
                      septiaedvan@gmail.com
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => handleCopy('septiaedvan@gmail.com', 'email')}
                    className="p-1.5 rounded-lg bg-black/5 dark:bg-white/8 hover:bg-black/10 dark:hover:bg-white/12 text-zinc-600 dark:text-zinc-300 transition cursor-pointer"
                    title="Salin Alamat Email"
                  >
                    {copiedKey === 'email' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                  <a
                    href="mailto:septiaedvan@gmail.com"
                    className="ios-pressable flex items-center gap-1 px-3 py-1.5 rounded-xl bg-black/6 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15 text-zinc-800 dark:text-zinc-200 text-xs font-semibold transition cursor-pointer border border-black/8 dark:border-white/10"
                  >
                    <span>Kirim Email</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>

              {/* 3. GitHub Profile */}
              <div className="p-3.5 rounded-2xl bg-black/3 dark:bg-white/4 border border-black/8 dark:border-white/10 flex items-center justify-between gap-3 hover:bg-black/5 dark:hover:bg-white/7 transition">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2.5 rounded-xl bg-black/8 dark:bg-white/10 text-zinc-900 dark:text-white shrink-0">
                    <GithubIcon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-zinc-900 dark:text-white truncate">
                      GitHub Profile
                    </p>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-mono truncate mt-0.5">
                      github.com/EdvanVProject
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => handleCopy('https://github.com/EdvanVProject', 'gh-user')}
                    className="p-1.5 rounded-lg bg-black/5 dark:bg-white/8 hover:bg-black/10 dark:hover:bg-white/12 text-zinc-600 dark:text-zinc-300 transition cursor-pointer"
                    title="Salin Link GitHub"
                  >
                    {copiedKey === 'gh-user' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                  <a
                    href="https://github.com/EdvanVProject"
                    target="_blank"
                    rel="noreferrer"
                    className="ios-pressable flex items-center gap-1 px-3 py-1.5 rounded-xl bg-black/6 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15 text-zinc-800 dark:text-zinc-200 text-xs font-semibold transition cursor-pointer border border-black/8 dark:border-white/10"
                  >
                    <span>Buka</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>

              {/* 4. Repositori ENCross */}
              <div className="p-3.5 rounded-2xl bg-black/3 dark:bg-white/4 border border-black/8 dark:border-white/10 flex items-center justify-between gap-3 hover:bg-black/5 dark:hover:bg-white/7 transition">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2.5 rounded-xl bg-purple-500/15 text-purple-600 dark:text-purple-400 shrink-0 border border-purple-500/30">
                    <FileCheck2 className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-zinc-900 dark:text-white truncate">
                      Repositori ENCross
                    </p>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-mono truncate mt-0.5">
                      github.com/EdvanVProject/ENCross
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => handleCopy('https://github.com/EdvanVProject/ENCross', 'gh-repo')}
                    className="p-1.5 rounded-lg bg-black/5 dark:bg-white/8 hover:bg-black/10 dark:hover:bg-white/12 text-zinc-600 dark:text-zinc-300 transition cursor-pointer"
                    title="Salin Link Repositori"
                  >
                    {copiedKey === 'gh-repo' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                  <a
                    href="https://github.com/EdvanVProject/ENCross"
                    target="_blank"
                    rel="noreferrer"
                    className="ios-pressable flex items-center gap-1 px-3 py-1.5 rounded-xl bg-black/6 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15 text-zinc-800 dark:text-zinc-200 text-xs font-semibold transition cursor-pointer border border-black/8 dark:border-white/10"
                  >
                    <span>Lihat Kode</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: ARSITEKTUR & PRIVASI */}
          {activeTab === 'architecture' && (
            <div className="space-y-3 animate-in fade-in duration-150">
              {/* Zero Cloud Privacy Guarantee Card */}
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-2">
                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                  <ShieldCheck className="w-5 h-5 shrink-0" />
                  <h6 className="text-xs font-bold uppercase tracking-wider">
                    Jaminan Privasi P2P (Zero Cloud Storage)
                  </h6>
                </div>
                <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed">
                  Seluruh pertukaran berkas, stream layar, dan sinkronisasi clipboard berjalan secara langsung antar-perangkat di jaringan Wi-Fi/LAN lokal Anda. Tidak ada server eksternal perantara, tidak ada analitik pihak ketiga, dan tidak ada data yang disimpan di cloud.
                </p>
              </div>

              {/* Technology Stack Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="p-3.5 rounded-2xl bg-black/3 dark:bg-white/4 border border-black/8 dark:border-white/10 space-y-1.5">
                  <div className="flex items-center gap-2 text-blue-500">
                    <Laptop className="w-4 h-4" />
                    <h6 className="text-xs font-bold text-zinc-900 dark:text-white">
                      Desktop (PC Windows)
                    </h6>
                  </div>
                  <p className="text-[11px] text-zinc-600 dark:text-zinc-300 leading-relaxed font-mono">
                    Electron 44 • Node.js • PowerShell Core • WMI & Acer CDP Bridge
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-black/3 dark:bg-white/4 border border-black/8 dark:border-white/10 space-y-1.5">
                  <div className="flex items-center gap-2 text-emerald-500">
                    <Smartphone className="w-4 h-4" />
                    <h6 className="text-xs font-bold text-zinc-900 dark:text-white">
                      Mobile (Android Native)
                    </h6>
                  </div>
                  <p className="text-[11px] text-zinc-600 dark:text-zinc-300 leading-relaxed font-mono">
                    Capacitor 7 • Java Native Bridge • MediaProjection • WebDAV
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-black/3 dark:bg-white/4 border border-black/8 dark:border-white/10 space-y-1.5">
                  <div className="flex items-center gap-2 text-purple-500">
                    <Radio className="w-4 h-4" />
                    <h6 className="text-xs font-bold text-zinc-900 dark:text-white">
                      Jaringan & Sinyal
                    </h6>
                  </div>
                  <p className="text-[11px] text-zinc-600 dark:text-zinc-300 leading-relaxed font-mono">
                    WebRTC DataChannel • UDP Discovery • Socket.IO LAN Signalling
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-black/3 dark:bg-white/4 border border-black/8 dark:border-white/10 space-y-1.5">
                  <div className="flex items-center gap-2 text-amber-500">
                    <Cpu className="w-4 h-4" />
                    <h6 className="text-xs font-bold text-zinc-900 dark:text-white">
                      Frontend & UX
                    </h6>
                  </div>
                  <p className="text-[11px] text-zinc-600 dark:text-zinc-300 leading-relaxed font-mono">
                    React 19 • Tailwind CSS • Apple HIG Fluid Touch & Haptics
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer info bar with explicit Copyright */}
        <div className="px-5 py-3 border-t border-black/8 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02] flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400 shrink-0">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold text-zinc-800 dark:text-zinc-200 truncate">
              Dibuat oleh Edvan (EdvanVProject)
            </p>
            <p className="text-[10px] font-mono text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
              © 2026 Edvan (EdvanVProject). All Rights Reserved.
            </p>
          </div>
          <button
            onClick={() => {
              triggerHaptic([20]);
              onClose();
            }}
            className="px-4 py-1.5 rounded-xl bg-black/6 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15 text-zinc-800 dark:text-zinc-200 font-semibold transition cursor-pointer text-xs shrink-0"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}

export default AboutModal;
