const { contextBridge, ipcRenderer } = require('electron');

// Expose protected capabilities to renderer
contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  platform: process.platform,
  showNotification: (title, body) => {
    ipcRenderer.send('show-notification', { title, body });
  },
  minimizeToTray: () => {
    ipcRenderer.send('minimize-to-tray');
  },
  createDesktopShortcut: () => ipcRenderer.invoke('create-desktop-shortcut'),
  saveFileToEncross: (data) => ipcRenderer.invoke('save-file-to-encross', data),
  getScrcpyStatus: () => ipcRenderer.invoke('get-scrcpy-status'),
  startScrcpy: (opts) => ipcRenderer.invoke('start-scrcpy', opts),
  sendAdbKeyevent: (opts) => ipcRenderer.invoke('send-adb-keyevent', opts),
  connectAdbTcpip: (arg1, arg2) => (typeof arg1 === 'object' ? ipcRenderer.invoke('connect-adb-tcpip', arg1) : ipcRenderer.invoke('connect-adb-tcpip', { ip: arg1, port: arg2 })),
  enableAdbTcpip: (arg1) => (typeof arg1 === 'object' ? ipcRenderer.invoke('enable-adb-tcpip', arg1) : ipcRenderer.invoke('enable-adb-tcpip', { port: arg1 })),
  pairAdbWifi: (ipPort, code) => ipcRenderer.invoke('pair-adb-wifi', { ipPort, code }),
  openEncrossFolder: () => ipcRenderer.invoke('open-encross-folder'),
  stopScrcpy: () => ipcRenderer.invoke('stop-scrcpy'),
  updateScrcpyBounds: (bounds) => ipcRenderer.invoke('update-scrcpy-bounds', bounds),
  showScrcpy: () => ipcRenderer.invoke('show-scrcpy'),
  hideScrcpy: () => ipcRenderer.invoke('hide-scrcpy'),
  onScrcpyStopped: (callback) => {
    const handler = (_, data) => callback(data);
    ipcRenderer.on('scrcpy-stopped', handler);
    return () => ipcRenderer.removeListener('scrcpy-stopped', handler);
  },
  onWindowBoundsChanged: (callback) => {
    const handler = () => callback();
    ipcRenderer.on('window-bounds-changed', handler);
    return () => ipcRenderer.removeListener('window-bounds-changed', handler);
  },
  getClipboardText: () => ipcRenderer.invoke('get-clipboard-text'),
  setClipboardText: (text) => ipcRenderer.invoke('set-clipboard-text', text),
  onClipboardChanged: (callback) => {
    const handler = (_, text) => callback(text);
    ipcRenderer.on('clipboard-changed', handler);
    return () => ipcRenderer.removeListener('clipboard-changed', handler);
  },
  sendRemoteInput: (cmd) => ipcRenderer.invoke('send-remote-input', cmd),
  mountPhoneStorage: (params) => ipcRenderer.invoke('mount-phone-storage', params),
  unmountPhoneStorage: (driveLetter) => ipcRenderer.invoke('unmount-phone-storage', driveLetter),
  getMacAddress: () => ipcRenderer.invoke('get-mac-address'),
  sendWakeOnLan: (opts) => ipcRenderer.invoke('send-wake-on-lan', opts),
  remoteTypeText: (opts) => ipcRenderer.invoke('remote-type-text', opts),
  toggleFloatingDropzone: () => ipcRenderer.invoke('toggle-floating-dropzone'),
  getFloatingDropzoneState: () => ipcRenderer.invoke('get-floating-dropzone-state'),
  onDropzoneStateChanged: (callback) => {
    const handler = (_, state) => callback(state);
    ipcRenderer.on('dropzone-state-changed', handler);
    return () => ipcRenderer.removeListener('dropzone-state-changed', handler);
  },
  onDropzoneFilesReceived: (callback) => {
    const handler = (_, files) => callback(files);
    ipcRenderer.on('dropzone-files-received', handler);
    return () => ipcRenderer.removeListener('dropzone-files-received', handler);
  },
  notifyDropzoneFilesDropped: (filePaths) => ipcRenderer.send('dropzone-files-dropped', filePaths),
  readFileBuffer: (filePath) => ipcRenderer.invoke('read-file-buffer', filePath),
  getDesktopSources: (types) => ipcRenderer.invoke('get-desktop-sources', types),
  setTargetDisplaySource: (sourceId) => ipcRenderer.invoke('set-target-display-source', sourceId)
});
