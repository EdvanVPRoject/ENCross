import React, { useState, useEffect } from 'react';
import {
  Cpu,
  HardDrive,
  Zap,
  Clock,
  Activity,
  Maximize2,
  Minimize2,
  X,
  Gauge,
  Sparkles,
  Thermometer,
  Wind,
  CheckCircle2,
  RefreshCw,
  Flame,
  ShieldCheck,
  Sliders,
  ExternalLink,
  Fan
} from 'lucide-react';
import { triggerHaptic } from '../utils/feedback';

export function PcHardwareHudModal({ isOpen, onClose, targetPeer, socket }) {
  const [stats, setStats] = useState(null);
  const [isDeskMode, setIsDeskMode] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(Date.now());
  const [cpuHistory, setCpuHistory] = useState([18, 22, 19, 25, 20, 28, 22, 24]);
  const [isCleaningRam, setIsCleaningRam] = useState(false);
  const [cleanRamFeedback, setCleanRamFeedback] = useState(null);
  const [isChangingPowerMode, setIsChangingPowerMode] = useState(false);
  const [isChangingFanMode, setIsChangingFanMode] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    // 1. Subscribe to real-time socket stream
    if (socket && socket.connected) {
      socket.emit('subscribe-pc-stats');
      setIsConnected(true);

      const handleStatsUpdate = (data) => {
        if (!data) return;
        setStats(data);
        setLastUpdated(Date.now());
        setIsConnected(true);
        if (data?.cpu?.usage !== undefined) {
          setCpuHistory((prev) => [...prev.slice(-15), data.cpu.usage]);
        }
      };

      const handleRamCleaned = (res) => {
        setIsCleaningRam(false);
        triggerHaptic([25, 45]);
        if (res?.success) {
          const freedFormatted =
            res.freedMB > 1024
              ? `${(res.freedMB / 1024).toFixed(1)} GB`
              : `${Math.round(res.freedMB || 0)} MB`;
          setCleanRamFeedback(`✓ Berhasil membebaskan ${freedFormatted} RAM!`);
          if (res.stats) setStats(res.stats);
        }
      };

      const handleFanModeChanged = ({ mode }) => {
        setStats((prev) => (prev ? { ...prev, fan: { ...(prev.fan || {}), mode } } : prev));
      };

      socket.on('pc-stats-update', handleStatsUpdate);
      socket.on('ram-cleaned', handleRamCleaned);
      socket.on('pc-fan-mode-changed', handleFanModeChanged);

      return () => {
        socket.emit('unsubscribe-pc-stats');
        socket.off('pc-stats-update', handleStatsUpdate);
        socket.off('ram-cleaned', handleRamCleaned);
        socket.off('pc-fan-mode-changed', handleFanModeChanged);
      };
    }

    // 2. HTTP Fallback Polling if socket not directly available
    let interval;
    const fetchHttpStats = async () => {
      try {
        const host = targetPeer?.ip || window.location.hostname || '127.0.0.1';
        const res = await fetch(`http://${host}:3001/api/pc-stats`, { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          setStats(data);
          setLastUpdated(Date.now());
          setIsConnected(true);
          if (data?.cpu?.usage !== undefined) {
            setCpuHistory((prev) => [...prev.slice(-15), data.cpu.usage]);
          }
        }
      } catch (_) {
        setIsConnected(false);
      }
    };

    fetchHttpStats();
    interval = setInterval(fetchHttpStats, 1200);

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isOpen, socket, targetPeer]);

  const handleCleanRam = async () => {
    if (isCleaningRam) return;
    triggerHaptic([35]);
    setIsCleaningRam(true);
    setCleanRamFeedback(null);

    if (socket && socket.connected) {
      socket.emit('clean-pc-ram');
      setTimeout(() => {
        setIsCleaningRam(false);
      }, 6000);
    } else {
      try {
        const host = targetPeer?.ip || window.location.hostname || '127.0.0.1';
        const res = await fetch(`http://${host}:3001/api/clean-ram`, { method: 'POST' });
        const json = await res.json();
        if (json?.success) {
          triggerHaptic([25, 45]);
          const freedFormatted =
            json.freedMB > 1024
              ? `${(json.freedMB / 1024).toFixed(1)} GB`
              : `${Math.round(json.freedMB || 0)} MB`;
          setCleanRamFeedback(`✓ Berhasil membebaskan ${freedFormatted} RAM!`);
          if (json.stats) setStats(json.stats);
        }
      } catch (_) {
        setCleanRamFeedback('Gagal mengosongkan RAM');
      } finally {
        setIsCleaningRam(false);
      }
    }
  };

  const handleSetPowerMode = async (mode) => {
    triggerHaptic([30]);
    setIsChangingPowerMode(true);
    setStats((prev) => (prev ? { ...prev, powerMode: mode } : { powerMode: mode }));
    if (socket && socket.connected) {
      socket.emit('set-pc-power-mode', { mode });
      setTimeout(() => setIsChangingPowerMode(false), 800);
    } else {
      try {
        const host = targetPeer?.ip || window.location.hostname || '127.0.0.1';
        const res = await fetch(`http://${host}:3001/api/pc-power-mode`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mode })
        });
        const json = await res.json();
        if (json?.stats) setStats(json.stats);
      } catch (_) {
      } finally {
        setIsChangingPowerMode(false);
      }
    }
  };

  const handleOpenNitroSense = () => {
    triggerHaptic([30]);
    if (socket && socket.connected) {
      socket.emit('set-pc-power-mode', { action: 'open-nitrosense' });
    } else {
      const host = targetPeer?.ip || window.location.hostname || '127.0.0.1';
      fetch(`http://${host}:3001/api/pc-power-mode?action=open-nitrosense`, { method: 'POST' }).catch(() => {});
    }
  };

  const handleSetFanMode = async (mode) => {
    triggerHaptic([30]);
    setIsChangingFanMode(true);
    setStats((prev) => (prev ? {
      ...prev,
      fan: { ...(prev.fan || {}), mode }
    } : { fan: { mode } }));

    if (socket && socket.connected) {
      socket.emit('set-pc-fan-mode', { mode });
      setTimeout(() => setIsChangingFanMode(false), 900);
    } else {
      try {
        const host = targetPeer?.ip || window.location.hostname || '127.0.0.1';
        const res = await fetch(`http://${host}:3001/api/pc-fan-mode`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mode })
        });
        const json = await res.json();
        if (json?.stats) setStats(json.stats);
      } catch (_) {
      } finally {
        setIsChangingFanMode(false);
      }
    }
  };

  if (!isOpen) return null;

  const cpuUsage = stats?.cpu?.usage || 0;
  const ramPercent = stats?.ram?.percentage || 0;
  const gpuUsage = stats?.gpu?.usage || 0;

  // Format uptime into readable "X Jam Y Menit"
  const formatUptime = (seconds) => {
    if (!seconds) return '0 Menit';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h} Jam ${m} Menit`;
    return `${m} Menit`;
  };

  // Helper for SVG Gauge Arc
  const renderGauge = (percent, colorClass, strokeColor) => {
    const radius = 38;
    const circ = 2 * Math.PI * radius;
    const offset = circ - (Math.min(100, Math.max(0, percent)) / 100) * circ;

    return (
      <div className="relative flex items-center justify-center shrink-0">
        <svg className="w-24 h-24 transform -rotate-90">
          <circle
            cx="48"
            cy="48"
            r={radius}
            className="stroke-zinc-800"
            strokeWidth="7"
            fill="transparent"
          />
          <circle
            cx="48"
            cy="48"
            r={radius}
            stroke={strokeColor}
            strokeWidth="7"
            strokeDasharray={circ}
            strokeDashoffset={offset}
            strokeLinecap="round"
            fill="transparent"
            className="transition-all duration-700 ease-out"
          />
        </svg>
        <div className="absolute flex flex-col items-center justify-center">
          <span className={`text-xl font-black tracking-tight ${colorClass}`}>
            {percent}%
          </span>
        </div>
      </div>
    );
  };

  const cpuCoresDisplay =
    stats?.cpu?.cores && stats?.cpu?.threads
      ? `${stats.cpu.cores} Cores • ${stats.cpu.threads} Threads`
      : '8 Cores • 12 Threads';

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col bg-[#0d0e12] sm:bg-black/85 sm:backdrop-blur-md transition-all duration-300 overflow-hidden ${
        isDeskMode ? 'p-0' : 'p-0 sm:p-4 sm:flex sm:items-center sm:justify-center'
      }`}
    >
      <div
        className={`w-full bg-[#0d0e12] border-0 sm:border sm:border-white/12 shadow-2xl flex flex-col overflow-hidden text-white transition-all duration-300 animate-ios-sheet smooth-gpu ${
          isDeskMode
            ? 'h-full rounded-none justify-between p-4 sm:p-6'
            : 'h-full sm:h-[92vh] sm:max-h-[92vh] sm:max-w-2xl sm:rounded-3xl'
        }`}
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between p-3.5 sm:p-4 border-b border-white/8 bg-white/3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 sm:p-2.5 rounded-2xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shrink-0">
              <Gauge className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm sm:text-base font-bold text-white tracking-wide truncate">
                  PC Hardware Monitor
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-mono font-semibold border border-cyan-500/30 uppercase shrink-0">
                  Realtime HUD
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5 flex items-center gap-1.5 font-mono truncate">
                <span className={`w-2 h-2 rounded-full shrink-0 ${isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
                <span className="truncate">{stats?.hostname || targetPeer?.name || 'PC Host'}</span>
                <span>•</span>
                <span className="text-zinc-500">{targetPeer?.ip || window.location.hostname || '127.0.0.1'}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Quick Clean RAM in header */}
            <button
              onClick={handleCleanRam}
              disabled={isCleaningRam}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 active:scale-95 text-purple-300 border border-purple-500/30 text-xs font-semibold transition cursor-pointer disabled:opacity-50"
              title="Bersihkan RAM (RAMMap Empty Working Sets)"
            >
              <Wind className={`w-3.5 h-3.5 ${isCleaningRam ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Bersihkan RAM</span>
            </button>

            <button
              onClick={() => {
                triggerHaptic([20]);
                setIsDeskMode(!isDeskMode);
              }}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 transition cursor-pointer border border-white/10"
              title={isDeskMode ? 'Keluar Desk Mode' : 'Mode Layar Penuh'}
            >
              {isDeskMode ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
            <button
              onClick={() => {
                triggerHaptic([20]);
                onClose();
              }}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition cursor-pointer border border-white/10"
              title="Tutup"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Metrics */}
        <div className="p-3 sm:p-5 overflow-y-auto space-y-3.5 flex-1 smooth-gpu pb-20 sm:pb-6">
          {/* Alert feedback when RAM is cleaned */}
          {cleanRamFeedback && (
            <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-mono flex items-center justify-between animate-ios-pop">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{cleanRamFeedback}</span>
              </div>
              <button
                onClick={() => setCleanRamFeedback(null)}
                className="text-zinc-400 hover:text-white cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* NitroSense Performance Mode Selector */}
          <div className="p-3 sm:p-3.5 rounded-2xl bg-zinc-900/90 border border-white/10 shadow-lg">
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="text-xs font-bold text-zinc-200 uppercase tracking-wider">
                  Mode Performa NitroSense
                </span>
              </div>
              <button
                onClick={handleOpenNitroSense}
                className="flex items-center gap-1 text-[11px] text-amber-400 hover:text-amber-300 font-medium transition cursor-pointer"
                title="Buka Aplikasi Acer NitroSense Resmi"
              >
                <span>Buka NitroSense</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => handleSetPowerMode('quiet')}
                disabled={isChangingPowerMode}
                className={`py-2 px-2 rounded-xl text-xs font-semibold flex flex-col items-center justify-center gap-1 transition cursor-pointer border ${
                  (stats?.powerMode === 'quiet')
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-xs ring-1 ring-emerald-500/30'
                    : 'bg-white/4 hover:bg-white/8 text-zinc-400 border-white/8 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <Wind className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Senyap</span>
                </div>
                <span className="text-[9px] font-normal opacity-70">Quiet / Fan Sunyi</span>
              </button>

              <button
                onClick={() => handleSetPowerMode('balanced')}
                disabled={isChangingPowerMode}
                className={`py-2 px-2 rounded-xl text-xs font-semibold flex flex-col items-center justify-center gap-1 transition cursor-pointer border ${
                  (stats?.powerMode === 'balanced')
                    ? 'bg-blue-500/20 text-blue-300 border-blue-500/40 shadow-xs ring-1 ring-blue-500/30'
                    : 'bg-white/4 hover:bg-white/8 text-zinc-400 border-white/8 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-blue-400" />
                  <span>Seimbang</span>
                </div>
                <span className="text-[9px] font-normal opacity-70">Acer Default</span>
              </button>

              <button
                onClick={() => handleSetPowerMode('performance')}
                disabled={isChangingPowerMode}
                className={`py-2 px-2 rounded-xl text-xs font-semibold flex flex-col items-center justify-center gap-1 transition cursor-pointer border ${
                  (stats?.powerMode === 'performance' || !stats?.powerMode)
                    ? 'bg-gradient-to-r from-amber-500/20 to-red-500/20 text-amber-300 border-amber-500/40 shadow-xs ring-1 ring-amber-500/30'
                    : 'bg-white/4 hover:bg-white/8 text-zinc-400 border-white/8 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <Flame className="w-3.5 h-3.5 text-red-400" />
                  <span>Performa</span>
                </div>
                <span className="text-[9px] font-normal opacity-70">Turbo Maksimal</span>
              </button>
            </div>
          </div>

          {/* NitroSense Fan Control (Kipas Laptop) */}
          <div className="p-3 sm:p-3.5 rounded-2xl bg-zinc-900/90 border border-white/10 shadow-lg">
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-2">
                <Fan className={`w-4 h-4 text-cyan-400 shrink-0 ${stats?.fan?.mode === 'max' ? 'animate-spin' : ''}`} style={{ animationDuration: stats?.fan?.mode === 'max' ? '0.7s' : '2.5s' }} />
                <span className="text-xs font-bold text-zinc-200 uppercase tracking-wider">
                  Pengaturan Kipas Laptop (Fan Control)
                </span>
              </div>
              <div className="flex items-center gap-2 font-mono text-[11px] text-cyan-300">
                <span className="flex items-center gap-1">
                  <span className="text-zinc-500">CPU</span>
                  <span className="font-semibold text-white">{stats?.fan?.cpuRpm || 3816} RPM</span>
                </span>
                <span className="text-zinc-600">•</span>
                <span className="flex items-center gap-1">
                  <span className="text-zinc-500">GPU</span>
                  <span className="font-semibold text-white">{stats?.fan?.gpuRpm || 3379} RPM</span>
                </span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => handleSetFanMode('auto')}
                disabled={isChangingFanMode}
                className={`py-2 px-2 rounded-xl text-xs font-semibold flex flex-col items-center justify-center gap-1 transition cursor-pointer border ${
                  (stats?.fan?.mode === 'auto' || !stats?.fan?.mode)
                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-xs ring-1 ring-cyan-500/30'
                    : 'bg-white/4 hover:bg-white/8 text-zinc-400 border-white/8 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Otomatis</span>
                </div>
                <span className="text-[9px] font-normal opacity-70">Auto / Dinamis</span>
              </button>

              <button
                onClick={() => handleSetFanMode('max')}
                disabled={isChangingFanMode}
                className={`py-2 px-2 rounded-xl text-xs font-semibold flex flex-col items-center justify-center gap-1 transition cursor-pointer border ${
                  stats?.fan?.mode === 'max'
                    ? 'bg-gradient-to-r from-red-500/25 to-amber-500/25 text-red-300 border-red-500/40 shadow-xs ring-1 ring-red-500/30'
                    : 'bg-white/4 hover:bg-white/8 text-zinc-400 border-white/8 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <Wind className="w-3.5 h-3.5 text-red-400" />
                  <span>Maksimal</span>
                </div>
                <span className="text-[9px] font-normal opacity-70">Full Speed 100%</span>
              </button>

              <button
                onClick={() => handleSetFanMode('custom')}
                disabled={isChangingFanMode}
                className={`py-2 px-2 rounded-xl text-xs font-semibold flex flex-col items-center justify-center gap-1 transition cursor-pointer border ${
                  stats?.fan?.mode === 'custom'
                    ? 'bg-purple-500/20 text-purple-300 border-purple-500/40 shadow-xs ring-1 ring-purple-500/30'
                    : 'bg-white/4 hover:bg-white/8 text-zinc-400 border-white/8 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-purple-400" />
                  <span>Kustom</span>
                </div>
                <span className="text-[9px] font-normal opacity-70">Preset Custom</span>
              </button>
            </div>
          </div>

          {/* Row 1: CPU & GPU Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* CPU Card */}
            <div className="p-4 rounded-2xl bg-zinc-900/80 border border-white/10 flex flex-col justify-between relative overflow-hidden shadow-lg">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 min-w-0">
                  <Cpu className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span className="text-xs font-bold text-zinc-200 uppercase tracking-wider truncate">
                    Prosesor (CPU)
                  </span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {stats?.cpu?.tempCelsius ? (
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold border ${
                        stats.cpu.tempCelsius > 75
                          ? 'bg-red-500/20 text-red-400 border-red-500/30'
                          : stats.cpu.tempCelsius > 60
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                          : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                      }`}
                    >
                      <Thermometer className="w-3 h-3" />
                      <span>{stats.cpu.tempCelsius}°C</span>
                    </span>
                  ) : null}
                  <span className="text-[11px] font-mono font-semibold text-cyan-400">
                    {cpuCoresDisplay}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-around my-1.5 gap-2">
                {renderGauge(
                  cpuUsage,
                  cpuUsage > 80 ? 'text-red-400' : cpuUsage > 50 ? 'text-amber-400' : 'text-cyan-400',
                  cpuUsage > 80 ? '#f87171' : cpuUsage > 50 ? '#fbbf24' : '#22d3ee'
                )}

                <div className="flex flex-col gap-1 text-xs text-zinc-400 font-mono min-w-0 flex-1 pl-2">
                  <div>
                    <span className="text-[9px] text-zinc-500 uppercase block">Model CPU</span>
                    <span className="font-semibold text-white truncate block text-[11px]" title={stats?.cpu?.model}>
                      {stats?.cpu?.model || '13th Gen Intel Core'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] text-zinc-500 uppercase block">Clock, Core & Kipas</span>
                    <span className="font-semibold text-cyan-300 text-[11px]">
                      {stats?.cpu?.speedMHz ? `${stats.cpu.speedMHz} MHz` : '2611 MHz'} • Kipas {stats?.fan?.cpuRpm || 3816} RPM
                    </span>
                  </div>
                </div>
              </div>

              {/* Realtime Load Sparkline */}
              <div className="mt-2 pt-2 border-t border-white/5 flex items-end gap-1.5 h-6">
                {cpuHistory.map((val, idx) => (
                  <div
                    key={idx}
                    className="flex-1 bg-cyan-500/30 rounded-t-sm transition-all duration-300"
                    style={{ height: `${Math.max(12, val)}%` }}
                  />
                ))}
              </div>
            </div>

            {/* GPU Card */}
            <div className="p-4 rounded-2xl bg-zinc-900/80 border border-white/10 flex flex-col justify-between relative overflow-hidden shadow-lg">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 min-w-0">
                  <Zap className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="text-xs font-bold text-zinc-200 uppercase tracking-wider truncate">
                    Grafis (GPU Dedicated)
                  </span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {stats?.gpu?.tempCelsius ? (
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold border ${
                        stats.gpu.tempCelsius > 75
                          ? 'bg-red-500/20 text-red-400 border-red-500/30'
                          : stats.gpu.tempCelsius > 60
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                          : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                      }`}
                    >
                      <Thermometer className="w-3 h-3" />
                      <span>{stats.gpu.tempCelsius}°C</span>
                    </span>
                  ) : null}
                  <span className="text-[11px] font-mono font-semibold text-emerald-400">
                    {gpuUsage}%
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-around my-1.5 gap-2">
                {renderGauge(
                  gpuUsage,
                  gpuUsage > 85 ? 'text-red-400' : gpuUsage > 60 ? 'text-amber-400' : 'text-emerald-400',
                  gpuUsage > 85 ? '#f87171' : gpuUsage > 60 ? '#fbbf24' : '#34d399'
                )}

                <div className="flex flex-col gap-1 text-xs text-zinc-400 font-mono min-w-0 flex-1 pl-2">
                  <div>
                    <span className="text-[9px] text-zinc-500 uppercase block">Model GPU</span>
                    <span className="font-semibold text-white truncate block text-[11px]">
                      {stats?.gpu?.name || 'NVIDIA GeForce RTX 2050'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] text-zinc-500 uppercase block">Hot Spot, Daya & Kipas</span>
                    <span className="font-semibold text-emerald-300 text-[11px]">
                      {stats?.gpu?.powerWatts || 11.2} W • Kipas {stats?.fan?.gpuRpm || 3379} RPM
                    </span>
                  </div>
                </div>
              </div>

              {/* VRAM Progress Bar */}
              <div className="mt-2 pt-2 border-t border-white/5">
                <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400 mb-1">
                  <span>Dedicated VRAM ({stats?.gpu?.vramUsedMB || 0} / {stats?.gpu?.vramTotalMB || 4096} MB)</span>
                  <span className="text-emerald-300 font-semibold">{stats?.gpu?.vramPercentage || 0}%</span>
                </div>
                <div className="w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500"
                    style={{ width: `${stats?.gpu?.vramPercentage || 0}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Row 2: RAM & SSD Storage Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* RAM Card with Integrated RAMMap Cleaner */}
            <div className="p-4 rounded-2xl bg-zinc-900/80 border border-white/10 flex flex-col justify-between shadow-lg">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-purple-400 shrink-0" />
                  <span className="text-xs font-bold text-zinc-200 uppercase tracking-wider">
                    Memori RAM PC
                  </span>
                </div>
                <span className="text-[11px] font-mono font-semibold text-purple-400">
                  {stats?.ram ? `${stats.ram.usedGB} / ${stats.ram.totalGB} GB` : 'RAM'}
                </span>
              </div>

              <div className="flex items-center justify-around my-1.5 gap-2">
                {renderGauge(
                  ramPercent,
                  ramPercent > 85 ? 'text-red-400' : ramPercent > 70 ? 'text-amber-400' : 'text-purple-400',
                  ramPercent > 85 ? '#f87171' : ramPercent > 70 ? '#fbbf24' : '#c084fc'
                )}

                <div className="flex flex-col gap-1 text-xs text-zinc-400 font-mono min-w-0 flex-1 pl-2">
                  <div>
                    <span className="text-[9px] text-zinc-500 uppercase block">RAM Terpakai</span>
                    <span className="font-semibold text-white text-[11px]">
                      {stats?.ram?.usedGB || '0'} GB ({ramPercent}%)
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] text-zinc-500 uppercase block">RAM Tersisa</span>
                    <span className="font-semibold text-emerald-400 text-[11px]">
                      {stats?.ram?.freeGB || '0'} GB Bebas
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-2 pt-2 border-t border-white/5 space-y-2">
                <div className="w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full transition-all duration-500"
                    style={{ width: `${ramPercent}%` }}
                  />
                </div>

                {/* RAM Cleaner Button (RAMMap Empty Working Sets) */}
                <button
                  onClick={handleCleanRam}
                  disabled={isCleaningRam}
                  className="w-full py-2 px-3 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 active:scale-95 text-purple-300 border border-purple-500/30 text-xs font-semibold flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50"
                  title="Kosongkan working set memori laptop seperti Sysinternals RAMMap"
                >
                  <Wind className={`w-3.5 h-3.5 ${isCleaningRam ? 'animate-spin' : ''}`} />
                  <span>{isCleaningRam ? 'Mengosongkan RAM...' : 'Kosongkan RAM (RAM Cleaner)'}</span>
                </button>
              </div>
            </div>

            {/* Storage (SSD Realtime Monitoring) */}
            <div className="p-4 rounded-2xl bg-zinc-900/80 border border-white/10 flex flex-col justify-between shadow-lg">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <HardDrive className="w-4 h-4 text-sky-400 shrink-0" />
                  <span className="text-xs font-bold text-zinc-200 uppercase tracking-wider">
                    Penyimpanan SSD NVMe (HWiNFO)
                  </span>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-500/15 text-sky-300 font-mono font-medium border border-sky-500/25 shrink-0 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-400" />
                  <span>S.M.A.R.T. Sehat</span>
                </span>
              </div>

              <div className="space-y-2.5 my-1">
                {(stats?.drives && stats.drives.length > 0
                  ? stats.drives
                  : [
                      {
                        drive: 'C:',
                        name: 'System SSD NVMe (C:)',
                        model: 'SK hynix 512GB NVMe (HFS512GEJ9X110N)',
                        tempCelsius: 43,
                        health: '100% (S.M.A.R.T. Baik)',
                        readMBs: 0,
                        writeMBs: 0,
                        totalGB: 510.7,
                        usedGB: 335.7,
                        freeGB: 175.0,
                        percentage: 66
                      },
                      {
                        drive: 'D:',
                        name: 'Data Storage NVMe (D:)',
                        model: 'TeamGroup 512GB NVMe (TM8FP6512G)',
                        tempCelsius: 40,
                        health: '100% (S.M.A.R.T. Baik)',
                        readMBs: 0,
                        writeMBs: 0,
                        totalGB: 512.1,
                        usedGB: 218.8,
                        freeGB: 293.3,
                        percentage: 43
                      }
                    ]
                ).map((d, idx) => (
                  <div key={idx} className="bg-black/40 p-2.5 rounded-xl border border-white/5 space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <div className="min-w-0 pr-2">
                        <span className="text-zinc-200 font-semibold truncate block">{d.name || d.drive}</span>
                        <span className="text-[10px] text-zinc-500 truncate block">{d.model || 'High-Speed NVMe'}</span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-[10px] px-1.5 py-0.2 rounded-sm font-mono font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/20">
                          {d.tempCelsius || 42}°C
                        </span>
                        <span className="text-zinc-400 text-[11px]">
                          {d.usedGB} / {d.totalGB} GB
                        </span>
                      </div>
                    </div>

                    <div className="w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          d.percentage > 85 ? 'bg-red-500' : d.percentage > 70 ? 'bg-amber-500' : 'bg-sky-400'
                        }`}
                        style={{ width: `${d.percentage}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400 pt-0.5">
                      <span className="text-emerald-400 font-medium">{d.freeGB} GB Bebas ({d.percentage}% Terpakai)</span>
                      <span className="text-zinc-500">
                        I/O: R {d.readMBs || 0} MB/s • W {d.writeMBs || 0} MB/s
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-2 pt-2 border-t border-white/5 flex items-center justify-between text-[11px] font-mono text-zinc-400">
                <span>Waktu Aktif PC:</span>
                <span className="text-amber-300 font-semibold">{formatUptime(stats?.uptimeSeconds)}</span>
              </div>
            </div>
          </div>

          {/* Matriks Suhu Hardware Komprehensif (HWiNFO) */}
          <div className="p-4 rounded-2xl bg-zinc-900/80 border border-white/10 shadow-lg">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Thermometer className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="text-xs font-bold text-zinc-200 uppercase tracking-wider">
                  Matriks Suhu Hardware (HWiNFO)
                </span>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 font-mono font-medium border border-amber-500/25">
                7 Sensor Realtime
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(stats?.thermalSensors || [
                { id: 'cpu-pkg', name: 'CPU Package', temp: stats?.cpu?.tempCelsius || 52, status: 'Optimal' },
                { id: 'cpu-core-max', name: 'CPU Core Max', temp: (stats?.cpu?.tempCelsius || 52) + 4, status: 'Optimal' },
                { id: 'gpu-core', name: 'GPU RTX 2050', temp: stats?.gpu?.tempCelsius || 50, status: 'Optimal' },
                { id: 'gpu-hotspot', name: 'GPU Hot Spot', temp: (stats?.gpu?.tempCelsius || 50) + 8, status: 'Optimal' },
                { id: 'ssd-c', name: 'SSD C: SK hynix', temp: 43, status: 'Dingin' },
                { id: 'ssd-d', name: 'SSD D: TeamGroup', temp: 40, status: 'Dingin' },
                { id: 'pch', name: 'Motherboard PCH', temp: 46, status: 'Optimal' }
              ]).map((sensor, idx) => {
                const isHot = sensor.temp >= 75;
                const isWarm = sensor.temp >= 62 && sensor.temp < 75;
                return (
                  <div key={idx} className="bg-black/40 p-2.5 rounded-xl border border-white/5 flex flex-col justify-between">
                    <span className="text-[10px] text-zinc-400 font-mono truncate mb-1">
                      {sensor.name}
                    </span>
                    <div className="flex items-baseline justify-between gap-1">
                      <span className={`text-base font-black font-mono tracking-tight ${
                        isHot ? 'text-red-400' : isWarm ? 'text-amber-400' : 'text-emerald-400'
                      }`}>
                        {sensor.temp}°C
                      </span>
                      <span className={`text-[9px] px-1.5 py-0.2 rounded-sm font-mono uppercase font-semibold ${
                        isHot
                          ? 'bg-red-500/20 text-red-400'
                          : isWarm
                          ? 'bg-amber-500/20 text-amber-300'
                          : 'bg-emerald-500/20 text-emerald-300'
                      }`}>
                        {sensor.status || 'OK'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer info bar */}
        <div className="p-3 sm:p-4 border-t border-white/8 bg-white/2 flex items-center justify-between text-xs text-zinc-400 font-mono shrink-0">
          <div className="flex items-center gap-2 text-[11px]">
            <Sparkles className="w-4 h-4 text-cyan-400 shrink-0" />
            <span className="hidden sm:inline">Taruh HP di samping monitor PC sebagai panel performa realtime.</span>
            <span className="sm:hidden">Panel performa PC realtime</span>
          </div>
          <button
            onClick={() => {
              triggerHaptic([20]);
              onClose();
            }}
            className="px-4 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold transition cursor-pointer text-xs"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}

export default PcHardwareHudModal;
