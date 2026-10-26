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
  unmountPhoneStorage: (driveLetter) => ipcRenderer.invoke('unmount-phone-storage', driveLetter)
});
