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
        addresses.push({ interface: name, address: iface.address });
      }
    }
  }
  return addresses;
}

function startServer(port = 3001, customDistPath = null) {
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
    maxHttpBufferSize: 1e8
  });

  const rooms = new Map();

  app.get('/api/network-info', (req, res) => {
    const localIps = getLocalIpAddresses();
    res.json({
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

  // Helper to safely resolve requested path against user's home directory (prevents path traversal)
  function resolveSafePcPath(requestedPath) {
    const home = os.homedir();
    if (!requestedPath || requestedPath === '/' || requestedPath === '.' || requestedPath.trim() === '') {
      return home;
    }
    const cleanRel = requestedPath.replace(/^[/\\]+/, '');
    const resolved = path.resolve(home, cleanRel);
    if (!resolved.startsWith(home)) {
      return home;
    }
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
        clientIp,
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

      const peersList = Array.from(roomPeers.values()).filter((p) => p.deviceId !== deviceKey);
      socket.emit('room-peers', {
        self: peerData,
        peers: peersList,
        roomId: currentRoom
      });
    });

    socket.on('signal-offer', ({ targetId, offer, metadata }) => {
      io.to(targetId).emit('signal-offer', { senderId: socket.id, offer, metadata });
    });

    socket.on('signal-answer', ({ targetId, answer }) => {
      io.to(targetId).emit('signal-answer', { senderId: socket.id, answer });
    });

    socket.on('signal-ice-candidate', ({ targetId, candidate }) => {
      io.to(targetId).emit('signal-ice-candidate', { senderId: socket.id, candidate });
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

    socket.on('screen-share-status', ({ targetId, isSharing }) => {
      if (targetId) {
        io.to(targetId).emit('peer-screen-share-status', { senderId: socket.id, isSharing });
      } else if (currentRoom) {
        socket.to(currentRoom).emit('peer-screen-share-status', { senderId: socket.id, isSharing });
      }
    });

    socket.on('request-camera-switch', ({ targetId }) => {
      if (targetId) {
        io.to(targetId).emit('camera-switch-requested', { requesterId: socket.id });
      }
    });

    socket.on('request-remote-screen', ({ targetId }) => {
      if (targetId) {
        io.to(targetId).emit('remote-screen-requested', { requesterId: socket.id });
      }
    });

    socket.on('request-remote-camera', ({ targetId }) => {
      if (targetId) {
        io.to(targetId).emit('remote-camera-requested', { requesterId: socket.id });
      }
    });

    socket.on('camera-facing-changed', ({ targetId, facingMode }) => {
      if (targetId) {
        io.to(targetId).emit('camera-facing-changed', { senderId: socket.id, facingMode });
      }
    });

    socket.on('ping-check', (cb) => {
      if (typeof cb === 'function') cb(Date.now());
    });

    socket.on('fs-list-request', ({ targetId, dirPath }) => {
      if (targetId) {
        io.to(targetId).emit('fs-list-request', {
          requesterId: socket.id,
          dirPath: dirPath || '/'
        });
      }
    });

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
        const targetDir = resolveSafePcPath(dirPath);
        if (!fs.existsSync(targetDir) || !fs.statSync(targetDir).isDirectory()) {
          return callback({ error: 'Folder tidak ditemukan.' });
        }
        const home = os.homedir();
        let relPath = path.relative(home, targetDir).replace(/\\/g, '/');
        if (!relPath || relPath === '') relPath = '/';
        else if (!relPath.startsWith('/')) relPath = '/' + relPath;

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

            let itemRel = path.relative(home, fullPath).replace(/\\/g, '/');
            if (!itemRel.startsWith('/')) itemRel = '/' + itemRel;

            items.push({
              name: ent.name,
              path: itemRel,
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

        callback({ currentPath: relPath, items });
      } catch (err) {
        callback({ error: err.message });
      }
    });

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

