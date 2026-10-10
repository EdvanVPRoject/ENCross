import React from 'react';
import { Upload, Download, CheckCircle2, X, FileText, ArrowDownToLine } from 'lucide-react';
import { formatBytes } from '../utils/deviceInfo';

export function TransferProgressModal({ transfer, onClose }) {
  if (!transfer) return null;

  const isUpload = transfer.direction === 'upload';
  const isDone = transfer.completed;

  const handleDownloadBlob = () => {
    if (transfer.blobUrl) {
      const a = document.createElement('a');
      a.href = transfer.blobUrl;
      a.download = transfer.fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 w-full max-w-sm animate-in slide-in-from-bottom-5 duration-300">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl p-5 shadow-2xl backdrop-blur-md relative overflow-hidden">
        {/* Progress Background Accent */}
        <div
          className={`absolute bottom-0 left-0 top-0 opacity-10 transition-all duration-300 ${
            isDone ? 'bg-emerald-500' : isUpload ? 'bg-indigo-500' : 'bg-sky-500'
          }`}
          style={{ width: `${transfer.progress}%` }}
        />

        {/* Close button if finished */}
        {isDone && (
          <button
            onClick={onClose}
            className="absolute top-3 right-3 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        <div className="flex items-start gap-3 mb-3">
          <div
            className={`p-2.5 rounded-xl border ${
              isDone
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : isUpload
                ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400'
                : 'bg-sky-500/10 border-sky-500/30 text-sky-400'
            }`}
          >
            {isDone ? (
              <CheckCircle2 className="w-5 h-5" />
            ) : isUpload ? (
              <Upload className="w-5 h-5 animate-pulse" />
            ) : (
              <Download className="w-5 h-5 animate-pulse" />
            )}
          </div>

          <div className="flex-1 min-w-0 pr-4">
            <h4 className="text-sm font-semibold text-white truncate">
              {transfer.fileName}
            </h4>
            <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
              <span>{formatBytes(transfer.fileSize || 0)}</span>
              <span>•</span>
              <span className="font-mono text-indigo-300">{transfer.speed}</span>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden mb-3">
          <div
            className={`h-full transition-all duration-150 rounded-full ${
              isDone
                ? 'bg-emerald-400'
                : isUpload
                ? 'bg-gradient-to-r from-indigo-500 to-violet-500'
                : 'bg-gradient-to-r from-sky-500 to-indigo-500'
            }`}
            style={{ width: `${transfer.progress}%` }}
          />
        </div>

        {/* Status Text & Action */}
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-400">
            {isDone
              ? 'Transfer Selesai!'
              : isUpload
              ? `Mengirim ke peer (${transfer.progress}%)`
              : `Menerima file (${transfer.progress}%)`}
          </span>

          {isDone && !isUpload && transfer.blobUrl && (
            <button
              onClick={handleDownloadBlob}
              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-3 py-1.5 rounded-lg text-xs shadow transition cursor-pointer"
            >
              <ArrowDownToLine className="w-3.5 h-3.5" />
              <span>Simpan File</span>
            </button>
          )}

          {isDone && isUpload && (
            <button
              onClick={onClose}
              className="text-xs text-slate-300 hover:text-white px-2 py-1 rounded bg-slate-800"
            >
              Tutup
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
