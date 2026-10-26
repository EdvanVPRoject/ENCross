import React, { useEffect, useRef, useState } from 'react';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  X,
  Radio,
  Square,
  Download,
  Activity,
  Smartphone,
  ShieldCheck
} from 'lucide-react';
import { triggerHaptic, playSound } from '../utils/feedback';

export function WirelessMicModal({ stream, senderName, onClose }) {
  const audioRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);

  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1.0);
  const [audioLevel, setAudioLevel] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [outputDevices, setOutputDevices] = useState([]);
  const [selectedOutput, setSelectedOutput] = useState('');

  // Enumerate audio output devices
  useEffect(() => {
    async function loadAudioOutputs() {
      try {
        if (navigator.mediaDevices?.enumerateDevices) {
          const devices = await navigator.mediaDevices.enumerateDevices();
          const outputs = devices.filter((d) => d.kind === 'audiooutput');
          setOutputDevices(outputs);
        }
      } catch (err) {
        console.warn('[WirelessMic] Failed to enumerate audio devices:', err);
      }
    }
    loadAudioOutputs();
    navigator.mediaDevices?.addEventListener?.('devicechange', loadAudioOutputs);
    return () => {
      navigator.mediaDevices?.removeEventListener?.('devicechange', loadAudioOutputs);
    };
  }, []);

  const handleOutputChange = async (deviceId) => {
    setSelectedOutput(deviceId);
    if (audioRef.current && typeof audioRef.current.setSinkId === 'function') {
      try {
        await audioRef.current.setSinkId(deviceId);
      } catch (err) {
        console.warn('[WirelessMic] setSinkId error:', err);
      }
    }
  };

  // 1. Play audio stream through HTML5 audio element
  useEffect(() => {
    const audio = audioRef.current;
    if (audio && stream) {
      audio.srcObject = stream;
      audio.muted = isMuted;
      audio.volume = volume;
      audio.play().catch((err) => {
        console.warn('[WirelessMic] Audio play error:', err);
      });
    }
  }, [stream]);

  // Sync volume & mute changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.muted = isMuted;
      audioRef.current.volume = volume;
    }
  }, [isMuted, volume]);

  // 2. Real-time VU meter via Web Audio API
  useEffect(() => {
    if (!stream) return;
    let audioCtx;
    let analyser;
    let source;
    let animId;

    try {
      const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
      if (AudioCtxClass) {
        audioCtx = new AudioCtxClass();
        analyser = audioCtx.createAnalyser();
        analyser.fftSize = 64;
        source = audioCtx.createMediaStreamSource(stream);
        source.connect(analyser);

        const dataArray = new Uint8Array(analyser.frequencyBinCount);

        const checkLevel = () => {
          analyser.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
          }
          const avg = sum / dataArray.length;
          const level = Math.min(100, Math.round((avg / 128) * 100));
          setAudioLevel(level);
          animId = requestAnimationFrame(checkLevel);
        };
        checkLevel();
      }
    } catch (e) {
      console.warn('[WirelessMic] Web Audio API init note:', e);
    }

    return () => {
      if (animId) cancelAnimationFrame(animId);
      if (source) try { source.disconnect(); } catch (_) {}
      if (audioCtx) try { audioCtx.close(); } catch (_) {}
    };
  }, [stream]);

  // 3. Recording timer
  useEffect(() => {
    let interval;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordSeconds((s) => s + 1);
      }, 1000);
    } else {
      setRecordSeconds(0);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  const toggleMute = () => {
    triggerHaptic([20]);
    setIsMuted(!isMuted);
  };

  const handleStartRecording = () => {
    if (!stream) return;
    triggerHaptic([40]);
    playSound('connect');
    recordedChunksRef.current = [];

    try {
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';
      const recorder = new MediaRecorder(stream, { mimeType });
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          recordedChunksRef.current.push(e.data);
        }
      };
      recorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ENCross_MicRecord_${new Date().toISOString().replace(/[:.]/g, '-')}.webm`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        playSound('complete');
      };
      recorder.start(500);
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
    } catch (err) {
      alert('Gagal memulai rekaman audio: ' + err.message);
    }
  };

  const handleStopRecording = () => {
    triggerHaptic([40]);
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const formatTimer = (totalSeconds) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      {/* Hidden Audio Element */}
      <audio ref={audioRef} autoPlay playsInline />

      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden text-left flex flex-col relative">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-zinc-800 bg-zinc-950/60 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
              <Mic className="w-5 h-5 animate-pulse" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold text-white truncate">
                  Mikrofon Wireless PC
                </h3>
                <span className="text-[10px] bg-emerald-950/80 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded font-mono font-bold uppercase">
                  LIVE
                </span>
              </div>
              <p className="text-xs text-zinc-400 truncate flex items-center gap-1.5 mt-0.5">
                <Smartphone className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                <span>Dari HP: {senderName || 'Smartphone'}</span>
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              triggerHaptic([20]);
              onClose();
            }}
            className="text-zinc-400 hover:text-white p-2 rounded-xl hover:bg-zinc-800 transition cursor-pointer shrink-0"
            title="Tutup / Putus Koneksi Mic"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Visualizer & Mic Center */}
        <div className="p-6 sm:p-8 flex flex-col items-center justify-center bg-black/30">
          <div className="relative flex items-center justify-center mb-6">
            {/* Pulsing ring proportional to sound level */}
            <div
              className="absolute rounded-full bg-emerald-500/20 transition-all duration-75"
              style={{
                width: `${120 + audioLevel * 1.2}px`,
                height: `${120 + audioLevel * 1.2}px`,
                opacity: audioLevel > 5 ? 0.7 : 0.1
              }}
            />
            <div
              className="absolute rounded-full bg-emerald-400/30 transition-all duration-75"
              style={{
                width: `${100 + audioLevel * 0.8}px`,
                height: `${100 + audioLevel * 0.8}px`,
                opacity: audioLevel > 5 ? 0.9 : 0.2
              }}
            />

            {/* Central Circle */}
            <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center shadow-xl shadow-emerald-500/20 relative z-10">
              <Mic className="w-12 h-12 text-white" />
            </div>
          </div>

          {/* Audio VU Meter Bar */}
          <div className="w-full max-w-xs mb-3">
            <div className="flex items-center justify-between text-[11px] text-zinc-400 font-mono mb-1.5">
              <span>Sensitivitas Suara:</span>
              <span className={audioLevel > 15 ? 'text-emerald-400 font-bold' : 'text-zinc-400'}>
                {audioLevel > 15 ? 'Mendeteksi Suara' : 'Hening'} ({audioLevel}%)
              </span>
            </div>
            <div className="w-full h-3 bg-zinc-950 rounded-full overflow-hidden p-0.5 border border-zinc-800">
              <div
                className={`h-full rounded-full transition-all duration-75 ${
                  audioLevel > 75
                    ? 'bg-red-500'
                    : audioLevel > 45
                    ? 'bg-amber-400'
                    : 'bg-emerald-400'
                }`}
                style={{ width: `${Math.max(4, audioLevel)}%` }}
              />
            </div>
          </div>

          {/* Recording Status Pill */}
          {isRecording && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-950/80 border border-red-500/40 text-red-200 text-xs font-mono animate-pulse mt-1">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
              <span>Merekam: {formatTimer(recordSeconds)}</span>
            </div>
          )}
        </div>

        {/* Controls & Tools */}
        <div className="p-4 sm:p-5 border-t border-zinc-800 bg-zinc-950/60 flex flex-col gap-3.5">
          {/* Speaker Monitor & Volume Slider */}
          <div className="flex items-center justify-between gap-3 bg-zinc-900/80 p-3 rounded-2xl border border-zinc-800">
            <button
              onClick={toggleMute}
              className={`p-2.5 rounded-xl transition cursor-pointer flex items-center gap-2 text-xs font-semibold ${
                isMuted
                  ? 'bg-zinc-800 text-zinc-400 hover:text-white'
                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
              }`}
              title={isMuted ? 'Aktifkan Speaker Monitor Laptop' : 'Senyapkan Speaker Monitor (Cegah Feedback)'}
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-zinc-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
              <span>{isMuted ? 'Speaker Senyap' : 'Monitor Speaker Aktif'}</span>
            </button>

            <div className="flex items-center gap-2 flex-1 max-w-[130px]">
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={volume}
                onChange={(e) => setVolume(parseFloat(e.target.value))}
                className="w-full accent-emerald-500 cursor-pointer"
                title={`Volume: ${Math.round(volume * 100)}%`}
              />
              <span className="text-[11px] text-zinc-400 font-mono w-7 text-right">
                {Math.round(volume * 100)}%
              </span>
            </div>
          </div>

          {/* Audio Output Route Selector */}
          <div className="bg-zinc-900/80 p-3 rounded-2xl border border-zinc-800 flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-zinc-300 flex items-center gap-1.5">
                <Volume2 className="w-3.5 h-3.5 text-teal-400" />
                Rute Output Suara Laptop:
              </span>
              {outputDevices.some((d) => d.label.toLowerCase().includes('cable')) && (
                <span className="text-[10px] bg-teal-500/20 text-teal-300 border border-teal-500/30 px-1.5 py-0.5 rounded font-medium">
                  VB-Cable Siap
                </span>
              )}
            </div>

            <select
              value={selectedOutput}
              onChange={(e) => handleOutputChange(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-700/80 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-teal-500 cursor-pointer"
            >
              <option value="">Default (Speaker / Headphone Laptop)</option>
              {outputDevices.map((d) => (
                <option key={d.deviceId} value={d.deviceId}>
                  {d.label || `Device (${d.deviceId.substring(0, 5)})`}
                  {d.label.toLowerCase().includes('cable') ? ' ★ (Pilih ini untuk Voicemod)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Panduan Voicemod & Discord */}
          <div className="bg-teal-950/20 border border-teal-500/30 rounded-2xl p-3 text-left">
            <div className="flex items-center gap-1.5 mb-1 text-teal-300 text-xs font-semibold">
              <ShieldCheck className="w-4 h-4 text-teal-400 shrink-0" />
              <span>Cara Menghubungkan ke Voicemod / Discord:</span>
            </div>
            <ol className="text-[11px] text-zinc-300 space-y-1 pl-4 list-decimal leading-relaxed">
              <li>
                Jalankan installer <strong className="text-white">VBCABLE_Setup_x64.exe</strong> sebagai Administrator (folder sudah kami buka di File Explorer laptop).
              </li>
              <li>
                Pada pilihan di atas, pilih output: <strong className="text-teal-300">CABLE Input (VB-Audio)</strong>.
              </li>
              <li>
                Di Voicemod ➔ <strong className="text-emerald-400">INPUT Microphone</strong> ➔ pilih: <strong className="text-white">CABLE Output (VB-Audio)</strong>.
              </li>
            </ol>
          </div>

          <div className="text-[11px] text-zinc-400 leading-relaxed px-1">
            <p>
              💡 <strong className="text-zinc-300">Tips:</strong> Jika laptop Anda dekat dengan HP, biarkan speaker disenyapkan agar tidak terjadi gema (audio feedback) saat Anda sedang meeting atau merekam suara.
            </p>
          </div>

          {/* Action Buttons: Record & Disconnect */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            {isRecording ? (
              <button
                onClick={handleStopRecording}
                className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-red-600 hover:bg-red-500 active:scale-[0.98] text-white font-semibold text-xs transition cursor-pointer shadow-sm"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
                <span>Stop & Simpan</span>
              </button>
            ) : (
              <button
                onClick={handleStartRecording}
                className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 active:scale-[0.98] text-zinc-200 border border-zinc-700 font-semibold text-xs transition cursor-pointer"
              >
                <Radio className="w-3.5 h-3.5 text-red-400" />
                <span>Rekam Suara</span>
              </button>
            )}

            <button
              onClick={() => {
                triggerHaptic([20]);
                onClose();
              }}
              className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 active:scale-[0.98] text-zinc-300 text-xs font-semibold transition cursor-pointer"
            >
              <span>Putus Mic</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default WirelessMicModal;
