// WebRTC PeerConnection & DataChannel Manager for VanCross

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ]
};

const CHUNK_SIZE = 64 * 1024; // 64 KB chunks for fast WebRTC throughput
const BUFFER_THRESHOLD = 8 * 1024 * 1024; // 8 MB backpressure limit

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

    this.setupSocketListeners();
  }

  setupSocketListeners() {
    this.socket.on('signal-offer', async ({ senderId, offer, metadata }) => {
      console.log(`[WebRTC] Received offer from ${senderId}`, metadata);
      const pc = this.getOrCreatePeerConnection(senderId);
      const peerObj = this.peers.get(senderId);

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
        this.onRemoteStream(peerId, stream);
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
      const channel = pc.createDataChannel('vancross-channel', {
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

    if (!navigator.mediaDevices) {
      throw new Error('Akses kamera/layar di HP dibatasi oleh Chrome jika bukan HTTPS. Buka web menggunakan alamat https:// (koneksi aman).');
    }

    const isMobile = /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent);
    let stream;

    // Check if getDisplayMedia is supported or if camera mode is requested
    if (mode === 'camera' || (!navigator.mediaDevices.getDisplayMedia && navigator.mediaDevices.getUserMedia)) {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: isMobile ? 'environment' : 'user',
            width: { ideal: 1280 },
            height: { ideal: 720 }
          },
          audio: false
        });
      } catch (camErr) {
        throw new Error('Gagal mengakses kamera HP: ' + camErr.message);
      }
    } else {
      try {
        // Mobile Android cannot accept desktop-only constraint 'cursor: always'
        const constraints = isMobile
          ? { video: true, audio: false }
          : { video: { cursor: 'always', frameRate: { ideal: 30, max: 60 } }, audio: false };

        stream = await navigator.mediaDevices.getDisplayMedia(constraints);
      } catch (dispErr) {
        // If mobile Chrome blocks getDisplayMedia on plain HTTP, suggest camera fallback
        if (isMobile && navigator.mediaDevices.getUserMedia) {
          console.warn('[ScreenShare] getDisplayMedia failed, falling back to camera', dispErr);
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'environment' },
            audio: false
          });
        } else {
          throw dispErr;
        }
      }
    }

    peerObj.localStream = stream;

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

  stopScreenShare(peerId) {
    const peerObj = this.peers.get(peerId);
    if (peerObj && peerObj.localStream) {
      peerObj.localStream.getTracks().forEach(track => track.stop());
      peerObj.localStream = null;
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
