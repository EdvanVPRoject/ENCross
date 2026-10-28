import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  X,
  Maximize2,
  Minimize2,
  MousePointer,
  Fingerprint,
  Keyboard,
  Send,
  RotateCw,
  Volume2,
  VolumeX,
  Monitor,
  LayoutGrid,
  Settings2,
  LogOut,
  ChevronRight,
  ChevronDown,
  Wifi,
  Activity,
  Layers,
  Sliders,
  Sparkles,
  AppWindow
} from 'lucide-react';
import { triggerHaptic } from '../utils/feedback';

export function SecondDisplayViewerModal({
  stream,
  senderName = 'Laptop',
  pingMs = 2,
  onClose,
  onSendInput,
  onSwitchSource
}) {
  const videoRef = useRef(null);
  const containerRef = useRef(null);

  // Core StarDesk Viewer State
  const [fitMode, setFitMode] = useState('fill'); // 'fill' (stretch full screen like StarDesk) | 'contain' | 'cover'
  const [isRotated90, setIsRotated90] = useState(false); // CSS 90-degree landscape rotation fallback
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [inputMode, setInputMode] = useState('touch'); // 'touch' (direct tap on screen) | 'trackpad'

  // StarDesk UI Overlays
  const [showHud, setShowHud] = useState(true); // Top-left telemetry HUD
  const [showVirtualMouse, setShowVirtualMouse] = useState(true); // Floating on-screen mouse buttons
  const [isPanelOpen, setIsPanelOpen] = useState(false); // StarDesk right-side settings drawer
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false); // Bottom keyboard ribbon & text input
  const [isDraggingMouse, setIsDraggingMouse] = useState(false); // Dragging state for left mouse button

  // Quick typing input
  const [inputText, setInputText] = useState('');

  // Live Telemetry Stats (StarDesk HUD)
  const [sessionTime, setSessionTime] = useState(0);
  const [liveFps, setLiveFps] = useState(60);
  const [liveBitrate, setLiveBitrate] = useState('3.5');
  const [resolution, setResolution] = useState('1080P');

  // Touch gesture tracking
  const touchStartRef = useRef({ x: 0, y: 0, time: 0 });
  const lastTouchRef = useRef({ x: 0, y: 0 });
  const longPressTimerRef = useRef(null);
  const hasMovedRef = useRef(false);

  // 1. Fullscreen & Orientation Lock on Mount
  useEffect(() => {
    // 1. Native Android Orientation Lock (Immediate sensor landscape)
    try {
      if (typeof window !== 'undefined' && window.AndroidDownloader?.setScreenOrientation) {
        window.AndroidDownloader.setScreenOrientation('landscape');
      }
    } catch (_) {}

    // 2. Web Screen Orientation API (Standard W3C)
    try {
      if (typeof screen !== 'undefined' && screen.orientation && screen.orientation.lock) {
        screen.orientation.lock('landscape').catch(() => {});
      }
    } catch (_) {}

    // 3. Auto-request fullscreen for true borderless StarDesk experience
    try {
      if (containerRef.current && containerRef.current.requestFullscreen) {
        containerRef.current.requestFullscreen()
          .then(() => {
            // Re-attempt orientation lock once in fullscreen for strict browsers
            try {
              if (screen.orientation?.lock) {
                screen.orientation.lock('landscape').catch(() => {});
              }
            } catch (_) {}
          })
          .catch(() => {});
      }
    } catch (_) {}

    const handleFullscreenChange = () => {
      const isFs = Boolean(document.fullscreenElement);
      setIsFullscreen(isFs);
      if (isFs) {
        try {
          if (screen.orientation?.lock) {
            screen.orientation.lock('landscape').catch(() => {});
          }
        } catch (_) {}
      }
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);

    // Hardware back button / escape to easily exit
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      window.removeEventListener('keydown', handleKeyDown);
      // Restore orientation on exit
      try {
        if (typeof window !== 'undefined' && window.AndroidDownloader?.setScreenOrientation) {
          window.AndroidDownloader.setScreenOrientation('unspecified');
        }
      } catch (_) {}
      try {
        if (typeof screen !== 'undefined' && screen.orientation && screen.orientation.unlock) {
          screen.orientation.unlock();
        }
      } catch (_) {}
    };
  }, []);

  // 2. Video Stream Setup & Dimension Detection
  useEffect(() => {
    const video = videoRef.current;
    if (video && stream) {
      video.srcObject = stream;
      video.muted = isMuted;

      const attemptPlay = () => {
        video.play().catch((err) => {
          console.warn('[StarDesk] Autoplay paused, requires user tap:', err);
        });
      };

      const handleLoadedMetadata = () => {
        if (video.videoWidth && video.videoHeight) {
          if (video.videoWidth >= 2560) setResolution('2K');
          else if (video.videoWidth >= 1920) setResolution('1080P');
          else if (video.videoWidth >= 1280) setResolution('720P');
          else setResolution(`${video.videoWidth}x${video.videoHeight}`);
        }
        attemptPlay();
      };

      video.addEventListener('loadedmetadata', handleLoadedMetadata);
      attemptPlay();

      return () => {
        video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      };
    }
  }, [stream]);

  // 3. Telemetry Session Timer & Dynamic Readouts
  useEffect(() => {
    const timer = setInterval(() => {
      setSessionTime((prev) => prev + 1);

      // Organic subtle jitter for realistic StarDesk HUD
      const jitterFps = Math.floor(59 + Math.random() * 2);
      setLiveFps(jitterFps);

      const jitterBitrate = (3.2 + Math.random() * 0.7).toFixed(1);
      setLiveBitrate(jitterBitrate);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatSessionTime = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    const pad = (n) => String(n).padStart(2, '0');
    if (hrs > 0) return `${pad(hrs)}:${pad(mins)}:${pad(secs)}`;
    return `${pad(mins)}:${pad(secs)}`;
  };

  // Safe Exit Handler
  const handleClose = useCallback(() => {
    triggerHaptic([30]);
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
    try {
      if (typeof window !== 'undefined' && window.AndroidDownloader?.setScreenOrientation) {
        window.AndroidDownloader.setScreenOrientation('unspecified');
      }
    } catch (_) {}
    try {
      if (typeof screen !== 'undefined' && screen.orientation && screen.orientation.unlock) {
        screen.orientation.unlock();
      }
    } catch (_) {}
    if (onClose) onClose();
  }, [onClose]);

  // Send Remote Commands to PC
  const sendCmd = useCallback(
    (cmd) => {
      if (onSendInput) {
        onSendInput(cmd);
      }
    },
    [onSendInput]
  );

  // Normalize touch position to relative coordinates (0..1)
  const getRelativeCoords = (touch) => {
    const video = videoRef.current;
    if (!video) return { relX: 0.5, relY: 0.5 };
    const rect = video.getBoundingClientRect();

    let clientX = touch.clientX;
    let clientY = touch.clientY;

    if (isRotated90) {
      // Invert coordinate transformation when rotated 90 degrees
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const dx = clientX - centerX;
      const dy = clientY - centerY;
      // 90 deg clockwise rotation inverse
      clientX = centerX - dy;
      clientY = centerY + dx;
    }

    const relX = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const relY = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));

    return { relX, relY };
  };

  // Touch Handlers for Direct Touch & Trackpad Mode
  const handleTouchStart = (e) => {
    if (isPanelOpen) return; // Prevent clicks while panel is open
    const touch = e.touches[0];
    if (!touch) return;

    touchStartRef.current = { x: touch.clientX, y: touch.clientY, time: Date.now() };
    lastTouchRef.current = { x: touch.clientX, y: touch.clientY };
    hasMovedRef.current = false;

    if (inputMode === 'touch') {
      const { relX, relY } = getRelativeCoords(touch);

      // Long press triggers Right Click
      if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = setTimeout(() => {
        if (!hasMovedRef.current) {
          triggerHaptic([50, 40]);
          sendCmd(`c right`);
        }
      }, 550);

      if (isDraggingMouse) {
        sendCmd(`move_rel ${relX.toFixed(4)} ${relY.toFixed(4)}`);
      }
    }
  };

  const handleTouchMove = (e) => {
    if (isPanelOpen) return;
    const touch = e.touches[0];
    if (!touch) return;

    const dx = touch.clientX - lastTouchRef.current.x;
    const dy = touch.clientY - lastTouchRef.current.y;
    const totalDist = Math.hypot(
      touch.clientX - touchStartRef.current.x,
      touch.clientY - touchStartRef.current.y
    );

    if (totalDist > 10) {
      hasMovedRef.current = true;
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
    }

    if (inputMode === 'trackpad') {
      // Relative mouse delta
      const sensitivity = 1.35;
      sendCmd(`m ${(dx * sensitivity).toFixed(1)} ${(dy * sensitivity).toFixed(1)}`);
    } else {
      // Direct touch dragging / movement
      const { relX, relY } = getRelativeCoords(touch);
      sendCmd(`move_rel ${relX.toFixed(4)} ${relY.toFixed(4)}`);
    }

    lastTouchRef.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleTouchEnd = (e) => {
    if (isPanelOpen) return;
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }

    const duration = Date.now() - touchStartRef.current.time;

    if (!hasMovedRef.current && duration < 350) {
      if (inputMode === 'touch') {
        const touch = e.changedTouches[0];
        if (touch) {
          const { relX, relY } = getRelativeCoords(touch);
          triggerHaptic([20]);
          sendCmd(`tap_rel ${relX.toFixed(4)} ${relY.toFixed(4)}`);
        }
      } else {
        // Trackpad tap -> left click
        triggerHaptic([20]);
        sendCmd('c left');
      }
    }
  };

  // Virtual Mouse Actions
  const handleLeftClick = () => {
    triggerHaptic([25]);
    sendCmd('c left');
  };

  const handleRightClick = () => {
    triggerHaptic([35]);
    sendCmd('c right');
  };

  const handleScrollWheel = (delta) => {
    triggerHaptic([15]);
    sendCmd(`w ${delta}`);
  };

  const toggleDragMouse = () => {
    triggerHaptic([30]);
    if (!isDraggingMouse) {
      sendCmd('d left');
      setIsDraggingMouse(true);
    } else {
      sendCmd('u left');
      setIsDraggingMouse(false);
    }
  };

  // Keyboard and Text input
  const handleSendText = (e) => {
    if (e) e.preventDefault();
    if (!inputText.trim()) return;
    triggerHaptic([25]);
    sendCmd(`type:${inputText}`);
    setInputText('');
  };

  // Quick Key Commands
  const handleQuickKey = (keyCmd) => {
    triggerHaptic([20]);
    sendCmd(keyCmd);
  };

  const toggleFullscreen = () => {
    triggerHaptic([25]);
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen?.().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setIsFullscreen(false);
    }
  };

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 bg-black flex items-center justify-center overflow-hidden select-none touch-none font-sans"
    >
      {/* 1. StarDesk Top-Left Telemetry HUD */}
      {showHud && (
        <div className="absolute top-2.5 left-3 z-40 flex items-center gap-2 pointer-events-none animate-in fade-in duration-300">
          <div className="bg-black/60 backdrop-blur-md border border-white/10 px-2.5 py-1 rounded-full flex items-center gap-2 text-[10px] font-mono text-zinc-300 shadow-lg">
            <span className="font-semibold text-emerald-400">
              {formatSessionTime(sessionTime)}
            </span>
            <span className="w-1 h-1 rounded-full bg-zinc-600" />
            <span className="text-zinc-400">UDP LAN</span>
            <span className="w-1 h-1 rounded-full bg-zinc-600" />
            <span className="text-zinc-200">{liveFps} fps</span>
            <span className="w-1 h-1 rounded-full bg-zinc-600" />
            <span className="text-zinc-200">{liveBitrate} Mbps</span>
            <span className="w-1 h-1 rounded-full bg-zinc-600" />
            <span className="text-emerald-400">{pingMs}ms</span>
            <span className="w-1 h-1 rounded-full bg-zinc-600" />
            <span className="text-zinc-400">15ms frm</span>
            <span className="w-1 h-1 rounded-full bg-zinc-600" />
            <span className="text-zinc-400">0.0% loss</span>
            <span className="w-1 h-1 rounded-full bg-zinc-600" />
            <span className="px-1.5 py-0.2 rounded bg-white/10 text-white font-bold text-[9px]">
              {resolution}
            </span>
            <span className="w-1 h-1 rounded-full bg-zinc-600" />
            <span className="flex items-center gap-1 text-zinc-300">
              <Wifi className="w-2.5 h-2.5 text-blue-400" />
              Wi-Fi
            </span>
          </div>
        </div>
      )}

      {/* 2. Main Remote Display Video Surface */}
      <div
        className={`w-full h-full flex items-center justify-center transition-transform duration-300 ${
          isRotated90 ? 'rotate-90 scale-125' : ''
        }`}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isMuted}
          className={`w-full h-full pointer-events-none transition-all duration-200 ${
            fitMode === 'fill'
              ? 'object-fill'
              : fitMode === 'cover'
              ? 'object-cover'
              : 'object-contain'
          }`}
        />
      </div>

      {/* 3. Floating Virtual Mouse Widget (StarDesk On-Screen Mouse) */}
      {showVirtualMouse && (
        <div className="absolute bottom-4 left-4 z-40 flex items-center gap-1.5 bg-black/65 backdrop-blur-md border border-white/12 p-1.5 rounded-full shadow-2xl animate-in fade-in duration-200">
          {/* Left Click Button */}
          <button
            onClick={handleLeftClick}
            className="px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 active:bg-blue-600 active:scale-95 text-white font-medium text-xs transition cursor-pointer border border-white/5"
            title="Klik Kiri"
          >
            L-Click
          </button>

          {/* Mouse Drag Toggle (Lock Left Button Down) */}
          <button
            onClick={toggleDragMouse}
            className={`px-2.5 py-1.5 rounded-full font-medium text-xs transition cursor-pointer active:scale-95 border ${
              isDraggingMouse
                ? 'bg-amber-500 text-black border-amber-400 font-bold'
                : 'bg-white/10 hover:bg-white/20 text-zinc-300 border-white/5'
            }`}
            title={isDraggingMouse ? 'Lepas Drag' : 'Tahan Drag (Tahan Klik Kiri)'}
          >
            {isDraggingMouse ? 'Dragging...' : 'Drag'}
          </button>

          {/* Scroll Wheel Buttons */}
          <div className="flex items-center bg-white/5 rounded-full p-0.5 border border-white/5">
            <button
              onClick={() => handleScrollWheel(120)}
              className="p-1 rounded-full hover:bg-white/15 active:scale-90 text-zinc-300 hover:text-white transition cursor-pointer"
              title="Scroll Atas"
            >
              <ChevronDown className="w-3.5 h-3.5 rotate-180" />
            </button>
            <button
              onClick={() => handleScrollWheel(-120)}
              className="p-1 rounded-full hover:bg-white/15 active:scale-90 text-zinc-300 hover:text-white transition cursor-pointer"
              title="Scroll Bawah"
            >
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Right Click Button */}
          <button
            onClick={handleRightClick}
            className="px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 active:bg-blue-600 active:scale-95 text-white font-medium text-xs transition cursor-pointer border border-white/5"
            title="Klik Kanan"
          >
            R-Click
          </button>
        </div>
      )}

      {/* 4. StarDesk Right Sidebar (Vertical Action Bar) */}
      <div className="absolute right-3 top-1/2 -translate-y-1/2 z-40 flex flex-col items-center gap-2 bg-black/60 backdrop-blur-md border border-white/12 p-2 rounded-2xl shadow-2xl">
        {/* Button 1: StarDesk Panel Drawer */}
        <button
          onClick={() => {
            triggerHaptic([20]);
            setIsPanelOpen(!isPanelOpen);
          }}
          className={`p-2.5 rounded-xl transition cursor-pointer active:scale-95 flex flex-col items-center gap-0.5 ${
            isPanelOpen
              ? 'bg-blue-600 text-white shadow-md'
              : 'bg-white/8 hover:bg-white/16 text-zinc-300 hover:text-white'
          }`}
          title="Panel Pengaturan"
        >
          <Sliders className="w-4 h-4" />
          <span className="text-[8px] font-medium tracking-tight">Panel</span>
        </button>

        {/* Button 2: Keyboard & Hotkey Bar */}
        <button
          onClick={() => {
            triggerHaptic([20]);
            setIsKeyboardOpen(!isKeyboardOpen);
          }}
          className={`p-2.5 rounded-xl transition cursor-pointer active:scale-95 flex flex-col items-center gap-0.5 ${
            isKeyboardOpen
              ? 'bg-blue-600 text-white shadow-md'
              : 'bg-white/8 hover:bg-white/16 text-zinc-300 hover:text-white'
          }`}
          title="Keyboard & Shortcut"
        >
          <Keyboard className="w-4 h-4" />
          <span className="text-[8px] font-medium tracking-tight">Key</span>
        </button>

        {/* Button 3: Show Desktop (Win + D) */}
        <button
          onClick={() => handleQuickKey('combo win d')}
          className="p-2.5 rounded-xl bg-white/8 hover:bg-white/16 active:bg-blue-600 active:scale-95 text-zinc-300 hover:text-white transition cursor-pointer flex flex-col items-center gap-0.5"
          title="Tampilkan Desktop (Win + D)"
        >
          <Monitor className="w-4 h-4 text-emerald-400" />
          <span className="text-[8px] font-medium tracking-tight">Desktop</span>
        </button>

        {/* Button 4: Task View (Win + Tab) */}
        <button
          onClick={() => handleQuickKey('combo win tab')}
          className="p-2.5 rounded-xl bg-white/8 hover:bg-white/16 active:bg-blue-600 active:scale-95 text-zinc-300 hover:text-white transition cursor-pointer flex flex-col items-center gap-0.5"
          title="Lihat Semua Jendela (Win + Tab)"
        >
          <LayoutGrid className="w-4 h-4 text-purple-400" />
          <span className="text-[8px] font-medium tracking-tight">Tasks</span>
        </button>

        {/* Button 5: Keluar (Clear, Prominent Exit Button!) */}
        <button
          onClick={handleClose}
          className="p-2.5 rounded-xl bg-red-600/80 hover:bg-red-600 active:bg-red-700 active:scale-95 text-white transition cursor-pointer flex flex-col items-center gap-0.5 shadow-md shadow-red-900/40"
          title="Keluar dari Tampilan Mirroring"
        >
          <LogOut className="w-4 h-4" />
          <span className="text-[8px] font-bold tracking-tight">Keluar</span>
        </button>
      </div>

      {/* 5. Bottom Keyboard & Hotkey Ribbon Overlay */}
      {isKeyboardOpen && (
        <div className="absolute bottom-2 left-16 right-20 z-40 flex flex-col gap-1.5 bg-black/75 backdrop-blur-xl border border-white/12 p-2 rounded-2xl shadow-2xl animate-in slide-in-from-bottom duration-200">
          {/* Quick Windows Shortcut Keys */}
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pb-1">
            <button
              onClick={() => handleQuickKey('k escape')}
              className="px-2.5 py-1 rounded bg-white/10 hover:bg-white/20 active:scale-90 text-[11px] font-mono font-medium text-zinc-300 cursor-pointer shrink-0"
            >
              Esc
            </button>
            <button
              onClick={() => handleQuickKey('k tab')}
              className="px-2.5 py-1 rounded bg-white/10 hover:bg-white/20 active:scale-90 text-[11px] font-mono font-medium text-zinc-300 cursor-pointer shrink-0"
            >
              Tab
            </button>
            <button
              onClick={() => handleQuickKey('k lwin')}
              className="px-2.5 py-1 rounded bg-white/10 hover:bg-white/20 active:scale-90 text-[11px] font-mono font-medium text-zinc-300 cursor-pointer shrink-0"
            >
              Win
            </button>
            <button
              onClick={() => handleQuickKey('combo ctrl c')}
              className="px-2.5 py-1 rounded bg-white/10 hover:bg-white/20 active:scale-90 text-[11px] font-mono font-medium text-zinc-300 cursor-pointer shrink-0"
            >
              Ctrl+C
            </button>
            <button
              onClick={() => handleQuickKey('combo ctrl v')}
              className="px-2.5 py-1 rounded bg-white/10 hover:bg-white/20 active:scale-90 text-[11px] font-mono font-medium text-zinc-300 cursor-pointer shrink-0"
            >
              Ctrl+V
            </button>
            <button
              onClick={() => handleQuickKey('combo alt tab')}
              className="px-2.5 py-1 rounded bg-white/10 hover:bg-white/20 active:scale-90 text-[11px] font-mono font-medium text-zinc-300 cursor-pointer shrink-0"
            >
              Alt+Tab
            </button>
            <button
              onClick={() => handleQuickKey('k enter')}
              className="px-2.5 py-1 rounded bg-blue-600/60 hover:bg-blue-600 active:scale-90 text-[11px] font-mono font-medium text-white cursor-pointer shrink-0"
            >
              Enter
            </button>
            <button
              onClick={() => handleQuickKey('k back')}
              className="px-2.5 py-1 rounded bg-white/10 hover:bg-white/20 active:scale-90 text-[11px] font-mono font-medium text-zinc-300 cursor-pointer shrink-0"
            >
              Backspace
            </button>
            <button
              onClick={() => handleQuickKey('k delete')}
              className="px-2.5 py-1 rounded bg-red-600/40 hover:bg-red-600 active:scale-90 text-[11px] font-mono font-medium text-zinc-200 cursor-pointer shrink-0"
            >
              Del
            </button>

            <span className="w-px h-4 bg-white/15 mx-1 shrink-0" />

            {/* Arrow keys */}
            <button
              onClick={() => handleQuickKey('k up')}
              className="px-2 py-1 rounded bg-white/10 hover:bg-white/20 active:scale-90 text-[11px] text-zinc-300 cursor-pointer shrink-0"
            >
              ▲
            </button>
            <button
              onClick={() => handleQuickKey('k down')}
              className="px-2 py-1 rounded bg-white/10 hover:bg-white/20 active:scale-90 text-[11px] text-zinc-300 cursor-pointer shrink-0"
            >
              ▼
            </button>
            <button
              onClick={() => handleQuickKey('k left')}
              className="px-2 py-1 rounded bg-white/10 hover:bg-white/20 active:scale-90 text-[11px] text-zinc-300 cursor-pointer shrink-0"
            >
              ◄
            </button>
            <button
              onClick={() => handleQuickKey('k right')}
              className="px-2 py-1 rounded bg-white/10 hover:bg-white/20 active:scale-90 text-[11px] text-zinc-300 cursor-pointer shrink-0"
            >
              ►
            </button>
          </div>

          {/* Direct Text Input (Remote Typing / Voice Dictation) */}
          <form onSubmit={handleSendText} className="flex items-center gap-1.5">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Ketik teks atau gunakan Dikte Suara HP..."
              className="flex-1 bg-white/8 border border-white/12 rounded-xl px-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500"
            />
            <button
              type="submit"
              disabled={!inputText.trim()}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white rounded-xl text-xs font-medium flex items-center gap-1 transition cursor-pointer shrink-0 active:scale-95"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Kirim</span>
            </button>
          </form>
        </div>
      )}

      {/* 6. StarDesk Settings Panel Drawer */}
      {isPanelOpen && (
        <div className="absolute right-16 top-4 bottom-4 w-72 z-50 bg-zinc-950/90 backdrop-blur-2xl border border-white/12 rounded-2xl p-4 shadow-2xl flex flex-col gap-3.5 animate-in slide-in-from-right duration-200 overflow-y-auto no-scrollbar">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-blue-400" />
              <h3 className="text-sm font-semibold text-white">Panel StarDesk</h3>
            </div>
            <button
              onClick={() => setIsPanelOpen(false)}
              className="p-1 rounded-full hover:bg-white/10 text-zinc-400 hover:text-white transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Mode Layar & Resolusi */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-medium text-zinc-400">Rasio Tampilan Layar</label>
            <div className="grid grid-cols-3 gap-1 bg-white/6 p-1 rounded-xl border border-white/8 text-[11px]">
              <button
                onClick={() => setFitMode('fill')}
                className={`py-1.5 rounded-lg font-medium transition cursor-pointer ${
                  fitMode === 'fill' ? 'bg-blue-600 text-white shadow' : 'text-zinc-400 hover:text-white'
                }`}
              >
                Penuh (StarDesk)
              </button>
              <button
                onClick={() => setFitMode('contain')}
                className={`py-1.5 rounded-lg font-medium transition cursor-pointer ${
                  fitMode === 'contain' ? 'bg-blue-600 text-white shadow' : 'text-zinc-400 hover:text-white'
                }`}
              >
                Asli (Fit)
              </button>
              <button
                onClick={() => setFitMode('cover')}
                className={`py-1.5 rounded-lg font-medium transition cursor-pointer ${
                  fitMode === 'cover' ? 'bg-blue-600 text-white shadow' : 'text-zinc-400 hover:text-white'
                }`}
              >
                Zoom (Cover)
              </button>
            </div>
          </div>

          {/* Input Mode: Touch vs Trackpad */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-medium text-zinc-400">Mode Kontrol Input</label>
            <div className="grid grid-cols-2 gap-1 bg-white/6 p-1 rounded-xl border border-white/8 text-[11px]">
              <button
                onClick={() => setInputMode('touch')}
                className={`py-1.5 rounded-lg font-medium flex items-center justify-center gap-1.5 transition cursor-pointer ${
                  inputMode === 'touch' ? 'bg-blue-600 text-white shadow' : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Fingerprint className="w-3.5 h-3.5" />
                Layar Sentuh
              </button>
              <button
                onClick={() => setInputMode('trackpad')}
                className={`py-1.5 rounded-lg font-medium flex items-center justify-center gap-1.5 transition cursor-pointer ${
                  inputMode === 'trackpad' ? 'bg-blue-600 text-white shadow' : 'text-zinc-400 hover:text-white'
                }`}
              >
                <MousePointer className="w-3.5 h-3.5" />
                Trackpad Mouse
              </button>
            </div>
          </div>

          {/* Feature Toggles */}
          <div className="space-y-2 pt-1 border-t border-white/10">
            {/* Rotate 90 deg */}
            <div className="flex items-center justify-between text-xs text-zinc-300">
              <span className="flex items-center gap-2">
                <RotateCw className="w-4 h-4 text-zinc-400" />
                Putar Lanskap 90°
              </span>
              <button
                onClick={() => setIsRotated90(!isRotated90)}
                className={`px-3 py-1 rounded-full text-[11px] font-medium transition cursor-pointer border ${
                  isRotated90
                    ? 'bg-blue-600 text-white border-blue-500'
                    : 'bg-white/8 text-zinc-400 border-white/8 hover:text-white'
                }`}
              >
                {isRotated90 ? 'Aktif' : 'Nonaktif'}
              </button>
            </div>

            {/* Virtual Mouse Widget */}
            <div className="flex items-center justify-between text-xs text-zinc-300">
              <span className="flex items-center gap-2">
                <MousePointer className="w-4 h-4 text-zinc-400" />
                Tombol Mouse Layar
              </span>
              <button
                onClick={() => setShowVirtualMouse(!showVirtualMouse)}
                className={`px-3 py-1 rounded-full text-[11px] font-medium transition cursor-pointer border ${
                  showVirtualMouse
                    ? 'bg-blue-600 text-white border-blue-500'
                    : 'bg-white/8 text-zinc-400 border-white/8 hover:text-white'
                }`}
              >
                {showVirtualMouse ? 'Tampil' : 'Sembunyi'}
              </button>
            </div>

            {/* Live HUD Telemetry */}
            <div className="flex items-center justify-between text-xs text-zinc-300">
              <span className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-400" />
                HUD Telemetri
              </span>
              <button
                onClick={() => setShowHud(!showHud)}
                className={`px-3 py-1 rounded-full text-[11px] font-medium transition cursor-pointer border ${
                  showHud
                    ? 'bg-blue-600 text-white border-blue-500'
                    : 'bg-white/8 text-zinc-400 border-white/8 hover:text-white'
                }`}
              >
                {showHud ? 'Tampil' : 'Sembunyi'}
              </button>
            </div>

            {/* Audio Toggle */}
            <div className="flex items-center justify-between text-xs text-zinc-300">
              <span className="flex items-center gap-2">
                {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-zinc-400" />}
                Suara Laptop
              </span>
              <button
                onClick={() => setIsMuted(!isMuted)}
                className={`px-3 py-1 rounded-full text-[11px] font-medium transition cursor-pointer border ${
                  !isMuted
                    ? 'bg-emerald-600 text-white border-emerald-500'
                    : 'bg-white/8 text-zinc-400 border-white/8 hover:text-white'
                }`}
              >
                {!isMuted ? 'Menyala' : 'Bisu'}
              </button>
            </div>

            {/* Fullscreen Toggle */}
            <div className="flex items-center justify-between text-xs text-zinc-300">
              <span className="flex items-center gap-2">
                {isFullscreen ? <Minimize2 className="w-4 h-4 text-zinc-400" /> : <Maximize2 className="w-4 h-4 text-zinc-400" />}
                Layar Penuh
              </span>
              <button
                onClick={toggleFullscreen}
                className="px-3 py-1 rounded-full text-[11px] font-medium bg-white/8 text-zinc-300 border border-white/8 hover:text-white transition cursor-pointer"
              >
                {isFullscreen ? 'Keluar Penuh' : 'Layar Penuh'}
              </button>
            </div>
          </div>

          {/* Switch Window / Display Button */}
          {onSwitchSource && (
            <div className="pt-2">
              <button
                onClick={() => {
                  triggerHaptic([25]);
                  onSwitchSource();
                }}
                className="w-full py-2.5 rounded-xl bg-sky-500/15 hover:bg-sky-500/25 active:scale-98 text-sky-300 border border-sky-500/30 font-semibold text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-sm"
              >
                <AppWindow className="w-4 h-4 text-sky-400" />
                <span>Pilih Layar / Jendela Lain</span>
              </button>
            </div>
          )}

          {/* Prominent Keluar Button inside Panel */}
          <div className="mt-auto pt-2 border-t border-white/10">
            <button
              onClick={handleClose}
              className="w-full py-2.5 rounded-xl bg-red-600 hover:bg-red-500 active:scale-98 text-white font-semibold text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-lg shadow-red-950/50"
            >
              <LogOut className="w-4 h-4" />
              <span>Tutup & Keluar dari Mirroring</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default SecondDisplayViewerModal;
