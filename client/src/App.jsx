import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { Navbar } from './components/Navbar';
import { QRCodeModal } from './components/QRCodeModal';
import { PeersRadar } from './components/PeersRadar';
import { TransferProgressModal } from './components/TransferProgressModal';
import { TextSyncDrawer } from './components/TextSyncDrawer';
import { ScreenViewModal } from './components/ScreenViewModal';
import { RenameModal } from './components/RenameModal';
import { PwaInstallBanner } from './components/PwaInstallBanner';
import { getDeviceInfo, setCustomDeviceName } from './utils/deviceInfo';
import { WebRTCManager } from './utils/webrtcManager';
import { playSound, triggerHaptic } from './utils/feedback';

export function App() {
  const [selfInfo, setSelfInfo] = useState(null);
  const [roomId, setRoomId] = useState('vancross-lan');
  const [localIp, setLocalIp] = useState('');
  const [peers, setPeers] = useState([]);
  const [socket, setSocket] = useState(null);

  // Modals & Drawers
  const [isQrOpen, setIsQrOpen] = useState(false);
  const [isRenameOpen, setIsRenameOpen] = useState(false);
  const [activeTransfer, setActiveTransfer] = useState(null);
  const [isTextSyncOpen, setIsTextSyncOpen] = useState(false);
  const [textTargetPeer, setTextTargetPeer] = useState(null);
  const [textMessages, setTextMessages] = useState([]);

  // Screen Monitoring
  const [incomingStream, setIncomingStream] = useState(null);
  const [screenSenderName, setScreenSenderName] = useState('');

  const webrtcManagerRef = useRef(null);

  useEffect(() => {
    // 1. Parse or assign room ID from URL query
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room') || 'vancross-lan';
    setRoomId(roomParam);

    // 2. Initialize self device profile
    let device = getDeviceInfo();
    setSelfInfo(device);

    // 3. Connect to backend signaling server
    const backendHost = window.location.hostname || 'localhost';
    const serverUrl = `http://${backendHost}:3001`;

    // Fetch network information (for accurate Hostname & QR Code generation)
    fetch(`${serverUrl}/api/network-info`)
      .then((res) => res.json())
      .then((data) => {
        if (data.localIps && data.localIps.length > 0) {
          setLocalIp(data.localIps[0].address);
        }
        // If device hasn't customized name and is host PC, assign real hostname
        if (data.serverHostname && (!localStorage.getItem('vancross_device_name') || localStorage.getItem('vancross_device_name').includes('Nova') || localStorage.getItem('vancross_device_name').includes('Hyper'))) {
          if (device.deviceType === 'desktop') {
            const accurateName = `${data.serverHostname} (PC)`;
            setCustomDeviceName(accurateName);
            setSelfInfo((prev) => ({ ...prev, name: accurateName }));
            device.name = accurateName;
          }
        }
      })
      .catch((err) => {
        console.warn('Network info fetch warning:', err);
        setLocalIp(backendHost);
      });

    const newSocket = io(serverUrl, {
      transports: ['websocket', 'polling']
    });

    setSocket(newSocket);

    // Initialize WebRTC Manager
    const rtcManager = new WebRTCManager(newSocket, device);
    webrtcManagerRef.current = rtcManager;

    // Handle Transfer Progress updates
    rtcManager.onTransferProgress = (progressData) => {
      setActiveTransfer(progressData);
      if (progressData.completed) {
        playSound('complete');
        triggerHaptic([60, 40, 60]);
      }
    };

    // Handle incoming Remote Screen Stream
    rtcManager.onRemoteStream = (peerId, stream) => {
      setIncomingStream(stream);
      playSound('connect');
      triggerHaptic([40]);
      setPeers((currPeers) => {
        const found = currPeers.find((p) => p.id === peerId);
        setScreenSenderName(found?.name || 'Remote Peer');
        return currPeers;
      });
    };

    rtcManager.onScreenShareEnded = () => {
      setIncomingStream(null);
    };

    // Socket Event: Connected
    newSocket.on('connect', () => {
      console.log('Connected to VanCross signaling server');
      newSocket.emit('join-room', {
        roomId: roomParam,
        device
      });
    });

    // Socket Event: Room Peers received (filter out own device)
    newSocket.on('room-peers', ({ peers: initialPeers }) => {
      const unique = initialPeers.filter((p) => p.deviceId !== device.deviceId);
      setPeers(unique);
    });

    // Socket Event: Another peer joined
    newSocket.on('peer-joined', (newPeer) => {
      // Ignore if this is another tab of the same device
      if (newPeer.deviceId === device.deviceId) return;

      playSound('connect');
      triggerHaptic([30]);
      setPeers((prev) => {
        const filtered = prev.filter((p) => p.deviceId !== newPeer.deviceId);
        return [...filtered, newPeer];
      });
    });

    // Socket Event: Peer was renamed
    newSocket.on('peer-renamed', ({ id, name }) => {
      setPeers((prev) =>
        prev.map((p) => (p.id === id ? { ...p, name } : p))
      );
    });

    // Socket Event: Peer left
    newSocket.on('peer-left', ({ id, deviceId }) => {
      setPeers((prev) => prev.filter((p) => p.id !== id && (deviceId ? p.deviceId !== deviceId : true)));
      rtcManager.closePeer(id);
    });

    // Socket Event: Instant Text Message received
    newSocket.on('receive-text-message', (msg) => {
      playSound('message');
      triggerHaptic([40]);
      setTextMessages((prev) => [...prev, { ...msg, isSelf: false }]);
    });

    return () => {
      newSocket.disconnect();
      rtcManager.cleanup();
    };
  }, []);

  // Rename Device Handler
  const handleSaveRename = (newName) => {
    setCustomDeviceName(newName);
    setSelfInfo((prev) => ({ ...prev, name: newName }));
    if (socket) {
      socket.emit('rename-device', { name: newName });
    }
    if (webrtcManagerRef.current) {
      webrtcManagerRef.current.selfInfo.name = newName;
    }
  };

  // Send File Handler
  const handleSendFile = async (peerId, file) => {
    if (!webrtcManagerRef.current) return;
    try {
      await webrtcManagerRef.current.sendFile(peerId, file);
    } catch (err) {
      console.error('File send error:', err);
      alert('Gagal mengirim file: ' + err.message);
    }
  };

  // Quick Text/Clipboard Message Handler
  const handleSendMessage = (targetId, text) => {
    if (!socket) return;
    const msg = {
      targetId,
      text,
      timestamp: Date.now()
    };
    socket.emit('send-text-message', msg);
    playSound('message');
    triggerHaptic([30]);
    setTextMessages((prev) => [
      ...prev,
      {
        senderName: selfInfo?.name || 'Saya',
        text,
        timestamp: Date.now(),
        isSelf: true
      }
    ]);
  };

  // Screen Share Handler
  const handleStartScreenShare = async (peerId) => {
    if (!webrtcManagerRef.current) return;
    try {
      await webrtcManagerRef.current.startScreenShare(peerId);
    } catch (err) {
      if (err.name !== 'NotAllowedError') {
        alert('Gagal memulai bagi layar: ' + err.message);
      }
    }
  };

  const resolvedIp = localIp || window.location.hostname || 'localhost';
  const joinUrl = `http://${resolvedIp}:5173/?room=${roomId}`;

  return (
    <div className="min-h-[100dvh] w-full max-w-full overflow-x-hidden bg-zinc-950 text-zinc-100 flex flex-col font-sans selection:bg-zinc-800 selection:text-white">
      {/* Top Navbar with click-to-rename */}
      <Navbar
        selfInfo={selfInfo}
        localIp={resolvedIp}
        roomId={roomId}
        onOpenQR={() => setIsQrOpen(true)}
        onOpenRename={() => setIsRenameOpen(true)}
      />

      {/* Main Workspace */}
      <main className="flex-1 flex flex-col justify-center py-2">
        {/* Android PWA Install Banner (Only rendered on mobile) */}
        <PwaInstallBanner selfInfo={selfInfo} />

        <PeersRadar
          peers={peers}
          onSendFile={handleSendFile}
          onOpenTextSync={(peer) => {
            setTextTargetPeer(peer);
            setIsTextSyncOpen(true);
          }}
          onStartScreenShare={handleStartScreenShare}
          onOpenQR={() => setIsQrOpen(true)}
        />
      </main>

      {/* Rename Device Modal */}
      <RenameModal
        isOpen={isRenameOpen}
        onClose={() => setIsRenameOpen(false)}
        currentName={selfInfo?.name}
        onSave={handleSaveRename}
      />

      {/* QR Code Modal for Phone Connection */}
      <QRCodeModal
        isOpen={isQrOpen}
        onClose={() => setIsQrOpen(false)}
        joinUrl={joinUrl}
        roomId={roomId}
        localIp={resolvedIp}
      />

      {/* File Transfer Progress & Download Trigger */}
      <TransferProgressModal
        transfer={activeTransfer}
        onClose={() => setActiveTransfer(null)}
      />

      {/* Instant Text / Link Sync Drawer */}
      <TextSyncDrawer
        isOpen={isTextSyncOpen}
        onClose={() => setIsTextSyncOpen(false)}
        targetPeer={textTargetPeer}
        messages={textMessages}
        onSendMessage={handleSendMessage}
      />

      {/* Live Remote Screen Monitoring Modal */}
      {incomingStream && (
        <ScreenViewModal
          stream={incomingStream}
          senderName={screenSenderName}
          onClose={() => setIncomingStream(null)}
        />
      )}

      {/* Footer Info */}
      <footer className="py-3 text-center text-[11px] text-zinc-500 border-t border-zinc-900/80 px-4">
        <p>
          VanCross • Direct WebRTC P2P Transfer & Screen Hub • Zero Cloud Storage
        </p>
      </footer>
    </div>
  );
}

export default App;
