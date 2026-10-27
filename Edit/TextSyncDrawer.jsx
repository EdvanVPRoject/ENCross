import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Send,
  Copy,
  Check,
  ExternalLink,
  MessageSquare,
  ClipboardList,
  Trash2,
  Search,
  Sparkles,
  Share2,
  Clock
} from 'lucide-react';
import { triggerHaptic } from '../utils/feedback';

export function TextSyncDrawer({
  isOpen,
  onClose,
  targetPeer,
  messages = [],
  onSendMessage,
  initialTab = 'history' // 'history' | 'chat'
}) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [text, setText] = useState('');
  const [copiedId, setCopiedId] = useState(null);
  const [clipboardHistory, setClipboardHistory] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const messagesEndRef = useRef(null);

  // Load clipboard history from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('encross_clipboard_history');
      if (stored) {
        setClipboardHistory(JSON.parse(stored));
      }
    } catch (_) {}
  }, [isOpen]);

  // Sync messages into history automatically
  useEffect(() => {
    if (messages.length > 0) {
      const latestMsg = messages[messages.length - 1];
      if (latestMsg && latestMsg.text) {
        addTextToClipboardHistory(latestMsg.text, latestMsg.senderName || 'Perangkat');
      }
    }
  }, [messages]);

  useEffect(() => {
    if (isOpen && activeTab === 'chat') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, activeTab]);

  if (!isOpen) return null;

  const addTextToClipboardHistory = (content, senderName = 'Perangkat Ini') => {
    if (!content || !content.trim()) return;
    const clean = content.trim();
    setClipboardHistory((prev) => {
      // Remove duplicate if already present
      const filtered = prev.filter((item) => item.text !== clean);
      const updated = [
        {
          id: Date.now() + Math.random().toString(36).substring(2, 6),
          text: clean,
          timestamp: Date.now(),
          senderName
        },
        ...filtered
      ].slice(0, 20); // Keep max 20 items

      try {
        localStorage.setItem('encross_clipboard_history', JSON.stringify(updated));
      } catch (_) {}
      return updated;
    });
  };

  const handleSend = (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    const toSend = text.trim();
    onSendMessage(targetPeer?.id, toSend);
    addTextToClipboardHistory(toSend, 'Perangkat Ini');
    setText('');
  };

  const handleCopy = (msgText, id) => {
    triggerHaptic([25]);
    navigator.clipboard.writeText(msgText);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDeleteHistoryItem = (id) => {
    triggerHaptic([20]);
    setClipboardHistory((prev) => {
      const updated = prev.filter((item) => item.id !== id);
      try {
        localStorage.setItem('encross_clipboard_history', JSON.stringify(updated));
      } catch (_) {}
      return updated;
    });
  };

  const handleClearAllHistory = () => {
    triggerHaptic([30]);
    setClipboardHistory([]);
    try {
      localStorage.removeItem('encross_clipboard_history');
    } catch (_) {}
  };

  const isUrl = (str) => {
    try {
      const trimmed = str.trim();
      return (
        trimmed.startsWith('http://') ||
        trimmed.startsWith('https://') ||
        trimmed.startsWith('www.')
      );
    } catch {
      return false;
    }
  };

  const getUrlHref = (str) => {
    const trimmed = str.trim();
    if (trimmed.startsWith('www.')) return `https://${trimmed}`;
    return trimmed;
  };

  const filteredHistory = clipboardHistory.filter((item) =>
    item.text.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="apple-card border border-black/10 dark:border-white/10 w-full max-w-lg max-h-[85vh] rounded-3xl flex flex-col shadow-2xl overflow-hidden"
      >
        {/* Header with Navigation Tabs */}
        <div className="px-5 py-3 border-b border-black/8 dark:border-white/10 flex items-center justify-between bg-black/3 dark:bg-white/3">
          <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-black/5 dark:bg-white/6 border border-black/8 dark:border-white/8">
            <button
              onClick={() => {
                triggerHaptic([20]);
                setActiveTab('history');
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                activeTab === 'history'
                  ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-xs'
                  : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
              }`}
            >
              <ClipboardList className="w-3.5 h-3.5 text-blue-500" />
              <span>Riwayat Clipboard ({clipboardHistory.length})</span>
            </button>

            <button
              onClick={() => {
                triggerHaptic([20]);
                setActiveTab('chat');
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                activeTab === 'chat'
                  ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-xs'
                  : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5 text-purple-500" />
              <span>Kirim Teks</span>
            </button>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* TAB 1: CLIPBOARD HISTORY MANAGER */}
        {activeTab === 'history' ? (
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            {/* Search & Actions Bar */}
            <div className="p-3 border-b border-black/8 dark:border-white/10 flex items-center gap-2">
              <div className="flex-1 relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-zinc-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari teks, link, atau catatan..."
                  className="w-full bg-black/4 dark:bg-white/5 border border-black/8 dark:border-white/10 rounded-xl pl-8 pr-3 py-1.5 text-xs text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-hidden focus:border-[#0071e3]"
                />
              </div>

              {clipboardHistory.length > 0 && (
                <button
                  onClick={handleClearAllHistory}
                  className="px-2.5 py-1.5 rounded-xl text-[11px] font-semibold text-red-500 hover:bg-red-500/10 border border-red-500/20 transition cursor-pointer shrink-0"
                  title="Hapus semua riwayat clipboard"
                >
                  Hapus Semua
                </button>
              )}
            </div>

            {/* History List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
              {filteredHistory.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center text-zinc-400 dark:text-zinc-500 text-xs py-10">
                  <ClipboardList className="w-8 h-8 stroke-1 text-zinc-400 mb-2 opacity-50" />
                  <p className="font-semibold text-zinc-600 dark:text-zinc-400">Belum ada riwayat clipboard.</p>
                  <p className="mt-1 text-[11px]">
                    Setiap teks atau link yang Anda copy antar perangkat akan otomatis tersimpan di sini hingga 20 item.
                  </p>
                </div>
              ) : (
                filteredHistory.map((item) => (
                  <div
                    key={item.id}
                    className="p-3.5 rounded-2xl bg-black/3 dark:bg-white/4 border border-black/6 dark:border-white/8 hover:border-black/15 dark:hover:border-white/15 transition group text-xs shadow-2xs"
                  >
                    <div className="flex items-center justify-between mb-1.5 text-[10px] text-zinc-400 font-mono">
                      <span className="font-semibold text-zinc-600 dark:text-zinc-300">
                        {item.senderName || 'Clipboard'}
                      </span>
                      <span>
                        {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <p className="text-xs text-zinc-800 dark:text-zinc-100 font-mono whitespace-pre-wrap break-all leading-relaxed select-text">
                      {item.text}
                    </p>

                    <div className="flex items-center justify-end gap-1.5 mt-2.5 pt-2 border-t border-black/5 dark:border-white/5">
                      {isUrl(item.text) && (
                        <a
                          href={getUrlHref(item.text)}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2 py-1 rounded-lg bg-[#0071e3]/10 hover:bg-[#0071e3]/20 text-[#0071e3] font-semibold text-[10px] flex items-center gap-1"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>Buka Link</span>
                        </a>
                      )}

                      {targetPeer && (
                        <button
                          onClick={() => {
                            triggerHaptic([25]);
                            onSendMessage(targetPeer.id, item.text);
                          }}
                          className="px-2 py-1 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 dark:text-purple-400 font-semibold text-[10px] flex items-center gap-1 cursor-pointer transition active:scale-95"
                          title="Kirim ulang ke perangkat tujuan"
                        >
                          <Share2 className="w-3 h-3" />
                          <span>Kirim ke {targetPeer.name}</span>
                        </button>
                      )}

                      <button
                        onClick={() => handleCopy(item.text, item.id)}
                        className="px-2.5 py-1 rounded-lg bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15 text-zinc-700 dark:text-zinc-200 font-semibold text-[10px] flex items-center gap-1 cursor-pointer transition active:scale-95"
                      >
                        {copiedId === item.id ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-500" />
                            <span className="text-emerald-500">Tersalin!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Salin</span>
                          </>
                        )}
                      </button>

                      <button
                        onClick={() => handleDeleteHistoryItem(item.id)}
                        className="p-1 text-zinc-400 hover:text-red-500 rounded-lg hover:bg-red-500/10 transition cursor-pointer"
                        title="Hapus dari riwayat"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : (
          /* TAB 2: INSTANT MESSAGES & NOTES THREAD */
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center text-zinc-400 dark:text-zinc-500 text-xs py-10">
                  <MessageSquare className="w-8 h-8 stroke-1 text-zinc-400 mb-2 opacity-50" />
                  <p className="font-semibold text-zinc-600 dark:text-zinc-400">Belum ada percakapan langsung.</p>
                  <p className="mt-1 text-[11px]">Ketik pesan atau tempel link di bawah untuk dikirim ke {targetPeer?.name || 'perangkat tujuan'}.</p>
                </div>
              ) : (
                messages.map((msg, i) => (
                  <div
                    key={i}
                    className={`p-3.5 rounded-2xl border text-xs shadow-2xs ${
                      msg.senderId === targetPeer?.id
                        ? 'bg-black/4 dark:bg-white/5 border-black/8 dark:border-white/10 text-zinc-900 dark:text-white mr-6'
                        : 'bg-[#0071e3]/10 border-[#0071e3]/20 text-zinc-900 dark:text-white ml-6'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1 text-[10px] text-zinc-400">
                      <span className="font-semibold">{msg.senderName}</span>
                      <span>
                        {new Date(msg.timestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>

                    <p className="break-all whitespace-pre-wrap font-mono select-text">{msg.text}</p>

                    <div className="flex items-center justify-end gap-2 mt-2 pt-2 border-t border-black/5 dark:border-white/5">
                      {isUrl(msg.text) && (
                        <a
                          href={getUrlHref(msg.text)}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1 text-[11px] text-[#0071e3] hover:underline font-medium"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>Buka</span>
                        </a>
                      )}
                      <button
                        onClick={() => handleCopy(msg.text, i)}
                        className="flex items-center gap-1 text-[11px] text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition cursor-pointer"
                      >
                        {copiedId === i ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-500" />
                            <span className="text-emerald-500">Tersalin</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Salin</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Form */}
            <form
              onSubmit={handleSend}
              className="p-3 border-t border-black/8 dark:border-white/10 bg-black/3 dark:bg-white/3"
            >
              <div className="flex items-end gap-2">
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Ketik catatan, nomor, atau tempel link..."
                  rows={2}
                  className="flex-1 bg-black/4 dark:bg-white/5 border border-black/8 dark:border-white/10 rounded-xl p-2.5 text-xs text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-hidden focus:border-[#0071e3] resize-none transition"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend(e);
                    }
                  }}
                />
                <button
                  type="submit"
                  disabled={!text.trim()}
                  className="bg-[#0071e3] hover:bg-[#0077ed] disabled:opacity-30 text-white p-2.5 rounded-xl transition cursor-pointer shrink-0 shadow-sm active:scale-95"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
export default TextSyncDrawer;
