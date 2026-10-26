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
  const [newColor, setNewColor] = useState('emerald');

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
    emerald: 'bg-emerald-500/15 hover:bg-emerald-500/25 border-emerald-500/35 text-emerald-300',
    sky: 'bg-sky-500/15 hover:bg-sky-500/25 border-sky-500/35 text-sky-300',
    rose: 'bg-rose-500/15 hover:bg-rose-500/25 border-rose-500/35 text-rose-300',
    amber: 'bg-amber-500/15 hover:bg-amber-500/25 border-amber-500/35 text-amber-300',
    purple: 'bg-purple-500/15 hover:bg-purple-500/25 border-purple-500/35 text-purple-300',
    indigo: 'bg-indigo-500/15 hover:bg-indigo-500/25 border-indigo-500/35 text-indigo-300',
    zinc: 'bg-zinc-800/80 hover:bg-zinc-700 border-zinc-700/60 text-zinc-200'
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-lg h-[90vh] max-h-[720px] flex flex-col shadow-2xl overflow-hidden select-none">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-zinc-800/80 bg-zinc-950/70">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 rounded-xl bg-purple-500/15 text-purple-400 border border-purple-500/30">
              <Layers className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h3 className="text-sm font-bold text-white truncate">Virtual Macro Pad</h3>
                <span className="text-[9px] bg-purple-500/20 text-purple-300 border border-purple-500/40 px-1.5 py-0.2 rounded font-mono font-semibold uppercase">
                  Stream Deck
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 truncate">
                Terkoneksi ke: <span className="text-purple-300 font-medium">{targetPeer?.name || 'PC'}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="grid grid-cols-4 gap-1 p-2 bg-zinc-950/40 border-b border-zinc-800/60 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('system')}
            className={`py-2 rounded-xl transition cursor-pointer flex flex-col items-center gap-1 ${
              activeTab === 'system'
                ? 'bg-zinc-800 text-white shadow-xs border border-zinc-700/60'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Monitor className="w-3.5 h-3.5 text-sky-400" />
            <span className="text-[10px]">Sistem</span>
          </button>

          <button
            onClick={() => setActiveTab('media')}
            className={`py-2 rounded-xl transition cursor-pointer flex flex-col items-center gap-1 ${
              activeTab === 'media'
                ? 'bg-zinc-800 text-white shadow-xs border border-zinc-700/60'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Headphones className="w-3.5 h-3.5 text-purple-400" />
            <span className="text-[10px]">Media & Voice</span>
          </button>

          <button
            onClick={() => setActiveTab('browser')}
            className={`py-2 rounded-xl transition cursor-pointer flex flex-col items-center gap-1 ${
              activeTab === 'browser'
                ? 'bg-zinc-800 text-white shadow-xs border border-zinc-700/60'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Globe className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-[10px]">Browser</span>
          </button>

          <button
            onClick={() => setActiveTab('custom')}
            className={`py-2 rounded-xl transition cursor-pointer flex flex-col items-center gap-1 ${
              activeTab === 'custom'
                ? 'bg-zinc-800 text-white shadow-xs border border-zinc-700/60'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-[10px]">Kustom</span>
          </button>
        </div>

        {/* Tiles Area */}
        <div className="flex-1 overflow-y-auto p-3.5 min-h-0">
          {activeTab === 'system' && (
            <div className="grid grid-cols-2 gap-2.5">
              {systemMacros.map((macro, idx) => {
                const IconComponent = macro.icon;
                return (
                  <button
                    key={idx}
                    onClick={() => executeCommand(macro.cmd)}
                    className={`flex flex-col items-start justify-between p-3.5 rounded-2xl border transition active:scale-[0.96] cursor-pointer shadow-xs min-h-[82px] text-left ${colorStyles[macro.color] || colorStyles.zinc}`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="p-1.5 rounded-lg bg-black/20 shrink-0">
                        <IconComponent className="w-4 h-4" />
                      </div>
                      <span className="text-[9px] font-mono opacity-60 font-semibold uppercase">{macro.hint}</span>
                    </div>
                    <div className="mt-2">
                      <span className="text-xs font-bold leading-tight block text-white">{macro.label}</span>
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
                    className={`flex flex-col items-start justify-between p-3.5 rounded-2xl border transition active:scale-[0.96] cursor-pointer shadow-xs min-h-[82px] text-left ${colorStyles[macro.color] || colorStyles.zinc}`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="p-1.5 rounded-lg bg-black/20 shrink-0">
                        <IconComponent className="w-4 h-4" />
                      </div>
                      <span className="text-[9px] font-mono opacity-60 font-semibold uppercase">{macro.hint}</span>
                    </div>
                    <div className="mt-2">
                      <span className="text-xs font-bold leading-tight block text-white">{macro.label}</span>
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
                    className={`flex flex-col items-start justify-between p-3.5 rounded-2xl border transition active:scale-[0.96] cursor-pointer shadow-xs min-h-[82px] text-left ${colorStyles[macro.color] || colorStyles.zinc}`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="p-1.5 rounded-lg bg-black/20 shrink-0">
                        <IconComponent className="w-4 h-4" />
                      </div>
                      <span className="text-[9px] font-mono opacity-60 font-semibold uppercase">{macro.hint}</span>
                    </div>
                    <div className="mt-2">
                      <span className="text-xs font-bold leading-tight block text-white">{macro.label}</span>
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
                    className={`relative flex flex-col items-start justify-between p-3.5 rounded-2xl border transition active:scale-[0.96] cursor-pointer shadow-xs min-h-[84px] text-left group ${colorStyles[macro.color] || colorStyles.emerald}`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="p-1.5 rounded-lg bg-black/20 shrink-0">
                        <Sparkles className="w-4 h-4" />
                      </div>
                      <button
                        onClick={(e) => handleDeleteCustomMacro(macro.id, e)}
                        className="p-1 text-zinc-400 hover:text-red-400 rounded hover:bg-black/30 transition cursor-pointer"
                        title="Hapus Macro"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="mt-2 w-full">
                      <span className="text-xs font-bold leading-tight block text-white truncate">{macro.label}</span>
                      <span className="text-[9px] font-mono opacity-60 block truncate">{macro.hint}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add New Custom Macro Button */}
              <button
                onClick={() => setIsAddingMacro(true)}
                className="w-full py-3 rounded-2xl border-2 border-dashed border-zinc-700 hover:border-emerald-500/50 bg-zinc-950/40 hover:bg-emerald-500/5 text-zinc-300 hover:text-emerald-300 flex items-center justify-center gap-2 text-xs font-bold transition cursor-pointer active:scale-[0.98]"
              >
                <Plus className="w-4 h-4 text-emerald-400" />
                <span>Tambah Tombol Macro Baru</span>
              </button>
            </div>
          )}
        </div>

        {/* Modal: Tambah Custom Macro */}
        {isAddingMacro && (
          <div className="absolute inset-0 bg-black/85 backdrop-blur-xs z-30 flex items-center justify-center p-4">
            <div className="bg-zinc-900 border border-zinc-700 rounded-2xl max-w-sm w-full p-5 text-left shadow-2xl relative">
              <button
                onClick={() => setIsAddingMacro(false)}
                className="absolute top-4 right-4 p-1 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800"
              >
                <X className="w-4 h-4" />
              </button>

              <h4 className="text-sm font-bold text-white mb-1">Buat Tombol Macro Baru</h4>
              <p className="text-[11px] text-zinc-400 mb-4">Tambahkan aksi atau shortcut kustom untuk PC Anda</p>

              <form onSubmit={handleAddCustomMacro} className="space-y-3 text-xs">
                <div>
                  <label className="text-zinc-300 font-semibold block mb-1">Nama Tombol</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Mute Discord / Paste Email"
                    value={newLabel}
                    onChange={(e) => setNewLabel(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-zinc-300 font-semibold block mb-1">Tipe Aksi</label>
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="hotkey">Shortcut Keyboard (Contoh: Ctrl+Alt+T)</option>
                    <option value="text">Ketik Teks Otomatis (Text Snippet)</option>
                    <option value="lock">Kunci Layar PC (Lock Workstation)</option>
                  </select>
                </div>

                {newType !== 'lock' && (
                  <div>
                    <label className="text-zinc-300 font-semibold block mb-1">
                      {newType === 'hotkey' ? 'Kombinasi Tombol' : 'Teks yang Diketik'}
                    </label>
                    <input
                      type="text"
                      required
                      placeholder={newType === 'hotkey' ? 'Contoh: ctrl alt t atau win shift s' : 'Ketik teks atau template email...'}
                      value={newCommand}
                      onChange={(e) => setNewCommand(e.target.value)}
                      className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                )}

                <div>
                  <label className="text-zinc-300 font-semibold block mb-1">Warna Tombol</label>
                  <div className="flex items-center gap-2">
                    {['emerald', 'sky', 'rose', 'amber', 'purple', 'indigo'].map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setNewColor(c)}
                        className={`w-7 h-7 rounded-full border-2 transition active:scale-90 ${
                          c === 'emerald' ? 'bg-emerald-500' :
                          c === 'sky' ? 'bg-sky-500' :
                          c === 'rose' ? 'bg-rose-500' :
                          c === 'amber' ? 'bg-amber-500' :
                          c === 'purple' ? 'bg-purple-500' : 'bg-indigo-500'
                        } ${newColor === c ? 'border-white scale-110' : 'border-transparent opacity-60'}`}
                      />
                    ))}
                  </div>
                </div>

                <div className="pt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAddingMacro(false)}
                    className="flex-1 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
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
