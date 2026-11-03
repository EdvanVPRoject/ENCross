import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, Send, X, Bell, Check, Smartphone } from 'lucide-react';
import { triggerHaptic, playSound } from '../utils/feedback';

export function QuickReplyToast({ notification, onReply, onClose }) {
  const [replyText, setReplyText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sentSuccess, setSentSuccess] = useState(false);
  const inputRef = useRef(null);
  const dismissTimerRef = useRef(null);

  useEffect(() => {
    if (!notification) return;

    // Reset state
    setReplyText('');
    setIsSending(false);
    setSentSuccess(false);

    // Auto-focus input if can reply
    if (notification.canReply) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }

    // Auto-dismiss after 15s if user is not actively typing
    dismissTimerRef.current = setTimeout(() => {
      if (!replyText.trim()) {
        onClose();
      }
    }, 15000);

    return () => {
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    };
  }, [notification]);

  if (!notification) return null;

  const handleSend = () => {
    if (!replyText.trim() || isSending) return;
    setIsSending(true);
    triggerHaptic([30]);

    if (onReply) {
      onReply(notification, replyText.trim());
    }

    setIsSending(false);
    setSentSuccess(true);
    playSound('sent');

    setTimeout(() => {
      onClose();
    }, 1200);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Determine App Badge Styling
  const appName = notification.appName || 'Aplikasi HP';
  const isWhatsApp = appName.toLowerCase().includes('whatsapp');
  const isTelegram = appName.toLowerCase().includes('telegram');
  const isSMS = appName.toLowerCase().includes('pesan') || appName.toLowerCase().includes('message') || appName.toLowerCase().includes('sms');

  const badgeColor = isWhatsApp
    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/25'
    : isTelegram
    ? 'bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/25'
    : isSMS
    ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/25'
    : 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/25';

  return (
    <div className="fixed bottom-6 right-6 z-50 w-full max-w-sm animate-in slide-in-from-bottom-5 fade-in duration-300">
      <div className="relative rounded-2xl bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl border border-black/10 dark:border-white/10 shadow-2xl overflow-hidden p-4">
        {/* Top Header */}
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border truncate ${badgeColor}`}>
              {appName}
            </span>
            <span className="text-[11px] text-zinc-400 font-mono">
              Baru Saja
            </span>
          </div>

          <button
            onClick={() => {
              triggerHaptic([20]);
              onClose();
            }}
            className="p-1 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-black/5 dark:hover:bg-white/5 transition cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Sender & Message Content */}
        <div className="mb-3">
          <h4 className="text-sm font-bold text-zinc-900 dark:text-white truncate">
            {notification.title || 'Pesan Masuk'}
          </h4>
          <p className="text-xs text-zinc-600 dark:text-zinc-300 line-clamp-2 mt-0.5 leading-relaxed">
            {notification.text || ''}
          </p>
        </div>

        {/* Quick Reply Form */}
        {notification.canReply ? (
          sentSuccess ? (
            <div className="flex items-center gap-2 p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold animate-in fade-in">
              <Check className="w-4 h-4" />
              <span>Balasan terkirim ke {appName}!</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 pt-1 border-t border-black/5 dark:border-white/5">
              <input
                ref={inputRef}
                type="text"
                value={replyText}
                onChange={(e) => {
                  setReplyText(e.target.value);
                  if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
                }}
                onKeyDown={handleKeyDown}
                placeholder={`Balas ${notification.title || appName}...`}
                className="flex-1 bg-black/5 dark:bg-white/5 border border-black/8 dark:border-white/10 rounded-xl px-3 py-1.5 text-xs text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:border-cyan-500 transition"
              />
              <button
                onClick={handleSend}
                disabled={!replyText.trim() || isSending}
                className="p-2 rounded-xl bg-cyan-500 hover:bg-cyan-600 disabled:opacity-40 text-white font-semibold transition cursor-pointer shadow-sm active:scale-95 shrink-0"
                title="Kirim Balasan Cepat"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          )
        ) : null}
      </div>
    </div>
  );
}
export default QuickReplyToast;
