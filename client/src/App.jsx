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
import { ScrcpyModal } from './components/ScrcpyModal';
import { FileExplorerModal } from './components/FileExplorerModal';
import { MediaStreamingModal } from './components/MediaStreamingModal';
import { WirelessMicModal } from './components/WirelessMicModal';
import { TouchpadModal } from './components/TouchpadModal';
import { MacroPadModal } from './components/MacroPadModal';
import { MessageSquare, X, SwitchCamera, ShieldAlert, Monitor, Camera, Shield, Check, BellRing, Mic, MicOff } from 'lucide-react';
import { getDeviceInfo, setCustomDeviceName } from './utils/deviceInfo';
import { WebRTCManager } from './utils/webrtcManager';
import { playSound, triggerHaptic } from './utils/feedback';
import { FEATURE_TOGGLES, SCRCPY_CONFIG, CUSTOM_ACTIONS } from './config/features';

export function App() {
  const isMobileDevice = typeof navigator !== 'undefined' && /Android|iPhone|iPad/i.test(navigator.userAgent);
  const [selfInfo, setSelfInfo] = useState(null);
  const [roomId, setRoomId] = useState('encross-lan');
  const [localIp, setLocalIp] = useState('');
  const [selfIp, setSelfIp] = useState('');
  const [peers, setPeers] = useState([]);
  const [socket, setSocket] = useState(null);
  const [pingMs, setPingMs] = useState(null);

  // Modals & Drawers
  const [isQrOpen, setIsQrOpen] = useState(!isMobileDevice);
  const [isRenameOpen, setIsRenameOpen] = useState(false);
  const [isSourceModalOpen, setIsSourceModalOpen] = useState(false);
  const [isServerIpModalOpen, setIsServerIpModalOpen] = useState(false);
  const [isScrcpyModalOpen, setIsScrcpyModalOpen] = useState(false);
  const [scrcpyTargetPeer, setScrcpyTargetPeer] = useState(null);
  const [scrcpyInitialMode, setScrcpyInitialMode] = useState('display');
  const [pendingTargetPeerId, setPendingTargetPeerId] = useState(null);
  const [activeTransfer, setActiveTransfer] = useState(null);
  const [isTextSyncOpen, setIsTextSyncOpen] = useState(false);
  const [textTargetPeer, setTextTargetPeer] = useState(null);
  const [textMessages, setTextMessages] = useState([]);
  const [isSuperseded, setIsSuperseded] = useState(false);
  const [incomingToast, setIncomingToast] = useState(null);

  // Remote Permission & Privacy Confirmation Dialog
  const [pendingRemoteRequest, setPendingRemoteRequest] = useState(null);

  // Session Transfer History (max 10 items)
  const [transferHistory, setTransferHistory] = useState([]);

  // Ring Phone Alarm States
  const [isRingingActive, setIsRingingActive] = useState(false);
  const [ringingSenderName, setRingingSenderName] = useState('');

  // Virtual Touchpad & Numpad States
  const [isTouchpadModalOpen, setIsTouchpadModalOpen] = useState(false);
  const [selectedPeerForTouchpad, setSelectedPeerForTouchpad] = useState(null);
  const isTouchpadModalOpenRef = useRef(isTouchpadModalOpen);

  // Virtual Macro Pad & Stream Deck States
  const [isMacroPadModalOpen, setIsMacroPadModalOpen] = useState(false);
  const [selectedPeerForMacroPad, setSelectedPeerForMacroPad] = useState(null);
  const isMacroPadModalOpenRef = useRef(isMacroPadModalOpen);
  const lastSyncedClipboardRef = useRef('');

  // Remote File Explorer States
  const [isFileExplorerOpen, setIsFileExplorerOpen] = useState(false);
  const [streamingMediaItem, setStreamingMediaItem] = useState(null);
  const streamingMediaItemRef = useRef(streamingMediaItem);
  streamingMediaItemRef.current = streamingMediaItem;
  const [explorerTargetPeer, setExplorerTargetPeer] = useState(null);
  const [explorerPath, setExplorerPath] = useState('/');
  const [explorerItems, setExplorerItems] = useState([]);
  const [explorerLoading, setExplorerLoading] = useState(false);
  const [explorerError, setExplorerError] = useState(null);

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
  const isScrcpyModalOpenRef = useRef(isScrcpyModalOpen);
  const isFileExplorerOpenRef = useRef(isFileExplorerOpen);
  const pendingRemoteRequestRef = useRef(pendingRemoteRequest);

  useEffect(() => { incomingStreamRef.current = incomingStream; }, [incomingStream]);
  useEffect(() => { activeSharingPeerIdRef.current = activeSharingPeerId; }, [activeSharingPeerId]);
  useEffect(() => { isTextSyncOpenRef.current = isTextSyncOpen; }, [isTextSyncOpen]);
  useEffect(() => { activeTransferRef.current = activeTransfer; }, [activeTransfer]);
  useEffect(() => { isSourceModalOpenRef.current = isSourceModalOpen; }, [isSourceModalOpen]);
  useEffect(() => { isServerIpModalOpenRef.current = isServerIpModalOpen; }, [isServerIpModalOpen]);
  useEffect(() => { isQrOpenRef.current = isQrOpen; }, [isQrOpen]);
  useEffect(() => { isRenameOpenRef.current = isRenameOpen; }, [isRenameOpen]);
  useEffect(() => { isScrcpyModalOpenRef.current = isScrcpyModalOpen; }, [isScrcpyModalOpen]);
  useEffect(() => { isFileExplorerOpenRef.current = isFileExplorerOpen; }, [isFileExplorerOpen]);
  useEffect(() => { isTouchpadModalOpenRef.current = isTouchpadModalOpen; }, [isTouchpadModalOpen]);
  useEffect(() => { isMacroPadModalOpenRef.current = isMacroPadModalOpen; }, [isMacroPadModalOpen]);
  useEffect(() => { pendingRemoteRequestRef.current = pendingRemoteRequest; }, [pendingRemoteRequest]);

  // Otomatis kontrol modal QR:
  // Jika ada perangkat terhubung (peers.length > 0) -> otomatis tutup modal QR
  // Jika tidak ada perangkat terhubung (peers.length === 0) -> otomatis buka modal QR (desktop/laptop)
  useEffect(() => {
    if (peers.length > 0) {
      setIsQrOpen(false);
    } else if (peers.length === 0 && !isMobileDevice) {
      setIsQrOpen(true);
    }
  }, [peers.length, isMobileDevice]);

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

    // Auto-prompt connection options on mobile startup
    if (isMobileDevice) {
      setIsServerIpModalOpen(true);
    }

    let backendHost = window.location.hostname || 'localhost';
    if (isLocalhost && savedServerIp) {
      backendHost = savedServerIp;
    }

    const serverUrl = `http://${backendHost}:3001`;

    // Fetch network information
    fetch(`${serverUrl}/api/network-info`)
      .then((res) => res.json())
      .then((data) => {
        if (data.localIps && data.localIps.length > 0) {
          setLocalIp(data.localIps[0].address);
        }
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
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000
    });

    // Keep JS execution alive on mobile in background using inaudible silent audio node
    let keepAliveAudioCtx = null;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx && (device.os === 'Android' || device.deviceType === 'mobile')) {
        keepAliveAudioCtx = new AudioCtx();
        const osc = keepAliveAudioCtx.createOscillator();
        const gain = keepAliveAudioCtx.createGain();
        gain.gain.value = 0.00001; // Inaudible
        osc.connect(gain);
        gain.connect(keepAliveAudioCtx.destination);
        osc.start();
      }
    } catch (_) {}

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
        if (!progressData.cancelled) {
          setTransferHistory((prev) => [
            {
              fileId: progressData.fileId,
              fileName: progressData.fileName,
              fileSize: progressData.fileSize,
              direction: progressData.direction,
              blobUrl: progressData.blobUrl || null,
              timestamp: Date.now()
            },
            ...prev
          ].slice(0, 10));
        }
        if (window.electronAPI) {
          window.electronAPI.showNotification(
            'Transfer Selesai',
            `File ${progressData.fileName || ''} berhasil ${progressData.direction === 'upload' ? 'dikirim' : 'diterima'}!`
          );
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

    // Handle incoming WebRTC DataChannel remote input commands (trackpad/keyboard)
    rtcManager.onRemoteInput = (event) => {
      if (window.electronAPI?.sendRemoteInput) {
        window.electronAPI.sendRemoteInput(event);
      }
    };

    // Socket Event: Peer started or stopped screen sharing
    newSocket.on('peer-screen-share-status', ({ senderId, isSharing, mode }) => {
      if (!isSharing) {
        setIncomingStream(null);
        setIncomingStreamPeerId(null);
      } else if (mode) {
        setIncomingStreamMode(mode);
      }
    });

    // Socket Event: Remote peer requested to launch Scrcpy on this PC
    newSocket.on('remote-scrcpy-requested', async ({ senderId, mode, cameraFacing }) => {
      console.log('[RemoteScrcpy] Incoming request from peer:', senderId, mode);
      if (window.electronAPI?.startScrcpy && window.electronAPI?.getScrcpyStatus) {
        try {
          const status = await window.electronAPI.getScrcpyStatus();
          if (status.isScrcpyAvailable && status.devices && status.devices.length > 0) {
            await window.electronAPI.startScrcpy({
              deviceId: status.devices[0].serial,
              videoSource: mode === 'camera' ? 'camera' : 'display',
              cameraFacing: cameraFacing || 'back',
              stayAwake: true
            });
            playSound('connect');
          }
        } catch (scrcpyErr) {
          console.warn('[RemoteScrcpy] Auto-launch scrcpy error:', scrcpyErr);
        }
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

    // Socket Event: Remote screen request with privacy check & user gesture modal
    newSocket.on('remote-screen-requested', ({ requesterId }) => {
      if (!requesterId) return;
      playSound('connect');
      triggerHaptic([40]);

      setPeers((currPeers) => {
        const found = currPeers.find((p) => p.id === requesterId);
        const name = found?.name || 'Perangkat Lawan';
        const devId = found?.deviceId;

        // Check if requester is in trusted peers list
        const trusted = JSON.parse(localStorage.getItem('encross_trusted_peers') || '[]');
        if (devId && trusted.includes(devId)) {
          executeStream(requesterId, 'screen');
        } else {
          setPendingRemoteRequest({
            requesterId,
            requesterName: name,
            requesterDeviceId: devId,
            mode: 'screen'
          });
        }
        return currPeers;
      });
    });

    // Socket Event: Remote camera request with privacy check & user gesture modal
    newSocket.on('remote-camera-requested', ({ requesterId }) => {
      if (!requesterId) return;
      playSound('connect');
      triggerHaptic([40]);

      setPeers((currPeers) => {
        const found = currPeers.find((p) => p.id === requesterId);
        const name = found?.name || 'Perangkat Lawan';
        const devId = found?.deviceId;

        // Check if requester is in trusted peers list
        const trusted = JSON.parse(localStorage.getItem('encross_trusted_peers') || '[]');
        if (devId && trusted.includes(devId)) {
          executeStream(requesterId, 'camera');
        } else {
          setPendingRemoteRequest({
            requesterId,
            requesterName: name,
            requesterDeviceId: devId,
            mode: 'camera'
          });
        }
        return currPeers;
      });
    });

    // Socket Event: Remote peer requested this phone to become wireless microphone
    newSocket.on('remote-mic-requested', ({ requesterId, requesterName, requesterDeviceId }) => {
      if (!requesterId) return;
      playSound('request');
      triggerHaptic([40, 60, 40]);

      setPeers((currPeers) => {
        const found = currPeers.find((p) => p.id === requesterId);
        const name = requesterName || found?.name || 'Laptop';
        const devId = requesterDeviceId || found?.deviceId;

        // Check if requester is in trusted peers list
        const trusted = JSON.parse(localStorage.getItem('encross_trusted_peers') || '[]');
        if (devId && trusted.includes(devId)) {
          executeStream(requesterId, 'mic');
        } else {
          setPendingRemoteRequest({
            requesterId,
            requesterName: name,
            requesterDeviceId: devId,
            mode: 'mic'
          });
        }
        return currPeers;
      });
    });

    newSocket.on('camera-facing-changed', ({ facingMode }) => {
      if (facingMode) {
        setCameraFacingMode(facingMode);
      }
    });

    // Remote File System Socket Event Listeners
    // 1. Peer requests directory listing from this device
    newSocket.on('fs-list-request', ({ requesterId, dirPath }) => {
      if (!requesterId) return;
      if (typeof window !== 'undefined' && window.AndroidFileSystem?.listDirectory) {
        if (!window.AndroidFileSystem.hasStoragePermission()) {
          newSocket.emit('fs-list-response', {
            targetId: requesterId,
            currentPath: dirPath || '/',
            items: [],
            error: 'PERMISSION_REQUIRED'
          });
          return;
        }
        try {
          const resStr = window.AndroidFileSystem.listDirectory(dirPath || '/');
          const data = JSON.parse(resStr);
          newSocket.emit('fs-list-response', {
            targetId: requesterId,
            currentPath: data.currentPath || dirPath || '/',
            items: data.items || [],
            error: data.error || null
          });
        } catch (e) {
          newSocket.emit('fs-list-response', {
            targetId: requesterId,
            currentPath: dirPath || '/',
            items: [],
            error: e.message
          });
        }
      } else {
        // If running in PC Browser / Desktop: query local PC directory
        newSocket.emit('fs-read-local-pc-dir', { dirPath: dirPath || '/' }, (res) => {
          newSocket.emit('fs-list-response', {
            targetId: requesterId,
            currentPath: res?.currentPath || dirPath || '/',
            items: res?.items || [],
            error: res?.error || null
          });
        });
      }
    });

    // 2. Peer responds with directory listing
    newSocket.on('fs-list-response', ({ currentPath, items, error }) => {
      setExplorerLoading(false);
      if (error) {
        setExplorerError(error);
      } else {
        setExplorerPath(currentPath || '/');
        setExplorerItems(items || []);
        setExplorerError(null);
      }
    });

    // Auto Clipboard Sync Listener
    newSocket.on('sync-clipboard', ({ senderName, text }) => {
      if (!FEATURE_TOGGLES.enableAutoClipboardSync || !text) return;
      if (text === lastSyncedClipboardRef.current) return;
      lastSyncedClipboardRef.current = text;

      if (window.electronAPI?.setClipboardText) {
        window.electronAPI.setClipboardText(text);
      } else if (window.AndroidClipboard?.setClipboardText) {
        window.AndroidClipboard.setClipboardText(text);
      }

      setIncomingToast({
        senderName: senderName || 'Perangkat',
        text: 'Clipboard: ' + (text.length > 50 ? text.substring(0, 50) + '...' : text),
        senderId: null
      });
    });

    // Remote Input Event (for desktop executing phone touchpad commands)
    newSocket.on('remote-input-event', ({ event }) => {
      if (window.electronAPI?.sendRemoteInput) {
        window.electronAPI.sendRemoteInput(event);
      }
    });

    // Ring Phone Event (Mobile receives alarm trigger from PC)
    newSocket.on('ring-device', ({ senderName }) => {
      if (!FEATURE_TOGGLES.enableRingPhone) return;
      if (window.AndroidRinger?.startRinging) {
        window.AndroidRinger.startRinging();
      }
      setIsRingingActive(true);
      setRingingSenderName(senderName || 'Laptop');
    });

    newSocket.on('stop-ring-device', () => {
      if (window.AndroidRinger?.stopRinging) {
        window.AndroidRinger.stopRinging();
      }
      setIsRingingActive(false);
    });

    // Notification Mirroring (PC receives phone notifications)
    newSocket.on('incoming-notification', ({ senderName, notif }) => {
      if (!FEATURE_TOGGLES.enableNotificationMirror || !notif) return;
      playSound('message');
      triggerHaptic([30, 40]);

      if (window.electronAPI?.showNotification) {
        window.electronAPI.showNotification(
          (notif.appName || senderName || 'HP') + ': ' + (notif.title || 'Notifikasi'),
          notif.text || ''
        );
      }

      setIncomingToast({
        senderName: notif.appName || senderName || 'HP',
        text: (notif.title ? notif.title + ': ' : '') + (notif.text || ''),
        senderId: null
      });
    });

    // Real-Time Peer Status & Battery updates
    newSocket.on('peer-status-updated', ({ id, deviceId, battery }) => {
      setPeers((prev) =>
        prev.map((p) => (p.id === id || (deviceId && p.deviceId === deviceId) ? { ...p, battery } : p))
      );
    });

    // 3. Peer requests a file to be sent from this device
    newSocket.on('fs-pull-file-request', async ({ requesterId, filePath, fileName }) => {
      if (!requesterId || !filePath) return;
      if (typeof window !== 'undefined' && window.AndroidFileSystem?.readFileBase64) {
        try {
          const b64 = window.AndroidFileSystem.readFileBase64(filePath);
          if (!b64 || b64.startsWith('ERROR:')) {
            alert('Gagal membaca file dari penyimpanan: ' + (b64 || 'File tidak dapat diakses'));
            return;
          }
          const byteCharacters = atob(b64);
          const byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);
          const file = new File([byteArray], fileName || 'file', { type: 'application/octet-stream' });
          if (webrtcManagerRef.current) {
            await webrtcManagerRef.current.sendFile(requesterId, file);
          }
        } catch (err) {
          console.error('[RemoteFS] Error sending requested file:', err);
        }
      }
    });

    // Socket Event: Connection Error
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

    // Socket Event: Room Peers received
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
      if (newPeer.deviceId === device.deviceId) return;
      playSound('connect');
      triggerHaptic([30]);

      setPeers((prev) => {
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

    // Socket Event: Tab superseded
    newSocket.on('tab-superseded', () => {
      console.warn('Sesi dialihkan ke tab/browser lain pada perangkat ini.');
      setIsSuperseded(true);
    });

    // Socket Event: Instant Text Message received
    newSocket.on('receive-text-message', (msg) => {
      playSound('message');
      triggerHaptic([40, 60]);
      setTextMessages((prev) => [...prev, { ...msg, isSelf: false }]);

      setPeers((currPeers) => {
        const sender = currPeers.find(
          (p) => p.id === msg.senderId || (msg.senderDeviceId && p.deviceId === msg.senderDeviceId)
        );
        if (sender) {
          setTextTargetPeer(sender);
        }
        return currPeers;
      });

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

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        if (newSocket && !newSocket.connected) {
          console.log('[App] App returned to foreground, reconnecting socket...');
          newSocket.connect();
        } else if (newSocket && newSocket.connected) {
          // Re-announce presence just in case server lost peer state while asleep
          newSocket.emit('join-room', {
            roomId: 'encross-default-room',
            device
          });
        }
      }
    };
    const handleOnline = () => {
      if (newSocket && !newSocket.connected) {
        newSocket.connect();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('online', handleOnline);
    window.addEventListener('focus', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('focus', handleVisibilityChange);
      try {
        if (keepAliveAudioCtx) keepAliveAudioCtx.close();
      } catch (_) {}
      newSocket.disconnect();
      rtcManager.cleanup();
    };
  }, []);

  // Periodic latency measurement (Ping check)
  useEffect(() => {
    if (!socket) return;
    const interval = setInterval(() => {
      if (socket.connected) {
        const start = Date.now();
        socket.emit('ping-check', () => {
          setPingMs(Date.now() - start);
        });
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [socket]);

  // Global Paste Listener (Ctrl+V) for Quick File / Screenshot Send
  useEffect(() => {
    if (!FEATURE_TOGGLES.enableGlobalPaste) return;
    const handlePaste = (e) => {
      const activeTag = document.activeElement?.tagName?.toLowerCase();
      if (activeTag === 'input' || activeTag === 'textarea') return;

      const items = e.clipboardData?.items;
      if (!items || peers.length === 0) return;

      const files = [];
      for (let i = 0; i < items.length; i++) {
        if (items[i].kind === 'file') {
          const file = items[i].getAsFile();
          if (file) files.push(file);
        }
      }

      if (files.length > 0) {
        e.preventDefault();
        const target = textTargetPeer?.id || peers[0]?.id;
        if (target) {
          triggerHaptic([35]);
          handleSendFile(target, files);
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [peers, textTargetPeer]);

  // Auto Clipboard Monitoring for Electron Desktop
  useEffect(() => {
    if (!FEATURE_TOGGLES.enableAutoClipboardSync) return;
    if (window.electronAPI?.onClipboardChanged && socket) {
      const unsubscribe = window.electronAPI.onClipboardChanged((text) => {
        if (text && text !== lastSyncedClipboardRef.current) {
          lastSyncedClipboardRef.current = text;
          socket.emit('sync-clipboard', { text });
        }
      });
      return () => unsubscribe?.();
    }
  }, [socket]);

  // Auto Clipboard Monitoring for Android APK
  useEffect(() => {
    if (!FEATURE_TOGGLES.enableAutoClipboardSync) return;
    window.onAndroidClipboardChanged = (text) => {
      if (text && text !== lastSyncedClipboardRef.current && socket) {
        lastSyncedClipboardRef.current = text;
        socket.emit('sync-clipboard', { text });
      }
    };
    return () => {
      window.onAndroidClipboardChanged = null;
    };
  }, [socket]);

  // Real-Time Battery Monitor Sync
  useEffect(() => {
    if (!FEATURE_TOGGLES.enableBatteryMonitor || !socket) return;

    const pushBattery = (batteryData) => {
      if (batteryData && typeof batteryData === 'object') {
        socket.emit('update-battery-status', { battery: batteryData });
      }
    };

    // Android Native Battery Bridge
    if (window.AndroidBattery?.getBatteryStatus) {
      try {
        const raw = window.AndroidBattery.getBatteryStatus();
        const parsed = JSON.parse(raw);
        pushBattery(parsed);
      } catch (_) {}

      window.onAndroidBatteryChanged = (jsonStr) => {
        try {
          const parsed = typeof jsonStr === 'string' ? JSON.parse(jsonStr) : jsonStr;
          pushBattery(parsed);
        } catch (_) {}
      };
      return () => {
        window.onAndroidBatteryChanged = null;
      };
    }

    // Web Browser Battery API fallback
    if (typeof navigator !== 'undefined' && navigator.getBattery) {
      navigator.getBattery().then((bm) => {
        const update = () => {
          pushBattery({
            level: Math.round(bm.level * 100),
            isCharging: bm.charging,
            temperature: null
          });
        };
        update();
        bm.addEventListener('levelchange', update);
        bm.addEventListener('chargingchange', update);
      }).catch(() => {});
    }
  }, [socket]);

  // Android Notification Mirroring listener
  useEffect(() => {
    if (!FEATURE_TOGGLES.enableNotificationMirror || !socket) return;
    window.onAndroidNotificationReceived = (notifData) => {
      try {
        const notif = typeof notifData === 'string' ? JSON.parse(notifData) : notifData;
        socket.emit('mirror-notification', { notif });
      } catch (_) {}
    };
    return () => {
      window.onAndroidNotificationReceived = null;
    };
  }, [socket]);

  // Ring My Phone Handlers
  const handleRingDevice = (targetId) => {
    if (!socket || !targetId) return;
    socket.emit('ring-device', { targetId });
    setIncomingToast({
      senderName: 'Sistem',
      text: 'Membunyikan alarm di ponsel target...',
      senderId: null
    });
  };

  const handleStopRinging = () => {
    if (window.AndroidRinger?.stopRinging) {
      window.AndroidRinger.stopRinging();
    }
    setIsRingingActive(false);
    if (socket) {
      socket.emit('stop-ring-device', {});
    }
  };

  // Mount and open Phone WebDAV Storage directly in Windows File Explorer (Drive Z:)
  const handleMountPhoneStorage = async (peer) => {
    triggerHaptic([30]);
    const peerIp = peer?.ip || peer?.clientIp;
    const peerPort = peer?.webdavPort || 8089;

    if (!peerIp) {
      setIncomingToast({
        senderName: 'VanCross Storage',
        text: 'Alamat IP perangkat HP tidak terdeteksi di jaringan.',
        senderId: null
      });
      return;
    }

    if (window.electronAPI?.mountPhoneStorage) {
      setIncomingToast({
        senderName: 'VanCross Storage',
        text: `Menghubungkan penyimpanan ${peer.name || 'HP'} ke Windows File Explorer (Drive Z:)...`,
        senderId: null
      });
      try {
        const res = await window.electronAPI.mountPhoneStorage({ ip: peerIp, port: peerPort, driveLetter: 'Z:' });
        setIncomingToast({
          senderName: 'VanCross Storage',
          text: res?.message || 'Penyimpanan HP berhasil dibuka di Windows File Explorer!',
          senderId: null
        });
      } catch (err) {
        setIncomingToast({
          senderName: 'VanCross Storage',
          text: `Gagal memetakan drive: ${err.message}`,
          senderId: null
        });
      }
    } else {
      const davUrl = `http://${peerIp}:${peerPort}/`;
      window.open(davUrl, '_blank');
      setIncomingToast({
        senderName: 'VanCross Storage',
        text: `Buka File Explorer -> Map Network Drive -> Masukkan: ${davUrl}`,
        senderId: null
      });
    }
  };

  // Send Remote Touchpad / Keyboard / Macro Command to PC
  const handleSendInput = (event, targetPeerParam = null) => {
    const peer = targetPeerParam || selectedPeerForTouchpad || selectedPeerForMacroPad;
    if (!peer) return;
    const sentP2P = webrtcManagerRef.current?.sendRemoteInput(peer.id, event);
    if (!sentP2P && socket) {
      socket.emit('remote-input-event', {
        targetId: peer.id,
        event
      });
    }
  };

  // Pause / Resume & Cancel Transfer Handlers
  const handleTogglePauseTransfer = (fileId) => {
    const webrtc = webrtcManagerRef.current;
    if (!webrtc) return;
    const transfer = webrtc.activeTransfers.get(fileId);
    if (transfer?.paused) {
      webrtc.resumeTransfer(fileId);
    } else {
      webrtc.pauseTransfer(fileId);
    }
  };

  const handleCancelTransfer = (fileId, peerId) => {
    if (webrtcManagerRef.current) {
      webrtcManagerRef.current.cancelTransfer(fileId, peerId);
    }
    setActiveTransfer(null);
  };

  // Stepped back navigation for mobile (Android hardware/gesture back & browser popstate)
  const handleBackStep = () => {
    if (isMacroPadModalOpenRef.current) {
      setIsMacroPadModalOpen(false);
      setSelectedPeerForMacroPad(null);
      return true;
    }
    if (isTouchpadModalOpenRef.current) {
      setIsTouchpadModalOpen(false);
      setSelectedPeerForTouchpad(null);
      return true;
    }
    if (pendingRemoteRequestRef.current) {
      setPendingRemoteRequest(null);
      return true;
    }
    if (isFileExplorerOpenRef.current) {
      setIsFileExplorerOpen(false);
      return true;
    }
    if (isScrcpyModalOpenRef.current) {
      setIsScrcpyModalOpen(false);
      return true;
    }
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
      try {
        const { StatusBar, Style } = await import('@capacitor/status-bar');
        await StatusBar.setOverlaysWebView({ overlay: false });
        await StatusBar.setStyle({ style: Style.Dark });
        await StatusBar.setBackgroundColor({ color: '#09090b' });
      } catch {}

      try {
        const { App: CapApp } = await import('@capacitor/app');
        backListener = await CapApp.addListener('backButton', () => {
          const handled = handleBackStep();
          if (!handled) {
            CapApp.exitApp();
          }
        });
      } catch {}
    };

    setupMobileSystem();

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
      Boolean(pendingRemoteRequest) ||
      Boolean(isTouchpadModalOpen) ||
      Boolean(isMacroPadModalOpen) ||
      isFileExplorerOpen ||
      isScrcpyModalOpen ||
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
    pendingRemoteRequest,
    isFileExplorerOpen,
    isScrcpyModalOpen,
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

  // Save Server IP
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

  // Send File Handler with Multi-File Queue support
  const handleSendFile = async (peerId, fileOrFiles) => {
    if (!webrtcManagerRef.current) return;
    const files = Array.isArray(fileOrFiles) ? fileOrFiles : [fileOrFiles];
    for (const file of files) {
      try {
        await webrtcManagerRef.current.sendFile(peerId, file);
      } catch (err) {
        console.error('File send error:', err);
        alert('Gagal mengirim file ' + (file.name || '') + ': ' + err.message);
        break;
      }
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
      const includeAudio = Boolean(FEATURE_TOGGLES.enableAudioStream);
      const stream = await webrtcManagerRef.current.startScreenShare(peerId, mode, includeAudio);
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

  // Allow or Deny Remote Stream Request
  const handleAllowRemoteRequest = (alwaysTrust = false) => {
    if (!pendingRemoteRequest) return;
    triggerHaptic([35]);
    const { requesterId, requesterDeviceId, mode } = pendingRemoteRequest;
    if (alwaysTrust && requesterDeviceId) {
      const current = JSON.parse(localStorage.getItem('encross_trusted_peers') || '[]');
      if (!current.includes(requesterDeviceId)) {
        current.push(requesterDeviceId);
        localStorage.setItem('encross_trusted_peers', JSON.stringify(current));
      }
    }
    setPendingRemoteRequest(null);
    executeStream(requesterId, mode);
  };

  const handleDenyRemoteRequest = () => {
    triggerHaptic([25]);
    setPendingRemoteRequest(null);
  };

  // Screen / Camera Share Handler (Toggle start/stop)
  const handleStartScreenShare = async (peerId, explicitMode = null) => {
    if (!webrtcManagerRef.current) return;

    if (activeSharingPeerId === peerId) {
      webrtcManagerRef.current.stopScreenShare(peerId);
      setActiveSharingPeerId(null);
      setActiveSharingMode(null);
      setLocalBroadcastStream(null);
      return;
    }

    if (explicitMode) {
      if (socket && (explicitMode === 'camera' || explicitMode === 'screen')) {
        socket.emit('request-remote-scrcpy', {
          targetId: peerId,
          mode: explicitMode === 'camera' ? 'camera' : 'display'
        });
      }
      executeStream(peerId, explicitMode);
      return;
    }

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

  const handleRequestRemoteScreen = (targetId) => {
    if (!socket || !targetId) return;
    triggerHaptic([30]);
    socket.emit('request-remote-screen', { targetId });
  };

  const handleRequestRemoteCamera = (targetId) => {
    if (!socket || !targetId) return;
    triggerHaptic([30]);
    socket.emit('request-remote-camera', { targetId });
  };

  const handleRequestRemoteMic = (targetId) => {
    if (!socket || !targetId) return;
    triggerHaptic([30]);
    socket.emit('request-remote-mic', { targetId });
  };

  const handleOpenScrcpy = (peer, mode = 'display') => {
    triggerHaptic([30]);
    setScrcpyTargetPeer(peer);
    setScrcpyInitialMode(mode);
    setIsScrcpyModalOpen(true);
  };

  // Remote File Explorer Handlers
  const handleOpenFileExplorer = (peer) => {
    triggerHaptic([30]);
    setExplorerTargetPeer(peer);
    setIsFileExplorerOpen(true);
    setExplorerLoading(true);
    setExplorerError(null);
    setExplorerPath('/');
    setExplorerItems([]);

    const isPeerPc = peer.deviceType === 'desktop' || ['Windows', 'macOS', 'Linux'].includes(peer.os);

    if (isPeerPc && socket) {
      socket.emit('fs-read-local-pc-dir', { dirPath: '/' }, (res) => {
        setExplorerLoading(false);
        if (res?.error) {
          setExplorerError(res.error);
        } else {
          setExplorerPath(res?.currentPath || '/');
          setExplorerItems(res?.items || []);
        }
      });
    } else if (socket) {
      socket.emit('fs-list-request', { targetId: peer.id, dirPath: '/' });
    }
  };

  const handleExplorerNavigate = (subPath) => {
    if (!explorerTargetPeer || !socket) return;
    setExplorerLoading(true);
    setExplorerError(null);

    const isPeerPc = explorerTargetPeer.deviceType === 'desktop' || ['Windows', 'macOS', 'Linux'].includes(explorerTargetPeer.os);

    if (isPeerPc) {
      socket.emit('fs-read-local-pc-dir', { dirPath: subPath }, (res) => {
        setExplorerLoading(false);
        if (res?.error) {
          setExplorerError(res.error);
        } else {
          setExplorerPath(res?.currentPath || subPath);
          setExplorerItems(res?.items || []);
        }
      });
    } else {
      socket.emit('fs-list-request', { targetId: explorerTargetPeer.id, dirPath: subPath });
    }
  };

  const handleExplorerRefresh = () => {
    handleExplorerNavigate(explorerPath || '/');
  };

  const handleExplorerPullFile = (item) => {
    if (!explorerTargetPeer || !item) return;
    triggerHaptic([35]);

    const isPeerPc = explorerTargetPeer.deviceType === 'desktop' || ['Windows', 'macOS', 'Linux'].includes(explorerTargetPeer.os);

    if (isPeerPc) {
      // Download directly via high-speed HTTP endpoint from PC host
      const host = localIp || window.location.hostname || 'localhost';
      const downloadUrl = `http://${host}:3001/api/pc-files/download?path=${encodeURIComponent(item.path)}`;
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = item.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } else if (socket) {
      // Pull file from Android phone via WebRTC DataChannel
      socket.emit('fs-pull-file-request', {
        targetId: explorerTargetPeer.id,
        filePath: item.path,
        fileName: item.name
      });
      alert(`Meminta file "${item.name}" dari ${explorerTargetPeer.name}... Transfer akan otomatis dimulai.`);
    }
  };

  const handleRequestStoragePermission = () => {
    if (typeof window !== 'undefined' && window.AndroidFileSystem?.requestStoragePermission) {
      window.AndroidFileSystem.requestStoragePermission();
    } else if (typeof window !== 'undefined' && window.AndroidDownloader?.requestStoragePermission) {
      window.AndroidDownloader.requestStoragePermission();
    } else {
      alert('Buka Pengaturan di HP Anda dan aktifkan "Izin Pengelolaan Semua File" untuk aplikasi ENCross.');
    }
  };

  // Open Downloads/ENCross folder (Electron)
  const handleOpenFolder = async () => {
    if (window.electronAPI?.openEncrossFolder) {
      await window.electronAPI.openEncrossFolder();
    } else {
      alert('File tersimpan di folder Downloads/ENCross pada perangkat Anda.');
    }
  };

  const handleClearTransferHistory = () => {
    triggerHaptic([25]);
    setTransferHistory([]);
  };

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

      {/* Floating Incoming Text Pop-up Notification (top-16 to avoid blocking Navbar) */}
      {incomingToast && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-zinc-900/95 border border-zinc-700 text-white px-3.5 py-2.5 sm:px-4 sm:py-3 rounded-2xl shadow-2xl backdrop-blur-md flex items-center gap-2.5 sm:gap-3 max-w-[94vw] sm:max-w-md animate-slideDown">
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
                <span className="text-[9px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.5 rounded font-mono">
                  Baru
                </span>
              </div>
              <p className="text-xs text-zinc-100 truncate font-mono mt-0.5 group-hover:text-emerald-300 transition">
                {incomingToast.text}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={handleOpenChatFromToast}
              className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg text-xs transition cursor-pointer shadow-sm active:scale-95 flex items-center gap-1"
            >
              <span>Buka</span>
            </button>
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

      {/* Interactive Remote Request Confirmation Modal (Privacy & User Gesture Fix) */}
      {pendingRemoteRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md p-5 sm:p-6 shadow-2xl relative text-left">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                {pendingRemoteRequest.mode === 'mic' ? (
                  <Mic className="w-6 h-6 text-teal-400" />
                ) : pendingRemoteRequest.mode === 'camera' ? (
                  <Camera className="w-6 h-6" />
                ) : (
                  <Monitor className="w-6 h-6" />
                )}
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  Permintaan Akses {pendingRemoteRequest.mode === 'mic' ? 'Mikrofon HP' : pendingRemoteRequest.mode === 'camera' ? 'Kamera HP' : 'Layar'}
                </h3>
                <p className="text-xs text-zinc-400">Konfirmasi Izin Privasi</p>
              </div>
            </div>

            <p className="text-xs text-zinc-300 leading-relaxed mb-5">
              <strong className="text-white">{pendingRemoteRequest.requesterName}</strong> meminta izin untuk mengakses{' '}
              <strong className="text-emerald-400">
                {pendingRemoteRequest.mode === 'mic'
                  ? 'Mikrofon HP Anda sebagai Mic Eksternal Laptop'
                  : pendingRemoteRequest.mode === 'camera'
                  ? 'Kamera (Webcam)'
                  : 'Layar Anda'}
              </strong>.
              Apakah Anda mengizinkan siaran langsung ini?
            </p>

            <div className="flex flex-col sm:flex-row gap-2">
              <button
                onClick={() => handleAllowRemoteRequest(false)}
                className="flex-1 py-2.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl text-xs transition cursor-pointer active:scale-[0.98] flex items-center justify-center gap-1.5 shadow-sm"
              >
                <Check className="w-4 h-4" />
                <span>Izinkan</span>
              </button>

              <button
                onClick={() => handleAllowRemoteRequest(true)}
                className="flex-1 py-2.5 px-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 font-semibold rounded-xl text-xs transition cursor-pointer active:scale-[0.98] flex items-center justify-center gap-1.5"
                title="Jangan tanya lagi untuk perangkat ini"
              >
                <Shield className="w-4 h-4 text-emerald-400" />
                <span>Selalu Percayai</span>
              </button>

              <button
                onClick={handleDenyRemoteRequest}
                className="py-2.5 px-4 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-xl text-xs font-semibold transition cursor-pointer border border-zinc-800 active:scale-[0.98]"
              >
                Tolak
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Workspace */}
      <main className="flex-1 flex flex-col justify-center py-2">
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
          onRequestRemoteScreen={handleRequestRemoteScreen}
          onRequestRemoteCamera={handleRequestRemoteCamera}
          onRequestRemoteMic={handleRequestRemoteMic}
          onOpenScrcpy={handleOpenScrcpy}
          onOpenQR={() => setIsQrOpen(true)}
          isMobile={isMobileDevice}
          onOpenConnect={() => setIsServerIpModalOpen(true)}
          onOpenFileExplorer={handleOpenFileExplorer}
          onOpenTouchpad={(peer) => { setSelectedPeerForTouchpad(peer); setIsTouchpadModalOpen(true); }}
          onOpenMacroPad={(peer) => { setSelectedPeerForMacroPad(peer); setIsMacroPadModalOpen(true); }}
          onRingDevice={handleRingDevice}
          pingMs={pingMs}
          transferHistory={transferHistory}
          onClearTransferHistory={handleClearTransferHistory}
          onOpenFolder={handleOpenFolder}
          onMountPhoneStorage={handleMountPhoneStorage}
        />
      </main>

      {/* Scrcpy Phone Mirroring Hub Modal (Native Desktop 60 FPS) */}
      <ScrcpyModal
        isOpen={isScrcpyModalOpen}
        onClose={() => setIsScrcpyModalOpen(false)}
        targetPeer={scrcpyTargetPeer}
        initialMode={scrcpyInitialMode}
      />

      {/* Two-Way Remote File Explorer Modal */}
      <FileExplorerModal
        isOpen={isFileExplorerOpen}
        onClose={() => setIsFileExplorerOpen(false)}
        targetPeer={explorerTargetPeer}
        currentPath={explorerPath}
        items={explorerItems}
        loading={explorerLoading}
        error={explorerError}
        onNavigate={handleExplorerNavigate}
        onRefresh={handleExplorerRefresh}
        onPullFile={handleExplorerPullFile}
        onStreamMedia={(item) => setStreamingMediaItem(item)}
        onRequestPermission={handleRequestStoragePermission}
      />

      {/* Instant Media Streaming Modal */}
      <MediaStreamingModal
        isOpen={Boolean(streamingMediaItem)}
        onClose={() => setStreamingMediaItem(null)}
        mediaItem={streamingMediaItem}
        targetPeer={explorerTargetPeer}
        onDownloadFile={handleExplorerPullFile}
      />

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

      {/* Server IP Config Modal */}
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

      {/* QR Code Modal */}
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

          <div className="min-w-0 pr-1 text-left">
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

          <button
            onClick={handleSwitchCamera}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 active:scale-95 text-emerald-400 hover:text-emerald-300 border border-zinc-700/70 text-xs font-semibold transition cursor-pointer shrink-0"
            title="Ganti Kamera Depan / Belakang"
          >
            <SwitchCamera className="w-3.5 h-3.5" />
            <span className="text-[11px]">Ganti Kamera</span>
          </button>

          <button
            onClick={() => handleStartScreenShare(activeSharingPeerId)}
            className="p-2 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/40 active:scale-95 transition cursor-pointer shrink-0"
            title="Hentikan Siaran"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Floating Wireless Mic Broadcaster Bar when Mic Streaming is Active on Phone */}
      {activeSharingPeerId && activeSharingMode === 'mic' && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-zinc-900/95 border border-teal-500/40 rounded-2xl shadow-2xl p-2.5 sm:p-3 flex items-center gap-3 backdrop-blur-md max-w-[94vw] animate-in fade-in slide-in-from-bottom-3 duration-200">
          <div className="w-10 h-10 rounded-xl bg-teal-500/20 text-teal-400 border border-teal-500/30 flex items-center justify-center shrink-0">
            <Mic className="w-5 h-5 animate-pulse" />
          </div>

          <div className="min-w-0 pr-1 text-left">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-white">Mic HP Aktif (PC Mic)</span>
              <span className="text-[10px] font-mono text-teal-300 bg-teal-500/15 border border-teal-500/30 px-1 rounded">
                BROADCAST
              </span>
            </div>
            <p className="text-[10px] text-zinc-400 truncate">
              Siaran ke: {peers.find((p) => p.id === activeSharingPeerId)?.name || 'Laptop'}
            </p>
          </div>

          <button
            onClick={() => {
              if (localBroadcastStream) {
                const audioTrack = localBroadcastStream.getAudioTracks()[0];
                if (audioTrack) {
                  audioTrack.enabled = !audioTrack.enabled;
                  triggerHaptic([20]);
                }
              }
            }}
            className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 text-xs font-semibold transition cursor-pointer shrink-0"
            title="Mute / Unmute Mic"
          >
            <MicOff className="w-4 h-4" />
          </button>

          <button
            onClick={() => handleStartScreenShare(activeSharingPeerId)}
            className="p-2 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/40 active:scale-95 transition cursor-pointer shrink-0"
            title="Hentikan Mic"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Live Remote Screen / Camera Monitoring Modal or Wireless Mic Modal */}
      {incomingStream && (
        incomingStreamMode === 'mic' ? (
          <WirelessMicModal
            stream={incomingStream}
            senderName={screenSenderName}
            onClose={() => {
              setIncomingStream(null);
              setIncomingStreamPeerId(null);
            }}
          />
        ) : (
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
        )
      )}

            {/* Virtual Touchpad & Numpad Modal */}
      {isTouchpadModalOpen && (
        <TouchpadModal
          targetPeer={selectedPeerForTouchpad}
          onSendInput={handleSendInput}
          onOpenMacroPad={(peer) => {
            setSelectedPeerForMacroPad(peer);
            setIsMacroPadModalOpen(true);
          }}
          onClose={() => {
            setIsTouchpadModalOpen(false);
            setSelectedPeerForTouchpad(null);
          }}
        />
      )}

      {/* Virtual Macro Pad & Stream Deck Modal */}
      {isMacroPadModalOpen && (
        <MacroPadModal
          targetPeer={selectedPeerForMacroPad}
          onSendInput={(cmd) => handleSendInput(cmd, selectedPeerForMacroPad)}
          onClose={() => {
            setIsMacroPadModalOpen(false);
            setSelectedPeerForMacroPad(null);
          }}
        />
      )}

      {/* Ring My Phone Alarm Alert Modal/Banner */}
      {isRingingActive && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-red-950/80 backdrop-blur-md animate-pulse">
          <div className="bg-zinc-900 border-2 border-red-500 rounded-3xl p-6 max-w-sm w-full text-center shadow-2xl shadow-red-950">
            <div className="w-16 h-16 rounded-full bg-red-500/20 text-red-400 border border-red-500/40 flex items-center justify-center mx-auto mb-4 animate-bounce">
              <BellRing className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-white mb-1">Ponsel Sedang Dideringkan!</h3>
            <p className="text-xs text-zinc-300 mb-6">
              Permintaan dari <span className="text-red-400 font-semibold">{ringingSenderName || 'Laptop'}</span> untuk mencari perangkat ini.
            </p>
            <button
              onClick={handleStopRinging}
              className="w-full py-3.5 bg-red-600 hover:bg-red-500 active:bg-red-700 text-white font-bold text-sm rounded-xl transition cursor-pointer shadow-lg shadow-red-900/50"
            >
              HENTIKAN DERING
            </button>
          </div>
        </div>
      )}

      {/* Footer Info */}
      <footer className="py-3 text-center text-[11px] text-zinc-500 border-t border-zinc-900/80 px-4 space-y-0.5">
        <p>ENCross • Direct WebRTC P2P Transfer & Screen Hub • Zero Cloud Storage</p>
        <p className="text-[10px] text-zinc-400">
          Dibuat & Dikembangkan oleh <span className="text-emerald-400 font-semibold">Edvan</span> (<a href="https://github.com/EdvanVPRoject/ENCross" target="_blank" rel="noreferrer" className="hover:text-emerald-300 underline underline-offset-2">EdvanVPRoject</a>)
        </p>
      </footer>
    </div>
  );
}

export default App;


