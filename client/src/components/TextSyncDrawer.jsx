import React, { useState } from 'react';
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
      return str.startsWith('http://') || str.startsWith('https://');
    } catch {
      return false;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/60 backdrop-blur-xs">
      <div className="bg-slate-900 border-l border-slate-800 w-full max-w-md h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-sky-500/10 text-sky-400">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">
                Kirim Teks / Link Cepat
              </h3>
              <p className="text-xs text-slate-400">
                Ke: <span className="text-sky-300 font-medium">{targetPeer?.name || 'Semua'}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Messages List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 text-xs">
              <p>Belum ada pesan atau link yang dikirim.</p>
              <p className="mt-1">Ketik di bawah untuk mengirim ke perangkat tujuan.</p>
            </div>
          ) : (
            messages.map((msg, i) => (
              <div
                key={i}
                className={`p-3.5 rounded-xl border text-xs ${
                  msg.isSelf
                    ? 'bg-indigo-600/10 border-indigo-500/20 text-indigo-100 ml-6'
                    : 'bg-slate-800/60 border-slate-700/60 text-slate-200 mr-6'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5 text-[11px] text-slate-400">
                  <span className="font-semibold text-slate-300">
                    {msg.senderName || 'Peer'}
                  </span>
                  <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>

                <p className="break-words font-sans text-sm whitespace-pre-wrap leading-relaxed select-text">
                  {msg.text}
                </p>

                <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-700/40">
                  {isUrl(msg.text) && (
                    <a
                      href={msg.text}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] text-sky-400 hover:underline"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>Buka Link</span>
                    </a>
                  )}

                  <button
                    onClick={() => handleCopy(msg.text, i)}
                    className="ml-auto inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-white cursor-pointer"
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
        </div>

        {/* Input Footer */}
        <form onSubmit={handleSend} className="p-4 border-t border-slate-800 bg-slate-950/60">
          <div className="flex items-end gap-2">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Ketik catatan, nomor, atau tempel link..."
              rows={2}
              className="flex-1 bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-indigo-500 resize-none"
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
              className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white p-2.5 rounded-xl transition cursor-pointer shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
