import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distPath = path.join(__dirname, '../client/dist');

const app = express();
app.use(cors());
app.use(express.json());

// Serve static frontend assets if built
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
}

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  },
  maxHttpBufferSize: 1e8 // 100MB buffer for fallback binary streaming
});

// Helper to get local network IPv4 addresses
function getLocalIpAddresses() {
  const interfaces = os.networkInterfaces();
  const addresses = [];

  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      // Skip internal/loopback and non-IPv4 addresses
      if (iface.family === 'IPv4' && !iface.internal) {
        addresses.push({
          interface: name,
          address: iface.address
        });
      }
    }
  }
  return addresses;
}

// In-memory rooms and peers mapping:
// rooms: { [roomId: string]: { [socketId: string]: PeerInfo } }
const rooms = new Map();

// API: Endpoint for frontend to fetch server network information
app.get('/api/network-info', (req, res) => {
  const localIps = getLocalIpAddresses();
  res.json({
    localIps,
    port: PORT,
    serverHostname: os.hostname(),
    timestamp: Date.now()
  });
});

// Serve Android APK directly for local LAN downloads
app.get('/api/download-apk', (req, res) => {
  const candidates = [
    path.join(distPath, 'ENCross.apk'),
    path.join(__dirname, '../release/ENCross.apk'),
    path.join(__dirname, 'release/ENCross.apk'),
    path.join(__dirname, '../client/android/app/build/outputs/apk/debug/app-debug.apk'),
    path.join(__dirname, 'client/android/app/build/outputs/apk/debug/app-debug.apk'),
    path.join(__dirname, '../client/public/ENCross.apk'),
    path.join(distPath, 'VanCross.apk'),
    path.join(__dirname, '../release/VanCross.apk')
  ];
  for (const cand of candidates) {
    if (fs.existsSync(cand)) {
      res.setHeader('Content-Type', 'application/vnd.android.package-archive');
      return res.download(cand, 'ENCross.apk');
    }
  }
  res.status(404).send('File APK belum tersedia. Silakan build APK terlebih dahulu.');
});

// Helper to detect Windows drives (C:, D:, etc.)
function getWindowsDrives() {
  if (os.platform() !== 'win32') return [];
  const drives = [];
  const letters = ['C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'];
  for (const letter of letters) {
    try {
      const rootPath = `${letter}:\\`;
      if (fs.existsSync(rootPath)) {
        drives.push({
          letter: `${letter}:`,
          path: `${letter}:/`,
          name: letter === 'C' ? 'Drive C: (Sistem)' : letter === 'D' ? 'Drive D: (Data)' : `Drive ${letter}:`
        });
      }
    } catch (_) {}
  }
  return drives;
}

// Helper to safely resolve requested path (supports Windows Drive letters C:, D: and user home directory)
function resolveSafePcPath(requestedPath) {
  if (!requestedPath || requestedPath === '.' || requestedPath.trim() === '') {
    return os.homedir();
  }
  let clean = requestedPath.trim();
  // Check if requestedPath is a Windows drive path like "C:/", "D:\Folder", "C:"
  if (/^[a-zA-Z]:[/\\]?/.test(clean)) {
    const normalized = path.resolve(clean);
    return normalized;
  }
  // Otherwise resolve relative to user's home directory
  const home = os.homedir();
  const cleanRel = clean.replace(/^[/\\]+/, '');
  const resolved = path.resolve(home, cleanRel);
  return resolved;
}

// HTTP Endpoint for fast LAN direct file downloads from PC Host
app.get('/api/pc-files/download', (req, res) => {
  try {
    const rawPath = req.query.path;
    if (!rawPath) {
      return res.status(400).send('Parameter path tidak valid.');
    }
    const safePath = resolveSafePcPath(rawPath);
    if (!fs.existsSync(safePath) || fs.statSync(safePath).isDirectory()) {
      return res.status(404).send('File tidak ditemukan di PC Host.');
    }
    return res.download(safePath, path.basename(safePath));
  } catch (err) {
    return res.status(500).send('Gagal mengunduh file: ' + err.message);
  }
});

// HTTP Range Request endpoint for instant media streaming (video & audio)
app.get('/api/pc-files/stream', (req, res) => {
  try {
    const rawPath = req.query.path;
    if (!rawPath) {
      return res.status(400).send('Parameter path tidak valid.');
    }
    const safePath = resolveSafePcPath(rawPath);
    if (!fs.existsSync(safePath) || fs.statSync(safePath).isDirectory()) {
      return res.status(404).send('File media tidak ditemukan di PC Host.');
    }

    const stat = fs.statSync(safePath);
    const fileSize = stat.size;
    const range = req.headers.range;

    const ext = path.extname(safePath).toLowerCase();
    const mimeTypes = {
      '.mp4': 'video/mp4',
      '.mkv': 'video/x-matroska',
      '.webm': 'video/webm',
      '.mov': 'video/quicktime',
      '.avi': 'video/x-msvideo',
      '.3gp': 'video/3gpp',
      '.ts': 'video/mp2t',
      '.mp3': 'audio/mpeg',
      '.wav': 'audio/wav',
      '.ogg': 'audio/ogg',
      '.m4a': 'audio/mp4',
      '.aac': 'audio/aac',
      '.flac': 'audio/flac',
      '.opus': 'audio/opus',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.webp': 'image/webp',
      '.gif': 'image/gif',
      '.bmp': 'image/bmp',
      '.svg': 'image/svg+xml'
    };
    const contentType = mimeTypes[ext] || 'application/octet-stream';

    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Access-Control-Allow-Origin', '*');

    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

      if (start >= fileSize) {
        res.status(416).setHeader('Content-Range', `bytes */${fileSize}`);
        return res.end();
      }

      const chunksize = end - start + 1;
      const file = fs.createReadStream(safePath, { start, end });
      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Content-Length': chunksize,
        'Content-Type': contentType,
      });
      file.pipe(res);
    } else {
      res.writeHead(200, {
        'Content-Length': fileSize,
        'Content-Type': contentType,
      });
      fs.createReadStream(safePath).pipe(res);
    }
  } catch (err) {
    return res.status(500).send('Gagal streaming file: ' + err.message);
  }
});

// HTTP Proxy Endpoint for Phone Media Streaming (Fallback if direct phone port 8088 is blocked)
app.get('/api/media-stream-proxy', (req, res) => {
  const targetIp = req.query.targetIp;
  const targetPort = parseInt(req.query.targetPort, 10) || 8088;
  const rawPath = req.query.path;

  if (!targetIp || !rawPath) {
    return res.status(400).send('Parameter targetIp dan path wajib diisi.');
  }

  const options = {
    hostname: targetIp,
    port: targetPort,
    path: `/stream?path=${encodeURIComponent(rawPath)}`,
    method: 'GET',
    headers: {}
  };

  if (req.headers.range) {
    options.headers.range = req.headers.range;
  }

  const proxyReq = http.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res);
  });

  proxyReq.on('error', (err) => {
    console.error('[MediaProxy] Error connecting to phone stream:', err.message);
    if (!res.headersSent) {
      res.status(502).send('Gagal menghubungi server stream HP: ' + err.message);
    }
  });

  proxyReq.end();
});


// SPA fallback for direct web browser navigation
app.use((req, res, next) => {
  if (req.method !== 'GET') return next();
  if (req.path.startsWith('/api') || req.path.startsWith('/socket.io')) {
    return next();
  }
  const indexPath = path.join(distPath, 'index.html');
  if (fs.existsSync(indexPath)) {
    return res.sendFile(indexPath);
  }
  next();
});

// Helper to normalize client IP address from socket
function getSocketClientIp(socket) {
  let ip = socket.handshake.address || socket.conn?.remoteAddress || '';
  if (ip.startsWith('::ffff:')) {
    ip = ip.substring(7);
  }
  if (ip === '::1' || ip === '127.0.0.1') {
    return '127.0.0.1';
  }
  return ip;
}

// Socket.IO signaling & presence logic
io.on('connection', (socket) => {
  let currentRoom = null;
  let peerData = null;
  let deviceKey = null;

  const clientIp = getSocketClientIp(socket);
  const serverIps = getLocalIpAddresses().map(item => item.address);
  const isHost = clientIp === '127.0.0.1' || serverIps.includes(clientIp);

  console.log(`[Socket Connected] ID: ${socket.id} from IP: ${clientIp} (isHost: ${isHost})`);

  // Rename device live
  socket.on('rename-device', ({ name }) => {
    if (peerData) {
      peerData.name = name;
      if (currentRoom && rooms.has(currentRoom)) {
        const roomPeers = rooms.get(currentRoom);
        if (roomPeers.has(deviceKey)) {
          roomPeers.get(deviceKey).name = name;
        }
        socket.to(currentRoom).emit('peer-renamed', { id: socket.id, deviceId: deviceKey, name });
      }
    }
  });

  // Register device in a room
  socket.on('join-room', ({ roomId, device }) => {
    currentRoom = roomId || 'default-room';

    // Unique physical hardware key:
    // Prioritize client-generated persistent deviceId (unique per browser/app profile)
    // to allow multiple devices (phones, laptops, tablets) to connect simultaneously.
    deviceKey = (device?.deviceId && typeof device.deviceId === 'string' && device.deviceId.length > 3)
      ? device.deviceId
      : (isHost ? `host_${socket.id.substring(0, 5)}` : `client_${clientIp}_${socket.id.substring(0, 5)}`);

    peerData = {
      id: socket.id,
      deviceId: deviceKey,
      clientIp: device?.ip || clientIp,
      ip: device?.ip || clientIp,
      webdavPort: device?.webdavPort || (device?.os === 'Android' ? 8089 : undefined),
      name: device?.name || (isHost ? 'PC' : 'Perangkat'),
      deviceType: device?.deviceType || (isHost ? 'desktop' : 'mobile'),
      os: device?.os || 'Unknown OS',
      browser: device?.browser || 'Browser',
      joinedAt: Date.now()
    };

    socket.join(currentRoom);

    if (!rooms.has(currentRoom)) {
      rooms.set(currentRoom, new Map()); // deviceKey -> peerData
    }

    const roomPeers = rooms.get(currentRoom);

    // If the exact same browser tab reconnected with a new socket, update it
    const existing = roomPeers.get(deviceKey);
    if (existing && existing.id !== socket.id) {
      console.log(`[Device Handover] ${peerData.name} on ${clientIp} updated socket from ${existing.id} to ${socket.id}`);
      io.to(existing.id).emit('tab-superseded');

      // Preserve existing custom name if the new connecting tab uses a generic default name
      if (existing.name && (!device?.name || device.name === 'PC' || device.name === 'Smartphone' || device.name.includes('Windows PC') || device.name.includes('Android Phone'))) {
        peerData.name = existing.name;
      }
    }

    roomPeers.set(deviceKey, peerData);

    console.log(`[Room: ${currentRoom}] ${peerData.name} (${deviceKey}) online. Total physical devices: ${roomPeers.size}`);

    // Notify other physical devices in the room (skip self deviceKey)
    socket.to(currentRoom).emit('peer-joined', peerData);

    // Send unique peers list (excluding self deviceKey)
    const peersList = Array.from(roomPeers.values()).filter(p => p.deviceId !== deviceKey);
    socket.emit('room-peers', {
      self: peerData,
      peers: peersList,
      roomId: currentRoom
    });
  });

  // WebRTC Signaling: Offer
  socket.on('signal-offer', ({ targetId, offer, metadata }) => {
    io.to(targetId).emit('signal-offer', {
      senderId: socket.id,
      offer,
      metadata
    });
  });

  // WebRTC Signaling: Answer
  socket.on('signal-answer', ({ targetId, answer }) => {
    io.to(targetId).emit('signal-answer', {
      senderId: socket.id,
      answer
    });
  });

  // WebRTC Signaling: ICE Candidate
  socket.on('signal-ice-candidate', ({ targetId, candidate }) => {
    io.to(targetId).emit('signal-ice-candidate', {
      senderId: socket.id,
      candidate
    });
  });

  socket.on('send-text-message', ({ targetId, text, timestamp }) => {
    let resolvedTargetSocket = null;

    const isSocketActive = (id) =>
      io.sockets?.sockets?.has ? io.sockets.sockets.has(id) : Boolean(io.sockets?.sockets?.[id]);

    if (currentRoom && rooms.has(currentRoom)) {
      const roomPeers = rooms.get(currentRoom);

      // 1. Direct deviceKey match (e.g. "client_192.168.1.15" or "host_pc")
      if (targetId && roomPeers.has(targetId)) {
        resolvedTargetSocket = roomPeers.get(targetId).id;
      } else if (targetId) {
        // 2. Search peers by socket.id or deviceId
        for (const peer of roomPeers.values()) {
          if (peer.id === targetId || peer.deviceId === targetId) {
            resolvedTargetSocket = peer.id;
            break;
          }
        }
      }

      // 3. Check if targetId is an active socket ID
      if (!resolvedTargetSocket && targetId && isSocketActive(targetId)) {
        resolvedTargetSocket = targetId;
      }

      // 4. Fallback: If 2 devices in room, route to the other device
      if (!resolvedTargetSocket && roomPeers.size === 2) {
        for (const [key, peer] of roomPeers.entries()) {
          if (key !== deviceKey && isSocketActive(peer.id)) {
            resolvedTargetSocket = peer.id;
            break;
          }
        }
      }
    }

    const payload = {
      senderId: socket.id,
      senderDeviceId: deviceKey,
      senderName: peerData?.name || 'Peer',
      text,
      timestamp: timestamp || Date.now()
    };

    console.log(`[Text Message] From: ${peerData?.name} (${socket.id}) -> Target: ${resolvedTargetSocket || 'Broadcast Room'}`);

    if (resolvedTargetSocket) {
      io.to(resolvedTargetSocket).emit('receive-text-message', payload);
    } else if (currentRoom) {
      socket.to(currentRoom).emit('receive-text-message', payload);
    }
  });

  // Auto Clipboard Sync
  socket.on('sync-clipboard', ({ targetId, text }) => {
    if (!text || typeof text !== 'string') return;
    const payload = {
      senderId: socket.id,
      senderName: peerData?.name || 'Perangkat',
      text
    };
    if (targetId) {
      io.to(targetId).emit('sync-clipboard', payload);
    } else if (currentRoom) {
      socket.to(currentRoom).emit('sync-clipboard', payload);
    }
  });

  // Ring Phone / Find My Phone
  socket.on('ring-device', ({ targetId }) => {
    if (targetId) {
      io.to(targetId).emit('ring-device', {
        senderId: socket.id,
        senderName: peerData?.name || 'Laptop'
      });
    }
  });

  socket.on('stop-ring-device', ({ targetId }) => {
    if (targetId) {
      io.to(targetId).emit('stop-ring-device', {
        senderId: socket.id
      });
    } else if (currentRoom) {
      socket.to(currentRoom).emit('stop-ring-device', { senderId: socket.id });
    }
  });

  // Notification Mirroring (Phone -> PC)
  socket.on('mirror-notification', ({ notif }) => {
    if (!notif) return;
    if (currentRoom) {
      socket.to(currentRoom).emit('incoming-notification', {
        senderId: socket.id,
        senderName: peerData?.name || 'HP',
        notif
      });
    }
  });

  // Real-Time Battery & Device Status
  socket.on('update-battery-status', ({ battery }) => {
    if (!battery || !peerData) return;
    peerData.battery = battery;
    if (currentRoom) {
      io.to(currentRoom).emit('peer-status-updated', {
        id: socket.id,
        deviceId: peerData.deviceId,
        battery
      });
    }
  });

  // Remote Input Event (Touchpad / Numpad / Media Keys)
  socket.on('remote-input-event', ({ targetId, event }) => {
    if (!event) return;
    const payload = {
      senderId: socket.id,
      event
    };
    if (targetId) {
      io.to(targetId).emit('remote-input-event', payload);
    } else if (currentRoom) {
      socket.to(currentRoom).emit('remote-input-event', payload);
    }
  });

  // Screen share status event (Phase 4)
  socket.on('screen-share-status', ({ targetId, isSharing }) => {
    if (targetId) {
      io.to(targetId).emit('peer-screen-share-status', {
        senderId: socket.id,
        isSharing
      });
    } else if (currentRoom) {
      socket.to(currentRoom).emit('peer-screen-share-status', {
        senderId: socket.id,
        isSharing
      });
    }
  });

  // Camera switch request from remote viewer to camera streamer
  socket.on('request-camera-switch', ({ targetId }) => {
    if (targetId) {
      io.to(targetId).emit('camera-switch-requested', {
        requesterId: socket.id
      });
    }
  });

  // Request remote peer to start screen mirror (e.g. Laptop requesting HP screen)
  socket.on('request-remote-screen', ({ targetId }) => {
    if (targetId) {
      io.to(targetId).emit('remote-screen-requested', {
        requesterId: socket.id
      });
    }
  });

  // Request remote peer to start camera stream (e.g. Laptop requesting HP webcam)
  socket.on('request-remote-camera', ({ targetId }) => {
    if (targetId) {
      io.to(targetId).emit('remote-camera-requested', {
        requesterId: socket.id
      });
    }
  });

  // Request remote peer to start wireless microphone stream (e.g. Laptop requesting HP microphone)
  socket.on('request-remote-mic', ({ targetId }) => {
    if (targetId) {
      io.to(targetId).emit('remote-mic-requested', {
        requesterId: socket.id,
        requesterName: peerData?.name || 'PC',
        requesterDeviceId: deviceKey
      });
    }
  });

  socket.on('camera-facing-changed', ({ targetId, facingMode }) => {
    if (targetId) {
      io.to(targetId).emit('camera-facing-changed', {
        senderId: socket.id,
        facingMode
      });
    }
  });

  // Latency ping check
  socket.on('ping-check', (cb) => {
    if (typeof cb === 'function') cb(Date.now());
  });

  // Remote File System: Request directory listing
  socket.on('fs-list-request', ({ targetId, dirPath }) => {
    if (targetId) {
      io.to(targetId).emit('fs-list-request', {
        requesterId: socket.id,
        dirPath: dirPath || '/'
      });
    }
  });

  // Remote File System: Send directory listing response
  socket.on('fs-list-response', ({ targetId, currentPath, items, error }) => {
    if (targetId) {
      io.to(targetId).emit('fs-list-response', {
        senderId: socket.id,
        currentPath: currentPath || '/',
        items: items || [],
        error: error || null
      });
    }
  });

  // Remote File System: Request file pull
  socket.on('fs-pull-file-request', ({ targetId, filePath, fileName }) => {
    if (targetId) {
      io.to(targetId).emit('fs-pull-file-request', {
        requesterId: socket.id,
        filePath,
        fileName
      });
    }
  });

  // Remote File System: Read local PC directory (for PC host)
  socket.on('fs-read-local-pc-dir', ({ dirPath }, callback) => {
    if (typeof callback !== 'function') return;
    try {
      // If on Windows and requesting root '/' or empty, return all available drives!
      if (os.platform() === 'win32' && (!dirPath || dirPath === '/' || dirPath === '' || dirPath === 'DRIVES')) {
        const drives = getWindowsDrives();
        const items = drives.map(d => ({
          name: d.name,
          path: d.path,
          isDirectory: true,
          isDrive: true,
          size: 0,
          lastModified: Date.now()
        }));
        return callback({ currentPath: '/', items, isDriveRoot: true });
      }

      const targetDir = resolveSafePcPath(dirPath);
      if (!fs.existsSync(targetDir) || !fs.statSync(targetDir).isDirectory()) {
        return callback({ error: 'Folder tidak ditemukan di PC Host.' });
      }

      let displayPath = targetDir.replace(/\\/g, '/');
      if (/^[a-zA-Z]:$/.test(displayPath)) {
        displayPath += '/';
      }

      const entries = fs.readdirSync(targetDir, { withFileTypes: true });
      const items = [];

      for (const ent of entries) {
        if (ent.name.startsWith('.')) continue; // skip hidden
        try {
          const fullPath = path.join(targetDir, ent.name);
          const isDir = ent.isDirectory();
          let size = 0;
          let mtime = Date.now();
          try {
            const st = fs.statSync(fullPath);
            size = isDir ? 0 : st.size;
            mtime = st.mtimeMs;
          } catch (_) {}

          let itemDisplayPath = fullPath.replace(/\\/g, '/');

          items.push({
            name: ent.name,
            path: itemDisplayPath,
            isDirectory: isDir,
            size,
            lastModified: mtime
          });
        } catch (_) {}
      }

      items.sort((a, b) => {
        if (a.isDirectory && !b.isDirectory) return -1;
        if (!a.isDirectory && b.isDirectory) return 1;
        return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
      });

      callback({ currentPath: displayPath, items });
    } catch (err) {
      callback({ error: err.message });
    }
  });

  // Disconnect handler
  socket.on('disconnect', () => {
    console.log(`[Socket Disconnected] ID: ${socket.id}`);
    if (currentRoom && rooms.has(currentRoom) && peerData) {
      const roomPeers = rooms.get(currentRoom);
      const active = roomPeers.get(peerData.deviceId);
      if (active && active.id === socket.id) {
        roomPeers.delete(peerData.deviceId);
        if (roomPeers.size === 0) {
          rooms.delete(currentRoom);
        } else {
          socket.to(currentRoom).emit('peer-left', { id: socket.id, deviceId: peerData.deviceId });
        }
      }
    }
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, '0.0.0.0', () => {
  const ips = getLocalIpAddresses();
  console.log(`\n======================================================`);
  console.log(`🚀 ENCross Signaling Server running on port ${PORT}`);
  console.log(`📡 Local Network IPv4 Addresses:`);
  ips.forEach(ip => {
    console.log(`   👉 http://${ip.address}:${PORT} (${ip.interface})`);
  });
  console.log(`======================================================\n`);
});


