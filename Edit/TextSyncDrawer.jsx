import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Copy, Check, ExternalLink, MessageSquare } from 'lucide-react';

export function TextSyncDrawer({
  isOpen,
  onClose,
  targetPeer,
  messages,
  onSendMessage
}) {
  const [text, setText] = useState('');
  const [copiedId, setCopiedId] = useState(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  if (!isOpen) return null;

  const handleSend = (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    onSendMessage(targetPeer?.id, text.trim());
    setText('');
  };

  const handleCopy = (msgText, id) => {
    navigator.clipboard.writeText(msgText);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
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

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="apple-card border border-black/10 dark:border-white/10 w-full max-w-md max-h-[85vh] rounded-3xl flex flex-col shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-black/8 dark:border-white/10 flex items-center justify-between bg-black/3 dark:bg-white/3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#0071e3]/10 text-[#0071e3]">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-semibold text-zinc-900 dark:text-white">
                Kirim Teks & Link
              </h3>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                Ke: <span className="text-zinc-800 dark:text-zinc-200 font-medium">{targetPeer?.name || 'Semua'}</span>
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

        {/* Messages List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center text-zinc-400 dark:text-zinc-500 text-xs">
              <p>Belum ada catatan atau link.</p>
              <p className="mt-1">Ketik di bawah untuk mengirim ke perangkat tujuan.</p>
            </div>
          ) : (
            messages.map((msg, i) => (
              <div
                key={i}
                className={`p-3.5 rounded-2xl border text-xs shadow-xs ${
                  msg.isSelf
                    ? 'bg-[#0071e3] border-[#0071e3] text-white ml-6'
                    : 'bg-black/4 dark:bg-white/5 border-black/8 dark:border-white/10 text-zinc-900 dark:text-zinc-200 mr-6'
                }`}
              >
                <div className={`flex items-center justify-between mb-1 text-[11px] font-mono ${
                  msg.isSelf ? 'text-blue-100' : 'text-zinc-500 dark:text-zinc-400'
                }`}>
                  <span>{msg.senderName || 'Peer'}</span>
                  <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>

                <p className="break-words text-xs whitespace-pre-wrap leading-relaxed select-text">
                  {msg.text}
                </p>

                <div className={`flex items-center gap-2 mt-2 pt-2 border-t ${
                  msg.isSelf ? 'border-white/20' : 'border-black/6 dark:border-white/10'
                }`}>
                  {isUrl(msg.text) && (
                    <a
                      href={getUrlHref(msg.text)}
                      target="_blank"
                      rel="noreferrer"
                      className={`inline-flex items-center gap-1 text-[11px] underline ${
                        msg.isSelf ? 'text-blue-100 hover:text-white' : 'text-[#0071e3] dark:text-blue-400'
                      }`}
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>Buka Link</span>
                    </a>
                  )}

                  <button
                    onClick={() => handleCopy(msg.text, i)}
                    className={`ml-auto inline-flex items-center gap-1 text-[11px] cursor-pointer ${
                      msg.isSelf ? 'text-blue-100 hover:text-white' : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
                    }`}
                  >
                    {copiedId === i ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span className="text-emerald-400">Tersalin</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Salin Teks</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Footer */}
        <form
          style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 0.75rem)' }}
          onSubmit={handleSend}
          className="p-3 border-t border-black/8 dark:border-white/10 bg-black/2 dark:bg-white/2"
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
    </div>
  );
}
