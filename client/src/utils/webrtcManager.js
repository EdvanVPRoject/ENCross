// WebRTC PeerConnection & DataChannel Manager for ENCross

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ]
};

const CHUNK_SIZE = 64 * 1024; // 64 KB chunks for fast WebRTC throughput
const BUFFER_THRESHOLD = 8 * 1024 * 1024; // 8 MB backpressure limit

// Native Android MediaProjection Screen Mirroring helper
function startNativeAndroidScreenCapture() {
  return new Promise((resolve, reject) => {
    if (!window.AndroidScreenShare?.startScreenCapture) {
      return reject(new Error('Modul Native Screen Share tidak terdeteksi di aplikasi ini.'));
    }

    let canvas = document.getElementById('__nativeScreenMirrorCanvas');
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.id = '__nativeScreenMirrorCanvas';
      canvas.width = 540;
      canvas.height = 960;
      canvas.style.display = 'none';
      canvas.style.position = 'fixed';
      canvas.style.left = '-9999px';
      document.body.appendChild(canvas);
    }

    const ctx = canvas.getContext('2d');
    let streamResolved = false;

    const timeout = setTimeout(() => {
      if (!streamResolved) {
        window.__onNativeScreenError = null;
        window.__onNativeScreenStarted = null;
        window.__onNativeScreenFrame = null;
        reject(new Error('Waktu permintaan izin siaran layar habis.'));
      }
    }, 60000);

    window.__onNativeScreenError = (msg) => {
      clearTimeout(timeout);
      window.__onNativeScreenFrame = null;
      window.__onNativeScreenStarted = null;
      window.__onNativeScreenError = null;
      reject(new Error(msg || 'Izin siaran layar ditolak.'));
    };

    window.__onNativeScreenStarted = (w, h) => {
      if (w && h) {
        canvas.width = w;
        canvas.height = h;
      }
      if (!streamResolved) {
        streamResolved = true;
        clearTimeout(timeout);
        if (ctx) {
          ctx.fillStyle = '#09090b';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
        const stream = canvas.captureStream ? canvas.captureStream(22) : null;
        if (!stream) {
          return reject(new Error('WebView Android tidak mendukung captureStream.'));
        }
        resolve(stream);
      }
    };

    window.__onNativeScreenFrame = (base64) => {
      const img = new Image();
      img.onload = () => {
        if (ctx) {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        }
      };
      img.src = 'data:image/jpeg;base64,' + base64;
    };

    // Trigger Android MediaProjection system popup
    window.AndroidScreenShare.startScreenCapture();
  });
}

export class WebRTCManager {
  constructor(socket, selfInfo) {
    this.socket = socket;
    this.selfInfo = selfInfo;
    this.peers = new Map(); // peerId -> { pc, dataChannel, stream }
    this.incomingFiles = new Map(); // fileId -> { meta, chunks: [], receivedBytes: 0, startTime }
    this.activeTransfers = new Map(); // fileId -> transferState

    // Event callbacks
    this.onTransferProgress = null;
    this.onRemoteStream = null;
    this.onScreenShareEnded = null;

    // Camera & Screen share state
    this.currentFacingMode = 'environment';
    this.activeSharePeerId = null;
    this.activeShareMode = null;

    this.setupSocketListeners();
  }

  setupSocketListeners() {
    this.socket.on('signal-offer', async ({ senderId, offer, metadata }) => {
      console.log(`[WebRTC] Received offer from ${senderId}`, metadata);
      const pc = this.getOrCreatePeerConnection(senderId);
      const peerObj = this.peers.get(senderId);
      if (metadata && metadata.mode) {
        peerObj.remoteMode = metadata.mode;
      }

      await pc.setRemoteDescription(new RTCSessionDescription(offer));

      // Process queued candidates
      if (peerObj.pendingCandidates && peerObj.pendingCandidates.length > 0) {
        for (const cand of peerObj.pendingCandidates) {
          await pc.addIceCandidate(new RTCIceCandidate(cand)).catch(e => console.warn(e));
        }
        peerObj.pendingCandidates = [];
      }

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      this.socket.emit('signal-answer', {
        targetId: senderId,
        answer
      });
    });

    this.socket.on('signal-answer', async ({ senderId, answer }) => {
      console.log(`[WebRTC] Received answer from ${senderId}`);
      const peerObj = this.peers.get(senderId);
      if (peerObj && peerObj.pc) {
        await peerObj.pc.setRemoteDescription(new RTCSessionDescription(answer));

        // Process queued candidates
        if (peerObj.pendingCandidates && peerObj.pendingCandidates.length > 0) {
          for (const cand of peerObj.pendingCandidates) {
            await peerObj.pc.addIceCandidate(new RTCIceCandidate(cand)).catch(e => console.warn(e));
          }
          peerObj.pendingCandidates = [];
        }
      }
    });

    this.socket.on('signal-ice-candidate', async ({ senderId, candidate }) => {
      const peerObj = this.peers.get(senderId);
      if (peerObj && peerObj.pc && candidate) {
        if (!peerObj.pc.remoteDescription || !peerObj.pc.remoteDescription.type) {
          peerObj.pendingCandidates.push(candidate);
        } else {
          try {
            await peerObj.pc.addIceCandidate(new RTCIceCandidate(candidate));
          } catch (err) {
            console.warn('[WebRTC] Failed to add ICE candidate', err);
          }
        }
      }
    });
  }

  getOrCreatePeerConnection(peerId) {
    if (this.peers.has(peerId)) {
      return this.peers.get(peerId).pc;
    }

    const pc = new RTCPeerConnection(ICE_SERVERS);
    const peerObj = {
      pc,
      dataChannel: null,
      localStream: null,
      remoteStream: null,
      pendingCandidates: []
    };
    this.peers.set(peerId, peerObj);

    // ICE Candidate handler
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.socket.emit('signal-ice-candidate', {
          targetId: peerId,
          candidate: event.candidate
        });
      }
    };

    // Receiver: Inbound DataChannel
    pc.ondatachannel = (event) => {
      const channel = event.channel;
      peerObj.dataChannel = channel;
      this.setupDataChannel(channel, peerId);
    };

    // Receiver: Inbound Screen / Media Stream
    pc.ontrack = (event) => {
      console.log(`[WebRTC] Remote stream track received from ${peerId}`, event);
      const stream = (event.streams && event.streams[0]) ? event.streams[0] : new MediaStream([event.track]);
      peerObj.remoteStream = stream;
      if (this.onRemoteStream) {
        this.onRemoteStream(peerId, stream, peerObj.remoteMode);
      }
    };

    pc.onconnectionstatechange = () => {
      console.log(`[WebRTC] Peer ${peerId} state:`, pc.connectionState);
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        this.closePeer(peerId);
      }
    };

    return pc;
  }

  async connectToPeer(peerId) {
    const pc = this.getOrCreatePeerConnection(peerId);
    const peerObj = this.peers.get(peerId);

    // Create Data Channel for sending files/messages
    if (!peerObj.dataChannel || peerObj.dataChannel.readyState !== 'open') {
      const channel = pc.createDataChannel('encross-channel', {
        ordered: true
      });
      peerObj.dataChannel = channel;
      this.setupDataChannel(channel, peerId);
    }

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    this.socket.emit('signal-offer', {
      targetId: peerId,
      offer
    });

    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        if (peerObj.dataChannel && peerObj.dataChannel.readyState === 'open') {
          clearInterval(checkInterval);
          resolve(peerObj.dataChannel);
        }
      }, 100);

      // Timeout after 8 seconds
      setTimeout(() => {
        clearInterval(checkInterval);
        resolve(peerObj.dataChannel);
      }, 8000);
    });
  }

  setupDataChannel(channel, peerId) {
    channel.binaryType = 'arraybuffer';

    channel.onopen = () => {
      console.log(`[DataChannel] Open with peer ${peerId}`);
    };

    channel.onmessage = (event) => {
      this.handleIncomingData(event.data, peerId);
    };

    channel.onerror = (err) => {
      console.error(`[DataChannel Error]`, err);
    };

    channel.onclose = () => {
      console.log(`[DataChannel Closed] with ${peerId}`);
    };
  }

  handleIncomingData(data, peerId) {
    if (typeof data === 'string') {
      try {
        const msg = JSON.parse(data);
        if (msg.type === 'file-start') {
          // New file transfer beginning
          this.incomingFiles.set(msg.fileId, {
            meta: msg,
            chunks: [],
            receivedBytes: 0,
            startTime: Date.now(),
            lastUpdate: Date.now(),
            peerId
          });

          if (this.onTransferProgress) {
            this.onTransferProgress({
              fileId: msg.fileId,
              fileName: msg.name,
              fileSize: msg.size,
              progress: 0,
              speed: '0 B/s',
              direction: 'download',
              peerId,
              completed: false
            });
          }
        } else if (msg.type === 'file-end') {
          // File completed
          const incoming = this.incomingFiles.get(msg.fileId);
          if (incoming) {
            const blob = new Blob(incoming.chunks, { type: incoming.meta.mimeType || 'application/octet-stream' });
            const blobUrl = URL.createObjectURL(blob);

            if (this.onTransferProgress) {
              this.onTransferProgress({
                fileId: msg.fileId,
                fileName: incoming.meta.name,
                fileSize: incoming.meta.size,
                progress: 100,
                speed: 'Completed',
                direction: 'download',
                peerId,
                completed: true,
                blobUrl,
                blob
              });
            }
            this.incomingFiles.delete(msg.fileId);
          }
        }
      } catch (e) {
        console.warn('[DataChannel] Error parsing JSON message', e);
      }
    } else if (data instanceof ArrayBuffer) {
      // Binary chunk received for active incoming file
      // If multiple files in flight, grab the latest active incoming file
      const currentEntry = Array.from(this.incomingFiles.entries())
        .filter(([_, v]) => v.peerId === peerId)
        .pop();

      if (!currentEntry) return;

      const [fileId, incoming] = currentEntry;
      incoming.chunks.push(data);
      incoming.receivedBytes += data.byteLength;

      const now = Date.now();
      // Throttle UI update every 100ms
      if (now - incoming.lastUpdate > 100 || incoming.receivedBytes >= incoming.meta.size) {
        incoming.lastUpdate = now;
        const elapsedSec = Math.max((now - incoming.startTime) / 1000, 0.05);
        const bytesPerSec = incoming.receivedBytes / elapsedSec;
        const progress = Math.min(Math.round((incoming.receivedBytes / incoming.meta.size) * 100), 99);

        if (this.onTransferProgress) {
          this.onTransferProgress({
            fileId,
            fileName: incoming.meta.name,
            fileSize: incoming.meta.size,
            progress,
            speed: `${(bytesPerSec / (1024 * 1024)).toFixed(2)} MB/s`,
            direction: 'download',
            peerId,
            completed: false
          });
        }
      }
    }
  }

  // Send a file to a peer with chunking & backpressure
  async sendFile(peerId, file) {
    const peerObj = this.peers.get(peerId);
    let channel = peerObj?.dataChannel;

    if (!channel || channel.readyState !== 'open') {
      channel = await this.connectToPeer(peerId);
    }

    if (!channel || channel.readyState !== 'open') {
      throw new Error('Gagal membuka koneksi peer-to-peer ke perangkat tujuan.');
    }

    const fileId = 'file_' + Math.random().toString(36).substring(2, 10);
    const startTime = Date.now();

    // 1. Send metadata header
    channel.send(JSON.stringify({
      type: 'file-start',
      fileId,
      name: file.name,
      size: file.size,
      mimeType: file.type || 'application/octet-stream'
    }));

    if (this.onTransferProgress) {
      this.onTransferProgress({
        fileId,
        fileName: file.name,
        fileSize: file.size,
        progress: 0,
        speed: '0 B/s',
        direction: 'upload',
        peerId,
        completed: false
      });
    }

    let offset = 0;
    let lastUpdate = Date.now();

    // 2. Stream file chunks with backpressure
    while (offset < file.size) {
      // Check backpressure buffer
      if (channel.bufferedAmount > BUFFER_THRESHOLD) {
        await new Promise((resolve) => {
          channel.onbufferedamountlow = () => {
            channel.onbufferedamountlow = null;
            resolve();
          };
        });
      }

      const slice = file.slice(offset, offset + CHUNK_SIZE);
      const buffer = await slice.arrayBuffer();
      channel.send(buffer);
      offset += buffer.byteLength;

      const now = Date.now();
      if (now - lastUpdate > 100 || offset >= file.size) {
        lastUpdate = now;
        const elapsedSec = Math.max((now - startTime) / 1000, 0.05);
        const bytesPerSec = offset / elapsedSec;
        const progress = Math.min(Math.round((offset / file.size) * 100), 99);

        if (this.onTransferProgress) {
          this.onTransferProgress({
            fileId,
            fileName: file.name,
            fileSize: file.size,
            progress,
            speed: `${(bytesPerSec / (1024 * 1024)).toFixed(2)} MB/s`,
            direction: 'upload',
            peerId,
            completed: false
          });
        }
      }
    }

    // 3. Send file completion packet
    channel.send(JSON.stringify({
      type: 'file-end',
      fileId
    }));

    if (this.onTransferProgress) {
      this.onTransferProgress({
        fileId,
        fileName: file.name,
        fileSize: file.size,
        progress: 100,
        speed: 'Completed',
        direction: 'upload',
        peerId,
        completed: true
      });
    }
  }

  // Phase 4: Screen Sharing / Live Video Stream
  async startScreenShare(peerId, mode = 'screen') {
    const pc = this.getOrCreatePeerConnection(peerId);
    const peerObj = this.peers.get(peerId);

    if (!navigator.mediaDevices && !window.AndroidScreenShare?.isScreenCaptureAvailable?.()) {
      throw new Error('Akses kamera/layar di HP dibatasi oleh Chrome jika bukan HTTPS. Buka web menggunakan alamat https:// (koneksi aman).');
    }

    const isMobile = /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent);
    let stream;

    // Check if camera mode is requested or screen share
    if (mode === 'camera') {
      this.currentFacingMode = isMobile ? 'environment' : 'user';
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: this.currentFacingMode },
            width: { ideal: 1280 },
            height: { ideal: 720 }
          },
          audio: false
        });
      } catch (camErr) {
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: this.currentFacingMode },
            audio: false
          });
        } catch (retryErr) {
          stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false
          });
        }
      }
      try {
        const tr = stream?.getVideoTracks()?.[0];
        if (tr?.getSettings?.()?.deviceId) {
          this.currentDeviceId = tr.getSettings().deviceId;
        }
      } catch (_) {}
    } else {
      // Screen mirror mode: Prioritize Native MediaProjection on Android APK
      const hasNativeCapture = typeof window !== 'undefined' && Boolean(window.AndroidScreenShare?.isScreenCaptureAvailable?.());

      if (hasNativeCapture) {
        stream = await startNativeAndroidScreenCapture();
      } else if (navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
        try {
          stream = await navigator.mediaDevices.getDisplayMedia({
            video: true,
            audio: false
          });
        } catch (dispErr) {
          if (dispErr.name === 'NotAllowedError') {
            throw new Error('Izin berbagi layar dibatalkan.');
          }
          throw new Error('Gagal memulai mirroring layar: ' + (dispErr.message || 'Tidak didukung'));
        }
      } else {
        throw new Error('Mirroring Layar dari HP dibatasi oleh sistem Android WebView. Gunakan aplikasi ENCross APK untuk siaran layar via MediaProjection.');
      }
    }

    peerObj.localStream = stream;
    peerObj.shareMode = mode;
    this.activeSharePeerId = peerId;
    this.activeShareMode = mode;

    // Remove old video senders if any
    const existingSenders = pc.getSenders();
    existingSenders.forEach((sender) => {
      if (sender.track && sender.track.kind === 'video') {
        try { pc.removeTrack(sender); } catch(e) {}
      }
    });

    // Add track to PeerConnection
    stream.getTracks().forEach((track) => {
      pc.addTrack(track, stream);
    });

    // Handle user clicking "Stop Sharing" on browser banner
    stream.getVideoTracks()[0].onended = () => {
      this.stopScreenShare(peerId);
    };

    // Renegotiate offer
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    this.socket.emit('signal-offer', {
      targetId: peerId,
      offer,
      metadata: { isScreenShare: true, mode }
    });

    this.socket.emit('screen-share-status', { targetId: peerId, isSharing: true });
    return stream;
  }

  // Switch between front ('user') and rear ('environment') camera without tearing down WebRTC
  async switchCamera(peerId = this.activeSharePeerId) {
    const targetId = peerId || this.activeSharePeerId;
    const peerObj = targetId ? this.peers.get(targetId) : null;
    if (!peerObj || !peerObj.pc) {
      throw new Error('Tidak ada siaran kamera yang aktif');
    }

    const currentMode = this.currentFacingMode || 'environment';
    const nextFacingMode = currentMode === 'user' ? 'environment' : 'user';

    // 1. MUST stop existing video track on Android first so hardware sensor is released!
    const oldTracks = peerObj.localStream ? peerObj.localStream.getVideoTracks() : [];
    oldTracks.forEach((track) => {
      try {
        track.stop();
      } catch (_) {}
    });

    // Small delay to let Android Camera HAL completely release the sensor
    await new Promise((resolve) => setTimeout(resolve, 80));

    let newStream = null;

    // Strategy 1: Physical Camera Sensor selection via enumerateDevices (Most reliable on Android)
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter((d) => d.kind === 'videoinput');

      if (videoDevices.length > 1) {
        let matched = null;
        if (nextFacingMode === 'user') {
          matched =
            videoDevices.find((d) => /front|user|depan|selfie|facing front/i.test(d.label)) ||
            (this.currentDeviceId ? videoDevices.find((d) => d.deviceId !== this.currentDeviceId) : null) ||
            videoDevices[1] ||
            videoDevices[videoDevices.length - 1];
        } else {
          matched =
            videoDevices.find((d) => /back|environment|belakang|rear|facing back/i.test(d.label)) ||
            (this.currentDeviceId ? videoDevices.find((d) => d.deviceId !== this.currentDeviceId) : null) ||
            videoDevices[0];
        }

        if (matched && matched.deviceId) {
          try {
            newStream = await navigator.mediaDevices.getUserMedia({
              video: {
                deviceId: { exact: matched.deviceId },
                width: { ideal: 1280 },
                height: { ideal: 720 }
              },
              audio: false
            });
            this.currentDeviceId = matched.deviceId;
          } catch (eDev) {
            try {
              newStream = await navigator.mediaDevices.getUserMedia({
                video: { deviceId: matched.deviceId },
                audio: false
              });
              this.currentDeviceId = matched.deviceId;
            } catch (eDevFallback) {
              console.warn('[Camera] deviceId exact/ideal failed, proceeding to facingMode...', eDevFallback);
            }
          }
        }
      }
    } catch (eEnum) {
      console.warn('[Camera] Device enumeration error:', eEnum);
    }

    // Strategy 2: Exact facingMode
    if (!newStream) {
      try {
        newStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { exact: nextFacingMode },
            width: { ideal: 1280 },
            height: { ideal: 720 }
          },
          audio: false
        });
      } catch (e1) {
        console.warn('[Camera] Exact facingMode failed, trying ideal constraint...', e1);
      }
    }

    // Strategy 3: Ideal facingMode
    if (!newStream) {
      try {
        newStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: nextFacingMode,
            width: { ideal: 1280 },
            height: { ideal: 720 }
          },
          audio: false
        });
      } catch (e2) {
        console.warn('[Camera] Ideal facingMode failed, falling back to general video...', e2);
      }
    }

    // Strategy 4: General video request fallback
    if (!newStream) {
      newStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
    }

    const newVideoTrack = newStream.getVideoTracks()[0];
    const pc = peerObj.pc;
    const senders = pc.getSenders();
    const videoSender = senders.find((s) => s.track && s.track.kind === 'video');

    if (videoSender) {
      await videoSender.replaceTrack(newVideoTrack);
    } else {
      pc.addTrack(newVideoTrack, newStream);
    }

    peerObj.localStream = newStream;
    this.currentFacingMode = nextFacingMode;
    if (newVideoTrack?.getSettings?.()?.deviceId) {
      this.currentDeviceId = newVideoTrack.getSettings().deviceId;
    }

    // Notify peers via socket about camera facing update
    if (this.socket && targetId) {
      this.socket.emit('camera-facing-changed', {
        targetId,
        facingMode: nextFacingMode
      });
    }

    newVideoTrack.onended = () => {
      this.stopScreenShare(targetId);
    };

    return { facingMode: nextFacingMode, stream: newStream };
  }

  stopScreenShare(peerId) {
    if (typeof window !== 'undefined' && window.AndroidScreenShare?.stopScreenCapture) {
      try {
        window.AndroidScreenShare.stopScreenCapture();
      } catch (_) {}
    }
    const peerObj = this.peers.get(peerId);
    if (peerObj && peerObj.localStream) {
      peerObj.localStream.getTracks().forEach((track) => track.stop());
      peerObj.localStream = null;
      peerObj.shareMode = null;
    }
    if (this.activeSharePeerId === peerId) {
      this.activeSharePeerId = null;
      this.activeShareMode = null;
    }
    this.socket.emit('screen-share-status', { targetId: peerId, isSharing: false });
    if (this.onScreenShareEnded) {
      this.onScreenShareEnded(peerId);
    }
  }

  closePeer(peerId) {
    if (this.peers.has(peerId)) {
      const peer = this.peers.get(peerId);
      if (peer.dataChannel) peer.dataChannel.close();
      if (peer.localStream) peer.localStream.getTracks().forEach(t => t.stop());
      if (peer.pc) peer.pc.close();
      this.peers.delete(peerId);
    }
  }

  cleanup() {
    this.peers.forEach((_, peerId) => this.closePeer(peerId));
  }
}
