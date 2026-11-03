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
  Clock,
  Image as ImageIcon,
  Gamepad2,
  Bell,
  BellOff,
  Eye,
  Download,
  ShieldCheck,
  Smartphone,
  Laptop
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
  const [filterType, setFilterType] = useState('all'); // 'all' | 'text' | 'image'
  const [previewImage, setPreviewImage] = useState(null);

  // User Settings for Pop-up & Game Mode
  const [isPopupEnabled, setIsPopupEnabled] = useState(() => {
    return localStorage.getItem('encross_clipboard_popup') !== 'false';
  });
  const [isGameDndEnabled, setIsGameDndEnabled] = useState(() => {
    return localStorage.getItem('encross_clipboard_game_dnd') !== 'false';
  });

  const messagesEndRef = useRef(null);

  // Load clipboard history from localStorage
  const loadHistory = () => {
    try {
      const stored = localStorage.getItem('encross_clipboard_history');
      if (stored) {
        setClipboardHistory(JSON.parse(stored));
      } else {
        setClipboardHistory([]);
      }
    } catch (_) {}
  };

  useEffect(() => {
    if (isOpen) {
      loadHistory();
    }
  }, [isOpen]);

  // Sync incoming text messages into history automatically
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

  const togglePopupSetting = () => {
    triggerHaptic([20]);
    setIsPopupEnabled((prev) => {
      const next = !prev;
      localStorage.setItem('encross_clipboard_popup', String(next));
      return next;
    });
  };

  const toggleGameDndSetting = () => {
    triggerHaptic([20]);
    setIsGameDndEnabled((prev) => {
      const next = !prev;
      localStorage.setItem('encross_clipboard_game_dnd', String(next));
      return next;
    });
  };

  const addTextToClipboardHistory = (content, senderName = 'Perangkat Ini') => {
    if (!content || !content.trim()) return;
    const clean = content.trim();
    setClipboardHistory((prev) => {
      const filtered = prev.filter((item) => item.text !== clean);
      const updated = [
        {
          id: 'clip_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
          type: 'text',
          text: clean,
          timestamp: Date.now(),
          senderName
        },
        ...filtered
      ].slice(0, 30);

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

  const handleCopyText = (msgText, id) => {
    triggerHaptic([25]);
    if (window.electronAPI?.setClipboardText) {
      window.electronAPI.setClipboardText(msgText);
    } else {
      navigator.clipboard?.writeText(msgText);
    }
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCopyImage = (dataUrl, id) => {
    triggerHaptic([25]);
    if (window.electronAPI?.setClipboardImage) {
      window.electronAPI.setClipboardImage(dataUrl);
    } else {
      // Browser fallback
      try {
        fetch(dataUrl)
          .then((res) => res.blob())
          .then((blob) => {
            navigator.clipboard?.write([new ClipboardItem({ [blob.type]: blob })]);
          })
          .catch(() => {});
      } catch (_) {}
    }
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDownloadImage = (dataUrl, fileName) => {
    triggerHaptic([20]);
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = fileName || `ENCross_${Date.now()}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
    if (!str) return false;
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

  if (!isOpen) return null;

  const filteredHistory = clipboardHistory.filter((item) => {
    if (filterType === 'text' && (item.type === 'image' || item.type === 'screenshot')) return false;
    if (filterType === 'image' && item.type !== 'image' && item.type !== 'screenshot') return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      if (item.text && item.text.toLowerCase().includes(q)) return true;
      if (item.fileName && item.fileName.toLowerCase().includes(q)) return true;
      if (item.senderName && item.senderName.toLowerCase().includes(q)) return true;
      return false;
    }
    return true;
  });

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="apple-card border border-black/10 dark:border-white/10 w-full max-w-xl max-h-[88vh] rounded-3xl flex flex-col shadow-2xl overflow-hidden animate-ios-sheet smooth-gpu"
      >
        {/* Header with Navigation Tabs */}
        <div className="px-4 sm:px-5 py-3 border-b border-black/8 dark:border-white/10 flex items-center justify-between bg-black/3 dark:bg-white/3">
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
            title="Tutup"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* TAB 1: CLIPBOARD HISTORY MANAGER */}
        {activeTab === 'history' ? (
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            {/* Pop-up & Game Mode Settings Bar */}
            <div className="px-4 py-2 bg-black/2 dark:bg-white/3 border-b border-black/6 dark:border-white/6 flex items-center justify-between gap-2 flex-wrap text-[11px]">
              <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                {/* Pop-up Toggle */}
                <button
                  onClick={togglePopupSetting}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border transition cursor-pointer ${
                    isPopupEnabled
                      ? 'bg-blue-500/15 border-blue-500/30 text-blue-600 dark:text-blue-400'
                      : 'bg-black/4 dark:bg-white/5 border-black/8 dark:border-white/10 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200'
                  }`}
                  title={isPopupEnabled ? 'Pop-up notifikasi aktif saat ada clipboard baru' : 'Pop-up dimatikan (hanya tersinkron diam-diam)'}
                >
                  {isPopupEnabled ? <Bell className="w-3 h-3 text-blue-500" /> : <BellOff className="w-3 h-3 text-zinc-400" />}
                  <span className="font-medium">Pop-up: {isPopupEnabled ? 'Nyala' : 'Mati'}</span>
                </button>

                {/* Game / Valorant DND Mode Toggle */}
                <button
                  onClick={toggleGameDndSetting}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border transition cursor-pointer ${
                    isGameDndEnabled
                      ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                      : 'bg-black/4 dark:bg-white/5 border-black/8 dark:border-white/10 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200'
                  }`}
                  title="Otomatis heningkan pop-up saat bermain Valorant, CS2, dll. tanpa mengganggu layar"
                >
                  <Gamepad2 className={`w-3 h-3 ${isGameDndEnabled ? 'text-emerald-500' : 'text-zinc-400'}`} />
                  <span className="font-medium">DND Game (Valorant): {isGameDndEnabled ? 'Aktif' : 'Mati'}</span>
                </button>
              </div>

              {clipboardHistory.length > 0 && (
                <button
                  onClick={handleClearAllHistory}
                  className="px-2 py-0.8 rounded-lg text-[10px] font-semibold text-red-500 hover:bg-red-500/10 border border-red-500/20 transition cursor-pointer shrink-0"
                  title="Hapus semua riwayat"
                >
                  Hapus Semua
                </button>
              )}
            </div>

            {/* Search & Filter Bar */}
            <div className="p-3 border-b border-black/8 dark:border-white/10 flex items-center gap-2">
              <div className="flex-1 relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-zinc-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari teks, screenshot, atau tautan..."
                  className="w-full bg-black/4 dark:bg-white/5 border border-black/8 dark:border-white/10 rounded-xl pl-8 pr-3 py-1.5 text-xs text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-hidden focus:border-[#0071e3]"
                />
              </div>

              {/* Filter Chips */}
              <div className="flex items-center gap-1 bg-black/4 dark:bg-white/5 p-0.5 rounded-xl border border-black/6 dark:border-white/8 text-[11px] shrink-0 font-medium">
                <button
                  onClick={() => setFilterType('all')}
                  className={`px-2 py-1 rounded-lg transition cursor-pointer ${filterType === 'all' ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-2xs font-semibold' : 'text-zinc-400 hover:text-zinc-600'}`}
                >
                  Semua
                </button>
                <button
                  onClick={() => setFilterType('text')}
                  className={`px-2 py-1 rounded-lg transition cursor-pointer ${filterType === 'text' ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-2xs font-semibold' : 'text-zinc-400 hover:text-zinc-600'}`}
                >
                  Teks
                </button>
                <button
                  onClick={() => setFilterType('image')}
                  className={`px-2 py-1 rounded-lg transition cursor-pointer ${filterType === 'image' ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-2xs font-semibold' : 'text-zinc-400 hover:text-zinc-600'}`}
                >
                  Gambar / SS
                </button>
              </div>
            </div>

            {/* History List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
              {filteredHistory.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center text-zinc-400 dark:text-zinc-500 text-xs py-10">
                  <ClipboardList className="w-8 h-8 stroke-1 text-zinc-400 mb-2 opacity-50" />
                  <p className="font-semibold text-zinc-600 dark:text-zinc-400">Belum ada riwayat clipboard.</p>
                  <p className="mt-1 text-[11px] max-w-xs leading-relaxed">
                    Setiap teks yang disalin atau screenshot yang diambil di ponsel/PC akan otomatis tersinkron dan tersimpan di sini.
                  </p>
                </div>
              ) : (
                filteredHistory.map((item) => {
                  const isImage = item.type === 'image' || item.type === 'screenshot' || Boolean(item.dataUrl);

                  return (
                    <div
                      key={item.id}
                      className="p-3.5 rounded-2xl bg-black/3 dark:bg-white/4 border border-black/6 dark:border-white/8 hover:border-black/15 dark:hover:border-white/15 transition group text-xs shadow-2xs"
                    >
                      <div className="flex items-center justify-between mb-1.5 text-[10px] text-zinc-400 font-mono">
                        <div className="flex items-center gap-1.5">
                          {isImage ? (
                            <span className="inline-flex items-center gap-1 text-purple-600 dark:text-purple-400 bg-purple-500/10 px-1.5 py-0.2 rounded font-semibold">
                              <ImageIcon className="w-3 h-3" />
                              {item.type === 'screenshot' ? 'Tangkapan Layar (SS)' : 'Gambar'}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 bg-blue-500/10 px-1.5 py-0.2 rounded font-semibold">
                              <ClipboardList className="w-3 h-3" />
                              Teks
                            </span>
                          )}
                          <span className="font-semibold text-zinc-600 dark:text-zinc-300">
                            {item.senderName || 'Clipboard'}
                          </span>
                        </div>
                        <span>
                          {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      {/* Content: Image vs Text */}
                      {isImage ? (
                        <div className="flex items-center gap-3 my-1.5">
                          <div
                            onClick={() => setPreviewImage(item.dataUrl)}
                            className="w-20 h-20 rounded-xl overflow-hidden bg-black/20 border border-black/10 dark:border-white/15 shrink-0 cursor-pointer relative group/img shadow-2xs"
                          >
                            <img
                              src={item.dataUrl}
                              alt={item.fileName || 'Screenshot'}
                              className="w-full h-full object-cover group-hover/img:scale-105 transition-transform"
                            />
                            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover/img:opacity-100 flex items-center justify-center transition-opacity">
                              <Eye className="w-4 h-4 text-white" />
                            </div>
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-100 truncate">
                              {item.fileName || 'Screenshot.jpg'}
                            </p>
                            <p className="text-[11px] text-zinc-400 mt-0.5">
                              Tersalin di clipboard • Siap di-paste (Ctrl+V) ke Discord, WhatsApp, atau editor.
                            </p>
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs text-zinc-800 dark:text-zinc-100 font-mono whitespace-pre-wrap break-all leading-relaxed select-text my-1">
                          {item.text}
                        </p>
                      )}

                      {/* Action Buttons */}
                      <div className="flex items-center justify-end gap-1.5 mt-2.5 pt-2 border-t border-black/5 dark:border-white/5">
                        {!isImage && isUrl(item.text) && (
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

                        {isImage && (
                          <>
                            <button
                              onClick={() => setPreviewImage(item.dataUrl)}
                              className="px-2 py-1 rounded-lg bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15 text-zinc-700 dark:text-zinc-200 font-semibold text-[10px] flex items-center gap-1 cursor-pointer transition active:scale-95"
                              title="Perbesar gambar"
                            >
                              <Eye className="w-3 h-3" />
                              <span>Lihat</span>
                            </button>
                            <button
                              onClick={() => handleDownloadImage(item.dataUrl, item.fileName)}
                              className="px-2 py-1 rounded-lg bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15 text-zinc-700 dark:text-zinc-200 font-semibold text-[10px] flex items-center gap-1 cursor-pointer transition active:scale-95"
                              title="Simpan berkas"
                            >
                              <Download className="w-3 h-3" />
                              <span>Simpan</span>
                            </button>
                          </>
                        )}

                        {/* Copy Button */}
                        <button
                          onClick={() => {
                            if (isImage) {
                              handleCopyImage(item.dataUrl, item.id);
                            } else {
                              handleCopyText(item.text, item.id);
                            }
                          }}
                          className="px-2.5 py-1 rounded-lg bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15 text-zinc-700 dark:text-zinc-200 font-semibold text-[10px] flex items-center gap-1 cursor-pointer transition active:scale-95"
                          title="Salin ke clipboard perangkat ini"
                        >
                          {copiedId === item.id ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-500" />
                              <span className="text-emerald-500">Tersalin!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>{isImage ? 'Salin Gambar' : 'Salin Teks'}</span>
                            </>
                          )}
                        </button>

                        {/* Delete Button */}
                        <button
                          onClick={() => handleDeleteHistoryItem(item.id)}
                          className="p-1 text-zinc-400 hover:text-red-500 rounded-lg hover:bg-red-500/10 transition cursor-pointer"
                          title="Hapus dari riwayat"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
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
                        onClick={() => handleCopyText(msg.text, i)}
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

      {/* Fullscreen Image Preview Lightbox */}
      {previewImage && (
        <div
          onClick={() => setPreviewImage(null)}
          className="fixed inset-0 z-60 bg-black/90 backdrop-blur-xl flex items-center justify-center p-4 animate-in fade-in duration-150"
        >
          <div className="relative max-w-4xl max-h-[90vh] flex flex-col items-center">
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute -top-10 right-0 p-2 text-white/80 hover:text-white rounded-full bg-white/10 hover:bg-white/20 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={previewImage}
              alt="Preview"
              className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl border border-white/20"
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default TextSyncDrawer;
