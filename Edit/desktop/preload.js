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
  connectAdbTcpip: (ip, port) => ipcRenderer.invoke('connect-adb-tcpip', { ip, port }),
  enableAdbTcpip: (port) => ipcRenderer.invoke('enable-adb-tcpip', { port }),
  stopScrcpy: () => ipcRenderer.invoke('stop-scrcpy')
});
