import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { Navbar } from './components/Navbar';
import { QRCodeModal } from './components/QRCodeModal';
import { PeersRadar } from './components/PeersRadar';
import { TransferProgressModal } from './components/TransferProgressModal';
import { TextSyncDrawer } from './components/TextSyncDrawer';
import { ScreenViewModal } from './components/ScreenViewModal';
import { getDeviceInfo } from './utils/deviceInfo';
import { WebRTCManager } from './utils/webrtcManager';

export function App() {
  const [selfInfo, setSelfInfo] = useState(null);
  const [roomId, setRoomId] = useState('vancross-lan');
  const [localIp, setLocalIp] = useState('');
  const [peers, setPeers] = useState([]);
  const [socket, setSocket] = useState(null);

  // Modals & Drawers
  const [isQrOpen, setIsQrOpen] = useState(false);
  const [activeTransfer, setActiveTransfer] = useState(null);
  const [isTextSyncOpen, setIsTextSyncOpen] = useState(false);
  const [textTargetPeer, setTextTargetPeer] = useState(null);
  const [textMessages, setTextMessages] = useState([]);

  // Screen Monitoring
  const [incomingStream, setIncomingStream] = useState(null);
  const [screenSenderName, setScreenSenderName] = useState('');

  const webrtcManagerRef = useRef(null);

  useEffect(() => {
    // 1. Initialize self device profile
    const device = getDeviceInfo();
    setSelfInfo(device);

    // 2. Parse or assign room ID from URL query
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room') || 'vancross-lan';
    setRoomId(roomParam);

    // 3. Connect to backend signaling server
    // Dynamic host detection so mobile connects to laptop's Wi-Fi IP automatically
    const backendHost = window.location.hostname || 'localhost';
    const serverUrl = `http://${backendHost}:3001`;

    // Fetch network information (for QR Code generation)
    fetch(`${serverUrl}/api/network-info`)
      .then((res) => res.json())
      .then((data) => {
        if (data.localIps && data.localIps.length > 0) {
          setLocalIp(data.localIps[0].address);
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
    };

    // Handle incoming Remote Screen Stream
    rtcManager.onRemoteStream = (peerId, stream) => {
      setIncomingStream(stream);
      // Find peer name
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

    // Socket Event: Room Peers received
    newSocket.on('room-peers', ({ peers: initialPeers }) => {
      setPeers(initialPeers);
    });

    // Socket Event: Another peer joined
    newSocket.on('peer-joined', (newPeer) => {
      setPeers((prev) => {
        const filtered = prev.filter((p) => p.id !== newPeer.id);
        return [...filtered, newPeer];
      });
    });

    // Socket Event: Peer left
    newSocket.on('peer-left', ({ id }) => {
      setPeers((prev) => prev.filter((p) => p.id !== id));
      rtcManager.closePeer(id);
    });

    // Socket Event: Instant Text Message received
    newSocket.on('receive-text-message', (msg) => {
      setTextMessages((prev) => [...prev, { ...msg, isSelf: false }]);
      // If mobile, trigger subtle vibration
      if (navigator.vibrate) {
        navigator.vibrate([100, 50, 100]);
      }
    });

    return () => {
      newSocket.disconnect();
      rtcManager.cleanup();
    };
  }, []);

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

  // URL for Mobile Joining via QR Code
  const resolvedIp = localIp || window.location.hostname || 'localhost';
  const joinUrl = `http://${resolvedIp}:5173/?room=${roomId}`;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans selection:bg-zinc-700 selection:text-white">
      {/* Top Navbar */}
      <Navbar
        selfInfo={selfInfo}
        localIp={resolvedIp}
        roomId={roomId}
        onOpenQR={() => setIsQrOpen(true)}
      />

      {/* Main Radar / Device Workspace */}
      <main className="flex-1 flex flex-col justify-center">
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
      <footer className="py-4 text-center text-xs text-zinc-500 border-t border-zinc-900">
        <p>
          VanCross • Direct WebRTC P2P Transfer & Screen Hub • Zero Cloud Storage
        </p>
      </footer>
    </div>
  );
}

export default App;
