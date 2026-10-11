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
  createDesktopShortcut: () => ipcRenderer.invoke('create-desktop-shortcut')
});
