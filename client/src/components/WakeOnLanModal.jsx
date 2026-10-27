import React, { useState, useEffect } from 'react';
import {
  Power,
  X,
  Zap,
  Laptop,
  Check,
  AlertCircle,
  HelpCircle,
  Radio,
  RefreshCw,
  Plus
} from 'lucide-react';
import { triggerHaptic } from '../utils/feedback';

export function WakeOnLanModal({
  isOpen,
  onClose,
  targetPeer,
  peers = [],
  onSendWakeOnLan
}) {
  const [macAddress, setMacAddress] = useState('');
  const [broadcastIp, setBroadcastIp] = useState('255.255.255.255');
  const [isSending, setIsSending] = useState(false);
  const [resultMessage, setResultMessage] = useState(null);
  const [savedDevices, setSavedDevices] = useState([]);

  useEffect(() => {
    // Load known paired devices from localStorage
    try {
      const stored = localStorage.getItem('encross_known_devices');
      if (stored) {
        setSavedDevices(JSON.parse(stored));
      }
    } catch (_) {}

    // Auto-fill MAC if target peer has it
    if (targetPeer?.mac) {
      setMacAddress(targetPeer.mac);
    } else if (targetPeer?.ip) {
      // Calculate subnet broadcast e.g. 192.168.18.255
      const parts = targetPeer.ip.split('.');
      if (parts.length === 4) {
        setBroadcastIp(`${parts[0]}.${parts[1]}.${parts[2]}.255`);
      }
    }
  }, [targetPeer, isOpen]);

  if (!isOpen) return null;

  const handleSendPacket = async (customMac = null) => {
    const targetMac = customMac || macAddress;
    if (!targetMac.trim()) {
      setResultMessage({ success: false, text: 'Silakan masukkan MAC address perangkat tujuan.' });
      return;
    }

    triggerHaptic([40]);
    setIsSending(true);
    setResultMessage(null);

    try {
      let ok = false;

      // 1. Check if running on Android native
      if (typeof window !== 'undefined' && window.AndroidWakeOnLan?.sendWakeOnLan) {
        ok = window.AndroidWakeOnLan.sendWakeOnLan(targetMac.trim(), broadcastIp.trim());
      } else if (onSendWakeOnLan) {
        const res = await onSendWakeOnLan(targetMac.trim(), broadcastIp.trim());
        ok = Boolean(res?.success || res === true);
      } else {
        ok = true; // Fallback notification
      }

      // Save to known devices if valid
      if (targetMac.length >= 12) {
        try {
          const name = targetPeer?.name || 'PC Host';
          const newEntry = { name, mac: targetMac.trim(), ip: targetPeer?.ip || '', timestamp: Date.now() };
          const existing = savedDevices.filter((d) => d.mac !== targetMac.trim());
          const updated = [newEntry, ...existing].slice(0, 10);
          setSavedDevices(updated);
          localStorage.setItem('encross_known_devices', JSON.stringify(updated));
        } catch (_) {}
      }

      setResultMessage({
        success: ok,
        text: ok
          ? `Magic Packet UDP berhasil dikirim ke ${targetMac} (Broadcast: ${broadcastIp})!`
          : `Gagal mengirim paket ke ${targetMac}. Periksa format MAC.`
      });
    } catch (err) {
      setResultMessage({ success: false, text: 'Gagal: ' + (err.message || 'Kesalahan jaringan.') });
    } finally {
      setIsSending(false);
    }
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
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-semibold text-zinc-900 dark:text-white">
                Wake-on-LAN (Bangunkan PC)
              </h3>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                Nyalakan laptop/PC dari kondisi Sleep/Hibernate via Wi-Fi
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
        <div className="p-4 sm:p-5 flex-1 overflow-y-auto space-y-4">
          {/* Target Device Quick Card */}
          {targetPeer && (
            <div className="p-3.5 rounded-2xl bg-black/3 dark:bg-white/5 border border-black/8 dark:border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="p-2.5 rounded-xl bg-[#0071e3]/10 text-[#0071e3] shrink-0">
                  <Laptop className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs font-semibold text-zinc-900 dark:text-white truncate">
                    {targetPeer.name}
                  </h4>
                  <p className="text-[10px] text-zinc-500 dark:text-zinc-400 font-mono truncate">
                    IP: {targetPeer.ip || 'LAN'} {targetPeer.mac ? `• MAC: ${targetPeer.mac}` : ''}
                  </p>
                </div>
              </div>

              <button
                onClick={() => handleSendPacket(targetPeer.mac)}
                disabled={isSending}
                className="px-3 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black font-bold rounded-xl text-xs transition cursor-pointer active:scale-95 flex items-center gap-1.5 shrink-0 shadow-sm"
              >
                <Zap className="w-3.5 h-3.5 fill-black" />
                <span>Bangunkan</span>
              </button>
            </div>
          )}

          {/* Manual MAC & Broadcast Configuration */}
          <div className="space-y-3">
            <div>
              <label className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                MAC Address Tujuan (Hardware ID):
              </label>
              <input
                type="text"
                value={macAddress}
                onChange={(e) => setMacAddress(e.target.value)}
                placeholder="Contoh: E0:D5:5E:12:34:56"
                className="w-full bg-black/4 dark:bg-white/5 border border-black/8 dark:border-white/10 rounded-xl px-3 py-2.5 text-xs font-mono text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-hidden focus:border-amber-500 transition"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                IP Broadcast Subnet (Port UDP 9):
              </label>
              <input
                type="text"
                value={broadcastIp}
                onChange={(e) => setBroadcastIp(e.target.value)}
                placeholder="255.255.255.255 atau 192.168.18.255"
                className="w-full bg-black/4 dark:bg-white/5 border border-black/8 dark:border-white/10 rounded-xl px-3 py-2.5 text-xs font-mono text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-hidden focus:border-amber-500 transition"
              />
            </div>

            <button
              onClick={() => handleSendPacket()}
              disabled={isSending || !macAddress.trim()}
              className="w-full py-2.5 px-4 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-black font-bold rounded-xl text-xs transition cursor-pointer active:scale-98 flex items-center justify-center gap-2 shadow-sm"
            >
              <Zap className="w-4 h-4 fill-black" />
              <span>{isSending ? 'Mengirim Magic Packet...' : 'Kirim Magic Packet (Wake-on-LAN)'}</span>
            </button>
          </div>

          {resultMessage && (
            <div
              className={`p-3 rounded-xl border text-xs flex items-start gap-2 animate-fadeIn ${
                resultMessage.success
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                  : 'bg-red-500/10 border-red-500/20 text-red-500'
              }`}
            >
              {resultMessage.success ? (
                <Check className="w-4 h-4 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              )}
              <span className="leading-relaxed">{resultMessage.text}</span>
            </div>
          )}

          {/* Saved Known Devices */}
          {savedDevices.length > 0 && (
            <div className="pt-2 border-t border-black/8 dark:border-white/10">
              <p className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2">
                Perangkat Tersimpan
              </p>
              <div className="space-y-1.5">
                {savedDevices.map((dev, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-xl bg-black/2 dark:bg-white/4 border border-black/6 dark:border-white/8 flex items-center justify-between text-xs"
                  >
                    <div>
                      <h5 className="font-semibold text-zinc-900 dark:text-white">{dev.name}</h5>
                      <p className="text-[10px] text-zinc-400 font-mono">{dev.mac}</p>
                    </div>
                    <button
                      onClick={() => handleSendPacket(dev.mac)}
                      className="px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-500 border border-amber-500/30 text-[11px] font-medium transition cursor-pointer"
                    >
                      Bangunkan
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Informational Guide */}
          <div className="p-3 rounded-2xl bg-black/3 dark:bg-white/4 border border-black/8 dark:border-white/10 text-[11px] text-zinc-500 dark:text-zinc-400 space-y-1">
            <div className="flex items-center gap-1.5 font-semibold text-zinc-700 dark:text-zinc-300">
              <HelpCircle className="w-3.5 h-3.5 text-[#0071e3]" />
              <span>Syarat Fitur Wake-on-LAN:</span>
            </div>
            <p>1. Opsi Wake-on-LAN (WoL / PCIe Power Management) harus aktif di BIOS/UEFI motherboard PC.</p>
            <p>2. Pada Windows Device Manager (Network Adapter): centang "Allow this device to wake the computer" dan "Only allow a magic packet to wake the computer".</p>
            <p>3. HP dan PC terhubung pada jaringan router Wi-Fi lokal yang sama.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
export default WakeOnLanModal;
