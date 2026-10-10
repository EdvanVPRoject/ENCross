const { app, BrowserWindow, Tray, Menu, Notification, ipcMain, nativeImage } = require('electron');
const path = require('path');
const http = require('http');
const { fork } = require('child_process');

let mainWindow = null;
let tray = null;
let serverProcess = null;
let hasShownTrayTip = false;
let serverLocalIp = '127.0.0.1';

const isDev = process.env.NODE_ENV === 'development';

// 1. Helper to probe if server is alive on port 3001
function probeServer(port = 3001) {
  return new Promise((resolve) => {
    const req = http.get(`http://127.0.0.1:${port}/api/network-info`, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.localIps && parsed.localIps.length > 0) {
            serverLocalIp = parsed.localIps[0].address;
          }
        } catch (_) {}
        resolve(true);
      });
    });
    req.on('error', () => resolve(false));
    req.setTimeout(1000, () => {
      req.abort();
      resolve(false);
    });
  });
}

// 2. Start background Express & Socket.io server if not already running
async function ensureServerRunning() {
  const isRunning = await probeServer(3001);
  if (isRunning) {
    console.log('[Electron] Server already running on port 3001.');
    return;
  }

  const serverScript = path.join(__dirname, '../server/index.js');
  console.log('[Electron] Spawning server process:', serverScript);

  serverProcess = fork(serverScript, [], {
    cwd: path.join(__dirname, '../server'),
    stdio: 'inherit',
    env: { ...process.env, PORT: '3001' }
  });

  serverProcess.on('error', (err) => {
    console.error('[Electron] Failed to start backend server:', err);
  });

  serverProcess.on('exit', (code) => {
    console.log(`[Electron] Backend server exited with code ${code}`);
  });

  // Wait until server starts responding
  for (let i = 0; i < 25; i++) {
    await new Promise((r) => setTimeout(r, 200));
    const ready = await probeServer(3001);
    if (ready) {
      console.log('[Electron] Backend server is ready.');
      return;
    }
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

  // Load URL: in dev, check 5173, otherwise load 3001
  const targetUrl = isDev ? 'http://localhost:5173' : 'http://localhost:3001';
  console.log(`[Electron] Loading UI from: ${targetUrl}`);

  mainWindow.loadURL(targetUrl).catch(() => {
    // Fallback to port 3001 if dev server isn't running
    mainWindow.loadURL('http://localhost:3001');
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
          body: 'Aplikasi tetap aktif di latar belakang untuk menerima file dan teks dari perangkat lain.',
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
    await ensureServerRunning();
    createMainWindow();
    createSystemTray();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createMainWindow();
      }
    });
  });
}

// Cleanup server child process on app termination
function cleanupProcesses() {
  if (serverProcess) {
    console.log('[Electron] Terminating background server process...');
    serverProcess.kill('SIGINT');
    serverProcess = null;
  }
}

app.on('before-quit', () => {
  app.isQuitting = true;
  cleanupProcesses();
});

app.on('will-quit', () => {
  cleanupProcesses();
});

app.on('window-all-closed', () => {
  // Keep alive in tray on Windows unless user explicitly clicks "Keluar"
  if (process.platform !== 'win32' && app.isQuitting) {
    app.quit();
  }
});
