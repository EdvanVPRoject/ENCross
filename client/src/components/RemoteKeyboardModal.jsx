import React, { useState, useRef, useEffect } from 'react';
import {
  Keyboard,
  X,
  Send,
  CornerDownLeft,
  Delete,
  Space,
  Sparkles,
  Mic,
  Copy,
  RotateCcw,
  Check,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight
} from 'lucide-react';
import { triggerHaptic } from '../utils/feedback';

export function RemoteKeyboardModal({
  isOpen,
  onClose,
  targetPeer,
  onSendInput
}) {
  const [text, setText] = useState('');
  const [autoSendOnEnter, setAutoSendOnEnter] = useState(false);
  const [lastSentText, setLastSentText] = useState(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 150);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSendText = (withEnter = false) => {
    if (!text) return;
    triggerHaptic([30]);
    const cmd = withEnter ? `type_enter:${text}` : `type:${text}`;
    onSendInput?.(cmd);
    setLastSentText(text);
    setText('');
    setTimeout(() => setLastSentText(null), 2500);
  };

  const handleSendKey = (keyCmd) => {
    triggerHaptic([20]);
    onSendInput?.(keyCmd);
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="apple-card border border-black/10 dark:border-white/10 w-full max-w-lg rounded-3xl flex flex-col shadow-2xl overflow-hidden max-h-[90vh]"
      >
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-black/8 dark:border-white/10 flex items-center justify-between bg-black/3 dark:bg-white/3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
              <Keyboard className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-semibold text-zinc-900 dark:text-white">
                Remote Keyboard & Dikte Suara
              </h3>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                Ketik langsung ke: <span className="font-semibold text-zinc-800 dark:text-zinc-200">{targetPeer?.name || 'PC / Laptop'}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-5 flex-1 overflow-y-auto space-y-3.5">
          {/* Tip Banner */}
          <div className="p-3 rounded-2xl bg-indigo-500/5 dark:bg-indigo-500/10 border border-indigo-500/15 flex items-start gap-2.5 text-xs text-indigo-700 dark:text-indigo-300">
            <Mic className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
            <p className="leading-relaxed text-[11px]">
              <strong>Dikte Suara (Speech-to-Text):</strong> Tap ikon mikrofon di keyboard HP Anda (Gboard) untuk berbicara, lalu klik <strong>Ketik ke PC</strong> untuk mengirim seluruh kalimat ke kursor aktif laptop.
            </p>
          </div>

          {/* Text Input Area */}
          <div className="relative">
            <textarea
              ref={textareaRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey && autoSendOnEnter) {
                  e.preventDefault();
                  handleSendText(true);
                }
              }}
              rows={4}
              placeholder="Ketik teks di sini atau gunakan fitur Dikte Suara HP..."
              className="w-full bg-black/4 dark:bg-white/5 border border-black/8 dark:border-white/10 rounded-2xl p-3 text-xs sm:text-sm text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-hidden focus:border-[#0071e3] resize-none transition"
            />
            {text && (
              <button
                onClick={() => setText('')}
                className="absolute top-2.5 right-2.5 p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-lg hover:bg-black/5 dark:hover:bg-white/10"
                title="Hapus input"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Action Send Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleSendText(false)}
              disabled={!text.trim()}
              className="flex-1 py-2.5 px-3 bg-[#0071e3] hover:bg-[#0077ed] disabled:opacity-40 text-white font-semibold rounded-xl text-xs transition cursor-pointer active:scale-95 flex items-center justify-center gap-1.5 shadow-sm"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Ketik ke PC</span>
            </button>

            <button
              onClick={() => handleSendText(true)}
              disabled={!text.trim()}
              className="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-semibold rounded-xl text-xs transition cursor-pointer active:scale-95 flex items-center justify-center gap-1.5 shadow-sm"
              title="Ketik teks dan tekan Enter"
            >
              <CornerDownLeft className="w-3.5 h-3.5" />
              <span>Ketik + Enter</span>
            </button>
          </div>

          {lastSentText && (
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[11px] flex items-center gap-1.5 animate-fadeIn">
              <Check className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Terkirim ke PC: "{lastSentText}"</span>
            </div>
          )}

          {/* Hardware Navigation & Shortcut Keys */}
          <div className="pt-2 border-t border-black/8 dark:border-white/10">
            <p className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2">
              Tombol Cepat Keyboard PC
            </p>
            <div className="grid grid-cols-4 gap-1.5 text-xs">
              <button
                onClick={() => handleSendKey('k enter')}
                className="ios-pressable py-2 px-2.5 rounded-xl bg-black/4 dark:bg-white/6 hover:bg-black/8 dark:hover:bg-white/10 border border-black/8 dark:border-white/10 text-zinc-800 dark:text-zinc-200 font-medium transition cursor-pointer flex items-center justify-center gap-1"
              >
                <CornerDownLeft className="w-3 h-3 text-emerald-500" />
                <span>Enter</span>
              </button>

              <button
                onClick={() => handleSendKey('k backspace')}
                className="ios-pressable py-2 px-2.5 rounded-xl bg-black/4 dark:bg-white/6 hover:bg-black/8 dark:hover:bg-white/10 border border-black/8 dark:border-white/10 text-zinc-800 dark:text-zinc-200 font-medium transition cursor-pointer flex items-center justify-center gap-1"
              >
                <Delete className="w-3 h-3 text-red-500" />
                <span>Bksp</span>
              </button>

              <button
                onClick={() => handleSendKey('k tab')}
                className="ios-pressable py-2 px-2.5 rounded-xl bg-black/4 dark:bg-white/6 hover:bg-black/8 dark:hover:bg-white/10 border border-black/8 dark:border-white/10 text-zinc-800 dark:text-zinc-200 font-medium transition cursor-pointer flex items-center justify-center"
              >
                <span>Tab</span>
              </button>

              <button
                onClick={() => handleSendKey('k escape')}
                className="ios-pressable py-2 px-2.5 rounded-xl bg-black/4 dark:bg-white/6 hover:bg-black/8 dark:hover:bg-white/10 border border-black/8 dark:border-white/10 text-zinc-800 dark:text-zinc-200 font-medium transition cursor-pointer flex items-center justify-center"
              >
                <span>Esc</span>
              </button>

              <button
                onClick={() => handleSendKey('combo ctrl a')}
                className="ios-pressable py-2 px-2.5 rounded-xl bg-black/4 dark:bg-white/6 hover:bg-black/8 dark:hover:bg-white/10 border border-black/8 dark:border-white/10 text-zinc-800 dark:text-zinc-200 font-medium transition cursor-pointer flex items-center justify-center"
              >
                <span>Ctrl+A</span>
              </button>

              <button
                onClick={() => handleSendKey('combo ctrl c')}
                className="ios-pressable py-2 px-2.5 rounded-xl bg-black/4 dark:bg-white/6 hover:bg-black/8 dark:hover:bg-white/10 border border-black/8 dark:border-white/10 text-zinc-800 dark:text-zinc-200 font-medium transition cursor-pointer flex items-center justify-center"
              >
                <span>Ctrl+C</span>
              </button>

              <button
                onClick={() => handleSendKey('combo ctrl v')}
                className="ios-pressable py-2 px-2.5 rounded-xl bg-black/4 dark:bg-white/6 hover:bg-black/8 dark:hover:bg-white/10 border border-black/8 dark:border-white/10 text-zinc-800 dark:text-zinc-200 font-medium transition cursor-pointer flex items-center justify-center"
              >
                <span>Ctrl+V</span>
              </button>

              <button
                onClick={() => handleSendKey('combo ctrl z')}
                className="ios-pressable py-2 px-2.5 rounded-xl bg-black/4 dark:bg-white/6 hover:bg-black/8 dark:hover:bg-white/10 border border-black/8 dark:border-white/10 text-zinc-800 dark:text-zinc-200 font-medium transition cursor-pointer flex items-center justify-center"
              >
                <span>Undo</span>
              </button>
            </div>

            {/* Arrow Navigation Keys */}
            <div className="flex items-center justify-center gap-2 mt-2.5">
              <button
                onClick={() => handleSendKey('k left')}
                className="ios-pressable p-2 rounded-xl bg-black/4 dark:bg-white/6 hover:bg-black/8 dark:hover:bg-white/10 border border-black/8 dark:border-white/10 text-zinc-700 dark:text-zinc-300"
                title="Panah Kiri"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div className="flex flex-col gap-1.5">
                <button
                  onClick={() => handleSendKey('k up')}
                  className="ios-pressable p-2 rounded-xl bg-black/4 dark:bg-white/6 hover:bg-black/8 dark:hover:bg-white/10 border border-black/8 dark:border-white/10 text-zinc-700 dark:text-zinc-300"
                  title="Panah Atas"
                >
                  <ArrowUp className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleSendKey('k down')}
                  className="ios-pressable p-2 rounded-xl bg-black/4 dark:bg-white/6 hover:bg-black/8 dark:hover:bg-white/10 border border-black/8 dark:border-white/10 text-zinc-700 dark:text-zinc-300"
                  title="Panah Bawah"
                >
                  <ArrowDown className="w-4 h-4" />
                </button>
              </div>
              <button
                onClick={() => handleSendKey('k right')}
                className="ios-pressable p-2 rounded-xl bg-black/4 dark:bg-white/6 hover:bg-black/8 dark:hover:bg-white/10 border border-black/8 dark:border-white/10 text-zinc-700 dark:text-zinc-300"
                title="Panah Kanan"
              >
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
export default RemoteKeyboardModal;
