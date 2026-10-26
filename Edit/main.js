const { app, BrowserWindow, Tray, Menu, Notification, ipcMain, nativeImage, session, desktopCapturer, shell, clipboard, powerSaveBlocker } = require('electron');
const path = require('path');
const http = require('http');
const fs = require('fs');
const { execFile, spawn, exec, execSync } = require('child_process');
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
    const result = await startServer(3001, distPath, {
      onRemoteInput: (cmd) => sendInputCommand(cmd)
    });
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
  const icoUnpacked = path.join(__dirname, 'assets/icon.ico').replace('app.asar', 'app.asar.unpacked');
  if (process.platform === 'win32' && fs.existsSync(icoUnpacked)) {
    return nativeImage.createFromPath(icoUnpacked);
  }
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
    show: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      backgroundThrottling: false
    }
  });

  try {
    if (powerSaveBlocker && !powerSaveBlocker.isStarted?.(1)) {
      powerSaveBlocker.start('prevent-app-suspension');
    }
  } catch (_) {}

  mainWindow.webContents.on('did-finish-load', () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
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

  // Intercept close to minimize to System Tray only if tray is active
  mainWindow.on('close', (event) => {
    if (!app.isQuitting) {
      if (tray && !tray.isDestroyed()) {
        event.preventDefault();
        mainWindow.hide();

        if (!hasShownTrayTip && Notification.isSupported()) {
          hasShownTrayTip = true;
          try {
            new Notification({
              title: 'ENCross Hub',
              body: 'Aplikasi tetap aktif di latar belakang (System Tray) untuk menerima file dan teks.',
              icon: appIcon
            }).show();
          } catch (_) {}
        }
      } else {
        // If system tray is not available, quit cleanly to avoid zombie background processes
        app.isQuitting = true;
        app.quit();
      }
    }
  });
}

// 4. Create System Tray
function createSystemTray() {
  try {
    let trayIcon = null;
    const icoPath = path.join(__dirname, 'assets/icon.ico').replace('app.asar', 'app.asar.unpacked');
    if (process.platform === 'win32' && fs.existsSync(icoPath)) {
      trayIcon = nativeImage.createFromPath(icoPath);
    }
    if (!trayIcon || trayIcon.isEmpty()) {
      const pngPath = path.join(__dirname, 'assets/icon.png').replace('app.asar', 'app.asar.unpacked');
      if (fs.existsSync(pngPath)) {
        trayIcon = nativeImage.createFromPath(pngPath);
      }
    }
    if (!trayIcon || trayIcon.isEmpty()) {
      trayIcon = getAppIcon();
    }

    if (trayIcon && !trayIcon.isEmpty() && process.platform === 'win32') {
      trayIcon = trayIcon.resize({ width: 16, height: 16 });
    }

    tray = new Tray(trayIcon);
    tray.setToolTip('ENCross Hub - Aktif di Jaringan LAN');

    const updateContextMenu = () => {
      const contextMenu = Menu.buildFromTemplate([
        {
          label: 'Buka ENCross Hub',
          click: () => {
            if (mainWindow) {
              if (mainWindow.isMinimized()) mainWindow.restore();
              mainWindow.show();
              mainWindow.setSkipTaskbar(false);
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
          if (mainWindow.isMinimized()) mainWindow.restore();
          mainWindow.show();
          mainWindow.setSkipTaskbar(false);
          mainWindow.focus();
        }
      }
    });

    tray.on('double-click', () => {
      if (mainWindow) {
        if (mainWindow.isMinimized()) mainWindow.restore();
        mainWindow.show();
        mainWindow.setSkipTaskbar(false);
        mainWindow.focus();
      }
    });
  } catch (err) {
    console.warn('[Tray] Warning creating tray icon:', err.message);
    tray = null;
  }
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

    let targetExe = process.env.PORTABLE_EXECUTABLE_FILE || process.execPath;
    let targetArgs = '';
    let workDir = path.dirname(targetExe);

    if (path.basename(targetExe).toLowerCase().includes('electron.exe')) {
      targetArgs = `"${app.getAppPath()}"`;
      workDir = app.getAppPath();
    }

    const icoPath = path.join(__dirname, 'assets/icon.ico');
    const hasIco = fs.existsSync(icoPath);
    const vbsPath = path.join(app.getPath('temp'), `encross_sc_${Date.now()}.vbs`);
    const script = [
      'Set ws = CreateObject("WScript.Shell")',
      `Set lnk = ws.CreateShortcut("${shortcutPath.replace(/\\/g, '\\\\')}")`,
      `lnk.TargetPath = "${targetExe.replace(/\\/g, '\\\\')}"`,
      targetArgs ? `lnk.Arguments = ${JSON.stringify(targetArgs)}` : '',
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

// Helper to safely sanitize filename and prevent overwrite with automatic numbering (1), (2)
function getUniqueSafeFilePath(targetDir, rawFileName) {
  const safeName = path.basename(rawFileName || 'file');
  let finalPath = path.join(targetDir, safeName);
  if (!fs.existsSync(finalPath)) {
    return finalPath;
  }
  const ext = path.extname(safeName);
  const base = path.basename(safeName, ext);
  let counter = 1;
  while (fs.existsSync(path.join(targetDir, `${base} (${counter})${ext}`))) {
    counter++;
  }
  return path.join(targetDir, `${base} (${counter})${ext}`);
}

ipcMain.handle('save-file-to-encross', async (_, { fileName, base64Data, mimeType, relativePath }) => {
  try {
    const downloadsDir = app.getPath('downloads');
    let targetDir;
    let finalFileName = fileName;

    if (relativePath && (relativePath.includes('/') || relativePath.includes('\\'))) {
      const cleanRelPath = relativePath.replace(/^[/\\]+/, '');
      const parts = cleanRelPath.split(/[/\\]+/);
      finalFileName = parts.pop() || fileName;
      targetDir = path.join(downloadsDir, 'ENCross', ...parts);
    } else {
      const subfolder = getEncrossSubfolder(fileName, mimeType);
      targetDir = subfolder
        ? path.join(downloadsDir, 'ENCross', subfolder)
        : path.join(downloadsDir, 'ENCross');
    }

    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const filePath = getUniqueSafeFilePath(targetDir, finalFileName);
    const savedName = path.basename(filePath);
    const buffer = Buffer.from(base64Data, 'base64');
    fs.writeFileSync(filePath, buffer);

    const relFolder = targetDir.replace(downloadsDir, 'Downloads').replace(/\\/g, '/');
    if (Notification.isSupported()) {
      const iconPath = path.join(__dirname, 'assets/icon.png');
      new Notification({
        title: 'File Diterima',
        body: `Disimpan di ${relFolder}/${savedName}`,
        icon: nativeImage.createFromPath(iconPath)
      }).show();
    }

    return { success: true, path: filePath, relFolder, fileName: savedName };
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
    execFile('scrcpy', ['--version'], (sErr, sOut) => {
      const isScrcpyAvailable = !sErr && Boolean(sOut && sOut.includes('scrcpy'));
      const scrcpyVersion = isScrcpyAvailable ? (sOut.match(/scrcpy\s+([^\s]+)/)?.[1] || '4.1') : null;

      execFile('adb', ['devices', '-l'], (aErr, aOut) => {
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
  const {
    deviceId,
    ip,
    stayAwake = true,
    alwaysOnTop = false,
    maxSize = 0,
    bitRate = '8M',
    turnScreenOff = false,
    videoSource = 'display', // 'display' | 'camera'
    cameraFacing = 'back',   // 'back' | 'front'
    includeAudio = true
  } = options;

  if (activeScrcpyProcess && !activeScrcpyProcess.killed) {
    try {
      activeScrcpyProcess.kill();
    } catch (_) {}
    activeScrcpyProcess = null;
  }

  const isCamera = videoSource === 'camera';
  const title = isCamera ? 'ENCross - Wireless Webcam HP (60 FPS)' : 'ENCross - Layar HP';
  const args = [`--window-title=${title}`];
  if (stayAwake) args.push('--stay-awake');
  if (alwaysOnTop) args.push('--always-on-top');
  if (maxSize && Number(maxSize) > 0) args.push(`--max-size=${Number(maxSize)}`);
  if (bitRate && typeof bitRate === 'string') args.push(`--video-bit-rate=${bitRate}`);
  if (turnScreenOff && !isCamera) args.push('--turn-screen-off');

  if (isCamera) {
    args.push('--video-source=camera');
    args.push(`--camera-facing=${cameraFacing === 'front' ? 'front' : 'back'}`);
    if (includeAudio) {
      args.push('--audio-source=mic');
    }
  }

  if (deviceId) {
    args.push('-s', deviceId);
  } else if (ip) {
    const cleanIp = String(ip).trim();
    args.push(`--tcpip=${cleanIp}:5555`);
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

ipcMain.handle('connect-adb-tcpip', async (_, arg1, arg2) => {
  let ip = '';
  let port = 5555;
  if (arg1 && typeof arg1 === 'object') {
    ip = arg1.ip;
    port = arg1.port || 5555;
  } else {
    ip = arg1;
    port = arg2 || 5555;
  }

  if (!ip || typeof ip !== 'string') return { success: false, error: 'Alamat IP diperlukan' };
  const target = `${ip.trim()}:${port}`;
  if (!/^[0-9a-zA-Z.:-]+$/.test(target)) {
    return { success: false, error: 'Format IP/Port tidak valid' };
  }

  return new Promise((resolve) => {
    execFile('adb', ['connect', target], (err, stdout, stderr) => {
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

ipcMain.handle('enable-adb-tcpip', async (_, arg1) => {
  let port = 5555;
  if (arg1 && typeof arg1 === 'object') {
    port = arg1.port || 5555;
  } else if (arg1) {
    port = arg1;
  }
  return new Promise((resolve) => {
    execFile('adb', ['tcpip', String(port)], (err, stdout, stderr) => {
      const out = (stdout || '') + (stderr || '');
      if (err) {
        return resolve({ success: false, error: out || err.message });
      }
      resolve({ success: true, output: out.trim() });
    });
  });
});

ipcMain.handle('pair-adb-wifi', async (_, arg1, arg2) => {
  let ipPort = '';
  let code = '';
  if (arg1 && typeof arg1 === 'object') {
    ipPort = arg1.ipPort || '';
    code = arg1.code || '';
  } else {
    ipPort = arg1 || '';
    code = arg2 || '';
  }

  if (!ipPort || !code) {
    return { success: false, error: 'IP:Port dan Kode Pairing diperlukan.' };
  }
  const cleanTarget = String(ipPort).trim();
  const cleanCode = String(code).trim();
  if (!/^[0-9a-zA-Z.:-]+$/.test(cleanTarget) || !/^[0-9]+$/.test(cleanCode)) {
    return { success: false, error: 'Karakter input pairing tidak valid.' };
  }

  return new Promise((resolve) => {
    execFile('adb', ['pair', cleanTarget, cleanCode], (err, stdout, stderr) => {
      const out = (stdout || '') + (stderr || '');
      const isSuccess = out.toLowerCase().includes('successfully paired');
      resolve({
        success: isSuccess,
        output: out.trim(),
        error: isSuccess ? null : out.trim()
      });
    });
  });
});

ipcMain.handle('open-encross-folder', async () => {
  try {
    const encrossDir = path.join(app.getPath('downloads'), 'ENCross');
    if (!fs.existsSync(encrossDir)) {
      fs.mkdirSync(encrossDir, { recursive: true });
    }
    await shell.openPath(encrossDir);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
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

// =============================================================================
// VIRTUAL TOUCHPAD & NATIVE INPUT SIMULATOR
// =============================================================================
let inputProcess = null;

function ensureInputHelperRunning() {
  if (inputProcess && !inputProcess.killed) return;
  let exePath = path.join(__dirname, 'assets/input-helper.exe');
  if (exePath.includes('app.asar')) {
    const unpacked = exePath.replace('app.asar', 'app.asar.unpacked');
    if (fs.existsSync(unpacked)) {
      exePath = unpacked;
    }
  }
  if (fs.existsSync(exePath)) {
    try {
      inputProcess = spawn(exePath, [], { windowsHide: true });
      inputProcess.stdin.setDefaultEncoding('utf-8');
      inputProcess.stdout?.on('data', () => {});
      inputProcess.stderr?.on('data', () => {});
      inputProcess.on('exit', () => { inputProcess = null; });
      inputProcess.on('error', (err) => console.warn('[InputHelper] process error:', err));
    } catch (e) {
      console.warn('[InputHelper] Failed to spawn:', e);
    }
  }
}

function sendInputCommand(cmdStr) {
  if (!cmdStr || typeof cmdStr !== 'string') return;

  // Handle instant text snippet typing via clipboard paste
  if (cmdStr.startsWith('type:')) {
    const textToType = cmdStr.slice(5);
    try {
      clipboard.writeText(textToType);
      setTimeout(() => {
        sendInputCommand('combo ctrl v');
      }, 40);
    } catch (_) {}
    return;
  }

  ensureInputHelperRunning();
  if (inputProcess && inputProcess.stdin && !inputProcess.stdin.destroyed) {
    try {
      inputProcess.stdin.write(cmdStr.trim() + '\n');
    } catch (_) {}
  }
}

ipcMain.handle('send-remote-input', (_, cmd) => {
  sendInputCommand(cmd);
  return true;
});

// =============================================================================
// AUTO CLIPBOARD SYNC MONITOR
// =============================================================================
let lastCopiedText = '';
let clipboardWatcher = null;

function startClipboardWatcher() {
  if (clipboardWatcher) return;
  try {
    lastCopiedText = clipboard.readText();
  } catch (_) {}

  clipboardWatcher = setInterval(() => {
    try {
      const current = clipboard.readText();
      if (typeof current === 'string' && current.length > 0 && current !== lastCopiedText) {
        lastCopiedText = current;
        if (mainWindow && !mainWindow.isDestroyed() && !mainWindow.webContents.isDestroyed()) {
          try {
            mainWindow.webContents.send('clipboard-changed', current);
          } catch (_) {}
        }
      }
    } catch (_) {}
  }, 1200);
}

ipcMain.handle('get-clipboard-text', () => {
  try {
    return clipboard.readText();
  } catch (_) {
    return '';
  }
});

ipcMain.handle('set-clipboard-text', (_, text) => {
  try {
    if (typeof text === 'string') {
      lastCopiedText = text;
      clipboard.writeText(text);
      return true;
    }
  } catch (_) {}
  return false;
});

// Map Phone WebDAV storage as a native Windows drive (e.g. Z:)
ipcMain.handle('mount-phone-storage', async (_, { ip, port = 8089, driveLetter = 'Z:' }) => {
  if (process.platform !== 'win32') {
    return { success: false, message: 'Fitur Map Drive hanya didukung pada sistem Windows.' };
  }
  if (!ip) {
    return { success: false, message: 'Alamat IP HP tidak valid.' };
  }

  // Ensure WebClient service is running (required for Windows WebDAV drive mapping)
  try {
    execSync('sc config WebClient start= auto', { stdio: 'ignore' });
    execSync('net start WebClient', { stdio: 'ignore' });
  } catch (_) {}

  // Delete any existing mapping on this drive letter
  try {
    execSync(`net use ${driveLetter} /delete /y`, { stdio: 'ignore' });
  } catch (_) {}

  const url = `http://${ip}:${port}`;
  try {
    // Attempt mapping via net use
    execSync(`net use ${driveLetter} ${url} /persistent:no`, { timeout: 8000 });
    // Open Windows File Explorer to the drive
    exec(`explorer.exe ${driveLetter}`);
    return {
      success: true,
      drive: driveLetter,
      message: `Penyimpanan HP berhasil dipetakan ke ${driveLetter} dan dibuka di Windows Explorer!`
    };
  } catch (err) {
    console.warn(`[WebDAV Mount Warning] net use failed, attempting UNC / explorer fallback: ${err.message}`);
    // Fallback 1: Try UNC path \\ip@port\DavWWWRoot
    try {
      exec(`explorer.exe "\\\\${ip}@${port}\\DavWWWRoot"`);
      return {
        success: true,
        drive: null,
        message: `Membuka penyimpanan HP melalui jalur jaringan \\\\${ip}@${port}...`
      };
    } catch (_) {
      // Fallback 2: Open browser WebDAV URL
      shell.openExternal(url);
      return {
        success: true,
        drive: null,
        message: `Membuka penyimpanan HP di browser: ${url}`
      };
    }
  }
});

ipcMain.handle('unmount-phone-storage', async (_, driveLetter = 'Z:') => {
  if (process.platform !== 'win32') return { success: false };
  try {
    execSync(`net use ${driveLetter} /delete /y`, { stdio: 'ignore' });
    return { success: true, message: `Drive ${driveLetter} berhasil dilepas.` };
  } catch (err) {
    return { success: false, error: err.message };
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
      if (!mainWindow.isVisible()) mainWindow.show();
      mainWindow.setSkipTaskbar(false);
      mainWindow.focus();
      try {
        mainWindow.setAlwaysOnTop(true);
        mainWindow.setAlwaysOnTop(false);
      } catch (_) {}
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

      const filePath = getUniqueSafeFilePath(targetDir, fileName);
      item.setSavePath(filePath);
    });

    // 4. Start embedded in-process server
    await ensureServerRunning();

    // 4. Create Window & Tray
    createMainWindow();
    createSystemTray();

        startClipboardWatcher();
    ensureInputHelperRunning();

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
  if (inputProcess && !inputProcess.killed) {
    try { inputProcess.kill(); } catch (_) {}
  }
  if (clipboardWatcher) {
    clearInterval(clipboardWatcher);
    clipboardWatcher = null;
  }
  app.isQuitting = true;
});

app.on('window-all-closed', () => {
  if (process.platform !== 'win32' && app.isQuitting) {
    app.quit();
  }
});

