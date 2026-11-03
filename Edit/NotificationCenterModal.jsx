import React, { useState } from 'react';
import { Bell, Send, Trash2, X, MessageSquare, Check, ExternalLink } from 'lucide-react';
import { triggerHaptic, playSound } from '../utils/feedback';

export function NotificationCenterModal({ isOpen, onClose, notifications = [], onReply, onClear }) {
  const [replyDrafts, setReplyDrafts] = useState({});
  const [sentMap, setSentMap] = useState({});

  if (!isOpen) return null;

  const handleSendReply = (item) => {
    const text = replyDrafts[item.id || item.key]?.trim();
    if (!text) return;
    triggerHaptic([30]);

    if (onReply) {
      onReply(item, text);
    }

    setSentMap((prev) => ({ ...prev, [item.id || item.key]: true }));
    setReplyDrafts((prev) => ({ ...prev, [item.id || item.key]: '' }));
    playSound('sent');
  };

  const formatTime = (ts) => {
    if (!ts) return '';
    try {
      const d = new Date(ts);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-3xl bg-white dark:bg-zinc-900 border border-black/10 dark:border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[88vh] animate-ios-sheet smooth-gpu">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-black/5 dark:border-white/5 bg-zinc-50/60 dark:bg-zinc-800/40">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                <span>Pusat Notifikasi HP</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
                  {notifications.length} Pesan
                </span>
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                Sinkronisasi notifikasi dan pesan masuk dari smartphone
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {notifications.length > 0 && (
              <button
                onClick={() => {
                  triggerHaptic([20]);
                  onClear?.();
                }}
                className="p-2 rounded-xl text-zinc-400 hover:text-red-500 hover:bg-red-500/10 transition cursor-pointer"
                title="Hapus Semua Riwayat Notifikasi"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={() => {
                triggerHaptic([20]);
                onClose();
              }}
              className="p-2 rounded-xl text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-black/5 dark:hover:bg-white/5 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* List of Notifications */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-3 flex-1">
          {notifications.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-center text-zinc-400">
              <div className="p-4 rounded-full bg-black/3 dark:bg-white/5 mb-3 border border-black/5 dark:border-white/5">
                <Bell className="w-8 h-8 opacity-40" />
              </div>
              <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                Belum Ada Notifikasi Masuk
              </p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-xs">
                Pesan WhatsApp, SMS, dan panggilan di HP akan otomatis muncul di sini.
              </p>
            </div>
          ) : (
            notifications.map((item, idx) => {
              const itemKey = item.id || item.key || idx;
              const isSent = sentMap[itemKey];
              const draft = replyDrafts[itemKey] || '';

              const isWhatsApp = item.appName?.toLowerCase().includes('whatsapp');
              const isTelegram = item.appName?.toLowerCase().includes('telegram');
              const isSMS = item.appName?.toLowerCase().includes('pesan') || item.appName?.toLowerCase().includes('sms');

              const badgeColor = isWhatsApp
                ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/25'
                : isTelegram
                ? 'bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/25'
                : isSMS
                ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/25'
                : 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/25';

              return (
                <div
                  key={itemKey}
                  className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-black/5 dark:border-white/5 shadow-sm space-y-2 text-left"
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${badgeColor}`}>
                      {item.appName || 'Aplikasi HP'}
                    </span>
                    <span className="text-[11px] text-zinc-400 font-mono">
                      {formatTime(item.receivedAt || item.timestamp)}
                    </span>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold text-zinc-900 dark:text-white truncate">
                      {item.title || 'Notifikasi'}
                    </h4>
                    <p className="text-xs text-zinc-600 dark:text-zinc-300 mt-0.5 leading-relaxed">
                      {item.text || ''}
                    </p>
                  </div>

                  {/* Inline Reply Input if supported */}
                  {item.canReply ? (
                    isSent ? (
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 pt-1">
                        <Check className="w-3.5 h-3.5" />
                        <span>Balasan terkirim!</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 pt-2 border-t border-black/5 dark:border-white/5">
                        <input
                          type="text"
                          value={draft}
                          onChange={(e) =>
                            setReplyDrafts((prev) => ({ ...prev, [itemKey]: e.target.value }))
                          }
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSendReply(item);
                          }}
                          placeholder={`Balas ${item.title || 'pesan'}...`}
                          className="flex-1 bg-black/5 dark:bg-white/5 border border-black/8 dark:border-white/10 rounded-xl px-3 py-1.5 text-xs text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:border-cyan-500"
                        />
                        <button
                          onClick={() => handleSendReply(item)}
                          disabled={!draft.trim()}
                          className="px-3 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-600 disabled:opacity-40 text-white font-semibold text-xs transition cursor-pointer shadow-sm active:scale-95 flex items-center gap-1.5"
                        >
                          <Send className="w-3 h-3" />
                          <span>Balas</span>
                        </button>
                      </div>
                    )
                  ) : null}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 border-t border-black/5 dark:border-white/5 bg-zinc-50/60 dark:bg-zinc-800/40 flex justify-end">
          <button
            onClick={() => {
              triggerHaptic([20]);
              onClose();
            }}
            className="px-5 py-2 rounded-xl bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300 dark:hover:bg-zinc-600 text-zinc-800 dark:text-zinc-200 text-xs font-semibold transition cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
export default NotificationCenterModal;
