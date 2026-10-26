import React, { useEffect } from 'react';
import { Upload, Download, CheckCircle2, X, ArrowDownToLine, Play, Pause } from 'lucide-react';
import { formatBytes } from '../utils/deviceInfo';
import { getEncrossSubfolder } from '../utils/fileCategorizer';

export function TransferProgressModal({ transfer, onClose, onTogglePause, onCancel }) {
  if (!transfer) return null;

  const isUpload = transfer.direction === 'upload';
  const isDone = transfer.completed;
  const isPaused = Boolean(transfer.isPaused);
  const subfolder = getEncrossSubfolder(transfer.fileName, transfer.mimeType || transfer.blob?.type);
  const targetFolderDisplay = `Downloads/ENCross${subfolder ? '/' + subfolder : ''}`;

  const handleDownloadBlob = () => {
    const fileName = transfer.fileName || 'file';
    const relativePath = transfer.relativePath || transfer.fileName || '';

    // 1. Desktop (Electron) Direct Save to Downloads/ENCross/{subfolder or directory tree}
    if (window.electronAPI?.saveFileToEncross && transfer.blob) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64Data = reader.result.split(',')[1];
        window.electronAPI.saveFileToEncross({
          fileName,
          relativePath,
          base64Data,
          mimeType: transfer.mimeType || transfer.blob?.type
        });
      };
      reader.readAsDataURL(transfer.blob);
      return;
    }

    // 2. Android Native App Direct Save to Downloads/ENCross/{subfolder or directory tree}
    if (window.AndroidDownloader?.saveToEncross && transfer.blob) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64Data = reader.result.split(',')[1];
        let targetSubfolder = subfolder;
        if (relativePath && relativePath.includes('/')) {
          const parts = relativePath.split('/');
          parts.pop();
          targetSubfolder = parts.join('/');
        }
        const success = window.AndroidDownloader.saveToEncross(fileName, base64Data, targetSubfolder);
        if (!success) {
          triggerBrowserDownload();
        }
      };
      reader.readAsDataURL(transfer.blob);
      return;
    }

    // 3. Web Browser Fallback Download
    triggerBrowserDownload();
  };

  const triggerBrowserDownload = () => {
    if (transfer.blobUrl) {
      const a = document.createElement('a');
      a.href = transfer.blobUrl;
      a.download = transfer.fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  // Auto-download file upon completion on both mobile and desktop
  useEffect(() => {
    if (transfer.completed && transfer.direction === 'download') {
      handleDownloadBlob();
    }
  }, [transfer.completed, transfer.direction]);

  return (
    <div className="fixed bottom-4 left-3 right-3 sm:left-auto sm:right-6 sm:bottom-6 z-50 w-auto sm:w-full sm:max-w-sm animate-in slide-in-from-bottom-4 duration-200 smooth-gpu">
      <div className="bg-zinc-900/95 border border-zinc-800 rounded-2xl p-4 shadow-2xl relative backdrop-blur-md transition-all">
        {/* Close button if finished */}
        {isDone && (
          <button
            onClick={onClose}
            className="absolute top-3 right-3 text-zinc-400 hover:text-white p-1 rounded hover:bg-zinc-800 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        <div className="flex items-start gap-3 mb-3">
          <div className="p-2 rounded-lg bg-zinc-800 border border-zinc-700/60 text-zinc-300">
            {isDone ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            ) : isUpload ? (
              <Upload className="w-4 h-4 text-zinc-300" />
            ) : (
              <Download className="w-4 h-4 text-zinc-300" />
            )}
          </div>

          <div className="flex-1 min-w-0 pr-4">
            <h4 className="text-xs font-semibold text-white truncate">
              {transfer.fileName}
            </h4>
            {transfer.relativePath && transfer.relativePath.includes('/') && (
              <div className="text-[10px] text-amber-400 font-mono truncate">
                📁 {transfer.relativePath}
              </div>
            )}
            <div className="flex items-center gap-2 text-[11px] text-zinc-400 mt-0.5 font-mono">
              <span>{formatBytes(transfer.fileSize || 0)}</span>
              <span>•</span>
              <span className={isPaused ? "text-amber-400 font-semibold" : "text-zinc-300"}>
                {isPaused ? 'Dijeda' : transfer.speed}
              </span>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden mb-3">
          <div
            className={`h-full transition-all duration-150 rounded-full ${
              isDone ? 'bg-emerald-500' : isPaused ? 'bg-amber-400' : 'bg-zinc-200'
            }`}
            style={{ width: `${transfer.progress}%` }}
          />
        </div>

        {/* Status Text & Actions */}
        <div className="flex items-center justify-between text-xs">
          <div className="min-w-0 pr-2">
            <span className="text-zinc-400 text-[11px] block truncate">
              {isDone
                ? isUpload
                  ? 'File Berhasil Terkirim'
                  : `Tersimpan di ${targetFolderDisplay}`
                : isPaused
                ? 'Transfer Dijeda'
                : isUpload
                ? `Mengirim (${transfer.progress}%)`
                : `Menerima (${transfer.progress}%)`}
            </span>
          </div>

          {/* Active transfer controls: Pause / Resume / Cancel */}
          {!isDone && (
            <div className="flex items-center gap-1.5 shrink-0">
              {onTogglePause && isUpload && (
                <button
                  onClick={() => onTogglePause(transfer.fileId)}
                  className="flex items-center gap-1 px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-[11px] transition cursor-pointer"
                  title={isPaused ? "Lanjutkan Transfer" : "Jeda Transfer"}
                >
                  {isPaused ? (
                    <>
                      <Play className="w-3 h-3 text-emerald-400" />
                      <span>Lanjut</span>
                    </>
                  ) : (
                    <>
                      <Pause className="w-3 h-3 text-amber-400" />
                      <span>Jeda</span>
                    </>
                  )}
                </button>
              )}

              {onCancel && (
                <button
                  onClick={() => onCancel(transfer.fileId, transfer.peerId)}
                  className="p-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-red-400 transition cursor-pointer"
                  title="Batalkan Transfer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}

          {isDone && !isUpload && transfer.blobUrl && (
            <button
              onClick={handleDownloadBlob}
              className="flex items-center gap-1.5 bg-zinc-100 hover:bg-white text-zinc-950 font-medium px-2.5 py-1 rounded text-xs transition cursor-pointer"
            >
              <ArrowDownToLine className="w-3.5 h-3.5" />
              <span>Simpan Ulang</span>
            </button>
          )}

          {isDone && isUpload && (
            <button
              onClick={onClose}
              className="text-xs text-zinc-400 hover:text-white px-2 py-0.5 rounded hover:bg-zinc-800 cursor-pointer"
            >
              Tutup
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
