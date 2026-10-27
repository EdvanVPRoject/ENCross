const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const os = require('os');
const path = require('path');
const fs = require('fs');

function getLocalIpAddresses() {
  const interfaces = os.networkInterfaces();
  const addresses = [];
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        addresses.push({ interface: name, address: iface.address, mac: iface.mac });
      }
    }
  }
  return addresses;
}

function startServer(port = 3001, customDistPath = null, serverOptions = {}) {
  const app = express();
  app.use(cors());
  app.use(express.json());

  const distPath = customDistPath || path.join(__dirname, '../client/dist');
  console.log(`[Embedded Server] Serving static files from: ${distPath}`);

  if (fs.existsSync(distPath)) {
    app.use(express.static(distPath));
  }

  const server = http.createServer(app);
  const io = new Server(server, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
    maxHttpBufferSize: 1e8,
    pingInterval: 10000,
    pingTimeout: 60000,
    connectTimeout: 45000
  });

  const rooms = new Map();

  // Authoritative real-time room peer broadcast: ensures all devices in the room receive the exact synchronized peer list
  function broadcastRoomPeers(roomName) {
    if (!roomName || !rooms.has(roomName)) return;
    const rPeers = rooms.get(roomName);
    for (const [dKey, pData] of rPeers.entries()) {
      const peersForThisDevice = Array.from(rPeers.values()).filter(
        (p) => p.deviceId !== dKey && p.id !== pData.id
      );
      io.to(pData.id).emit('room-peers', {
        self: pData,
        peers: peersForThisDevice,
        roomId: roomName
      });
    }
  }

  app.get('/api/network-info', (req, res) => {
    const localIps = getLocalIpAddresses();
    res.json({
      encross: true,
      service: 'encross-hub',
      localIps,
      port,
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
      // Images
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


  // SPA fallback: Return index.html for any client navigation
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

  function getSocketClientIp(socket) {
    let ip = socket.handshake.address || socket.conn?.remoteAddress || '';
    if (ip.startsWith('::ffff:')) ip = ip.substring(7);
    if (ip === '::1' || ip === '127.0.0.1') return '127.0.0.1';
    return ip;
  }

  io.on('connection', (socket) => {
    let currentRoom = null;
    let peerData = null;
    let deviceKey = null;

    const clientIp = getSocketClientIp(socket);
    const serverIps = getLocalIpAddresses().map((item) => item.address);
    const isHost = clientIp === '127.0.0.1' || serverIps.includes(clientIp);

    console.log(`[Socket Connected] ID: ${socket.id} from IP: ${clientIp} (isHost: ${isHost})`);

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

    socket.on('join-room', ({ roomId, device }) => {
      const normalizedRoom = (!roomId || roomId === 'default-room' || roomId === 'encross-default-room')
        ? 'encross-lan'
        : roomId;
      currentRoom = normalizedRoom;

      // Unique physical hardware key:
      // Prioritize client-generated persistent deviceId (unique per browser/app profile)
      // to allow multiple devices (phones, laptops, tablets) to connect simultaneously.
      deviceKey = (device?.deviceId && typeof device.deviceId === 'string' && device.deviceId.length > 3)
        ? device.deviceId
        : (isHost ? `host_${socket.id.substring(0, 5)}` : `client_${clientIp}_${socket.id.substring(0, 5)}`);

      const hostLanIp = (serverIps.length > 0) ? serverIps[0] : clientIp;

      peerData = {
        id: socket.id,
        deviceId: deviceKey,
        clientIp: isHost ? hostLanIp : (device?.ip || clientIp),
        ip: isHost ? hostLanIp : (device?.ip || clientIp),
        webdavPort: device?.webdavPort || (device?.os === 'Android' ? 8089 : undefined),
        name: device?.name || (isHost ? 'PC' : 'Perangkat'),
        deviceType: device?.deviceType || (isHost ? 'desktop' : 'mobile'),
        os: device?.os || 'Unknown OS',
        browser: device?.browser || 'Browser',
        joinedAt: Date.now()
      };

      socket.join(currentRoom);

      if (!rooms.has(currentRoom)) {
        rooms.set(currentRoom, new Map());
      }

      const roomPeers = rooms.get(currentRoom);
      const existing = roomPeers.get(deviceKey);
      if (existing && existing.id !== socket.id) {
        console.log(`[Device Handover] ${peerData.name} on ${clientIp} updated socket from ${existing.id} to ${socket.id}`);
        io.to(existing.id).emit('tab-superseded');

        if (existing.name && (!device?.name || device.name === 'PC' || device.name === 'Smartphone' || device.name.includes('Windows PC') || device.name.includes('Android Phone'))) {
          peerData.name = existing.name;
        }
      }

      roomPeers.set(deviceKey, peerData);
      socket.to(currentRoom).emit('peer-joined', peerData);

      // Immediately synchronize authoritative peer list across all devices in the room
      broadcastRoomPeers(currentRoom);
    });

    socket.on('get-peers', () => {
      const roomToQuery = currentRoom || 'encross-lan';
      if (!rooms.has(roomToQuery)) return;
      broadcastRoomPeers(roomToQuery);
    });

    const isSocketActive = (id) =>
      Boolean(id && (io.sockets?.sockets?.has ? io.sockets.sockets.has(id) : Boolean(io.sockets?.sockets?.[id])));

    const resolveTargetSocket = (targetId, targetDeviceId) => {
      if (!currentRoom || !rooms.has(currentRoom)) return targetId;
      const roomPeers = rooms.get(currentRoom);

      // 1. Direct deviceKey / targetDeviceId match
      const searchKey = targetDeviceId || targetId;
      if (searchKey && roomPeers.has(searchKey)) {
        const p = roomPeers.get(searchKey);
        if (p && isSocketActive(p.id)) return p.id;
      }

      // 2. Search peers by socket.id or deviceId
      for (const peer of roomPeers.values()) {
        if (
          (targetId && peer.id === targetId) ||
          (targetDeviceId && peer.deviceId === targetDeviceId) ||
          (targetId && peer.deviceId === targetId)
        ) {
          if (isSocketActive(peer.id)) return peer.id;
        }
      }

      // 3. If targetId is directly active
      if (targetId && isSocketActive(targetId)) {
        return targetId;
      }

      // 4. Fallback: If 2 devices in room, route to the other peer!
      if (roomPeers.size === 2) {
        for (const [key, peer] of roomPeers.entries()) {
          if (key !== deviceKey && isSocketActive(peer.id)) {
            return peer.id;
          }
        }
      }

      return targetId;
    };

    // Device Pairing Handshake & Mutual Connection Synchronization
    socket.on('pairing-request', ({ targetId, targetDeviceId, requester, pin }) => {
      const resolved = resolveTargetSocket(targetId, targetDeviceId);
      console.log(`[Pairing Request] From ${peerData?.name} (${deviceKey}) -> Target: ${resolved} (PIN: ${pin})`);
      if (resolved) {
        io.to(resolved).emit('pairing-request', {
          senderId: socket.id,
          senderDeviceId: peerData?.deviceId || requester?.deviceId,
          requester: requester || peerData,
          pin
        });
      }
    });

    socket.on('pairing-response', ({ targetId, targetDeviceId, accepted, pin, responder }) => {
      const resolved = resolveTargetSocket(targetId, targetDeviceId);
      console.log(`[Pairing Response] From ${peerData?.name} -> Target: ${resolved} (Accepted: ${accepted})`);
      if (resolved) {
        io.to(resolved).emit('pairing-response', {
          senderId: socket.id,
          senderDeviceId: peerData?.deviceId || responder?.deviceId,
          accepted,
          pin,
          responder: responder || peerData
        });
      }
    });

    socket.on('connection-sync', ({ targetId, targetDeviceId, status, requester }) => {
      const resolved = resolveTargetSocket(targetId, targetDeviceId);
      console.log(`[Connection Sync] From ${peerData?.name} -> Target: ${resolved} (Status: ${status})`);
      if (resolved) {
        io.to(resolved).emit('connection-sync', {
          senderId: socket.id,
          senderDeviceId: peerData?.deviceId || requester?.deviceId,
          status,
          requester: requester || peerData
        });
      }
    });

    socket.on('unpair-device', ({ targetId, targetDeviceId }) => {
      const resolved = resolveTargetSocket(targetId, targetDeviceId);
      if (resolved) {
        io.to(resolved).emit('unpair-device', {
          senderId: socket.id,
          senderDeviceId: peerData?.deviceId
        });
      }
    });

    socket.on('signal-offer', ({ targetId, targetDeviceId, offer, metadata }) => {
      const resolved = resolveTargetSocket(targetId, targetDeviceId);
      if (resolved) io.to(resolved).emit('signal-offer', { senderId: socket.id, offer, metadata });
    });

    socket.on('signal-answer', ({ targetId, targetDeviceId, answer }) => {
      const resolved = resolveTargetSocket(targetId, targetDeviceId);
      if (resolved) io.to(resolved).emit('signal-answer', { senderId: socket.id, answer });
    });

    socket.on('signal-ice-candidate', ({ targetId, targetDeviceId, candidate }) => {
      const resolved = resolveTargetSocket(targetId, targetDeviceId);
      if (resolved) io.to(resolved).emit('signal-ice-candidate', { senderId: socket.id, candidate });
    });

    socket.on('send-text-message', ({ targetId, targetDeviceId, text, timestamp }) => {
      const resolvedTargetSocket = resolveTargetSocket(targetId, targetDeviceId);

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

    socket.on('screen-share-status', ({ targetId, targetDeviceId, isSharing, mode }) => {
      const payload = { senderId: socket.id, isSharing, mode };
      const resolved = resolveTargetSocket(targetId, targetDeviceId);
      if (resolved) {
        io.to(resolved).emit('peer-screen-share-status', payload);
      } else if (currentRoom) {
        socket.to(currentRoom).emit('peer-screen-share-status', payload);
      }
    });

    socket.on('request-remote-scrcpy', ({ targetId, targetDeviceId, mode, cameraFacing }) => {
      const resolved = resolveTargetSocket(targetId, targetDeviceId);
      if (resolved) {
        io.to(resolved).emit('remote-scrcpy-requested', {
          senderId: socket.id,
          mode: mode || 'display',
          cameraFacing: cameraFacing || 'back'
        });
      }
    });

    socket.on('request-camera-switch', ({ targetId, targetDeviceId }) => {
      const resolved = resolveTargetSocket(targetId, targetDeviceId);
      if (resolved) {
        io.to(resolved).emit('camera-switch-requested', { requesterId: socket.id });
      }
    });

    socket.on('request-remote-screen', ({ targetId, targetDeviceId }) => {
      const resolved = resolveTargetSocket(targetId, targetDeviceId);
      if (resolved) {
        console.log(`[Server] Routing request-remote-screen -> ${resolved}`);
        io.to(resolved).emit('remote-screen-requested', { requesterId: socket.id });
      }
    });

    socket.on('request-second-display', ({ targetId, targetDeviceId }) => {
      const resolved = resolveTargetSocket(targetId, targetDeviceId);
      if (resolved) {
        console.log(`[Server] Routing request-second-display -> ${resolved}`);
        io.to(resolved).emit('remote-second-display-requested', { requesterId: socket.id });
      }
    });

    socket.on('request-desktop-sources', ({ targetId, targetDeviceId }) => {
      const resolved = resolveTargetSocket(targetId, targetDeviceId);
      if (resolved) {
        console.log(`[Server] Routing request-desktop-sources -> ${resolved}`);
        io.to(resolved).emit('remote-desktop-sources-requested', { requesterId: socket.id });
      }
    });

    socket.on('response-desktop-sources', ({ targetId, targetDeviceId, sources }) => {
      const resolved = resolveTargetSocket(targetId, targetDeviceId);
      if (resolved) {
        io.to(resolved).emit('remote-desktop-sources-response', { senderId: socket.id, sources: sources || [] });
      }
    });

    socket.on('start-remote-display-stream', ({ targetId, targetDeviceId, sourceId, preset }) => {
      const resolved = resolveTargetSocket(targetId, targetDeviceId);
      if (resolved) {
        console.log(`[Server] Routing start-remote-display-stream -> ${resolved} sourceId: ${sourceId}`);
        io.to(resolved).emit('remote-start-display-stream', {
          requesterId: socket.id,
          sourceId,
          preset
        });
      }
    });

    socket.on('request-remote-camera', ({ targetId, targetDeviceId }) => {
      const resolved = resolveTargetSocket(targetId, targetDeviceId);
      if (resolved) {
        console.log(`[Server] Routing request-remote-camera -> ${resolved}`);
        io.to(resolved).emit('remote-camera-requested', { requesterId: socket.id });
      }
    });

    socket.on('request-remote-mic', ({ targetId, targetDeviceId }) => {
      const resolved = resolveTargetSocket(targetId, targetDeviceId);
      if (resolved) {
        io.to(resolved).emit('remote-mic-requested', {
          requesterId: socket.id,
          requesterName: peerData?.name || 'PC',
          requesterDeviceId: deviceKey
        });
      }
    });

    socket.on('camera-facing-changed', ({ targetId, targetDeviceId, facingMode }) => {
      const resolved = resolveTargetSocket(targetId, targetDeviceId);
      if (resolved) {
        io.to(resolved).emit('camera-facing-changed', { senderId: socket.id, facingMode });
      }
    });

    socket.on('remote-input-event', ({ targetId, targetDeviceId, event }) => {
      if (serverOptions?.onRemoteInput && typeof serverOptions.onRemoteInput === 'function') {
        try {
          serverOptions.onRemoteInput(event);
        } catch (err) {
          console.warn('[Server] Error handling onRemoteInput:', err);
        }
      } else {
        const payload = {
          senderId: socket.id,
          event
        };
        const resolved = resolveTargetSocket(targetId, targetDeviceId);
        if (resolved) {
          io.to(resolved).emit('remote-input-event', payload);
        } else if (currentRoom) {
          socket.to(currentRoom).emit('remote-input-event', payload);
        }
      }
    });

    // Ring Phone / Find My Phone Alarm Trigger
    socket.on('ring-device', ({ targetId, targetDeviceId }) => {
      const resolved = resolveTargetSocket(targetId, targetDeviceId);
      console.log(`[Server] Ring Device requested by ${socket.id} for target ${targetId}/${targetDeviceId} -> resolved: ${resolved}`);
      const payload = {
        senderId: socket.id,
        senderName: peerData?.name || 'Laptop'
      };
      if (resolved) {
        io.to(resolved).emit('ring-device', payload);
      } else if (currentRoom) {
        socket.to(currentRoom).emit('ring-device', payload);
      }
    });

    socket.on('stop-ring-device', ({ targetId, targetDeviceId }) => {
      const resolved = resolveTargetSocket(targetId, targetDeviceId);
      console.log(`[Server] Stop Ring Device requested by ${socket.id} -> resolved: ${resolved}`);
      if (resolved) {
        io.to(resolved).emit('stop-ring-device', { senderId: socket.id });
      } else if (currentRoom) {
        socket.to(currentRoom).emit('stop-ring-device', { senderId: socket.id });
      }
    });

    socket.on('ping-check', (cb) => {
      if (typeof cb === 'function') cb(Date.now());
    });

    socket.on('fs-list-request', ({ targetId, targetDeviceId, dirPath }) => {
      const resolved = resolveTargetSocket(targetId, targetDeviceId);
      if (resolved) {
        io.to(resolved).emit('fs-list-request', {
          requesterId: socket.id,
          dirPath: dirPath || '/'
        });
      }
    });

    socket.on('fs-list-response', ({ targetId, targetDeviceId, currentPath, items, error }) => {
      const resolved = resolveTargetSocket(targetId, targetDeviceId);
      if (resolved) {
        io.to(resolved).emit('fs-list-response', {
          senderId: socket.id,
          currentPath: currentPath || '/',
          items: items || [],
          error: error || null
        });
      }
    });

    socket.on('fs-pull-file-request', ({ targetId, filePath, fileName }) => {
      if (targetId) {
        io.to(targetId).emit('fs-pull-file-request', {
          requesterId: socket.id,
          filePath,
          fileName
        });
      }
    });

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
          if (ent.name.startsWith('.')) continue;
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

    socket.on('disconnect', (reason) => {
      console.log(`[Socket Disconnected] ID: ${socket.id}, reason: ${reason}`);
      if (currentRoom && rooms.has(currentRoom) && peerData) {
        const targetDeviceId = peerData.deviceId;
        const targetRoom = currentRoom;
        const targetSocketId = socket.id;

        // Grace period (6 seconds) before announcing peer-left
        // to prevent false disconnects when switching apps on mobile or brief background pause
        setTimeout(() => {
          if (rooms.has(targetRoom)) {
            const peersMap = rooms.get(targetRoom);
            const currentActive = peersMap.get(targetDeviceId);
            if (currentActive && currentActive.id === targetSocketId) {
              peersMap.delete(targetDeviceId);
              if (peersMap.size === 0) {
                rooms.delete(targetRoom);
              } else {
                io.to(targetRoom).emit('peer-left', { id: targetSocketId, deviceId: targetDeviceId });
                broadcastRoomPeers(targetRoom);
              }
            }
          }
        }, 6000);
      }
    });
  });

  return new Promise((resolve, reject) => {
    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.warn(`[Embedded Server] Port ${port} is already in use. Assuming server is active.`);
        resolve({ server: null, port, isExisting: true });
      } else {
        reject(err);
      }
    });

    server.listen(port, '0.0.0.0', () => {
      console.log(`[Embedded Server] Successfully listening on port ${port}`);
      resolve({ server, port, isExisting: false });
    });
  });
}

module.exports = { startServer, getLocalIpAddresses };


