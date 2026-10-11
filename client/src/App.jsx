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
import { ShareSourceModal } from './components/ShareSourceModal';
import { ServerIpModal } from './components/ServerIpModal';
import { MessageSquare, X, SwitchCamera } from 'lucide-react';
import { getDeviceInfo, setCustomDeviceName } from './utils/deviceInfo';
import { WebRTCManager } from './utils/webrtcManager';
import { playSound, triggerHaptic } from './utils/feedback';

export function App() {
  const isMobileDevice = typeof navigator !== 'undefined' && /Android|iPhone|iPad/i.test(navigator.userAgent);
  const [selfInfo, setSelfInfo] = useState(null);
  const [roomId, setRoomId] = useState('encross-lan');
  const [localIp, setLocalIp] = useState('');
  const [selfIp, setSelfIp] = useState('');
  const [peers, setPeers] = useState([]);
  const [socket, setSocket] = useState(null);

  // Modals & Drawers
  const [isQrOpen, setIsQrOpen] = useState(false);
  const [isRenameOpen, setIsRenameOpen] = useState(false);
  const [isSourceModalOpen, setIsSourceModalOpen] = useState(false);
  const [isServerIpModalOpen, setIsServerIpModalOpen] = useState(false);
  const [pendingTargetPeerId, setPendingTargetPeerId] = useState(null);
  const [activeTransfer, setActiveTransfer] = useState(null);
  const [isTextSyncOpen, setIsTextSyncOpen] = useState(false);
  const [textTargetPeer, setTextTargetPeer] = useState(null);
  const [textMessages, setTextMessages] = useState([]);
  const [isSuperseded, setIsSuperseded] = useState(false);
  const [incomingToast, setIncomingToast] = useState(null);

  // Screen & Camera Monitoring
  const [incomingStream, setIncomingStream] = useState(null);
  const [incomingStreamMode, setIncomingStreamMode] = useState('screen');
  const [incomingStreamPeerId, setIncomingStreamPeerId] = useState(null);
  const [screenSenderName, setScreenSenderName] = useState('');
  const [activeSharingPeerId, setActiveSharingPeerId] = useState(null);
  const [activeSharingMode, setActiveSharingMode] = useState(null);
  const [cameraFacingMode, setCameraFacingMode] = useState('environment');
  const [localBroadcastStream, setLocalBroadcastStream] = useState(null);

  const webrtcManagerRef = useRef(null);
  const activeSharingPeerIdRef = useRef(activeSharingPeerId);
  const incomingStreamRef = useRef(incomingStream);
  const isTextSyncOpenRef = useRef(isTextSyncOpen);
  const activeTransferRef = useRef(activeTransfer);
  const isSourceModalOpenRef = useRef(isSourceModalOpen);
  const isServerIpModalOpenRef = useRef(isServerIpModalOpen);
  const isQrOpenRef = useRef(isQrOpen);
  const isRenameOpenRef = useRef(isRenameOpen);

  useEffect(() => { incomingStreamRef.current = incomingStream; }, [incomingStream]);
  useEffect(() => { activeSharingPeerIdRef.current = activeSharingPeerId; }, [activeSharingPeerId]);
  useEffect(() => { isTextSyncOpenRef.current = isTextSyncOpen; }, [isTextSyncOpen]);
  useEffect(() => { activeTransferRef.current = activeTransfer; }, [activeTransfer]);
  useEffect(() => { isSourceModalOpenRef.current = isSourceModalOpen; }, [isSourceModalOpen]);
  useEffect(() => { isServerIpModalOpenRef.current = isServerIpModalOpen; }, [isServerIpModalOpen]);
  useEffect(() => { isQrOpenRef.current = isQrOpen; }, [isQrOpen]);
  useEffect(() => { isRenameOpenRef.current = isRenameOpen; }, [isRenameOpen]);

  useEffect(() => {
    // 1. Parse or assign room ID from URL query
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room') || 'encross-lan';
    setRoomId(roomParam);

    // 2. Initialize self device profile
    let device = getDeviceInfo();
    setSelfInfo(device);

    // Query device's own local Wi-Fi IP on Android APK
    if (window.AndroidDownloader?.getDeviceIp) {
      try {
        const dIp = window.AndroidDownloader.getDeviceIp();
        if (dIp) setSelfIp(dIp);
      } catch (e) {
        console.warn('[Network] getDeviceIp note:', e);
      }
    }

    // 3. Connect to backend signaling server
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const savedServerIp = localStorage.getItem('encross_server_ip') || localStorage.getItem('vancross_server_ip');

    // Auto-prompt 2 connection options (Scan QR / Gunakan IP) on mobile startup
    if (isMobileDevice) {
      setIsServerIpModalOpen(true);
    }

    let backendHost = window.location.hostname || 'localhost';
    if (isLocalhost && savedServerIp) {
      backendHost = savedServerIp;
    }

    const serverUrl = `http://${backendHost}:3001`;

    // Fetch network information (for accurate Hostname & QR Code generation)
    fetch(`${serverUrl}/api/network-info`)
      .then((res) => res.json())
      .then((data) => {
        if (data.localIps && data.localIps.length > 0) {
          setLocalIp(data.localIps[0].address);
        }
        // If device hasn't customized name and is host PC, assign real hostname
        const storedName = localStorage.getItem('encross_device_name') || localStorage.getItem('vancross_device_name');
        if (data.serverHostname && (!storedName || storedName.includes('Nova') || storedName.includes('Hyper'))) {
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
        if (window.electronAPI) {
          window.electronAPI.showNotification('Transfer Selesai', `File ${progressData.fileName || ''} berhasil diterima!`);
        }
      }
    };

    // Handle incoming Remote Screen or Camera Stream
    rtcManager.onRemoteStream = (peerId, stream, mode) => {
      setIncomingStream(stream);
      setIncomingStreamMode(mode || 'screen');
      setIncomingStreamPeerId(peerId);
      playSound('connect');
      triggerHaptic([40]);
      setPeers((currPeers) => {
        const found = currPeers.find((p) => p.id === peerId);
        setScreenSenderName(found?.name || 'Remote Peer');
        return currPeers;
      });
    };

    rtcManager.onScreenShareEnded = () => {
      setActiveSharingPeerId(null);
      setActiveSharingMode(null);
      setLocalBroadcastStream(null);
      setIncomingStream(null);
      setIncomingStreamPeerId(null);
    };

    // Socket Event: Peer started or stopped screen sharing
    newSocket.on('peer-screen-share-status', ({ senderId, isSharing }) => {
      if (!isSharing) {
        setIncomingStream(null);
        setIncomingStreamPeerId(null);
      }
    });

    // Socket Event: Remote peer requested camera switch (front <-> back)
    newSocket.on('camera-switch-requested', () => {
      if (webrtcManagerRef.current) {
        webrtcManagerRef.current.switchCamera()
          .then((res) => {
            if (res) {
              setCameraFacingMode(res.facingMode);
              setLocalBroadcastStream(res.stream);
            }
          })
          .catch((err) => console.warn('[CameraSwitch] Remote switch error:', err));
      }
    });

    newSocket.on('camera-facing-changed', ({ facingMode }) => {
      if (facingMode) {
        setCameraFacingMode(facingMode);
      }
    });

    // Socket Event: Connection Error (Prompt IP for mobile APK)
    newSocket.on('connect_error', () => {
      if (isMobileDevice && isLocalhost) {
        setIsServerIpModalOpen(true);
      }
    });

    // Socket Event: Connected
    newSocket.on('connect', () => {
      console.log('Connected to ENCross signaling server');
      setIsServerIpModalOpen(false);
      newSocket.emit('join-room', {
        roomId: roomParam,
        device
      });
    });

    // Socket Event: Room Peers received (filter out own device)
    newSocket.on('room-peers', ({ self: assignedSelf, peers: initialPeers }) => {
      if (assignedSelf) {
        device.deviceId = assignedSelf.deviceId;
        setSelfInfo(assignedSelf);
        if (assignedSelf.clientIp && assignedSelf.clientIp !== '127.0.0.1') {
          setSelfIp((prev) => prev || assignedSelf.clientIp);
        }
        if (webrtcManagerRef.current) {
          webrtcManagerRef.current.selfInfo = assignedSelf;
        }
      }
      setIsSuperseded(false);
      const myDeviceId = assignedSelf?.deviceId || device.deviceId;
      const unique = (initialPeers || []).filter((p) => p.deviceId !== myDeviceId);
      setPeers(unique);
    });

    // Socket Event: Another peer joined
    newSocket.on('peer-joined', (newPeer) => {
      // Ignore if this is another tab/browser of the same physical device
      if (newPeer.deviceId === device.deviceId) return;

      playSound('connect');
      triggerHaptic([30]);

      setPeers((prev) => {
        // If there was an existing socket for this physical device, clean up WebRTC
        const existing = prev.find((p) => p.deviceId === newPeer.deviceId);
        if (existing && existing.id !== newPeer.id) {
          rtcManager.closePeer(existing.id);
        }
        const filtered = prev.filter((p) => p.deviceId !== newPeer.deviceId);
        return [...filtered, newPeer];
      });
    });

    // Socket Event: Peer was renamed
    newSocket.on('peer-renamed', ({ id, deviceId, name }) => {
      setPeers((prev) =>
        prev.map((p) => ((p.id === id || (deviceId && p.deviceId === deviceId)) ? { ...p, name } : p))
      );
    });

    // Socket Event: Peer left
    newSocket.on('peer-left', ({ id, deviceId }) => {
      setPeers((prev) => prev.filter((p) => p.id !== id && (deviceId ? p.deviceId !== deviceId : true)));
      rtcManager.closePeer(id);
    });

    // Socket Event: This tab was superseded by another tab/browser on this device
    newSocket.on('tab-superseded', () => {
      console.warn('Sesi dialihkan ke tab/browser lain pada perangkat ini.');
      setIsSuperseded(true);
    });

    // Socket Event: Instant Text Message received
    newSocket.on('receive-text-message', (msg) => {
      playSound('message');
      triggerHaptic([40, 60]);
      setTextMessages((prev) => [...prev, { ...msg, isSelf: false }]);

      // Match sender to update textTargetPeer so user can easily reply
      setPeers((currPeers) => {
        const sender = currPeers.find(
          (p) => p.id === msg.senderId || (msg.senderDeviceId && p.deviceId === msg.senderDeviceId)
        );
        if (sender) {
          setTextTargetPeer(sender);
        }
        return currPeers;
      });

      // Do NOT auto-open drawer. Show interactive pop-up notification if chat drawer is closed.
      if (!isTextSyncOpenRef.current) {
        setIncomingToast(msg);
        setTimeout(() => {
          setIncomingToast((curr) => (curr?.timestamp === msg.timestamp ? null : curr));
        }, 8500);
      }

      if (window.electronAPI) {
        window.electronAPI.showNotification(`Pesan dari ${msg.senderName || 'Perangkat'}`, msg.text || '');
      }
    });

    return () => {
      newSocket.disconnect();
      rtcManager.cleanup();
    };
  }, []);

  // Stepped back navigation for mobile (Android hardware/gesture back & browser popstate)
  const handleBackStep = () => {
    if (activeSharingPeerIdRef.current) {
      if (webrtcManagerRef.current) {
        webrtcManagerRef.current.stopScreenShare(activeSharingPeerIdRef.current);
      }
      setActiveSharingPeerId(null);
      setActiveSharingMode(null);
      setLocalBroadcastStream(null);
      return true;
    }
    if (incomingStreamRef.current) {
      setIncomingStream(null);
      setIncomingStreamPeerId(null);
      return true;
    }
    if (isTextSyncOpenRef.current) {
      setIsTextSyncOpen(false);
      return true;
    }
    if (activeTransferRef.current) {
      setActiveTransfer(null);
      return true;
    }
    if (isSourceModalOpenRef.current) {
      setIsSourceModalOpen(false);
      return true;
    }
    if (isServerIpModalOpenRef.current) {
      setIsServerIpModalOpen(false);
      return true;
    }
    if (isQrOpenRef.current) {
      setIsQrOpen(false);
      return true;
    }
    if (isRenameOpenRef.current) {
      setIsRenameOpen(false);
      return true;
    }
    return false;
  };

  useEffect(() => {
    let backListener = null;

    const setupMobileSystem = async () => {
      // 1. Configure Capacitor StatusBar so it doesn't overlay WebView and matches dark theme
      try {
        const { StatusBar, Style } = await import('@capacitor/status-bar');
        await StatusBar.setOverlaysWebView({ overlay: false });
        await StatusBar.setStyle({ style: Style.Dark });
        await StatusBar.setBackgroundColor({ color: '#09090b' });
      } catch {
        // Not running in native Capacitor
      }

      // 2. Configure Capacitor Hardware Back Button
      try {
        const { App: CapApp } = await import('@capacitor/app');
        backListener = await CapApp.addListener('backButton', () => {
          const handled = handleBackStep();
          if (!handled) {
            CapApp.exitApp();
          }
        });
      } catch {
        // Not running in native Capacitor
      }
    };

    setupMobileSystem();

    // 3. Mobile Browser Popstate handler & Native Android bridge
    const handlePopState = () => {
      handleBackStep();
    };
    window.addEventListener('popstate', handlePopState);
    window.__handleAndroidBack = () => handleBackStep();

    return () => {
      if (backListener && typeof backListener.remove === 'function') {
        backListener.remove();
      }
      window.removeEventListener('popstate', handlePopState);
      delete window.__handleAndroidBack;
    };
  }, []);

  // Sync open overlay state to browser history for popstate support
  useEffect(() => {
    const isAnyModalOpen =
      Boolean(incomingStream) ||
      isTextSyncOpen ||
      Boolean(activeTransfer) ||
      isSourceModalOpen ||
      isServerIpModalOpen ||
      isQrOpen ||
      isRenameOpen;

    if (isAnyModalOpen) {
      if (!window.history.state?.encrossModal) {
        window.history.pushState({ encrossModal: true }, '');
      }
    }
  }, [
    incomingStream,
    isTextSyncOpen,
    activeTransfer,
    isSourceModalOpen,
    isServerIpModalOpen,
    isQrOpen,
    isRenameOpen
  ]);

  // Reactivate session if superseded by another tab/browser
  const handleReactivateSession = () => {
    if (socket && socket.connected) {
      socket.emit('join-room', {
        roomId,
        device: selfInfo || getDeviceInfo()
      });
      setIsSuperseded(false);
    }
  };

  // Save Server IP (for mobile APK & Laptop-to-Laptop connection)
  const handleSaveServerIp = (newIp) => {
    if (!newIp || newIp === 'localhost' || newIp === '127.0.0.1') {
      localStorage.removeItem('encross_server_ip');
      localStorage.removeItem('vancross_server_ip');
    } else {
      localStorage.setItem('encross_server_ip', newIp);
    }
    window.location.reload();
  };

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
    const resolvedTarget = textTargetPeer?.deviceId || textTargetPeer?.id || targetId;
    const msg = {
      targetId: resolvedTarget,
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

  const executeStream = async (peerId, mode = 'screen') => {
    if (!webrtcManagerRef.current) return;
    try {
      const stream = await webrtcManagerRef.current.startScreenShare(peerId, mode);
      setActiveSharingPeerId(peerId);
      setActiveSharingMode(mode);
      setLocalBroadcastStream(stream);
      setCameraFacingMode(webrtcManagerRef.current.currentFacingMode || 'environment');
    } catch (err) {
      setActiveSharingPeerId(null);
      setActiveSharingMode(null);
      setLocalBroadcastStream(null);
      if (err.name !== 'NotAllowedError') {
        alert('Info Siaran: ' + err.message);
      }
    }
  };

  // Screen / Camera Share Handler (Toggle start/stop)
  const handleStartScreenShare = async (peerId) => {
    if (!webrtcManagerRef.current) return;

    if (activeSharingPeerId === peerId) {
      webrtcManagerRef.current.stopScreenShare(peerId);
      setActiveSharingPeerId(null);
      setActiveSharingMode(null);
      setLocalBroadcastStream(null);
      return;
    }

    // On mobile devices, prompt user to choose Screen or Camera
    if (selfInfo?.deviceType === 'mobile') {
      setPendingTargetPeerId(peerId);
      setIsSourceModalOpen(true);
    } else {
      executeStream(peerId, 'screen');
    }
  };

  // Switch between front and rear camera
  const handleSwitchCamera = async () => {
    if (!webrtcManagerRef.current) return;
    try {
      triggerHaptic([30]);
      const res = await webrtcManagerRef.current.switchCamera(activeSharingPeerId);
      if (res) {
        setCameraFacingMode(res.facingMode);
        setLocalBroadcastStream(res.stream);
      }
    } catch (err) {
      console.warn('Gagal mengganti kamera:', err);
    }
  };

  // Remote viewer request camera switch on broadcaster
  const handleRequestRemoteCameraSwitch = (targetId) => {
    if (!socket || !targetId) return;
    triggerHaptic([30]);
    socket.emit('request-camera-switch', { targetId });
  };

  // Open Chat Drawer from Floating Notification Pop-up
  const handleOpenChatFromToast = () => {
    triggerHaptic([30]);
    if (incomingToast) {
      const sender = peers.find(
        (p) =>
          p.id === incomingToast.senderId ||
          (incomingToast.senderDeviceId && p.deviceId === incomingToast.senderDeviceId)
      );
      if (sender) {
        setTextTargetPeer(sender);
      }
    }
    setIsTextSyncOpen(true);
    setIncomingToast(null);
  };

  const protocol = window.location.protocol || 'http:';
  const resolvedIp = localIp || window.location.hostname || 'localhost';
  const currentPort = window.location.port ? `:${window.location.port}` : ':3001';
  const joinUrl = `${protocol}//${resolvedIp}${currentPort}/?room=${roomId}`;

  return (
    <div className="min-h-[100dvh] w-full max-w-full overflow-x-hidden bg-zinc-950 text-zinc-100 flex flex-col font-sans selection:bg-zinc-800 selection:text-white">
      {/* Top Navbar with click-to-rename */}
      <Navbar
        selfInfo={selfInfo}
        localIp={resolvedIp}
        selfIp={selfIp}
        roomId={roomId}
        onOpenQR={() => setIsQrOpen(true)}
        onOpenRename={() => setIsRenameOpen(true)}
        onOpenConnect={() => setIsServerIpModalOpen(true)}
      />

      {/* Floating Incoming Text Pop-up Notification */}
      {incomingToast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-zinc-900/95 border border-zinc-700 text-white px-3.5 py-2.5 sm:px-4 sm:py-3 rounded-2xl shadow-2xl backdrop-blur-md flex items-center gap-2.5 sm:gap-3 max-w-[94vw] sm:max-w-md animate-slideDown">
          {/* Clickable Message Area to Open Chat */}
          <div
            onClick={handleOpenChatFromToast}
            className="flex items-center gap-2.5 sm:gap-3 flex-1 min-w-0 cursor-pointer group select-none"
            title="Klik untuk membuka chat"
          >
            <div className="p-2 rounded-xl bg-zinc-800 border border-zinc-700/70 text-zinc-200 shrink-0 relative">
              <MessageSquare className="w-4 h-4 text-emerald-400" />
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping absolute -top-0.5 -right-0.5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="text-[11px] font-semibold text-zinc-300 truncate group-hover:text-white transition">
                  Pesan dari {incomingToast.senderName}
                </p>
                <span className="text-[9px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.2 rounded font-mono">
                  Baru
                </span>
              </div>
              <p className="text-xs text-zinc-100 truncate font-mono mt-0.5 group-hover:text-emerald-300 transition">
                {incomingToast.text}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Open / Balas Button */}
            <button
              onClick={handleOpenChatFromToast}
              className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg text-xs transition cursor-pointer shadow-sm active:scale-95 flex items-center gap-1"
            >
              <span>Buka</span>
            </button>

            {/* Quick Copy Button */}
            <button
              onClick={() => {
                navigator.clipboard.writeText(incomingToast.text);
                triggerHaptic([30]);
                setIncomingToast(null);
              }}
              title="Salin teks ke clipboard"
              className="px-2 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-medium rounded-lg text-xs transition cursor-pointer border border-zinc-700/60 active:scale-95"
            >
              Salin
            </button>

            {/* Dismiss Button */}
            <button
              onClick={() => setIncomingToast(null)}
              title="Tutup notifikasi"
              className="p-1 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Tab Superseded Notice Banner */}
      {isSuperseded && (
        <div className="bg-amber-950/80 border-b border-amber-500/30 px-4 py-2.5 text-amber-200 text-xs sm:text-sm flex items-center justify-between gap-3 z-40 backdrop-blur-sm animate-fadeIn">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-amber-400 animate-pulse"></span>
            <span>Sesi aktif di browser/tab lain pada perangkat ini.</span>
          </div>
          <button
            onClick={handleReactivateSession}
            className="px-3 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-lg text-xs font-medium transition cursor-pointer"
          >
            Aktifkan di Sini
          </button>
        </div>
      )}

      {/* Main Workspace */}
      <main className="flex-1 flex flex-col justify-center py-2">
        {/* Android PWA Install Banner (Only rendered on mobile) */}
        <PwaInstallBanner selfInfo={selfInfo} />

        <PeersRadar
          peers={peers}
          localIp={resolvedIp}
          selfIp={selfIp}
          activeSharingPeerId={activeSharingPeerId}
          activeSharingMode={activeSharingMode}
          cameraFacingMode={cameraFacingMode}
          onSwitchCamera={handleSwitchCamera}
          unreadPeerId={incomingToast?.senderId || incomingToast?.senderDeviceId}
          onSendFile={handleSendFile}
          onOpenTextSync={(peer) => {
            setTextTargetPeer(peer);
            setIsTextSyncOpen(true);
            if (incomingToast && (incomingToast.senderId === peer.id || incomingToast.senderDeviceId === peer.deviceId)) {
              setIncomingToast(null);
            }
          }}
          onStartScreenShare={handleStartScreenShare}
          onOpenQR={() => setIsQrOpen(true)}
          isMobile={isMobileDevice}
          onOpenConnect={() => setIsServerIpModalOpen(true)}
        />
      </main>

      {/* Stream Source Selector for Mobile */}
      <ShareSourceModal
        isOpen={isSourceModalOpen}
        onClose={() => setIsSourceModalOpen(false)}
        onSelect={(mode) => {
          if (pendingTargetPeerId) {
            executeStream(pendingTargetPeerId, mode);
          }
        }}
      />

      {/* Server IP Config Modal for Android APK & Laptop-to-Laptop */}
      <ServerIpModal
        isOpen={isServerIpModalOpen}
        onClose={() => setIsServerIpModalOpen(false)}
        onSave={handleSaveServerIp}
        currentIp={localStorage.getItem('encross_server_ip') || localStorage.getItem('vancross_server_ip') || ''}
        isMobile={isMobileDevice}
      />

      {/* Rename Device Modal */}
      <RenameModal
        isOpen={isRenameOpen}
        onClose={() => setIsRenameOpen(false)}
        currentName={selfInfo?.name}
        onSave={handleSaveRename}
      />

      {/* QR Code Modal for Phone Connection & Other Devices */}
      <QRCodeModal
        isOpen={isQrOpen}
        onClose={() => setIsQrOpen(false)}
        joinUrl={joinUrl}
        roomId={roomId}
        localIp={resolvedIp}
        onOpenManualIp={() => setIsServerIpModalOpen(true)}
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

      {/* Floating Camera Broadcaster Bar when Camera Streaming is Active */}
      {activeSharingPeerId && activeSharingMode === 'camera' && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-zinc-900/95 border border-zinc-700/80 rounded-2xl shadow-2xl p-2 sm:p-2.5 flex items-center gap-3 backdrop-blur-md max-w-[94vw] animate-in fade-in slide-in-from-bottom-3 duration-200">
          {/* Mini Camera Preview */}
          <div className="w-10 h-10 rounded-xl overflow-hidden bg-black border border-zinc-700 shrink-0 relative">
            <video
              ref={(el) => {
                if (el && localBroadcastStream && el.srcObject !== localBroadcastStream) {
                  el.srcObject = localBroadcastStream;
                }
              }}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          </div>

          {/* Info & Mode */}
          <div className="min-w-0 pr-1">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-white">Siaran Kamera HP</span>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-1 rounded">
                {cameraFacingMode === 'user' ? 'Depan' : 'Belakang'}
              </span>
            </div>
            <p className="text-[10px] text-zinc-400 truncate">
              Ke: {peers.find((p) => p.id === activeSharingPeerId)?.name || 'Perangkat Lawan'}
            </p>
          </div>

          {/* Switch Camera Button */}
          <button
            onClick={handleSwitchCamera}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 active:scale-95 text-emerald-400 hover:text-emerald-300 border border-zinc-700/70 text-xs font-semibold transition cursor-pointer shrink-0"
            title="Ganti Kamera Depan / Belakang"
          >
            <SwitchCamera className="w-3.5 h-3.5" />
            <span className="text-[11px]">Ganti Kamera</span>
          </button>

          {/* Stop Button */}
          <button
            onClick={() => handleStartScreenShare(activeSharingPeerId)}
            className="p-2 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/40 active:scale-95 transition cursor-pointer shrink-0"
            title="Hentikan Siaran"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Live Remote Screen / Camera Monitoring Modal */}
      {incomingStream && (
        <ScreenViewModal
          stream={incomingStream}
          senderName={screenSenderName}
          mode={incomingStreamMode}
          onSwitchCamera={incomingStreamMode === 'camera' ? () => handleRequestRemoteCameraSwitch(incomingStreamPeerId) : null}
          onClose={() => {
            setIncomingStream(null);
            setIncomingStreamPeerId(null);
          }}
        />
      )}

      {/* Footer Info */}
      <footer className="py-3 text-center text-[11px] text-zinc-500 border-t border-zinc-900/80 px-4 space-y-0.5">
        <p>
          ENCross • Direct WebRTC P2P Transfer & Screen Hub • Zero Cloud Storage
        </p>
        <p className="text-[10px] text-zinc-400">
          Dibuat & Dikembangkan oleh <span className="text-emerald-400 font-semibold">Edvan</span> (<a href="https://github.com/EdvanVPRoject/ENCross" target="_blank" rel="noreferrer" className="hover:text-emerald-300 underline underline-offset-2">EdvanVPRoject</a>)
        </p>
      </footer>
    </div>
  );
}

export default App;
