import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  X,
  MousePointer,
  Keyboard,
  Layers,
  CornerDownLeft,
  Delete,
  Space,
  Sliders,
  Volume2,
  VolumeX,
  Volume1,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Monitor,
  Lock,
  Scissors,
  Copy,
  Plus,
  Trash2,
  Maximize2,
  Terminal,
  Folder,
  Globe,
  RefreshCw,
  Send,
  Mic,
  ChevronDown,
  Hash,
  Sparkles,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  AppWindow,
  LayoutGrid
} from 'lucide-react';
import { triggerHaptic } from '../utils/feedback';

export function TouchpadModal({
  targetPeer,
  onSendInput,
  onClose,
  initialTab = 'windows' // 'windows' | 'media' | 'browser' | 'numpad' | 'custom'
}) {
  // Navigation & Category Tabs
  const [activeMacroTab, setActiveMacroTab] = useState(initialTab);
  const [sensitivity, setSensitivity] = useState(1.4);
  const [showSensitivitySlider, setShowSensitivitySlider] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Realtime Keyboard & Touchpad State
  const [inputText, setInputText] = useState('');
  const [isKeyboardFocused, setIsKeyboardFocused] = useState(false);
  const inputRef = useRef(null);
  const lastValRef = useRef('');

  // Auto-focus keyboard on mount so virtual keyboard opens immediately
  useEffect(() => {
    const timer = setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }, 200);
    return () => clearTimeout(timer);
  }, []);

  // Custom Macros State
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
  const [newMacroLabel, setNewMacroLabel] = useState('');
  const [newMacroType, setNewMacroType] = useState('hotkey'); // 'hotkey' | 'text' | 'lock'
  const [newMacroCommand, setNewMacroCommand] = useState('');
  const [newMacroColor, setNewMacroColor] = useState('blue');

  useEffect(() => {
    try {
      localStorage.setItem('encross_custom_macros', JSON.stringify(customMacros));
    } catch (_) {}
  }, [customMacros]);

  // Touchpad Gestures
  const touchAreaRef = useRef(null);
  const touchState = useRef({
    startX: 0,
    startY: 0,
    lastX: 0,
    lastY: 0,
    startTime: 0,
    isTwoFinger: false,
    lastTwoFingerY: 0,
    moved: false
  });

  const sendCommand = useCallback(
    (cmdStr) => {
      if (onSendInput && typeof onSendInput === 'function') {
        onSendInput(cmdStr);
      }
    },
    [onSendInput]
  );

  // Touchpad Events
  const handleTouchStart = (e) => {
    if (e.touches.length === 1) {
      const t = e.touches[0];
      touchState.current = {
        startX: t.clientX,
        startY: t.clientY,
        lastX: t.clientX,
        lastY: t.clientY,
        startTime: Date.now(),
        isTwoFinger: false,
        lastTwoFingerY: 0,
        moved: false
      };
    } else if (e.touches.length === 2) {
      touchState.current.isTwoFinger = true;
      touchState.current.lastTwoFingerY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
    }
  };

  const handleTouchMove = (e) => {
    e.preventDefault(); // Prevent accidental mobile pull-to-refresh
    if (e.touches.length === 1 && !touchState.current.isTwoFinger) {
      const t = e.touches[0];
      const dx = (t.clientX - touchState.current.lastX) * sensitivity;
      const dy = (t.clientY - touchState.current.lastY) * sensitivity;

      touchState.current.lastX = t.clientX;
      touchState.current.lastY = t.clientY;

      if (Math.abs(dx) > 0.4 || Math.abs(dy) > 0.4) {
        touchState.current.moved = true;
        const roundX = Math.round(dx);
        const roundY = Math.round(dy);
        if (roundX !== 0 || roundY !== 0) {
          sendCommand(`m ${roundX} ${roundY}`);
        }
      }
    } else if (e.touches.length === 2) {
      const currentY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
      const deltaY = currentY - touchState.current.lastTwoFingerY;
      touchState.current.lastTwoFingerY = currentY;

      if (Math.abs(deltaY) > 2) {
        // Natural scrolling
        const wheelDelta = Math.round(deltaY * 3);
        sendCommand(`w ${wheelDelta}`);
      }
    }
  };

  const handleTouchEnd = (e) => {
    const elapsed = Date.now() - touchState.current.startTime;
    // Tap to Click: single touch under 250ms and not moved
    if (!touchState.current.isTwoFinger && !touchState.current.moved && elapsed < 250) {
      triggerHaptic([20]);
      sendCommand('c left');
    }
    // Two-finger tap: Right Click
    if (touchState.current.isTwoFinger && !touchState.current.moved && elapsed < 300) {
      triggerHaptic([25]);
      sendCommand('c right');
    }
    if (e.touches.length === 0) {
      touchState.current.isTwoFinger = false;
      touchState.current.moved = false;
    }
  };

  // Toggle Mouse Drag
  const toggleDrag = () => {
    triggerHaptic([30]);
    if (!isDragging) {
      sendCommand('d left');
      setIsDragging(true);
    } else {
      sendCommand('u left');
      setIsDragging(false);
    }
  };

  // Send Single Key
  const handleKeyClick = (key) => {
    triggerHaptic([15]);
    sendCommand(`k ${key}`);
  };

  // Send Modifier Combo
  const handleComboClick = (mod, key) => {
    triggerHaptic([25]);
    sendCommand(`combo ${mod} ${key}`);
  };

  // Send Media
  const handleMediaClick = (mediaCmd) => {
    triggerHaptic([20]);
    sendCommand(`media ${mediaCmd}`);
  };

  // Realtime Input Handlers: sends keystrokes instantly to PC without requiring 'Kirim'
  const handleInputChange = (e) => {
    const newVal = e.target.value;
    const oldVal = lastValRef.current;

    let commonPrefix = 0;
    while (
      commonPrefix < oldVal.length &&
      commonPrefix < newVal.length &&
      oldVal[commonPrefix] === newVal[commonPrefix]
    ) {
      commonPrefix++;
    }

    const backspacesNeeded = oldVal.length - commonPrefix;
    const addedChars = newVal.slice(commonPrefix);

    if (backspacesNeeded > 0) {
      for (let i = 0; i < backspacesNeeded; i++) {
        sendCommand('k backspace');
      }
    }

    if (addedChars.length > 0) {
      sendCommand('text ' + addedChars);
    }

    lastValRef.current = newVal;
    setInputText(newVal);

    // Keep buffer manageable without breaking active composition
    if (newVal.length > 80) {
      setTimeout(() => {
        setInputText('');
        lastValRef.current = '';
      }, 60);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Backspace' && (!inputText || inputText.length === 0)) {
      e.preventDefault();
      triggerHaptic([15]);
      sendCommand('k backspace');
    } else if (e.key === 'Enter') {
      e.preventDefault();
      triggerHaptic([20]);
      sendCommand('k enter');
      setInputText('');
      lastValRef.current = '';
    } else if (e.key === 'Tab') {
      e.preventDefault();
      triggerHaptic([15]);
      sendCommand('k tab');
    } else if (e.key === 'Escape') {
      e.preventDefault();
      triggerHaptic([15]);
      sendCommand('k esc');
    }
  };

  // Add Custom Macro
  const handleAddCustomMacro = (e) => {
    e.preventDefault();
    if (!newMacroLabel.trim()) return;

    let finalCmd = '';
    let hintText = '';

    if (newMacroType === 'hotkey') {
      const cleanKeys = newMacroCommand.trim().toLowerCase().replace(/\+/g, ' ');
      finalCmd = `combo ${cleanKeys}`;
      hintText = newMacroCommand.trim().toUpperCase();
    } else if (newMacroType === 'text') {
      finalCmd = `type:${newMacroCommand.trim()}`;
      hintText = 'Ketik teks otomatis';
    } else if (newMacroType === 'lock') {
      finalCmd = 'lock';
      hintText = 'Lock Workstation';
    }

    const newMacro = {
      id: 'm_' + Date.now(),
      label: newMacroLabel.trim(),
      hint: hintText,
      cmd: finalCmd,
      color: newMacroColor
    };

    setCustomMacros([...customMacros, newMacro]);
    setNewMacroLabel('');
    setNewMacroCommand('');
    setIsAddingMacro(false);
    triggerHaptic([30]);
  };

  const handleDeleteCustomMacro = (id) => {
    triggerHaptic([25]);
    setCustomMacros(customMacros.filter((m) => m.id !== id));
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200 select-none font-sans"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="apple-card border border-black/10 dark:border-white/10 rounded-3xl w-full max-w-lg max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-ios-sheet smooth-gpu"
      >
        {/* 1. Header Bar */}
        <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-b border-black/8 dark:border-white/10 bg-black/3 dark:bg-white/3 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-emerald-500 to-blue-500 text-white shadow-xs">
              <MousePointer className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-white truncate">
                  Remote Mouse, Keyboard & MacroPad
                </h3>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              </div>
              <p className="text-[10px] sm:text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
                Terkoneksi ke: <span className="text-[#0071e3] font-semibold">{targetPeer?.name || 'PC'}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {/* Toggle Sensitivity Slider */}
            <button
              onClick={() => setShowSensitivitySlider(!showSensitivitySlider)}
              className={`p-2 rounded-full transition cursor-pointer ${
                showSensitivitySlider
                  ? 'bg-[#0071e3]/15 text-[#0071e3]'
                  : 'text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10'
              }`}
              title="Atur Sensitivitas Mouse"
            >
              <Sliders className="w-4 h-4" />
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-2 text-zinc-400 hover:text-zinc-900 dark:hover:text-white rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Sensitivity Popover (Optional) */}
        {showSensitivitySlider && (
          <div className="px-5 py-2.5 bg-black/5 dark:bg-white/5 border-b border-black/8 dark:border-white/10 flex items-center justify-between gap-3 text-xs shrink-0 animate-in fade-in">
            <span className="text-zinc-600 dark:text-zinc-300 font-medium">Sensitivitas Kursor:</span>
            <div className="flex items-center gap-2 flex-1 max-w-[200px]">
              <span className="text-[10px] text-zinc-400">1.0x</span>
              <input
                type="range"
                min="0.8"
                max="2.4"
                step="0.1"
                value={sensitivity}
                onChange={(e) => setSensitivity(parseFloat(e.target.value))}
                className="w-full accent-[#0071e3] cursor-pointer"
              />
              <span className="text-[10px] text-zinc-400 font-mono">{sensitivity.toFixed(1)}x</span>
            </div>
          </div>
        )}

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto no-scrollbar p-3 sm:p-4 flex flex-col gap-3.5">
          {/* ============================================================== */}
          {/* SECTION A: DI ATASNYA ADA MOUSEPAD (Touchpad Surface on Top)   */}
          {/* ============================================================== */}
          <div className="flex flex-col gap-2 shrink-0">
            {/* Smooth Touch Surface */}
            <div
              ref={touchAreaRef}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              className="h-44 sm:h-52 rounded-2xl bg-black/4 dark:bg-white/5 border border-black/8 dark:border-white/10 flex flex-col items-center justify-center text-center p-4 relative overflow-hidden cursor-crosshair active:border-[#0071e3] transition-colors shadow-inner"
              style={{ touchAction: 'none' }}
            >
              {/* Subtle tactile grid lines */}
              <div className="absolute inset-0 opacity-[0.035] bg-[radial-gradient(#000_1.5px,transparent_1.5px)] dark:bg-[radial-gradient(#fff_1.5px,transparent_1.5px)] [background-size:18px_18px]" />
              <MousePointer className="w-8 h-8 text-zinc-400 dark:text-zinc-500 mb-1.5 pointer-events-none" />
              <p className="text-xs text-zinc-700 dark:text-zinc-300 font-semibold pointer-events-none">
                Mousepad Sentuh Presisi PC
              </p>
              <p className="text-[10px] sm:text-[11px] text-zinc-500 dark:text-zinc-400 pointer-events-none mt-0.5">
                1 Jari: Gerak & Klik • 2 Jari: Scroll Layar & Klik Kanan
              </p>
            </div>

            {/* Mouse Click Buttons Bar */}
            <div className="grid grid-cols-4 gap-1.5 h-12 shrink-0">
              {/* Klik Kiri */}
              <button
                onClick={() => {
                  triggerHaptic([20]);
                  sendCommand('c left');
                }}
                className="col-span-2 rounded-xl bg-black/4 dark:bg-white/6 hover:bg-black/8 dark:hover:bg-white/10 border border-black/8 dark:border-white/10 text-zinc-900 dark:text-white font-medium text-xs transition cursor-pointer flex flex-col items-center justify-center active:scale-98"
              >
                <span className="font-semibold">Klik Kiri</span>
                <span className="text-[9px] text-zinc-500 dark:text-zinc-400">Left Click</span>
              </button>

              {/* Drag Lock Toggle */}
              <button
                onClick={toggleDrag}
                className={`rounded-xl border font-medium text-xs transition cursor-pointer flex flex-col items-center justify-center active:scale-98 ${
                  isDragging
                    ? 'bg-amber-500 text-black border-amber-400 font-bold shadow'
                    : 'bg-black/4 dark:bg-white/6 hover:bg-black/8 dark:hover:bg-white/10 border-black/8 dark:border-white/10 text-zinc-700 dark:text-zinc-300'
                }`}
                title={isDragging ? 'Lepas Drag' : 'Tahan Drag'}
              >
                <span className="font-semibold">{isDragging ? 'Dragging' : 'Drag'}</span>
                <span className="text-[9px] opacity-75">{isDragging ? 'Lepas' : 'Tahan'}</span>
              </button>

              {/* Klik Kanan */}
              <button
                onClick={() => {
                  triggerHaptic([20]);
                  sendCommand('c right');
                }}
                className="rounded-xl bg-black/4 dark:bg-white/6 hover:bg-black/8 dark:hover:bg-white/10 border border-black/8 dark:border-white/10 text-zinc-900 dark:text-white font-medium text-xs transition cursor-pointer flex flex-col items-center justify-center active:scale-98"
              >
                <span className="font-semibold">Klik Kanan</span>
                <span className="text-[9px] text-zinc-500 dark:text-zinc-400">Right Click</span>
              </button>
            </div>
          </div>

          {/* ============================================================== */}
          {/* SECTION B: REALTIME KEYBOARD & PC CONTROLS                    */}
          {/* ============================================================== */}
          <div className="flex flex-col gap-2.5 bg-black/[0.03] dark:bg-white/[0.04] p-3 sm:p-3.5 rounded-2xl border border-black/8 dark:border-white/10 shrink-0">
            {/* Realtime Status Bar & Mobile Keyboard Trigger */}
            <div className="flex items-center justify-between gap-2 px-0.5">
              <div className="flex items-center gap-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                  Keyboard Realtime PC
                </span>
                <span className="text-[10px] text-zinc-500 dark:text-zinc-400 hidden sm:inline">
                  • Input langsung masuk ke PC
                </span>
              </div>

              <button
                type="button"
                onClick={() => {
                  triggerHaptic([15]);
                  inputRef.current?.focus();
                }}
                className="px-2.5 py-1 rounded-lg bg-[#0071e3]/10 hover:bg-[#0071e3]/15 text-[#0071e3] text-[11px] font-medium flex items-center gap-1 transition active:scale-95 cursor-pointer"
                title="Buka atau fokuskan Keyboard"
              >
                <Keyboard className="w-3.5 h-3.5" />
                <span>Buka Keyboard</span>
              </button>
            </div>

            {/* Direct Realtime Input Field */}
            <div
              onClick={() => inputRef.current?.focus()}
              className={`relative flex items-center bg-white dark:bg-zinc-800/90 border rounded-xl px-3 py-2 transition-all cursor-text shadow-xs ${
                isKeyboardFocused
                  ? 'border-[#0071e3] ring-2 ring-[#0071e3]/20'
                  : 'border-black/10 dark:border-white/12 hover:border-black/20 dark:hover:border-white/20'
              }`}
            >
              <Keyboard className="w-4 h-4 text-zinc-400 mr-2 shrink-0" />
              <input
                ref={inputRef}
                autoFocus
                type="text"
                value={inputText}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                onFocus={() => setIsKeyboardFocused(true)}
                onBlur={() => setIsKeyboardFocused(false)}
                placeholder="Ketik langsung (teks, simbol, dikte suara)..."
                className="w-full bg-transparent border-none text-xs sm:text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none"
                autoCapitalize="none"
                autoComplete="off"
                autoCorrect="off"
                spellCheck="false"
              />
              {inputText && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setInputText('');
                    lastValRef.current = '';
                    inputRef.current?.focus();
                  }}
                  className="p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-md shrink-0 cursor-pointer"
                  title="Hapus Buffer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Quick Actions & Navigation Ribbon (ENTER PC Prominent) */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
              {/* 1. ENTER PC (HIGHLIGHTED & PROMINENT) */}
              <button
                onClick={() => {
                  triggerHaptic([25]);
                  sendCommand('k enter');
                  setInputText('');
                  lastValRef.current = '';
                }}
                className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-[#0071e3] hover:from-blue-500 hover:to-[#0077ed] active:from-blue-700 active:to-blue-600 text-white font-bold text-xs shadow-md flex items-center gap-1.5 transition cursor-pointer shrink-0 active:scale-95"
                title="Tekan ENTER di PC"
              >
                <CornerDownLeft className="w-3.5 h-3.5" />
                <span>ENTER PC</span>
              </button>

              {/* Spasi */}
              <button
                onClick={() => {
                  triggerHaptic([15]);
                  sendCommand('k space');
                  setInputText((prev) => prev + ' ');
                  lastValRef.current += ' ';
                }}
                className="px-3 py-2 rounded-xl bg-black/5 dark:bg-white/8 hover:bg-black/10 dark:hover:bg-white/12 text-zinc-700 dark:text-zinc-300 font-medium text-xs border border-black/8 dark:border-white/10 cursor-pointer shrink-0 active:scale-95 transition flex items-center gap-1"
                title="Tekan Spasi di PC"
              >
                <Space className="w-3.5 h-3.5" />
                <span>Spasi</span>
              </button>

              {/* Backspace */}
              <button
                onClick={() => {
                  triggerHaptic([15]);
                  sendCommand('k backspace');
                  setInputText((prev) => {
                    const updated = prev.slice(0, -1);
                    lastValRef.current = updated;
                    return updated;
                  });
                }}
                className="px-2.5 py-2 rounded-xl bg-black/5 dark:bg-white/8 hover:bg-black/10 dark:hover:bg-white/12 text-amber-600 dark:text-amber-400 font-medium text-xs border border-black/8 dark:border-white/10 cursor-pointer shrink-0 active:scale-95 transition flex items-center gap-1"
                title="Hapus Karakter"
              >
                <Delete className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>

              {/* Tab */}
              <button
                onClick={() => handleKeyClick('tab')}
                className="px-2.5 py-2 rounded-xl bg-black/5 dark:bg-white/8 hover:bg-black/10 dark:hover:bg-white/12 text-zinc-700 dark:text-zinc-300 font-mono font-medium text-xs border border-black/8 dark:border-white/10 cursor-pointer shrink-0 active:scale-95 transition"
              >
                Tab
              </button>

              {/* Esc */}
              <button
                onClick={() => handleKeyClick('esc')}
                className="px-2.5 py-2 rounded-xl bg-black/5 dark:bg-white/8 hover:bg-black/10 dark:hover:bg-white/12 text-zinc-700 dark:text-zinc-300 font-mono font-medium text-xs border border-black/8 dark:border-white/10 cursor-pointer shrink-0 active:scale-95 transition"
              >
                Esc
              </button>

              {/* Win */}
              <button
                onClick={() => handleKeyClick('win')}
                className="px-2.5 py-2 rounded-xl bg-black/5 dark:bg-white/8 hover:bg-black/10 dark:hover:bg-white/12 text-zinc-700 dark:text-zinc-300 font-mono font-medium text-xs border border-black/8 dark:border-white/10 cursor-pointer shrink-0 active:scale-95 transition"
              >
                Win
              </button>

              {/* Del */}
              <button
                onClick={() => handleKeyClick('del')}
                className="px-2.5 py-2 rounded-xl bg-black/5 dark:bg-white/8 hover:bg-black/10 dark:hover:bg-white/12 text-red-600 dark:text-red-400 font-mono font-medium text-xs border border-black/8 dark:border-white/10 cursor-pointer shrink-0 active:scale-95 transition"
              >
                Del
              </button>

              {/* Arrow Keys */}
              <div className="flex items-center gap-1 bg-black/5 dark:bg-white/8 p-0.5 rounded-xl border border-black/8 dark:border-white/10 shrink-0">
                <button
                  onClick={() => handleKeyClick('up')}
                  className="p-1.5 rounded-lg hover:bg-black/10 dark:hover:bg-white/12 active:scale-90 text-zinc-700 dark:text-zinc-300 cursor-pointer"
                >
                  <ArrowUp className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleKeyClick('down')}
                  className="p-1.5 rounded-lg hover:bg-black/10 dark:hover:bg-white/12 active:scale-90 text-zinc-700 dark:text-zinc-300 cursor-pointer"
                >
                  <ArrowDown className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleKeyClick('left')}
                  className="p-1.5 rounded-lg hover:bg-black/10 dark:hover:bg-white/12 active:scale-90 text-zinc-700 dark:text-zinc-300 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleKeyClick('right')}
                  className="p-1.5 rounded-lg hover:bg-black/10 dark:hover:bg-white/12 active:scale-90 text-zinc-700 dark:text-zinc-300 cursor-pointer"
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Combos */}
              <button
                onClick={() => handleComboClick('ctrl', 'c')}
                className="px-2.5 py-2 rounded-xl bg-black/5 dark:bg-white/8 hover:bg-black/10 dark:hover:bg-white/12 text-zinc-700 dark:text-zinc-300 font-mono font-medium text-xs border border-black/8 dark:border-white/10 cursor-pointer shrink-0 active:scale-95 transition"
              >
                Ctrl+C
              </button>
              <button
                onClick={() => handleComboClick('ctrl', 'v')}
                className="px-2.5 py-2 rounded-xl bg-black/5 dark:bg-white/8 hover:bg-black/10 dark:hover:bg-white/12 text-zinc-700 dark:text-zinc-300 font-mono font-medium text-xs border border-black/8 dark:border-white/10 cursor-pointer shrink-0 active:scale-95 transition"
              >
                Ctrl+V
              </button>
              <button
                onClick={() => handleComboClick('ctrl', 'z')}
                className="px-2.5 py-2 rounded-xl bg-black/5 dark:bg-white/8 hover:bg-black/10 dark:hover:bg-white/12 text-zinc-700 dark:text-zinc-300 font-mono font-medium text-xs border border-black/8 dark:border-white/10 cursor-pointer shrink-0 active:scale-95 transition"
              >
                Ctrl+Z
              </button>
              <button
                onClick={() => handleComboClick('alt', 'tab')}
                className="px-2.5 py-2 rounded-xl bg-black/5 dark:bg-white/8 hover:bg-black/10 dark:hover:bg-white/12 text-zinc-700 dark:text-zinc-300 font-mono font-medium text-xs border border-black/8 dark:border-white/10 cursor-pointer shrink-0 active:scale-95 transition"
              >
                Alt+Tab
              </button>
            </div>
          </div>

          {/* ============================================================== */}
          {/* SECTION C: SATUKAN MACROPAD (MacroPad Deck & Actions)          */}
          {/* ============================================================== */}
          <div className="flex flex-col gap-2.5">
            {/* Category Segmented Tabs */}
            <div className="grid grid-cols-5 gap-1 p-1 rounded-2xl bg-black/5 dark:bg-white/6 border border-black/5 dark:border-white/5 text-[11px] font-medium">
              <button
                onClick={() => setActiveMacroTab('windows')}
                className={`py-1.5 rounded-xl transition cursor-pointer text-center truncate ${
                  activeMacroTab === 'windows'
                    ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-xs font-bold'
                    : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                }`}
              >
                Windows
              </button>
              <button
                onClick={() => setActiveMacroTab('media')}
                className={`py-1.5 rounded-xl transition cursor-pointer text-center truncate ${
                  activeMacroTab === 'media'
                    ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-xs font-bold'
                    : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                }`}
              >
                Media
              </button>
              <button
                onClick={() => setActiveMacroTab('browser')}
                className={`py-1.5 rounded-xl transition cursor-pointer text-center truncate ${
                  activeMacroTab === 'browser'
                    ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-xs font-bold'
                    : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                }`}
              >
                Browser
              </button>
              <button
                onClick={() => setActiveMacroTab('numpad')}
                className={`py-1.5 rounded-xl transition cursor-pointer text-center truncate ${
                  activeMacroTab === 'numpad'
                    ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-xs font-bold'
                    : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                }`}
              >
                Numpad
              </button>
              <button
                onClick={() => setActiveMacroTab('custom')}
                className={`py-1.5 rounded-xl transition cursor-pointer text-center truncate ${
                  activeMacroTab === 'custom'
                    ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-xs font-bold'
                    : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                }`}
              >
                Custom
              </button>
            </div>

            {/* TAB 1: WINDOWS & SYSTEM MACROS */}
            {activeMacroTab === 'windows' && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 animate-in fade-in">
                <button
                  onClick={() => handleComboClick('win', 'd')}
                  className="p-3 rounded-2xl bg-black/3 dark:bg-white/5 hover:bg-black/6 dark:hover:bg-white/8 border border-black/8 dark:border-white/10 text-left transition cursor-pointer active:scale-95 flex flex-col justify-between h-20 shadow-xs"
                >
                  <Monitor className="w-5 h-5 text-blue-500" />
                  <div>
                    <span className="text-xs font-semibold text-zinc-900 dark:text-white block">Desktop</span>
                    <span className="text-[10px] text-zinc-500 font-mono">Win + D</span>
                  </div>
                </button>

                <button
                  onClick={() => handleComboClick('win', 'tab')}
                  className="p-3 rounded-2xl bg-black/3 dark:bg-white/5 hover:bg-black/6 dark:hover:bg-white/8 border border-black/8 dark:border-white/10 text-left transition cursor-pointer active:scale-95 flex flex-col justify-between h-20 shadow-xs"
                >
                  <LayoutGrid className="w-5 h-5 text-purple-500" />
                  <div>
                    <span className="text-xs font-semibold text-zinc-900 dark:text-white block">Task View</span>
                    <span className="text-[10px] text-zinc-500 font-mono">Win + Tab</span>
                  </div>
                </button>

                <button
                  onClick={() => {
                    triggerHaptic([25]);
                    sendCommand('lock');
                  }}
                  className="p-3 rounded-2xl bg-black/3 dark:bg-white/5 hover:bg-black/6 dark:hover:bg-white/8 border border-black/8 dark:border-white/10 text-left transition cursor-pointer active:scale-95 flex flex-col justify-between h-20 shadow-xs"
                >
                  <Lock className="w-5 h-5 text-amber-500" />
                  <div>
                    <span className="text-xs font-semibold text-zinc-900 dark:text-white block">Kunci PC</span>
                    <span className="text-[10px] text-zinc-500 font-mono">Lock Screen</span>
                  </div>
                </button>

                <button
                  onClick={() => handleComboClick('win', 'e')}
                  className="p-3 rounded-2xl bg-black/3 dark:bg-white/5 hover:bg-black/6 dark:hover:bg-white/8 border border-black/8 dark:border-white/10 text-left transition cursor-pointer active:scale-95 flex flex-col justify-between h-20 shadow-xs"
                >
                  <Folder className="w-5 h-5 text-amber-500" />
                  <div>
                    <span className="text-xs font-semibold text-zinc-900 dark:text-white block">Explorer</span>
                    <span className="text-[10px] text-zinc-500 font-mono">Win + E</span>
                  </div>
                </button>

                <button
                  onClick={() => handleComboClick('ctrl shift', 'escape')}
                  className="p-3 rounded-2xl bg-black/3 dark:bg-white/5 hover:bg-black/6 dark:hover:bg-white/8 border border-black/8 dark:border-white/10 text-left transition cursor-pointer active:scale-95 flex flex-col justify-between h-20 shadow-xs"
                >
                  <Terminal className="w-5 h-5 text-emerald-500" />
                  <div>
                    <span className="text-xs font-semibold text-zinc-900 dark:text-white block">Task Manager</span>
                    <span className="text-[10px] text-zinc-500 font-mono">Ctrl+Shift+Esc</span>
                  </div>
                </button>

                <button
                  onClick={() => handleComboClick('win shift', 's')}
                  className="p-3 rounded-2xl bg-black/3 dark:bg-white/5 hover:bg-black/6 dark:hover:bg-white/8 border border-black/8 dark:border-white/10 text-left transition cursor-pointer active:scale-95 flex flex-col justify-between h-20 shadow-xs"
                >
                  <Scissors className="w-5 h-5 text-sky-500" />
                  <div>
                    <span className="text-xs font-semibold text-zinc-900 dark:text-white block">Screenshot</span>
                    <span className="text-[10px] text-zinc-500 font-mono">Win+Shift+S</span>
                  </div>
                </button>

                <button
                  onClick={() => handleComboClick('alt', 'f4')}
                  className="p-3 rounded-2xl bg-black/3 dark:bg-white/5 hover:bg-black/6 dark:hover:bg-white/8 border border-black/8 dark:border-white/10 text-left transition cursor-pointer active:scale-95 flex flex-col justify-between h-20 shadow-xs"
                >
                  <X className="w-5 h-5 text-red-500" />
                  <div>
                    <span className="text-xs font-semibold text-zinc-900 dark:text-white block">Tutup App</span>
                    <span className="text-[10px] text-zinc-500 font-mono">Alt + F4</span>
                  </div>
                </button>

                <button
                  onClick={() => handleComboClick('win', 'r')}
                  className="p-3 rounded-2xl bg-black/3 dark:bg-white/5 hover:bg-black/6 dark:hover:bg-white/8 border border-black/8 dark:border-white/10 text-left transition cursor-pointer active:scale-95 flex flex-col justify-between h-20 shadow-xs"
                >
                  <Play className="w-5 h-5 text-indigo-500" />
                  <div>
                    <span className="text-xs font-semibold text-zinc-900 dark:text-white block">Run Dialog</span>
                    <span className="text-[10px] text-zinc-500 font-mono">Win + R</span>
                  </div>
                </button>
              </div>
            )}

            {/* TAB 2: MEDIA & VOLUME MACROS */}
            {activeMacroTab === 'media' && (
              <div className="flex flex-col gap-2.5 animate-in fade-in">
                {/* Volume Row */}
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => handleMediaClick('voldown')}
                    className="p-3 rounded-2xl bg-black/3 dark:bg-white/5 hover:bg-black/6 dark:hover:bg-white/8 border border-black/8 dark:border-white/10 flex flex-col items-center justify-center gap-1 cursor-pointer active:scale-95 transition"
                  >
                    <Volume1 className="w-5 h-5 text-zinc-600 dark:text-zinc-300" />
                    <span className="text-xs font-semibold text-zinc-900 dark:text-white">Volume -</span>
                  </button>
                  <button
                    onClick={() => handleMediaClick('mute')}
                    className="p-3 rounded-2xl bg-black/3 dark:bg-white/5 hover:bg-black/6 dark:hover:bg-white/8 border border-black/8 dark:border-white/10 flex flex-col items-center justify-center gap-1 cursor-pointer active:scale-95 transition"
                  >
                    <VolumeX className="w-5 h-5 text-amber-500" />
                    <span className="text-xs font-semibold text-zinc-900 dark:text-white">Mute</span>
                  </button>
                  <button
                    onClick={() => handleMediaClick('volup')}
                    className="p-3 rounded-2xl bg-black/3 dark:bg-white/5 hover:bg-black/6 dark:hover:bg-white/8 border border-black/8 dark:border-white/10 flex flex-col items-center justify-center gap-1 cursor-pointer active:scale-95 transition"
                  >
                    <Volume2 className="w-5 h-5 text-zinc-600 dark:text-zinc-300" />
                    <span className="text-xs font-semibold text-zinc-900 dark:text-white">Volume +</span>
                  </button>
                </div>

                {/* Playback Controls */}
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => handleMediaClick('prev')}
                    className="p-3.5 rounded-2xl bg-black/3 dark:bg-white/5 hover:bg-black/6 dark:hover:bg-white/8 border border-black/8 dark:border-white/10 flex items-center justify-center cursor-pointer active:scale-95 transition"
                  >
                    <SkipBack className="w-5 h-5 text-zinc-700 dark:text-zinc-300" />
                  </button>
                  <button
                    onClick={() => handleMediaClick('playpause')}
                    className="p-3.5 rounded-2xl bg-[#0071e3] hover:bg-[#0077ed] text-white flex items-center justify-center cursor-pointer active:scale-95 transition shadow-md"
                  >
                    <Play className="w-5 h-5 fill-white" />
                  </button>
                  <button
                    onClick={() => handleMediaClick('next')}
                    className="p-3.5 rounded-2xl bg-black/3 dark:bg-white/5 hover:bg-black/6 dark:hover:bg-white/8 border border-black/8 dark:border-white/10 flex items-center justify-center cursor-pointer active:scale-95 transition"
                  >
                    <SkipForward className="w-5 h-5 text-zinc-700 dark:text-zinc-300" />
                  </button>
                </div>
              </div>
            )}

            {/* TAB 3: BROWSER & TABS */}
            {activeMacroTab === 'browser' && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 animate-in fade-in">
                <button
                  onClick={() => handleComboClick('ctrl', 't')}
                  className="p-3 rounded-2xl bg-black/3 dark:bg-white/5 hover:bg-black/6 dark:hover:bg-white/8 border border-black/8 dark:border-white/10 text-left transition cursor-pointer active:scale-95 flex flex-col justify-between h-20 shadow-xs"
                >
                  <Globe className="w-5 h-5 text-blue-500" />
                  <div>
                    <span className="text-xs font-semibold text-zinc-900 dark:text-white block">Tab Baru</span>
                    <span className="text-[10px] text-zinc-500 font-mono">Ctrl + T</span>
                  </div>
                </button>

                <button
                  onClick={() => handleComboClick('ctrl', 'w')}
                  className="p-3 rounded-2xl bg-black/3 dark:bg-white/5 hover:bg-black/6 dark:hover:bg-white/8 border border-black/8 dark:border-white/10 text-left transition cursor-pointer active:scale-95 flex flex-col justify-between h-20 shadow-xs"
                >
                  <X className="w-5 h-5 text-red-500" />
                  <div>
                    <span className="text-xs font-semibold text-zinc-900 dark:text-white block">Tutup Tab</span>
                    <span className="text-[10px] text-zinc-500 font-mono">Ctrl + W</span>
                  </div>
                </button>

                <button
                  onClick={() => handleComboClick('ctrl shift', 't')}
                  className="p-3 rounded-2xl bg-black/3 dark:bg-white/5 hover:bg-black/6 dark:hover:bg-white/8 border border-black/8 dark:border-white/10 text-left transition cursor-pointer active:scale-95 flex flex-col justify-between h-20 shadow-xs"
                >
                  <RefreshCw className="w-5 h-5 text-emerald-500" />
                  <div>
                    <span className="text-xs font-semibold text-zinc-900 dark:text-white block">Restore Tab</span>
                    <span className="text-[10px] text-zinc-500 font-mono">Ctrl+Shift+T</span>
                  </div>
                </button>

                <button
                  onClick={() => handleKeyClick('f5')}
                  className="p-3 rounded-2xl bg-black/3 dark:bg-white/5 hover:bg-black/6 dark:hover:bg-white/8 border border-black/8 dark:border-white/10 text-left transition cursor-pointer active:scale-95 flex flex-col justify-between h-20 shadow-xs"
                >
                  <RefreshCw className="w-5 h-5 text-sky-500" />
                  <div>
                    <span className="text-xs font-semibold text-zinc-900 dark:text-white block">Refresh</span>
                    <span className="text-[10px] text-zinc-500 font-mono">F5</span>
                  </div>
                </button>

                <button
                  onClick={() => handleKeyClick('f12')}
                  className="p-3 rounded-2xl bg-black/3 dark:bg-white/5 hover:bg-black/6 dark:hover:bg-white/8 border border-black/8 dark:border-white/10 text-left transition cursor-pointer active:scale-95 flex flex-col justify-between h-20 shadow-xs"
                >
                  <Terminal className="w-5 h-5 text-indigo-500" />
                  <div>
                    <span className="text-xs font-semibold text-zinc-900 dark:text-white block">DevTools</span>
                    <span className="text-[10px] text-zinc-500 font-mono">F12</span>
                  </div>
                </button>

                <button
                  onClick={() => handleComboClick('ctrl', 'f')}
                  className="p-3 rounded-2xl bg-black/3 dark:bg-white/5 hover:bg-black/6 dark:hover:bg-white/8 border border-black/8 dark:border-white/10 text-left transition cursor-pointer active:scale-95 flex flex-col justify-between h-20 shadow-xs"
                >
                  <AppWindow className="w-5 h-5 text-purple-500" />
                  <div>
                    <span className="text-xs font-semibold text-zinc-900 dark:text-white block">Cari di Hal</span>
                    <span className="text-[10px] text-zinc-500 font-mono">Ctrl + F</span>
                  </div>
                </button>

                <button
                  onClick={() => handleComboClick('ctrl', 'add')}
                  className="p-3 rounded-2xl bg-black/3 dark:bg-white/5 hover:bg-black/6 dark:hover:bg-white/8 border border-black/8 dark:border-white/10 text-left transition cursor-pointer active:scale-95 flex flex-col justify-between h-20 shadow-xs"
                >
                  <Plus className="w-5 h-5 text-zinc-500" />
                  <div>
                    <span className="text-xs font-semibold text-zinc-900 dark:text-white block">Zoom In</span>
                    <span className="text-[10px] text-zinc-500 font-mono">Ctrl + Plus</span>
                  </div>
                </button>

                <button
                  onClick={() => handleComboClick('ctrl', 'subtract')}
                  className="p-3 rounded-2xl bg-black/3 dark:bg-white/5 hover:bg-black/6 dark:hover:bg-white/8 border border-black/8 dark:border-white/10 text-left transition cursor-pointer active:scale-95 flex flex-col justify-between h-20 shadow-xs"
                >
                  <span className="text-lg font-bold text-zinc-500 leading-none">-</span>
                  <div>
                    <span className="text-xs font-semibold text-zinc-900 dark:text-white block">Zoom Out</span>
                    <span className="text-[10px] text-zinc-500 font-mono">Ctrl + Minus</span>
                  </div>
                </button>
              </div>
            )}

            {/* TAB 4: NUMPAD (ANGKA) */}
            {activeMacroTab === 'numpad' && (
              <div className="flex flex-col gap-1.5 max-w-xs mx-auto w-full animate-in fade-in">
                {/* Row 1 */}
                <div className="grid grid-cols-4 gap-1.5">
                  <button
                    onClick={() => handleKeyClick('esc')}
                    className="py-2.5 rounded-xl bg-black/5 dark:bg-white/8 hover:bg-black/10 text-zinc-700 dark:text-zinc-300 font-semibold text-xs border border-black/8 dark:border-white/10 cursor-pointer active:scale-95 transition"
                  >
                    ESC
                  </button>
                  <button
                    onClick={() => handleKeyClick('tab')}
                    className="py-2.5 rounded-xl bg-black/5 dark:bg-white/8 hover:bg-black/10 text-zinc-700 dark:text-zinc-300 font-semibold text-xs border border-black/8 dark:border-white/10 cursor-pointer active:scale-95 transition"
                  >
                    TAB
                  </button>
                  <button
                    onClick={() => handleKeyClick('back')}
                    className="py-2.5 rounded-xl bg-black/5 dark:bg-white/8 hover:bg-black/10 text-amber-500 font-semibold text-xs border border-black/8 dark:border-white/10 cursor-pointer active:scale-95 transition flex items-center justify-center"
                  >
                    <Delete className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleKeyClick('divide')}
                    className="py-2.5 rounded-xl bg-black/5 dark:bg-white/8 hover:bg-black/10 text-zinc-700 dark:text-zinc-300 font-semibold text-sm border border-black/8 dark:border-white/10 cursor-pointer active:scale-95 transition"
                  >
                    ÷
                  </button>
                </div>

                {/* Row 2 */}
                <div className="grid grid-cols-4 gap-1.5">
                  {['7', '8', '9'].map((n) => (
                    <button
                      key={n}
                      onClick={() => handleKeyClick(`num${n}`)}
                      className="py-3 rounded-xl bg-white dark:bg-white/10 hover:bg-zinc-100 dark:hover:bg-white/14 text-zinc-900 dark:text-white font-semibold text-base border border-black/8 dark:border-white/10 cursor-pointer active:scale-95 transition shadow-xs"
                    >
                      {n}
                    </button>
                  ))}
                  <button
                    onClick={() => handleKeyClick('multiply')}
                    className="py-3 rounded-xl bg-black/5 dark:bg-white/8 hover:bg-black/10 text-zinc-700 dark:text-zinc-300 font-semibold text-sm border border-black/8 dark:border-white/10 cursor-pointer active:scale-95 transition"
                  >
                    ×
                  </button>
                </div>

                {/* Row 3 */}
                <div className="grid grid-cols-4 gap-1.5">
                  {['4', '5', '6'].map((n) => (
                    <button
                      key={n}
                      onClick={() => handleKeyClick(`num${n}`)}
                      className="py-3 rounded-xl bg-white dark:bg-white/10 hover:bg-zinc-100 dark:hover:bg-white/14 text-zinc-900 dark:text-white font-semibold text-base border border-black/8 dark:border-white/10 cursor-pointer active:scale-95 transition shadow-xs"
                    >
                      {n}
                    </button>
                  ))}
                  <button
                    onClick={() => handleKeyClick('minus')}
                    className="py-3 rounded-xl bg-black/5 dark:bg-white/8 hover:bg-black/10 text-zinc-700 dark:text-zinc-300 font-semibold text-sm border border-black/8 dark:border-white/10 cursor-pointer active:scale-95 transition"
                  >
                    -
                  </button>
                </div>

                {/* Row 4 */}
                <div className="grid grid-cols-4 gap-1.5">
                  {['1', '2', '3'].map((n) => (
                    <button
                      key={n}
                      onClick={() => handleKeyClick(`num${n}`)}
                      className="py-3 rounded-xl bg-white dark:bg-white/10 hover:bg-zinc-100 dark:hover:bg-white/14 text-zinc-900 dark:text-white font-semibold text-base border border-black/8 dark:border-white/10 cursor-pointer active:scale-95 transition shadow-xs"
                    >
                      {n}
                    </button>
                  ))}
                  <button
                    onClick={() => handleKeyClick('plus')}
                    className="py-3 rounded-xl bg-black/5 dark:bg-white/8 hover:bg-black/10 text-zinc-700 dark:text-zinc-300 font-semibold text-sm border border-black/8 dark:border-white/10 cursor-pointer active:scale-95 transition"
                  >
                    +
                  </button>
                </div>

                {/* Row 5 with ENTER PC */}
                <div className="grid grid-cols-4 gap-1.5">
                  <button
                    onClick={() => handleKeyClick('num0')}
                    className="col-span-2 py-3 rounded-xl bg-white dark:bg-white/10 hover:bg-zinc-100 dark:hover:bg-white/14 text-zinc-900 dark:text-white font-semibold text-base border border-black/8 dark:border-white/10 cursor-pointer active:scale-95 transition shadow-xs"
                  >
                    0
                  </button>
                  <button
                    onClick={() => handleKeyClick('decimal')}
                    className="py-3 rounded-xl bg-white dark:bg-white/10 hover:bg-zinc-100 dark:hover:bg-white/14 text-zinc-900 dark:text-white font-semibold text-base border border-black/8 dark:border-white/10 cursor-pointer active:scale-95 transition shadow-xs"
                  >
                    .
                  </button>
                  <button
                    onClick={() => handleKeyClick('enter')}
                    className="py-3 rounded-xl bg-[#0071e3] hover:bg-[#0077ed] text-white font-bold text-xs cursor-pointer active:scale-95 transition flex items-center justify-center shadow-xs"
                    title="Enter PC"
                  >
                    <CornerDownLeft className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* TAB 5: CUSTOM MACROPAD */}
            {activeMacroTab === 'custom' && (
              <div className="flex flex-col gap-2.5 animate-in fade-in">
                {/* List of Custom Macros */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {customMacros.map((macro) => (
                    <div
                      key={macro.id}
                      className="group relative p-3 rounded-2xl bg-black/3 dark:bg-white/5 hover:bg-black/6 dark:hover:bg-white/8 border border-black/8 dark:border-white/10 flex flex-col justify-between h-20 transition shadow-xs"
                    >
                      <button
                        onClick={() => {
                          triggerHaptic([25]);
                          sendCommand(macro.cmd);
                        }}
                        className="w-full h-full text-left flex flex-col justify-between cursor-pointer active:scale-95"
                      >
                        <div className="flex items-center justify-between">
                          <Sparkles className="w-4 h-4 text-purple-500" />
                        </div>
                        <div>
                          <span className="text-xs font-semibold text-zinc-900 dark:text-white block truncate">
                            {macro.label}
                          </span>
                          <span className="text-[10px] text-zinc-500 font-mono truncate block">
                            {macro.hint || macro.cmd}
                          </span>
                        </div>
                      </button>

                      {/* Delete Macro Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteCustomMacro(macro.id);
                        }}
                        className="absolute top-2 right-2 p-1 text-zinc-400 hover:text-red-500 rounded-md transition opacity-0 group-hover:opacity-100 cursor-pointer"
                        title="Hapus Makro"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}

                  {/* Add Macro Button */}
                  <button
                    onClick={() => setIsAddingMacro(!isAddingMacro)}
                    className="p-3 rounded-2xl border-2 border-dashed border-black/10 dark:border-white/15 hover:border-[#0071e3] text-zinc-500 hover:text-[#0071e3] transition cursor-pointer flex flex-col items-center justify-center gap-1.5 h-20"
                  >
                    <Plus className="w-5 h-5" />
                    <span className="text-xs font-semibold">Tambah Makro</span>
                  </button>
                </div>

                {/* Form Add Custom Macro */}
                {isAddingMacro && (
                  <form
                    onSubmit={handleAddCustomMacro}
                    className="p-3.5 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/8 dark:border-white/10 flex flex-col gap-2.5 animate-in slide-in-from-top duration-200"
                  >
                    <h4 className="text-xs font-bold text-zinc-900 dark:text-white">Buat Tombol Pintasan Baru</h4>

                    <div className="grid grid-cols-3 gap-1 bg-black/5 dark:bg-white/8 p-1 rounded-xl text-xs">
                      <button
                        type="button"
                        onClick={() => setNewMacroType('hotkey')}
                        className={`py-1 rounded-lg font-medium transition cursor-pointer ${
                          newMacroType === 'hotkey' ? 'bg-[#0071e3] text-white shadow' : 'text-zinc-500'
                        }`}
                      >
                        Kombinasi Key
                      </button>
                      <button
                        type="button"
                        onClick={() => setNewMacroType('text')}
                        className={`py-1 rounded-lg font-medium transition cursor-pointer ${
                          newMacroType === 'text' ? 'bg-[#0071e3] text-white shadow' : 'text-zinc-500'
                        }`}
                      >
                        Ketik Teks
                      </button>
                      <button
                        type="button"
                        onClick={() => setNewMacroType('lock')}
                        className={`py-1 rounded-lg font-medium transition cursor-pointer ${
                          newMacroType === 'lock' ? 'bg-[#0071e3] text-white shadow' : 'text-zinc-500'
                        }`}
                      >
                        Kunci PC
                      </button>
                    </div>

                    <input
                      type="text"
                      placeholder="Nama Tombol (cth: Buka Spotify / Discord Mute)"
                      value={newMacroLabel}
                      onChange={(e) => setNewMacroLabel(e.target.value)}
                      className="bg-white dark:bg-zinc-800 border border-black/10 dark:border-white/10 rounded-xl px-3 py-1.5 text-xs text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:border-[#0071e3]"
                      required
                    />

                    {newMacroType === 'hotkey' && (
                      <input
                        type="text"
                        placeholder="Kombinasi Tombol (cth: ctrl+shift+m / alt+f4)"
                        value={newMacroCommand}
                        onChange={(e) => setNewMacroCommand(e.target.value)}
                        className="bg-white dark:bg-zinc-800 border border-black/10 dark:border-white/10 rounded-xl px-3 py-1.5 text-xs text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:border-[#0071e3]"
                        required
                      />
                    )}

                    {newMacroType === 'text' && (
                      <input
                        type="text"
                        placeholder="Teks yang akan otomatis diketik..."
                        value={newMacroCommand}
                        onChange={(e) => setNewMacroCommand(e.target.value)}
                        className="bg-white dark:bg-zinc-800 border border-black/10 dark:border-white/10 rounded-xl px-3 py-1.5 text-xs text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:border-[#0071e3]"
                        required
                      />
                    )}

                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setIsAddingMacro(false)}
                        className="px-3 py-1.5 text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-white cursor-pointer"
                      >
                        Batal
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-1.5 rounded-xl bg-[#0071e3] hover:bg-[#0077ed] text-white text-xs font-semibold cursor-pointer shadow-sm active:scale-95"
                      >
                        Simpan Makro
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default TouchpadModal;
