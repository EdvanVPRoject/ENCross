const { app, BrowserWindow, Tray, Menu, Notification, ipcMain, nativeImage, session, desktopCapturer } = require('electron');
const path = require('path');
const http = require('http');
const fs = require('fs');
const { startServer, getLocalIpAddresses } = require('./server');

let mainWindow = null;
let tray = null;
let hasShownTrayTip = false;
let serverLocalIp = '127.0.0.1';

const isDev = process.env.NODE_ENV === 'development';

// 1. Resolve distPath correctly in both dev and packaged environments
function getDistPath() {
  const candidates = [
    path.join(__dirname, '../client/dist'),
    path.join(app.getAppPath(), 'client/dist'),
    path.join(process.resourcesPath || '', 'app.asar/client/dist'),
    path.join(__dirname, 'client/dist')
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate) && fs.existsSync(path.join(candidate, 'index.html'))) {
      return candidate;
    }
  }
  return candidates[0];
}

// 2. Start integrated in-process Express & Socket.io server
async function ensureServerRunning() {
  const distPath = getDistPath();
  console.log('[Electron] Initializing embedded server with distPath:', distPath);

  try {
    const result = await startServer(3001, distPath);
    console.log(`[Electron] Server is running on port 3001 (isExisting: ${result.isExisting})`);
  } catch (err) {
    console.error('[Electron] Server initialization warning:', err);
  }

  const localIps = getLocalIpAddresses();
  if (localIps.length > 0) {
    serverLocalIp = localIps[0].address;
  }
}

// 3. Create Main Application Window
function createMainWindow() {
  const iconPath = path.join(__dirname, 'assets/icon.png');
  const appIcon = nativeImage.createFromPath(iconPath);

  mainWindow = new BrowserWindow({
    width: 1100,
    height: 760,
    minWidth: 640,
    minHeight: 520,
    title: 'VanCross Hub',
    icon: appIcon,
    backgroundColor: '#09090b',
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  const targetUrl = isDev ? 'http://localhost:5173' : 'http://localhost:3001';
  console.log(`[Electron] Loading UI from: ${targetUrl}`);

  mainWindow.loadURL(targetUrl).catch((err) => {
    console.warn(`[Electron] Failed to load ${targetUrl}, fallback to http://localhost:3001`, err);
    mainWindow.loadURL('http://localhost:3001');
  });

  // Handle load failure and retry gracefully
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    console.error(`[Electron] Load failed: ${validatedURL} (${errorCode}: ${errorDescription})`);
    setTimeout(() => {
      if (mainWindow) {
        mainWindow.loadURL('http://localhost:3001');
      }
    }, 600);
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.focus();
  });

  // Intercept close to minimize to System Tray
  mainWindow.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      mainWindow.hide();

      if (!hasShownTrayTip && Notification.isSupported()) {
        hasShownTrayTip = true;
        new Notification({
          title: 'VanCross Hub',
          body: 'Aplikasi tetap aktif di latar belakang (System Tray) untuk menerima file dan teks.',
          icon: appIcon
        }).show();
      }
    }
  });
}

// 4. Create System Tray
function createSystemTray() {
  const iconPath = path.join(__dirname, 'assets/icon.png');
  const trayIcon = nativeImage.createFromPath(iconPath);

  tray = new Tray(trayIcon);
  tray.setToolTip('VanCross Hub - Aktif di Jaringan LAN');

  const updateContextMenu = () => {
    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Buka VanCross Hub',
        click: () => {
          if (mainWindow) {
            mainWindow.show();
            mainWindow.focus();
          }
        }
      },
      {
        label: `LAN: http://${serverLocalIp}:3001`,
        enabled: false
      },
      { type: 'separator' },
      {
        label: 'Keluar',
        click: () => {
          app.isQuitting = true;
          app.quit();
        }
      }
    ]);
    tray.setContextMenu(contextMenu);
  };

  updateContextMenu();

  tray.on('click', () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.hide();
      } else {
        mainWindow.show();
        mainWindow.focus();
      }
    }
  });

  tray.on('double-click', () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

// 5. IPC Handlers
ipcMain.on('show-notification', (_, { title, body }) => {
  if (Notification.isSupported()) {
    const iconPath = path.join(__dirname, 'assets/icon.png');
    new Notification({
      title: title || 'VanCross Hub',
      body: body || '',
      icon: nativeImage.createFromPath(iconPath)
    }).show();
  }
});

ipcMain.on('minimize-to-tray', () => {
  if (mainWindow) {
    mainWindow.hide();
  }
});

// Single Instance Lock (prevents multiple desktop windows)
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });

  app.whenReady().then(async () => {
    // 1. Grant media & display permissions automatically
    session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
      callback(true);
    });
    session.defaultSession.setPermissionCheckHandler(() => true);

    // 2. Handle screen sharing (getDisplayMedia) in Electron
    session.defaultSession.setDisplayMediaRequestHandler((request, callback) => {
      desktopCapturer.getSources({ types: ['screen', 'window'] }).then((sources) => {
        const primaryScreen =
          sources.find((s) => s.id.startsWith('screen:0')) ||
          sources.find((s) => s.id.startsWith('screen')) ||
          sources[0];

        if (primaryScreen) {
          console.log('[Electron] Display capture source:', primaryScreen.name);
          callback({ video: primaryScreen });
        } else {
          console.warn('[Electron] No screen source available');
          callback({});
        }
      }).catch((err) => {
        console.error('[Electron] desktopCapturer error:', err);
        callback({});
      });
    });

    // 3. Start embedded in-process server
    await ensureServerRunning();

    // 4. Create Window & Tray
    createMainWindow();
    createSystemTray();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createMainWindow();
      }
    });
  });
}

app.on('before-quit', () => {
  app.isQuitting = true;
});

app.on('window-all-closed', () => {
  if (process.platform !== 'win32' && app.isQuitting) {
    app.quit();
  }
});
