const { app, BrowserWindow, Tray, Menu, Notification, ipcMain, nativeImage, session, desktopCapturer } = require('electron');
const path = require('path');
const http = require('http');
const fs = require('fs');
const { exec, spawn } = require('child_process');
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

function getAppIcon() {
  const icoPath = path.join(__dirname, 'assets/icon.ico');
  const pngPath = path.join(__dirname, 'assets/icon.png');
  if (process.platform === 'win32' && fs.existsSync(icoPath)) {
    return nativeImage.createFromPath(icoPath);
  }
  return nativeImage.createFromPath(pngPath);
}

// 3. Create Main Application Window
function createMainWindow() {
  const appIcon = getAppIcon();

  mainWindow = new BrowserWindow({
    width: 1100,
    height: 760,
    minWidth: 640,
    minHeight: 520,
    title: 'ENCross Hub',
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

  // Log renderer console messages for diagnostics
  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    console.log(`[Renderer] [${level}] ${message} (${sourceId}:${line})`);
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
          title: 'ENCross Hub',
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
  tray.setToolTip('ENCross Hub - Aktif di Jaringan LAN');

  const updateContextMenu = () => {
    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Buka ENCross Hub',
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
        label: 'Buat Shortcut di Desktop',
        click: () => {
          createDesktopShortcut(true);
        }
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

// 5. Automatic Desktop Shortcut Creation on Windows
function createDesktopShortcut(force = false) {
  if (process.platform !== 'win32') return false;
  try {
    const desktopPath = app.getPath('desktop');
    const shortcutPath = path.join(desktopPath, 'ENCross.lnk');

    // If shortcut already exists and not explicitly forced, skip
    if (fs.existsSync(shortcutPath) && !force) {
      return true;
    }

    const targetExe = process.env.PORTABLE_EXECUTABLE_FILE || process.execPath;
    // Skip if in development mode running electron.exe
    if (path.basename(targetExe).toLowerCase().includes('electron.exe')) {
      return false;
    }

    const workDir = path.dirname(targetExe);
    const icoPath = path.join(__dirname, 'assets/icon.ico');
    const hasIco = fs.existsSync(icoPath);
    const vbsPath = path.join(app.getPath('temp'), `encross_sc_${Date.now()}.vbs`);
    const script = [
      'Set ws = CreateObject("WScript.Shell")',
      `Set lnk = ws.CreateShortcut("${shortcutPath.replace(/\\/g, '\\\\')}")`,
      `lnk.TargetPath = "${targetExe.replace(/\\/g, '\\\\')}"`,
      `lnk.WorkingDirectory = "${workDir.replace(/\\/g, '\\\\')}"`,
      hasIco ? `lnk.IconLocation = "${icoPath.replace(/\\/g, '\\\\')},0"` : '',
      'lnk.Description = "ENCross LAN Hub - P2P File Transfer & Screen Hub"',
      'lnk.Save'
    ].filter(Boolean).join('\r\n');

    fs.writeFileSync(vbsPath, script, 'utf8');

    const { exec } = require('child_process');
    exec(`cscript //nologo "${vbsPath}"`, (err) => {
      try {
        fs.unlinkSync(vbsPath);
      } catch (_) {}

      if (err) {
        console.warn('[Shortcut] Warning creating desktop shortcut:', err.message);
      } else {
        console.log('[Shortcut] Desktop shortcut ensured at:', shortcutPath);
        if (force && Notification.isSupported()) {
          new Notification({
            title: 'ENCross Hub',
            body: 'Shortcut ENCross berhasil dibuat di Desktop Anda!',
            icon: getAppIcon()
          }).show();
        }
      }
    });

    return true;
  } catch (err) {
    console.error('[Shortcut] Error in createDesktopShortcut:', err);
    return false;
  }
}

// 6. IPC Handlers
ipcMain.on('show-notification', (_, { title, body }) => {
  if (Notification.isSupported()) {
    const iconPath = path.join(__dirname, 'assets/icon.png');
    new Notification({
      title: title || 'ENCross Hub',
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

ipcMain.handle('create-desktop-shortcut', () => {
  return createDesktopShortcut(true);
});

function getEncrossSubfolder(fileName = '', mimeType = '') {
  const ext = (fileName || '').split('.').pop().toLowerCase();
  const mime = (mimeType || '').toLowerCase();

  // 1. Image -> /ENCross/Image
  if (
    mime.startsWith('image/') ||
    ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico', 'tiff', 'tif', 'heic', 'raw'].includes(ext)
  ) {
    return 'Image';
  }

  // 2. Video -> /ENCross/Video
  if (
    mime.startsWith('video/') ||
    ['mp4', 'mkv', 'webm', 'avi', 'mov', 'wmv', 'flv', '3gp', 'm4v', 'ts'].includes(ext)
  ) {
    return 'Video';
  }

  // 3. Audio -> /ENCross/Audio
  if (
    mime.startsWith('audio/') ||
    ['mp3', 'wav', 'ogg', 'm4a', 'flac', 'aac', 'wma', 'opus', 'mid'].includes(ext)
  ) {
    return 'Audio';
  }

  // 4. Document -> /ENCross/Document
  if (
    mime.includes('pdf') ||
    mime.includes('word') ||
    mime.includes('officedocument') ||
    mime.includes('text') ||
    mime.includes('excel') ||
    mime.includes('powerpoint') ||
    ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'csv', 'md', 'epub', 'rtf'].includes(ext)
  ) {
    return 'Document';
  }

  // 5. Acak / Other files -> directly in Downloads/ENCross
  return '';
}

ipcMain.handle('save-file-to-encross', async (_, { fileName, base64Data, mimeType }) => {
  try {
    const subfolder = getEncrossSubfolder(fileName, mimeType);
    const downloadsDir = app.getPath('downloads');
    const targetDir = subfolder
      ? path.join(downloadsDir, 'ENCross', subfolder)
      : path.join(downloadsDir, 'ENCross');

    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const filePath = path.join(targetDir, fileName);
    const buffer = Buffer.from(base64Data, 'base64');
    fs.writeFileSync(filePath, buffer);

    const relFolder = subfolder ? `Downloads/ENCross/${subfolder}` : 'Downloads/ENCross';
    if (Notification.isSupported()) {
      const iconPath = path.join(__dirname, 'assets/icon.png');
      new Notification({
        title: 'File Diterima',
        body: `Disimpan di ${relFolder}/${fileName}`,
        icon: nativeImage.createFromPath(iconPath)
      }).show();
    }

    return { success: true, path: filePath, relFolder };
  } catch (err) {
    console.error('[Electron] Error saving file to ENCross folder:', err);
    return { success: false, error: err.message };
  }
});

// Scrcpy & ADB Integration for Ultra-Smooth Phone Mirroring
let activeScrcpyProcess = null;

function parseAdbDevices(stdout) {
  if (!stdout) return [];
  const lines = stdout.split(/\r?\n/).filter(line => line.trim() && !line.startsWith('List of devices'));
  return lines.map(line => {
    const parts = line.trim().split(/\s+/);
    const id = parts[0];
    const status = parts[1] || 'unknown';
    const modelMatch = line.match(/model:([^\s]+)/);
    const model = modelMatch ? modelMatch[1].replace(/_/g, ' ') : id;
    const isWireless = id.includes(':');
    return {
      id,
      status, // 'device', 'unauthorized', 'offline'
      model,
      isWireless,
      raw: line
    };
  });
}

ipcMain.handle('get-scrcpy-status', async () => {
  return new Promise((resolve) => {
    exec('scrcpy --version', (sErr, sOut) => {
      const isScrcpyAvailable = !sErr && Boolean(sOut && sOut.includes('scrcpy'));
      const scrcpyVersion = isScrcpyAvailable ? (sOut.match(/scrcpy\s+([^\s]+)/)?.[1] || '4.1') : null;

      exec('adb devices -l', (aErr, aOut) => {
        const isAdbAvailable = !aErr;
        const devices = (!aErr && aOut) ? parseAdbDevices(aOut) : [];
        resolve({
          isScrcpyAvailable,
          scrcpyVersion,
          isAdbAvailable,
          devices,
          isMirroringActive: Boolean(activeScrcpyProcess && !activeScrcpyProcess.killed)
        });
      });
    });
  });
});

ipcMain.handle('start-scrcpy', async (_, options = {}) => {
  const { deviceId, ip, stayAwake = true, alwaysOnTop = false } = options;

  if (activeScrcpyProcess && !activeScrcpyProcess.killed) {
    try {
      activeScrcpyProcess.kill();
    } catch (_) {}
    activeScrcpyProcess = null;
  }

  const args = ['--window-title=ENCross - Layar HP'];
  if (stayAwake) args.push('--stay-awake');
  if (alwaysOnTop) args.push('--always-on-top');

  if (deviceId) {
    args.push('-s', deviceId);
  } else if (ip) {
    args.push(`--tcpip=${ip}:5555`);
  }

  return new Promise((resolve) => {
    try {
      const child = spawn('scrcpy', args, {
        windowsHide: false,
        detached: true
      });
      activeScrcpyProcess = child;

      let hasReported = false;
      let errorOutput = '';

      child.stderr.on('data', (data) => {
        const text = data.toString();
        errorOutput += text;
        console.log('[Scrcpy stderr]', text);
      });

      child.stdout.on('data', (data) => {
        const text = data.toString();
        console.log('[Scrcpy stdout]', text);
        if (!hasReported) {
          hasReported = true;
          resolve({ success: true, pid: child.pid });
        }
      });

      child.on('error', (err) => {
        console.error('[Scrcpy process error]', err);
        if (!hasReported) {
          hasReported = true;
          resolve({ success: false, error: err.message });
        }
      });

      child.on('exit', (code) => {
        console.log('[Scrcpy process exited]', code);
        activeScrcpyProcess = null;
        if (!hasReported) {
          hasReported = true;
          resolve({ success: false, error: errorOutput || `Scrcpy keluar dengan kode ${code}` });
        }
      });

      // If process starts without immediate error in 1.5 seconds, consider it running
      setTimeout(() => {
        if (!hasReported) {
          hasReported = true;
          resolve({ success: true, pid: child.pid });
        }
      }, 1500);
    } catch (err) {
      resolve({ success: false, error: err.message });
    }
  });
});

ipcMain.handle('connect-adb-tcpip', async (_, { ip, port = 5555 }) => {
  if (!ip) return { success: false, error: 'Alamat IP diperlukan' };
  const target = `${ip}:${port}`;
  return new Promise((resolve) => {
    exec(`adb connect ${target}`, (err, stdout, stderr) => {
      const out = (stdout || '') + (stderr || '');
      const isConnected = out.includes('connected to') && !out.includes('cannot connect') && !out.includes('failed');
      resolve({
        success: isConnected,
        output: out.trim(),
        error: isConnected ? null : out.trim()
      });
    });
  });
});

ipcMain.handle('enable-adb-tcpip', async (_, { port = 5555 }) => {
  return new Promise((resolve) => {
    exec(`adb tcpip ${port}`, (err, stdout, stderr) => {
      const out = (stdout || '') + (stderr || '');
      if (err) {
        return resolve({ success: false, error: out || err.message });
      }
      resolve({ success: true, output: out.trim() });
    });
  });
});

ipcMain.handle('stop-scrcpy', async () => {
  if (activeScrcpyProcess && !activeScrcpyProcess.killed) {
    try {
      activeScrcpyProcess.kill();
    } catch (_) {}
    activeScrcpyProcess = null;
    return { success: true };
  }
  return { success: false, message: 'Tidak ada proses Scrcpy yang berjalan' };
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

    // 3. Auto-route all downloads into Downloads/ENCross/{subfolder}
    session.defaultSession.on('will-download', (event, item) => {
      const fileName = item.getFilename();
      const mimeType = item.getMimeType();
      const subfolder = getEncrossSubfolder(fileName, mimeType);
      const downloadsDir = app.getPath('downloads');
      const targetDir = subfolder
        ? path.join(downloadsDir, 'ENCross', subfolder)
        : path.join(downloadsDir, 'ENCross');

      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }

      const filePath = path.join(targetDir, fileName);
      item.setSavePath(filePath);
    });

    // 4. Start embedded in-process server
    await ensureServerRunning();

    // 4. Create Window & Tray
    createMainWindow();
    createSystemTray();

    // 5. Automatically ensure Desktop Shortcut exists on launch
    createDesktopShortcut(false);

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
