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
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/60 backdrop-blur-xs">
      <div className="bg-zinc-900 border-l border-zinc-800 w-full max-w-md h-full flex flex-col shadow-2xl">
        {/* Header */}
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-zinc-800 border border-zinc-700/60 text-zinc-300">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-semibold text-white">
                Kirim Teks & Link
              </h3>
              <p className="text-[11px] text-zinc-400">
                Ke: <span className="text-zinc-200">{targetPeer?.name || 'Semua'}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded text-zinc-400 hover:text-white hover:bg-zinc-800 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Messages List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center text-zinc-500 text-xs">
              <p>Belum ada catatan atau link.</p>
              <p className="mt-1">Ketik di bawah untuk mengirim ke perangkat tujuan.</p>
            </div>
          ) : (
            messages.map((msg, i) => (
              <div
                key={i}
                className={`p-3 rounded-lg border text-xs ${
                  msg.isSelf
                    ? 'bg-zinc-800 border-zinc-700 text-zinc-100 ml-6'
                    : 'bg-zinc-950 border-zinc-800 text-zinc-300 mr-6'
                }`}
              >
                <div className="flex items-center justify-between mb-1 text-[11px] text-zinc-400 font-mono">
                  <span>{msg.senderName || 'Peer'}</span>
                  <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>

                <p className="break-words text-xs whitespace-pre-wrap leading-relaxed select-text">
                  {msg.text}
                </p>

                <div className="flex items-center gap-2 mt-2 pt-2 border-t border-zinc-700/40">
                  {isUrl(msg.text) && (
                    <a
                      href={getUrlHref(msg.text)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] text-zinc-300 hover:text-white underline"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>Buka Link</span>
                    </a>
                  )}

                  <button
                    onClick={() => handleCopy(msg.text, i)}
                    className="ml-auto inline-flex items-center gap-1 text-[11px] text-zinc-400 hover:text-white cursor-pointer"
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
        <form onSubmit={handleSend} className="p-3 border-t border-zinc-800 bg-zinc-950">
          <div className="flex items-end gap-2">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Ketik catatan, nomor, atau tempel link..."
              rows={2}
              className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-xs text-white placeholder-zinc-500 focus:outline-hidden focus:border-zinc-600 resize-none"
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
              className="bg-zinc-100 hover:bg-white disabled:opacity-30 text-zinc-950 p-2.5 rounded-lg transition cursor-pointer shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
