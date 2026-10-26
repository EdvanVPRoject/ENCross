import React, { useState, useEffect } from 'react';
import {
  X,
  Layers,
  Sparkles,
  Monitor,
  Headphones,
  Globe,
  Plus,
  Trash2,
  Lock,
  Volume2,
  VolumeX,
  Play,
  SkipForward,
  SkipBack,
  Scissors,
  Folder,
  Terminal,
  Command,
  MicOff,
  VideoOff,
  Maximize2,
  RefreshCw,
  PlusCircle,
  Copy
} from 'lucide-react';
import { triggerHaptic } from '../utils/feedback';

export function MacroPadModal({ targetPeer, onSendInput, onClose }) {
  const [activeTab, setActiveTab] = useState('system'); // 'system' | 'media' | 'browser' | 'custom'
  const [customMacros, setCustomMacros] = useState(() => {
    try {
      const saved = localStorage.getItem('encross_custom_macros');
      if (saved) return JSON.parse(saved);
    } catch (_) {}
    return [
      { id: 'c1', label: 'Discord Mute', hint: 'Ctrl+Shift+M', cmd: 'combo ctrl shift m', color: 'rose' },
      { id: 'c2', label: 'Paste Email', hint: 'Ketik email', cmd: 'type:user@example.com', color: 'sky' },
      { id: 'c3', label: 'Kunci Laptop', hint: 'Lock Workstation', cmd: 'lock', color: 'amber' },
      { id: 'c4', label: 'Close Window', hint: 'Alt+F4', cmd: 'combo alt f4', color: 'purple' }
    ];
  });

  const [isAddingMacro, setIsAddingMacro] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newType, setNewType] = useState('hotkey'); // 'hotkey' | 'text' | 'lock'
  const [newCommand, setNewCommand] = useState('');
  const [newColor, setNewColor] = useState('blue');

  useEffect(() => {
    try {
      localStorage.setItem('encross_custom_macros', JSON.stringify(customMacros));
    } catch (_) {}
  }, [customMacros]);

  const executeCommand = (cmd) => {
    triggerHaptic([20]);
    if (onSendInput && typeof onSendInput === 'function') {
      onSendInput(cmd);
    }
  };

  const handleAddCustomMacro = (e) => {
    e.preventDefault();
    if (!newLabel.trim()) return;

    let finalCmd = '';
    let hintText = '';

    if (newType === 'hotkey') {
      const cleanKeys = newCommand.trim().toLowerCase().replace(/\+/g, ' ');
      finalCmd = `combo ${cleanKeys}`;
      hintText = newCommand.trim().toUpperCase();
    } else if (newType === 'text') {
      finalCmd = `type:${newCommand}`;
      hintText = 'Ketik Teks';
    } else if (newType === 'lock') {
      finalCmd = 'lock';
      hintText = 'Kunci Windows';
    }

    const newMacro = {
      id: `custom_${Date.now()}`,
      label: newLabel.trim(),
      hint: hintText,
      cmd: finalCmd,
      color: newColor
    };

    setCustomMacros((prev) => [...prev, newMacro]);
    setNewLabel('');
    setNewCommand('');
    setIsAddingMacro(false);
    triggerHaptic([30]);
  };

  const handleDeleteCustomMacro = (id, e) => {
    e.stopPropagation();
    triggerHaptic([25]);
    setCustomMacros((prev) => prev.filter((m) => m.id !== id));
  };

  const colorStyles = {
    blue: 'bg-blue-500/10 hover:bg-blue-500/15 border-blue-500/20 text-[#0071e3] dark:text-blue-400',
    emerald: 'bg-emerald-500/10 hover:bg-emerald-500/15 border-emerald-500/20 text-emerald-600 dark:text-emerald-400',
    sky: 'bg-sky-500/10 hover:bg-sky-500/15 border-sky-500/20 text-sky-600 dark:text-sky-400',
    rose: 'bg-rose-500/10 hover:bg-rose-500/15 border-rose-500/20 text-rose-600 dark:text-rose-400',
    amber: 'bg-amber-500/10 hover:bg-amber-500/15 border-amber-500/20 text-amber-600 dark:text-amber-400',
    purple: 'bg-purple-500/10 hover:bg-purple-500/15 border-purple-500/20 text-purple-600 dark:text-purple-400',
    indigo: 'bg-indigo-500/10 hover:bg-indigo-500/15 border-indigo-500/20 text-indigo-600 dark:text-indigo-400',
    zinc: 'bg-black/4 dark:bg-white/5 hover:bg-black/8 dark:hover:bg-white/10 border-black/8 dark:border-white/10 text-zinc-700 dark:text-zinc-300'
  };

  const systemMacros = [
    { label: 'Screenshot Area', hint: 'Win+Shift+S', cmd: 'combo win shift s', icon: Scissors, color: 'sky' },
    { label: 'Task Manager', hint: 'Ctrl+Shift+Esc', cmd: 'combo ctrl shift esc', icon: Terminal, color: 'emerald' },
    { label: 'File Explorer', hint: 'Win+E', cmd: 'combo win e', icon: Folder, color: 'amber' },
    { label: 'Riwayat Clipboard', hint: 'Win+V', cmd: 'combo win v', icon: Copy, color: 'purple' },
    { label: 'Kunci Layar PC', hint: 'Lock Workstation', cmd: 'lock', icon: Lock, color: 'rose' },
    { label: 'Show Desktop', hint: 'Win+D', cmd: 'combo win d', icon: Monitor, color: 'sky' },
    { label: 'Switch App', hint: 'Alt+Tab', cmd: 'combo alt tab', icon: Layers, color: 'indigo' },
    { label: 'Tutup Window', hint: 'Alt+F4', cmd: 'combo alt f4', icon: X, color: 'rose' },
    { label: 'Virtual Desktop', hint: 'Win+Ctrl+D', cmd: 'combo win ctrl d', icon: PlusCircle, color: 'emerald' },
    { label: 'Run Dialog', hint: 'Win+R', cmd: 'combo win r', icon: Command, color: 'zinc' }
  ];

  const mediaMacros = [
    { label: 'Discord Mute', hint: 'Ctrl+Shift+M', cmd: 'combo ctrl shift m', icon: MicOff, color: 'rose' },
    { label: 'Discord Deafen', hint: 'Ctrl+Shift+D', cmd: 'combo ctrl shift d', icon: Headphones, color: 'purple' },
    { label: 'Mute Audio PC', hint: 'Mute Speaker', cmd: 'media mute', icon: VolumeX, color: 'amber' },
    { label: 'Volume PC +', hint: 'Volume Up', cmd: 'media volup', icon: Volume2, color: 'emerald' },
    { label: 'Volume PC -', hint: 'Volume Down', cmd: 'media voldown', icon: Volume2, color: 'emerald' },
    { label: 'Play / Pause', hint: 'Media Toggle', cmd: 'media playpause', icon: Play, color: 'sky' },
    { label: 'Next Track', hint: 'Lagu Berikutnya', cmd: 'media next', icon: SkipForward, color: 'zinc' },
    { label: 'Prev Track', hint: 'Lagu Sebelumnya', cmd: 'media prev', icon: SkipBack, color: 'zinc' },
    { label: 'Zoom Mute Mic', hint: 'Alt+A', cmd: 'combo alt a', icon: MicOff, color: 'indigo' },
    { label: 'Zoom Stop Cam', hint: 'Alt+V', cmd: 'combo alt v', icon: VideoOff, color: 'rose' }
  ];

  const browserMacros = [
    { label: 'Tab Baru', hint: 'Ctrl+T', cmd: 'combo ctrl t', icon: Plus, color: 'emerald' },
    { label: 'Tutup Tab', hint: 'Ctrl+W', cmd: 'combo ctrl w', icon: X, color: 'rose' },
    { label: 'Pulihkan Tab', hint: 'Ctrl+Shift+T', cmd: 'combo ctrl shift t', icon: RefreshCw, color: 'sky' },
    { label: 'Refresh Halaman', hint: 'Ctrl+R', cmd: 'combo ctrl r', icon: RefreshCw, color: 'indigo' },
    { label: 'Bookmark Page', hint: 'Ctrl+D', cmd: 'combo ctrl d', icon: Sparkles, color: 'amber' },
    { label: 'Developer Tools', hint: 'F12', cmd: 'k f12', icon: Terminal, color: 'purple' },
    { label: 'Zoom In', hint: 'Ctrl + +', cmd: 'combo ctrl plus', icon: Maximize2, color: 'sky' },
    { label: 'Zoom Out', hint: 'Ctrl + -', cmd: 'combo ctrl minus', icon: Maximize2, color: 'zinc' }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
      <div className="apple-card border border-black/10 dark:border-white/10 rounded-3xl w-full max-w-lg h-[90vh] max-h-[720px] flex flex-col shadow-2xl overflow-hidden select-none animate-ios-sheet smooth-gpu">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-black/8 dark:border-white/10 bg-black/3 dark:bg-white/3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <Layers className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-white truncate">Virtual Macro Pad</h3>
                <span className="text-[9px] bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 px-2 py-0.2 rounded-full font-mono font-medium uppercase">
                  Stream Deck
                </span>
              </div>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
                Terkoneksi ke: <span className="text-purple-600 dark:text-purple-400 font-medium">{targetPeer?.name || 'PC'}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-900 dark:hover:text-white rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition cursor-pointer ios-pressable"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector - Apple Segmented Capsule */}
        <div className="grid grid-cols-4 gap-1 p-1 m-3 rounded-full bg-black/5 dark:bg-white/8 border border-black/5 dark:border-white/5 text-xs font-medium">
          <button
            onClick={() => setActiveTab('system')}
            className={`py-1.5 rounded-full transition cursor-pointer flex flex-col items-center gap-0.5 ios-pressable ${
              activeTab === 'system'
                ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-xs font-semibold'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            <Monitor className="w-3.5 h-3.5" />
            <span className="text-[10px]">Sistem</span>
          </button>

          <button
            onClick={() => setActiveTab('media')}
            className={`py-1.5 rounded-full transition cursor-pointer flex flex-col items-center gap-0.5 ios-pressable ${
              activeTab === 'media'
                ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-xs font-semibold'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            <Headphones className="w-3.5 h-3.5" />
            <span className="text-[10px]">Media</span>
          </button>

          <button
            onClick={() => setActiveTab('browser')}
            className={`py-1.5 rounded-full transition cursor-pointer flex flex-col items-center gap-0.5 ios-pressable ${
              activeTab === 'browser'
                ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-xs font-semibold'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span className="text-[10px]">Browser</span>
          </button>

          <button
            onClick={() => setActiveTab('custom')}
            className={`py-1.5 rounded-full transition cursor-pointer flex flex-col items-center gap-0.5 ios-pressable ${
              activeTab === 'custom'
                ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-xs font-semibold'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span className="text-[10px]">Kustom</span>
          </button>
        </div>

        {/* Tiles Area */}
        <div className="flex-1 overflow-y-auto p-3.5 pt-0 min-h-0">
          {activeTab === 'system' && (
            <div className="grid grid-cols-2 gap-2.5">
              {systemMacros.map((macro, idx) => {
                const IconComponent = macro.icon;
                return (
                  <button
                    key={idx}
                    onClick={() => executeCommand(macro.cmd)}
                    className={`flex flex-col items-start justify-between p-3.5 rounded-2xl border transition cursor-pointer shadow-xs min-h-[82px] text-left ios-pressable ${colorStyles[macro.color] || colorStyles.zinc}`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="p-1.5 rounded-xl bg-black/5 dark:bg-white/10 shrink-0">
                        <IconComponent className="w-4 h-4" />
                      </div>
                      <span className="text-[9px] font-mono opacity-60 font-semibold uppercase">{macro.hint}</span>
                    </div>
                    <div className="mt-2">
                      <span className="text-xs font-semibold leading-tight block text-zinc-900 dark:text-white">{macro.label}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {activeTab === 'media' && (
            <div className="grid grid-cols-2 gap-2.5">
              {mediaMacros.map((macro, idx) => {
                const IconComponent = macro.icon;
                return (
                  <button
                    key={idx}
                    onClick={() => executeCommand(macro.cmd)}
                    className={`flex flex-col items-start justify-between p-3.5 rounded-2xl border transition cursor-pointer shadow-xs min-h-[82px] text-left ios-pressable ${colorStyles[macro.color] || colorStyles.zinc}`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="p-1.5 rounded-xl bg-black/5 dark:bg-white/10 shrink-0">
                        <IconComponent className="w-4 h-4" />
                      </div>
                      <span className="text-[9px] font-mono opacity-60 font-semibold uppercase">{macro.hint}</span>
                    </div>
                    <div className="mt-2">
                      <span className="text-xs font-semibold leading-tight block text-zinc-900 dark:text-white">{macro.label}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {activeTab === 'browser' && (
            <div className="grid grid-cols-2 gap-2.5">
              {browserMacros.map((macro, idx) => {
                const IconComponent = macro.icon;
                return (
                  <button
                    key={idx}
                    onClick={() => executeCommand(macro.cmd)}
                    className={`flex flex-col items-start justify-between p-3.5 rounded-2xl border transition cursor-pointer shadow-xs min-h-[82px] text-left ios-pressable ${colorStyles[macro.color] || colorStyles.zinc}`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="p-1.5 rounded-xl bg-black/5 dark:bg-white/10 shrink-0">
                        <IconComponent className="w-4 h-4" />
                      </div>
                      <span className="text-[9px] font-mono opacity-60 font-semibold uppercase">{macro.hint}</span>
                    </div>
                    <div className="mt-2">
                      <span className="text-xs font-semibold leading-tight block text-zinc-900 dark:text-white">{macro.label}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {activeTab === 'custom' && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2.5">
                {customMacros.map((macro) => (
                  <div
                    key={macro.id}
                    onClick={() => executeCommand(macro.cmd)}
                    className={`relative flex flex-col items-start justify-between p-3.5 rounded-2xl border transition cursor-pointer shadow-xs min-h-[84px] text-left group ios-pressable ${colorStyles[macro.color] || colorStyles.blue}`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="p-1.5 rounded-xl bg-black/5 dark:bg-white/10 shrink-0">
                        <Sparkles className="w-4 h-4" />
                      </div>
                      <button
                        onClick={(e) => handleDeleteCustomMacro(macro.id, e)}
                        className="p-1 text-zinc-400 hover:text-red-500 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition cursor-pointer"
                        title="Hapus Macro"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="mt-2 w-full">
                      <span className="text-xs font-semibold leading-tight block text-zinc-900 dark:text-white truncate">{macro.label}</span>
                      <span className="text-[9px] font-mono opacity-60 block truncate">{macro.hint}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add New Custom Macro Button */}
              <button
                onClick={() => setIsAddingMacro(true)}
                className="w-full py-3 rounded-2xl border border-dashed border-black/15 dark:border-white/20 bg-black/3 dark:bg-white/5 hover:bg-black/6 dark:hover:bg-white/8 text-zinc-700 dark:text-zinc-300 flex items-center justify-center gap-2 text-xs font-medium transition cursor-pointer active:scale-[0.98]"
              >
                <Plus className="w-4 h-4 text-[#0071e3]" />
                <span>Tambah Tombol Macro Baru</span>
              </button>
            </div>
          )}
        </div>

        {/* Modal: Tambah Custom Macro */}
        {isAddingMacro && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md z-30 flex items-center justify-center p-4">
            <div className="apple-card border border-black/10 dark:border-white/10 rounded-3xl max-w-sm w-full p-6 text-left shadow-2xl relative">
              <button
                onClick={() => setIsAddingMacro(false)}
                className="absolute top-4 right-4 p-1.5 text-zinc-400 hover:text-zinc-900 dark:hover:text-white rounded-full hover:bg-black/5 dark:hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>

              <h4 className="text-sm font-semibold text-zinc-900 dark:text-white mb-1">Buat Tombol Macro Baru</h4>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-4">Tambahkan aksi atau shortcut kustom untuk PC Anda</p>

              <form onSubmit={handleAddCustomMacro} className="space-y-3.5 text-xs">
                <div>
                  <label className="text-zinc-700 dark:text-zinc-300 font-medium block mb-1">Nama Tombol</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Mute Discord / Paste Email"
                    value={newLabel}
                    onChange={(e) => setNewLabel(e.target.value)}
                    className="w-full px-3.5 py-2 bg-black/5 dark:bg-white/8 border border-black/8 dark:border-white/10 rounded-xl text-zinc-900 dark:text-white focus:outline-none focus:border-[#0071e3]"
                  />
                </div>

                <div>
                  <label className="text-zinc-700 dark:text-zinc-300 font-medium block mb-1">Tipe Aksi</label>
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value)}
                    className="w-full px-3.5 py-2 bg-black/5 dark:bg-white/8 border border-black/8 dark:border-white/10 rounded-xl text-zinc-900 dark:text-white focus:outline-none focus:border-[#0071e3]"
                  >
                    <option value="hotkey">Shortcut Keyboard (Contoh: Ctrl+Alt+T)</option>
                    <option value="text">Ketik Teks Otomatis (Text Snippet)</option>
                    <option value="lock">Kunci Layar PC (Lock Workstation)</option>
                  </select>
                </div>

                {newType !== 'lock' && (
                  <div>
                    <label className="text-zinc-700 dark:text-zinc-300 font-medium block mb-1">
                      {newType === 'hotkey' ? 'Kombinasi Tombol' : 'Teks yang Diketik'}
                    </label>
                    <input
                      type="text"
                      required
                      placeholder={newType === 'hotkey' ? 'Contoh: ctrl alt t atau win shift s' : 'Ketik teks atau template email...'}
                      value={newCommand}
                      onChange={(e) => setNewCommand(e.target.value)}
                      className="w-full px-3.5 py-2 bg-black/5 dark:bg-white/8 border border-black/8 dark:border-white/10 rounded-xl text-zinc-900 dark:text-white focus:outline-none focus:border-[#0071e3]"
                    />
                  </div>
                )}

                <div>
                  <label className="text-zinc-700 dark:text-zinc-300 font-medium block mb-1.5">Warna Tombol</label>
                  <div className="flex items-center gap-2">
                    {['blue', 'emerald', 'sky', 'rose', 'amber', 'purple', 'indigo'].map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setNewColor(c)}
                        className={`w-7 h-7 rounded-full border-2 transition active:scale-90 ${
                          c === 'blue' ? 'bg-[#0071e3]' :
                          c === 'emerald' ? 'bg-emerald-500' :
                          c === 'sky' ? 'bg-sky-500' :
                          c === 'rose' ? 'bg-rose-500' :
                          c === 'amber' ? 'bg-amber-500' :
                          c === 'purple' ? 'bg-purple-500' : 'bg-indigo-500'
                        } ${newColor === c ? 'border-zinc-900 dark:border-white scale-110' : 'border-transparent opacity-60'}`}
                      />
                    ))}
                  </div>
                </div>

                <div className="pt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAddingMacro(false)}
                    className="flex-1 py-2 rounded-full bg-black/5 dark:bg-white/8 hover:bg-black/10 dark:hover:bg-white/12 text-zinc-600 dark:text-zinc-400 font-medium"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2 rounded-full bg-[#0071e3] hover:bg-[#0077ed] text-white font-medium shadow-sm active:scale-95"
                  >
                    Simpan Macro
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
