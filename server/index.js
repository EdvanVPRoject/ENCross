import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import os from 'os';

const app = express();
app.use(cors());
app.use(express.json());

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

    // Unique physical hardware key on LAN:
    // All browsers on the same phone share the same client LAN IP.
    // All browsers on the laptop share the host identity.
    deviceKey = isHost ? 'host_pc' : `client_${clientIp}`;

    peerData = {
      id: socket.id,
      deviceId: deviceKey,
      clientIp,
      name: device?.name || (isHost ? 'PC' : 'Smartphone'),
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

    // If another browser on the same physical phone/PC was connected, replace it
    const existing = roomPeers.get(deviceKey);
    if (existing && existing.id !== socket.id) {
      console.log(`[Device Handover] ${peerData.name} on ${clientIp} switched from socket ${existing.id} to ${socket.id}`);
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

  // Instant Text / Clipboard Sharing Relay
  socket.on('send-text-message', ({ targetId, text, timestamp }) => {
    if (targetId) {
      // Direct message to specific peer
      io.to(targetId).emit('receive-text-message', {
        senderId: socket.id,
        senderName: peerData?.name || 'Peer',
        text,
        timestamp: timestamp || Date.now()
      });
    } else if (currentRoom) {
      // Broadcast to entire room
      socket.to(currentRoom).emit('receive-text-message', {
        senderId: socket.id,
        senderName: peerData?.name || 'Peer',
        text,
        timestamp: timestamp || Date.now()
      });
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
  console.log(`🚀 VanCross Signaling Server running on port ${PORT}`);
  console.log(`📡 Local Network IPv4 Addresses:`);
  ips.forEach(ip => {
    console.log(`   👉 http://${ip.address}:${PORT} (${ip.interface})`);
  });
  console.log(`======================================================\n`);
});
