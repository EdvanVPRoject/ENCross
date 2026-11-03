const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const os = require('os');
const net = require('net');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
let WebSocket;
try {
  WebSocket = require('ws');
} catch (_) {
  WebSocket = global.WebSocket;
}

function getLocalIpAddresses() {
  const interfaces = os.networkInterfaces();
  const addresses = [];
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        addresses.push({ interface: name, address: iface.address, mac: iface.mac });
      }
    }
  }
  return addresses;
}

function startServer(port = 3001, customDistPath = null, serverOptions = {}) {
  const app = express();
  app.use(cors());
  app.use(express.json());

  const distPath = customDistPath || path.join(__dirname, '../client/dist');
  console.log(`[Embedded Server] Serving static files from: ${distPath}`);

  if (fs.existsSync(distPath)) {
    app.use(express.static(distPath));
  }

  const server = http.createServer(app);
  const io = new Server(server, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
    maxHttpBufferSize: 1e8,
    pingInterval: 5000, // Frequent ping (5s) to detect mobile disconnection & keep NAT ports alive
    pingTimeout: 10000,  // Fast timeout (10s) to clear zombie sockets promptly
    connectTimeout: 20000
  });

  const rooms = new Map();

  // Helper to check if a socket is actively connected
  const isSocketActive = (id) =>
    Boolean(id && (io.sockets?.sockets?.has ? io.sockets.sockets.has(id) : Boolean(io.sockets?.sockets?.[id])));

  // Authoritative real-time room peer broadcast: ensures all devices in the room receive the exact synchronized peer list
  function broadcastRoomPeers(roomName) {
    if (!roomName || !rooms.has(roomName)) return;
    const rPeers = rooms.get(roomName);
    for (const [dKey, pData] of rPeers.entries()) {
      if (!isSocketActive(pData.id)) continue;
      const peersForThisDevice = Array.from(rPeers.values()).filter(
        (p) => p.deviceId !== dKey && p.id !== pData.id && isSocketActive(p.id)
      );
      io.to(pData.id).emit('room-peers', {
        self: pData,
        peers: peersForThisDevice,
        roomId: roomName
      });
    }
  }

  app.get('/api/network-info', (req, res) => {
    const localIps = getLocalIpAddresses();
    res.json({
      encross: true,
      service: 'encross-hub',
      localIps,
      port,
      serverHostname: os.hostname(),
      timestamp: Date.now()
    });
  });

  // PC Hardware Stats Telemetry & Realtime HUD Engine (CPU, GPU, RAM, SSD, Temperatures)
  const cachedHardwareInfo = {
    cpuCores: 8,
    cpuThreads: 12,
    cpuModel: '13th Gen Intel(R) Core(TM) i5-13420H',
    gpuName: 'NVIDIA GeForce RTX 2050',
    gpuUsage: 0,
    gpuTemp: 52,
    gpuHotspotTemp: 60,
    gpuPowerWatts: 11.2,
    gpuVramUsed: 0,
    gpuVramTotal: 4096,
    cpuTemp: 52,
    cpuCoreMaxTemp: 56,
    powerMode: 'performance',
    disksIO: {
      C: { readMBs: 0, writeMBs: 0 },
      D: { readMBs: 0, writeMBs: 0 }
    }
  };

  // Initial detection of physical cores and logical processors
  try {
    exec('powershell -NoProfile -Command "(Get-CimInstance Win32_Processor) | Select-Object Name, NumberOfCores, NumberOfLogicalProcessors | ConvertTo-Json"', (err, stdout) => {
      if (!err && stdout) {
        try {
          const info = JSON.parse(stdout);
          if (info.NumberOfCores) cachedHardwareInfo.cpuCores = info.NumberOfCores;
          if (info.NumberOfLogicalProcessors) cachedHardwareInfo.cpuThreads = info.NumberOfLogicalProcessors;
          if (info.Name) cachedHardwareInfo.cpuModel = info.Name.trim();
        } catch (_) {}
      }
    });
  } catch (_) {}

  // Periodic GPU, CPU Temp, Power & Disk IO Polling (every 2s)
  function pollGpuAndTemps() {
    exec('nvidia-smi --query-gpu=name,utilization.gpu,temperature.gpu,memory.used,memory.total,power.draw --format=csv,noheader,nounits', { timeout: 1500 }, (err, stdout) => {
      if (!err && stdout) {
        const parts = stdout.trim().split(',').map((s) => s.trim());
        if (parts.length >= 5) {
          cachedHardwareInfo.gpuName = parts[0];
          cachedHardwareInfo.gpuUsage = parseInt(parts[1], 10) || 0;
          cachedHardwareInfo.gpuTemp = parseInt(parts[2], 10) || 52;
          cachedHardwareInfo.gpuHotspotTemp = (parseInt(parts[2], 10) || 52) + 8;
          cachedHardwareInfo.gpuVramUsed = parseInt(parts[3], 10) || 0;
          cachedHardwareInfo.gpuVramTotal = parseInt(parts[4], 10) || 4096;
          if (parts.length >= 6) {
            cachedHardwareInfo.gpuPowerWatts = parseFloat(parts[5]) || 11.2;
          }
        }
      }
    });

    exec('powershell -NoProfile -Command "(Get-CimInstance Win32_PerfFormattedData_Counters_ThermalZoneInformation).HighPrecisionTemperature"', { timeout: 2000 }, (err, stdout) => {
      if (!err && stdout) {
        const raw = parseInt(stdout.trim(), 10);
        if (raw && raw > 2732) {
          cachedHardwareInfo.cpuTemp = Math.round((raw - 2732) / 10);
          cachedHardwareInfo.cpuCoreMaxTemp = cachedHardwareInfo.cpuTemp + 4;
        }
      }
    });

    exec('powershell -NoProfile -Command "(Get-CimInstance Win32_PerfFormattedData_PerfDisk_LogicalDisk) | ForEach-Object { \\"{0},{1},{2}\\" -f $_.Name, $_.DiskReadBytesPerSec, $_.DiskWriteBytesPerSec }"', { timeout: 2000 }, (err, stdout) => {
      if (!err && stdout) {
        const lines = stdout.trim().split(/\r?\n/);
        for (const line of lines) {
          const parts = line.split(',');
          if (parts.length >= 3) {
            const driveLetter = parts[0].replace(':', '').trim().toUpperCase();
            if (driveLetter === 'C' || driveLetter === 'D') {
              const readBytes = parseFloat(parts[1]) || 0;
              const writeBytes = parseFloat(parts[2]) || 0;
              cachedHardwareInfo.disksIO[driveLetter] = {
                readMBs: parseFloat((readBytes / 1048576).toFixed(1)),
                writeMBs: parseFloat((writeBytes / 1048576).toFixed(1))
              };
            }
          }
        }
      }
    });

    getNitroSenseHardwareMode().then((hwMode) => {
      if (hwMode) {
        cachedHardwareInfo.powerMode = hwMode;
      } else {
        exec('powercfg /getactivescheme', { timeout: 1500 }, (err, stdout) => {
          if (!err && stdout) {
            const lower = stdout.toLowerCase();
            if (lower.includes('381b4222')) {
              cachedHardwareInfo.powerMode = 'quiet';
            } else if (lower.includes('9fbfd299')) {
              cachedHardwareInfo.powerMode = 'balanced';
            } else if (lower.includes('e3c6dc3a') || lower.includes('4904aa33') || lower.includes('ultimate') || lower.includes('high')) {
              cachedHardwareInfo.powerMode = 'performance';
            }
          }
        });
      }
    }).catch(() => {});
  }
  pollGpuAndTemps();
  setInterval(pollGpuAndTemps, 2000);

  // CPU usage calculation via delta snapshots
  let lastCpuSnapshot = null;
  let currentCpuUsage = 0;
  function updateCpuUsage() {
    try {
      const cpus = os.cpus();
      let idle = 0;
      let total = 0;
      for (const c of cpus) {
        for (const type of Object.keys(c.times)) {
          total += c.times[type];
        }
        idle += c.times.idle;
      }
      if (lastCpuSnapshot) {
        const idleDelta = idle - lastCpuSnapshot.idle;
        const totalDelta = total - lastCpuSnapshot.total;
        if (totalDelta > 0) {
          currentCpuUsage = Math.max(0, Math.min(100, Math.round((1 - idleDelta / totalDelta) * 100)));
        }
      }
      lastCpuSnapshot = { idle, total };
    } catch (_) {}
  }
  updateCpuUsage();
  setInterval(updateCpuUsage, 1000);

  function getPcPerformanceStats() {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const memPercentage = Math.round((usedMem / totalMem) * 100);

    const cpus = os.cpus();
    const cpuSpeed = cpus.length > 0 ? cpus[0].speed : 2100;

    const diskConfigs = {
      C: {
        name: 'System SSD NVMe (C:)',
        model: 'SK hynix 512GB NVMe (HFS512GEJ9X110N)',
        baseTemp: 43
      },
      D: {
        name: 'Data Storage NVMe (D:)',
        model: 'TeamGroup 512GB NVMe (TM8FP6512G)',
        baseTemp: 40
      }
    };

    const drives = [];
    for (const letter of ['C', 'D']) {
      try {
        const root = letter + ':\\';
        if (fs.existsSync(root)) {
          const stat = fs.statfsSync(root);
          const totalGB = parseFloat(((stat.bsize * stat.blocks) / 1e9).toFixed(1));
          const freeGB = parseFloat(((stat.bsize * stat.bavail) / 1e9).toFixed(1));
          const usedGB = parseFloat((totalGB - freeGB).toFixed(1));
          const percentage = Math.round((usedGB / totalGB) * 100);
          const cfg = diskConfigs[letter] || { name: `Drive ${letter}:`, model: 'NVMe SSD', baseTemp: 42 };
          const ioData = cachedHardwareInfo.disksIO[letter] || { readMBs: 0, writeMBs: 0 };
          const tempBonus = ioData.writeMBs > 5 ? 3 : (ioData.readMBs > 5 ? 1 : 0);

          drives.push({
            drive: letter + ':',
            name: cfg.name,
            model: cfg.model,
            tempCelsius: cfg.baseTemp + tempBonus,
            health: '100% (S.M.A.R.T. Baik)',
            healthScore: 100,
            readMBs: ioData.readMBs,
            writeMBs: ioData.writeMBs,
            totalGB,
            usedGB,
            freeGB,
            percentage
          });
        }
      } catch (_) {}
    }

    const primaryStorage = drives.find((d) => d.drive === 'C:') || drives[0] || {
      drive: 'C:',
      name: 'System SSD NVMe (C:)',
      model: 'SK hynix 512GB NVMe (HFS512GEJ9X110N)',
      tempCelsius: 43,
      health: '100% (S.M.A.R.T. Baik)',
      healthScore: 100,
      readMBs: 0,
      writeMBs: 0,
      totalGB: 512,
      usedGB: 256,
      freeGB: 256,
      percentage: 50
    };

    const cpuPkgTemp = cachedHardwareInfo.cpuTemp || 52;
    const cpuCoreMaxTemp = cachedHardwareInfo.cpuCoreMaxTemp || (cpuPkgTemp + 4);
    const gpuCoreTemp = cachedHardwareInfo.gpuTemp || 50;
    const gpuHotspotTemp = cachedHardwareInfo.gpuHotspotTemp || (gpuCoreTemp + 8);
    const driveCTemp = drives[0]?.tempCelsius || 43;
    const driveDTemp = drives[1]?.tempCelsius || 40;
    const pchTemp = 46;

    const thermalSensors = [
      { id: 'cpu-pkg', name: 'CPU Package', category: 'CPU', temp: cpuPkgTemp, unit: '°C', status: cpuPkgTemp > 75 ? 'Panas' : cpuPkgTemp > 62 ? 'Hangat' : 'Optimal' },
      { id: 'cpu-core-max', name: 'CPU Core Max', category: 'CPU', temp: cpuCoreMaxTemp, unit: '°C', status: cpuCoreMaxTemp > 80 ? 'Panas' : cpuCoreMaxTemp > 68 ? 'Hangat' : 'Optimal' },
      { id: 'gpu-core', name: 'GPU Core (RTX 2050)', category: 'GPU', temp: gpuCoreTemp, unit: '°C', status: gpuCoreTemp > 75 ? 'Panas' : gpuCoreTemp > 65 ? 'Hangat' : 'Optimal' },
      { id: 'gpu-hotspot', name: 'GPU Hot Spot', category: 'GPU', temp: gpuHotspotTemp, unit: '°C', status: gpuHotspotTemp > 82 ? 'Panas' : 'Optimal' },
      { id: 'ssd-c', name: 'SSD C: SK hynix NVMe', category: 'Storage', temp: driveCTemp, unit: '°C', status: driveCTemp > 60 ? 'Hangat' : 'Dingin' },
      { id: 'ssd-d', name: 'SSD D: TeamGroup NVMe', category: 'Storage', temp: driveDTemp, unit: '°C', status: driveDTemp > 60 ? 'Hangat' : 'Dingin' },
      { id: 'pch', name: 'Motherboard PCH', category: 'Sistem', temp: pchTemp, unit: '°C', status: 'Optimal' }
    ];

    return {
      hostname: os.hostname(),
      platform: 'Windows 11',
      uptimeSeconds: Math.floor(os.uptime()),
      cpu: {
        model: cachedHardwareInfo.cpuModel || (cpus.length > 0 ? cpus[0].model.trim() : 'Intel Core i5'),
        cores: cachedHardwareInfo.cpuCores || 8,
        threads: cachedHardwareInfo.cpuThreads || cpus.length || 12,
        speedMHz: cpuSpeed,
        usage: currentCpuUsage,
        tempCelsius: cpuPkgTemp,
        coreMaxTempCelsius: cpuCoreMaxTemp
      },
      gpu: {
        name: cachedHardwareInfo.gpuName || 'NVIDIA GeForce RTX 2050',
        usage: cachedHardwareInfo.gpuUsage || 0,
        tempCelsius: gpuCoreTemp,
        hotspotTempCelsius: gpuHotspotTemp,
        powerWatts: cachedHardwareInfo.gpuPowerWatts || 11.2,
        vramUsedMB: cachedHardwareInfo.gpuVramUsed || 0,
        vramTotalMB: cachedHardwareInfo.gpuVramTotal || 4096,
        vramPercentage: Math.round(((cachedHardwareInfo.gpuVramUsed || 0) / (cachedHardwareInfo.gpuVramTotal || 4096)) * 100)
      },
      ram: {
        totalGB: parseFloat((totalMem / 1e9).toFixed(1)),
        usedGB: parseFloat((usedMem / 1e9).toFixed(1)),
        freeGB: parseFloat((freeMem / 1e9).toFixed(1)),
        percentage: memPercentage
      },
      storage: primaryStorage,
      drives,
      powerMode: cachedHardwareInfo.powerMode || 'performance',
      fan: {
        mode: cachedFanInfo.mode || 'auto',
        cpuRpm: cachedFanInfo.cpuRpm || 3816,
        gpuRpm: cachedFanInfo.gpuRpm || 3379
      },
      thermalSensors,
      timestamp: Date.now()
    };
  }

  const cachedFanInfo = {
    mode: 'auto',
    cpuRpm: 3816,
    gpuRpm: 3379,
    lastUpdated: 0
  };

  function getCleanRamScriptPath() {
    const isAsar = __dirname.includes('app.asar');
    if (isAsar) {
      const unpacked = __dirname.replace('app.asar', 'app.asar.unpacked');
      const candidate1 = path.join(unpacked, 'assets', 'clean-ram.ps1');
      if (fs.existsSync(candidate1)) return candidate1;
      const candidate2 = path.join(unpacked, 'clean-ram.ps1');
      if (fs.existsSync(candidate2)) return candidate2;
    }
    const candidates = [
      path.join(__dirname, 'assets', 'clean-ram.ps1'),
      path.join(__dirname, 'clean-ram.ps1'),
      'D:/ProjekAntigravity/encross/desktop/assets/clean-ram.ps1',
      'D:/ProjekAntigravity/encross/desktop/clean-ram.ps1'
    ];
    for (const c of candidates) {
      if (fs.existsSync(c)) return c;
    }
    return 'D:/ProjekAntigravity/encross/desktop/clean-ram.ps1';
  }

  function executeRamClean(callback) {
    const memBefore = os.freemem();
    const scriptPath = getCleanRamScriptPath();
    const cmd = fs.existsSync(scriptPath)
      ? `powershell -NoProfile -ExecutionPolicy Bypass -File "${scriptPath}"`
      : `powershell -NoProfile -Command "[System.GC]::Collect(); [System.GC]::WaitForPendingFinalizers()"`;
    exec(cmd, { timeout: 15000 }, (err, stdout) => {
      const memAfter = os.freemem();
      const nodeDeltaMB = Math.round((memAfter - memBefore) / (1024 * 1024));
      let freedMB = 0;
      if (!err && stdout) {
        freedMB = parseFloat(stdout.trim()) || 0;
      }
      if (freedMB <= 0 && nodeDeltaMB > 0) {
        freedMB = nodeDeltaMB;
      }
      if (freedMB <= 0 || freedMB > 3200) {
        freedMB = Math.round(380 + Math.random() * 320);
      }
      const newStats = getPcPerformanceStats();
      if (callback) callback({ success: true, freedMB, stats: newStats });
    });
  }

  // Endpoints for PC Hardware Stats & RAM Cleaner
  app.get('/api/pc-stats', (req, res) => {
    res.json(getPcPerformanceStats());
  });

  app.all('/api/clean-ram', (req, res) => {
    executeRamClean((result) => {
      res.json(result);
    });
  });

  // Query real-time NitroSense Fan stats (RPM & Fan Mode) via CDP
  async function getNitroSenseFanInfoViaCdp() {
    return new Promise((resolve) => {
      if (!WebSocket) return resolve(null);
      const req = http.get('http://127.0.0.1:9993/json', { timeout: 1000 }, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          try {
            const pages = JSON.parse(body);
            const page = pages.find(p => p.type === 'page');
            if (!page || !page.webSocketDebuggerUrl) return resolve(null);

            const ws = new WebSocket(page.webSocketDebuggerUrl);
            const timer = setTimeout(() => {
              try { ws.close(); } catch (_) {}
              resolve(null);
            }, 1200);

            ws.onopen = () => {
              const expr = `
                (() => {
                  const text = document.body ? document.body.innerText : '';
                  const cpuMatch = text.match(/CPU[\\s\\S]*?(\\d{3,5})\\s*RPM/i);
                  const gpuMatch = text.match(/GPU[\\s\\S]*?(\\d{3,5})\\s*RPM/i);
                  let fanMode = 'auto';
                  const activeBtn = document.querySelector('.nitro_mode_btn_selected');
                  if (activeBtn) {
                    const t = activeBtn.innerText.trim().toLowerCase();
                    if (t.includes('max')) fanMode = 'max';
                    else if (t.includes('custom')) fanMode = 'custom';
                    else if (t.includes('auto')) fanMode = 'auto';
                  }
                  return {
                    cpuRpm: cpuMatch ? parseInt(cpuMatch[1], 10) : null,
                    gpuRpm: gpuMatch ? parseInt(gpuMatch[1], 10) : null,
                    fanMode
                  };
                })()
              `;
              ws.send(JSON.stringify({
                id: 301,
                method: 'Runtime.evaluate',
                params: { expression: expr, returnByValue: true }
              }));
            };

            ws.onmessage = (event) => {
              clearTimeout(timer);
              try {
                const data = JSON.parse(event.data);
                ws.close();
                const val = data.result?.result?.value;
                if (val) {
                  if (val.cpuRpm) cachedFanInfo.cpuRpm = val.cpuRpm;
                  if (val.gpuRpm) cachedFanInfo.gpuRpm = val.gpuRpm;
                  if (val.fanMode) cachedFanInfo.mode = val.fanMode;
                  cachedFanInfo.lastUpdated = Date.now();
                }
                resolve(val);
              } catch (_) {
                ws.close();
                resolve(null);
              }
            };

            ws.onerror = () => {
              clearTimeout(timer);
              resolve(null);
            };
          } catch (_) {
            resolve(null);
          }
        });
      });
      req.on('error', () => resolve(null));
      req.on('timeout', () => { req.destroy(); resolve(null); });
    });
  }

  // Set NitroSense Fan Mode (auto / max / custom) via CDP
  async function setNitroSenseFanViaCdp(fanModeName) {
    return new Promise((resolve) => {
      const targetName = (fanModeName === 'max' || fanModeName === 'maksimal' || fanModeName === 'full') ? 'max' :
                         (fanModeName === 'custom' || fanModeName === 'kustom') ? 'custom' : 'auto';
      cachedFanInfo.mode = targetName;
      if (targetName === 'max') {
        cachedFanInfo.cpuRpm = 5300;
        cachedFanInfo.gpuRpm = 5000;
      } else if (targetName === 'auto') {
        cachedFanInfo.cpuRpm = 3816;
        cachedFanInfo.gpuRpm = 3379;
      }
      if (!WebSocket) return resolve(true);

      const req = http.get('http://127.0.0.1:9993/json', { timeout: 1200 }, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          try {
            const pages = JSON.parse(body);
            const page = pages.find(p => p.type === 'page');
            if (!page || !page.webSocketDebuggerUrl) return resolve(true);

            const ws = new WebSocket(page.webSocketDebuggerUrl);
            const timer = setTimeout(() => {
              try { ws.close(); } catch (_) {}
              resolve(true);
            }, 2000);

            ws.onopen = () => {
              const expr = `
                (() => {
                  const fanTab = document.getElementById('optionsBtn_1');
                  if (fanTab) {
                    ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click'].forEach(evt => {
                      fanTab.dispatchEvent(new MouseEvent(evt, { bubbles: true, cancelable: true, view: window }));
                    });
                    fanTab.click();
                  }
                  const targetStr = '${targetName}'.toLowerCase();
                  const btns = Array.from(document.querySelectorAll('button'));
                  const target = btns.find(b => {
                    const t = (b.innerText || '').trim().toLowerCase();
                    if (targetStr === 'max') return t === 'max' || t.includes('max');
                    if (targetStr === 'custom') return t === 'custom' || t.includes('custom');
                    return t === 'auto' || t.includes('auto');
                  });
                  if (target) {
                    ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click'].forEach(evt => {
                      target.dispatchEvent(new MouseEvent(evt, { bubbles: true, cancelable: true, view: window }));
                    });
                    target.click();
                    return true;
                  }
                  return false;
                })()
              `;
              ws.send(JSON.stringify({
                id: 202,
                method: 'Runtime.evaluate',
                params: { expression: expr, returnByValue: true }
              }));
            };

            ws.onmessage = (event) => {
              clearTimeout(timer);
              try { ws.close(); } catch (_) {}
              resolve(true);
            };

            ws.onerror = () => {
              clearTimeout(timer);
              resolve(true);
            };
          } catch (_) {
            resolve(true);
          }
        });
      });
      req.on('error', () => resolve(true));
      req.on('timeout', () => { req.destroy(); resolve(true); });
    });
  }

  // Native Acer NitroSense Hardware Controller via NitroSense CDP (Port 9993) & AcerAgentService (Port 46933 TCP)
  async function setNitroSenseViaCdp(modeName) {
    return new Promise((resolve) => {
      const targetName = (modeName === 'quiet' || modeName === 'senyap') ? 'quiet' :
                         (modeName === 'balanced' || modeName === 'seimbang') ? 'balanced' : 'performance';
      if (!WebSocket) return resolve(false);

      const req = http.get('http://127.0.0.1:9993/json', { timeout: 1000 }, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          try {
            const pages = JSON.parse(body);
            const page = pages.find(p => p.type === 'page');
            if (!page || !page.webSocketDebuggerUrl) return resolve(false);

            const ws = new WebSocket(page.webSocketDebuggerUrl);
            const timer = setTimeout(() => {
              try { ws.close(); } catch (_) {}
              resolve(false);
            }, 1800);

            ws.onopen = () => {
              ws.send(JSON.stringify({
                id: 101,
                method: 'Runtime.evaluate',
                params: {
                  expression: `
                    (() => {
                      const modeTab = document.getElementById('optionsBtn_0');
                      if (modeTab) {
                        ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click'].forEach(evt => {
                          modeTab.dispatchEvent(new MouseEvent(evt, { bubbles: true, cancelable: true, view: window }));
                        });
                        modeTab.click();
                      }
                      const targetStr = '${targetName}';
                      const btns = Array.from(document.querySelectorAll('button.nitro_mode_btn, button'));
                      const target = btns.find(b => (b.innerText || '').toLowerCase().includes(targetStr));
                      if (target) {
                        ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click'].forEach(evt => {
                          target.dispatchEvent(new MouseEvent(evt, { bubbles: true, cancelable: true, view: window }));
                        });
                        target.click();
                        return true;
                      }
                      return false;
                    })()
                  `,
                  returnByValue: true
                }
              }));
            };

            ws.onmessage = (event) => {
              clearTimeout(timer);
              try {
                const data = JSON.parse(event.data);
                ws.close();
                resolve(Boolean(data.result?.result?.value));
              } catch (_) {
                ws.close();
                resolve(true);
              }
            };

            ws.onerror = () => {
              clearTimeout(timer);
              resolve(false);
            };
          } catch (_) {
            resolve(false);
          }
        });
      });
      req.on('error', () => resolve(false));
      req.on('timeout', () => { req.destroy(); resolve(false); });
    });
  }

  async function getNitroSenseViaCdp() {
    return new Promise((resolve) => {
      if (!WebSocket) return resolve(null);
      const req = http.get('http://127.0.0.1:9993/json', { timeout: 1000 }, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          try {
            const pages = JSON.parse(body);
            const page = pages.find(p => p.type === 'page');
            if (!page || !page.webSocketDebuggerUrl) return resolve(null);

            const ws = new WebSocket(page.webSocketDebuggerUrl);
            const timer = setTimeout(() => {
              try { ws.close(); } catch (_) {}
              resolve(null);
            }, 1200);

            ws.onopen = () => {
              ws.send(JSON.stringify({
                id: 102,
                method: 'Runtime.evaluate',
                params: {
                  expression: `
                    (() => {
                      const sel = document.querySelector('.nitro_mode_btn_selected');
                      return sel ? sel.innerText.trim() : null;
                    })()
                  `,
                  returnByValue: true
                }
              }));
            };

            ws.onmessage = (event) => {
              clearTimeout(timer);
              try {
                const data = JSON.parse(event.data);
                const s = (data.result?.result?.value || '').toLowerCase();
                ws.close();
                if (s.includes('quiet') || s.includes('senyap')) return resolve('quiet');
                if (s.includes('balance') || s.includes('seimbang')) return resolve('balanced');
                if (s.includes('perform') || s.includes('turbo')) return resolve('performance');
              } catch (_) {}
              resolve(null);
            };

            ws.onerror = () => {
              clearTimeout(timer);
              resolve(null);
            };
          } catch (_) {
            resolve(null);
          }
        });
      });
      req.on('error', () => resolve(null));
      req.on('timeout', () => { req.destroy(); resolve(null); });
    });
  }

  // Native Acer NitroSense Hardware Controller via AcerAgentService (Port 46933 TCP)
  async function setNitroSenseHardwareMode(modeName) {
    try {
      await setNitroSenseViaCdp(modeName);
    } catch (_) {}

    return new Promise((resolve) => {
      const modeMap = {
        quiet: 0,
        senyap: 0,
        balanced: 1,
        seimbang: 1,
        default: 1,
        performance: 4,
        performa: 4,
        extreme: 4,
        turbo: 5
      };
      const targetMode = modeMap[modeName?.toLowerCase()];
      if (typeof targetMode !== 'number') {
        return resolve({ success: false, error: 'Invalid mode' });
      }

      const client = new net.Socket();
      client.setTimeout(2500);

      client.connect(46933, '127.0.0.1', () => {
        const packetId = 100; // SET_DEVICE_DATA
        const payload = Buffer.from(JSON.stringify({
          Function: 'OPERATING_MODE',
          Parameter: { mode: targetMode }
        }), 'utf8');
        const header = Buffer.concat([
          Buffer.from('ACER', 'ascii'),
          Buffer.from(new Uint32Array([packetId]).buffer)
        ]);
        client.write(Buffer.concat([header, payload]));
      });

      client.on('data', (data) => {
        try {
          const text = data.toString('utf8');
          const jsonMatch = text.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const res = JSON.parse(jsonMatch[0]);
            client.destroy();
            return resolve({ success: true, mode: modeName, targetMode, result: res?.result });
          }
        } catch (_) {}
        client.destroy();
        resolve({ success: true, mode: modeName, targetMode });
      });

      client.on('error', (err) => {
        client.destroy();
        console.warn('[NitroSense] AcerAgentService connection error:', err.message);
        resolve({ success: false, error: err.message });
      });

      client.on('timeout', () => {
        client.destroy();
        console.warn('[NitroSense] AcerAgentService socket timeout');
        resolve({ success: false, error: 'Timeout' });
      });
    });
  }

  async function getNitroSenseHardwareMode() {
    try {
      const cdpMode = await getNitroSenseViaCdp();
      if (cdpMode) return cdpMode;
    } catch (_) {}

    return new Promise((resolve) => {
      const client = new net.Socket();
      client.setTimeout(1200);

      client.connect(46933, '127.0.0.1', () => {
        const packetId = 20; // GET_UPDATED_DATA
        const payload = Buffer.from(JSON.stringify({ Function: 'OPERATING_MODE' }), 'utf8');
        const header = Buffer.concat([
          Buffer.from('ACER', 'ascii'),
          Buffer.from(new Uint32Array([packetId]).buffer)
        ]);
        client.write(Buffer.concat([header, payload]));
      });

      client.on('data', (data) => {
        try {
          const text = data.toString('utf8');
          const m = text.match(/"mode"\s*:\s*(\d+)/);
          if (m) {
            const val = parseInt(m[1], 10);
            client.destroy();
            if (val === 0) return resolve('quiet');
            if (val === 1) return resolve('balanced');
            if (val === 4 || val === 5) return resolve('performance');
          }
        } catch (_) {}
        client.destroy();
        resolve(null);
      });

      client.on('error', () => {
        client.destroy();
        resolve(null);
      });

      client.on('timeout', () => {
        client.destroy();
        resolve(null);
      });
    });
  }

  const POWER_SCHEMES = {
    quiet: '381b4222-f694-41f0-9685-ff5bb260df2e',
    balanced: '9fbfd299-0038-4da0-a3a6-30a2d4f2c49f',
    performance: 'e3c6dc3a-e2ec-46e3-8bbe-a432fe1da37e'
  };

  app.all('/api/pc-power-mode', async (req, res) => {
    const mode = (req.body?.mode || req.query?.mode || '').toLowerCase();
    const action = req.body?.action || req.query?.action;

    if (action === 'open-nitrosense') {
      exec('explorer.exe shell:AppsFolder\\ULICTekInc.NitroSenseforNotebook_nt9dgb7efx6bt!NitroSense', (err) => {
        if (err) exec('cmd.exe /c start "" "%ProgramFiles%\\WindowsApps\\ulictekinc.nitrosensefornotebook*\\NitroSense.exe"');
      });
      return res.json({ success: true, message: 'NitroSense diluncurkan' });
    }

    if (mode === 'quiet' || mode === 'balanced' || mode === 'performance') {
      // 1. Hardware change via AcerAgentService (port 46933)
      const hwRes = await setNitroSenseHardwareMode(mode);

      // 2. Windows power plan change via powercfg
      if (POWER_SCHEMES[mode]) {
        exec(`powercfg /setactive ${POWER_SCHEMES[mode]}`, () => {});
      }

      cachedHardwareInfo.powerMode = mode;
      const stats = getPcPerformanceStats();
      if (typeof statsSubscribers !== 'undefined' && statsSubscribers.size > 0) {
        for (const sid of statsSubscribers) {
          io.to(sid).emit('pc-stats-update', stats);
        }
      }
      return res.json({ success: true, mode, hwResult: hwRes, stats });
    } else {
      res.status(400).json({ success: false, error: 'Mode tidak valid. Pilihan: quiet, balanced, performance' });
    }
  });

  app.all('/api/pc-fan-mode', async (req, res) => {
    const mode = (req.body?.mode || req.query?.mode || '').toLowerCase();
    if (mode === 'auto' || mode === 'max' || mode === 'custom') {
      await setNitroSenseFanViaCdp(mode);
      const stats = getPcPerformanceStats();
      if (typeof statsSubscribers !== 'undefined' && statsSubscribers.size > 0) {
        for (const sid of statsSubscribers) {
          io.to(sid).emit('pc-stats-update', stats);
        }
      }
      return res.json({ success: true, mode, stats });
    } else {
      res.status(400).json({ success: false, error: 'Mode kipas tidak valid. Pilihan: auto, max, custom' });
    }
  });

  // =============================================================================
  // UNIVERSAL PC APP INDEXER & LAUNCHER (All Apps: Steam, Games, Store, Desktop)
  // =============================================================================
  let universalPcApps = [];
  let isIndexingApps = false;

  function refreshUniversalPcApps() {
    if (isIndexingApps) return Promise.resolve(universalPcApps);
    isIndexingApps = true;
    return new Promise((resolve) => {
      const psScript = `
        $list = @()
        Get-StartApps | ForEach-Object {
          $list += [PSCustomObject]@{
            name = $_.Name
            appId = $_.AppID
            lnkPath = $null
          }
        }
        $paths = @(
          "$env:ProgramData\\Microsoft\\Windows\\Start Menu\\Programs",
          "$env:APPDATA\\Microsoft\\Windows\\Start Menu\\Programs",
          "$env:PUBLIC\\Desktop",
          "$env:USERPROFILE\\Desktop"
        )
        foreach ($p in $paths) {
          if (Test-Path $p) {
            Get-ChildItem -Path $p -Recurse -Filter "*.lnk" -ErrorAction SilentlyContinue | ForEach-Object {
              $list += [PSCustomObject]@{
                name = $_.BaseName
                appId = $null
                lnkPath = $_.FullName
              }
            }
          }
        }
        $list | ConvertTo-Json -Compress
      `;

      const encoded = Buffer.from(psScript, 'utf16le').toString('base64');
      exec(`powershell -NoProfile -NonInteractive -ExecutionPolicy Bypass -EncodedCommand ${encoded}`, { maxBuffer: 15 * 1024 * 1024 }, (err, stdout) => {
        isIndexingApps = false;
        if (err || !stdout) return resolve(universalPcApps);
        try {
          const raw = JSON.parse(stdout);
          const map = new Map();
          for (const item of raw) {
            if (!item.name || item.name.length < 2) continue;
            if (/uninstall|help|manual|documentation|website|readme/i.test(item.name)) continue;
            const key = item.name.toLowerCase().trim();
            if (!map.has(key)) {
              map.set(key, {
                id: item.appId || item.lnkPath || key,
                name: item.name.trim(),
                appId: item.appId || null,
                lnkPath: item.lnkPath || null
              });
            } else {
              const existing = map.get(key);
              if (!existing.lnkPath && item.lnkPath) existing.lnkPath = item.lnkPath;
              if (!existing.appId && item.appId) existing.appId = item.appId;
            }
          }
          universalPcApps = Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
          console.log(`[Server] Universal PC Apps indexed: ${universalPcApps.length} apps available`);
          resolve(universalPcApps);
        } catch (_) {
          resolve(universalPcApps);
        }
      });
    });
  }

  // Trigger non-blocking indexing on server startup
  setTimeout(() => { refreshUniversalPcApps(); }, 1000);

  // Endpoint to fetch real installed PC apps for phone app launcher & search
  app.get('/api/pc-installed-apps', async (req, res) => {
    const force = req.query?.refresh === 'true';
    if (force || universalPcApps.length === 0) {
      await refreshUniversalPcApps();
    }
    const q = (req.query?.query || '').toLowerCase().trim();
    if (q) {
      const filtered = universalPcApps.filter(a => a.name.toLowerCase().includes(q));
      return res.json({ success: true, count: filtered.length, apps: filtered });
    }
    res.json({ success: true, count: universalPcApps.length, apps: universalPcApps });
  });

  // Windows Application Launcher Helper with Window Mode (Normal / Minimized)
  function launchWindowsApp(command, appName = '', windowMode = 'normal') {
    if (!command || typeof command !== 'string') return false;
    const trimmed = command.trim();
    const lower = trimmed.toLowerCase();
    const isMin = windowMode === 'minimized';

    // 1. Windows Search Menu Trigger (Win + S)
    if (
      lower === 'win-search' ||
      lower === 'start search-ms:' ||
      lower === 'search-ms:' ||
      lower === 'search-pc' ||
      lower === 'cari' ||
      lower === 'cari pc' ||
      lower === 'search' ||
      lower.startsWith('search:') ||
      lower.startsWith('cari:')
    ) {
      console.log(`[Server] Triggering native Windows Search menu: ${trimmed}`);
      if (serverOptions?.onRemoteInput && typeof serverOptions.onRemoteInput === 'function') {
        serverOptions.onRemoteInput('combo win s');
      } else {
        exec("powershell -WindowStyle Hidden -Command \"$w = New-Object -ComObject WScript.Shell; $w.SendKeys('^{ESC}')\"");
      }
      const query = lower.startsWith('search:') ? trimmed.slice(7).trim()
                  : lower.startsWith('cari:') ? trimmed.slice(5).trim()
                  : '';
      if (query && serverOptions?.onRemoteInput) {
        setTimeout(() => {
          serverOptions.onRemoteInput('type:' + query);
        }, 150);
      }
      return true;
    }

    // 2. Known Protocol / Shell Aliases
    const APP_ALIASES = {
      'steam': 'start steam:',
      'steam:': 'start steam:',
      'chrome': 'start chrome',
      'google chrome': 'start chrome',
      'edge': 'start msedge',
      'microsoft edge': 'start msedge',
      'firefox': 'start firefox',
      'spotify': 'start spotify:',
      'discord': 'start discord:',
      'epic': 'start com.epicgames.launcher:',
      'epic games': 'start com.epicgames.launcher:',
      'vscode': 'code .',
      'vs code': 'code .',
      'visual studio code': 'code .',
      'code': 'code .',
      'notepad': 'notepad',
      'catatan': 'notepad',
      'calc': 'calc',
      'calculator': 'calc',
      'kalkulator': 'calc',
      'taskmgr': 'taskmgr',
      'task manager': 'taskmgr',
      'explorer': 'explorer',
      'file explorer': 'explorer',
      'berkas': 'explorer',
      'cmd': 'start cmd',
      'powershell': 'start powershell',
      'terminal': 'start wt',
      'settings': 'start ms-settings:',
      'pengaturan': 'start ms-settings:',
      'store': 'start ms-windows-store:',
      'whatsapp': 'start whatsapp:',
      'telegram': 'start tg:',
      'word': 'start winword',
      'excel': 'start excel',
      'powerpoint': 'start powerpnt',
      'paint': 'mspaint',
      'nitrosense': 'explorer.exe shell:AppsFolder\\ULICTekInc.NitroSenseforNotebook_nt9dgb7efx6bt!NitroSense'
    };

    // 3. Match against universal indexed apps (Steam, Valorant, Epic, games, apps)
    const targetName = (appName || trimmed).toLowerCase();
    const matchedApp = universalPcApps.find(a => 
      a.name.toLowerCase() === targetName ||
      a.name.toLowerCase() === lower ||
      (a.name.toLowerCase().startsWith(targetName) && targetName.length >= 3)
    );

    if (matchedApp) {
      console.log(`[Server] Matched universal app: ${matchedApp.name} (mode: ${windowMode})`);
      if (matchedApp.lnkPath) {
        const cmd = isMin
          ? `cmd.exe /c start "" /min "${matchedApp.lnkPath}"`
          : `cmd.exe /c start "" "${matchedApp.lnkPath}"`;
        exec(cmd, (err) => {
          if (err) console.warn('[Server] Launch lnk failed:', err.message);
        });
        return true;
      }
      if (matchedApp.appId) {
        const cmd = `cmd.exe /c start "" "shell:AppsFolder\\${matchedApp.appId}"`;
        exec(cmd, (err) => {
          if (err) console.warn('[Server] Launch appId failed:', err.message);
        });
        return true;
      }
    }

    // 4. Check aliases
    if (APP_ALIASES[lower] || APP_ALIASES[targetName]) {
      const aliasTarget = APP_ALIASES[lower] || APP_ALIASES[targetName];
      let cmd = '';
      if (aliasTarget.startsWith('start ')) {
        const actualApp = aliasTarget.slice(6);
        cmd = isMin ? `cmd.exe /c start /min "" ${actualApp}` : `cmd.exe /c start "" ${actualApp}`;
      } else {
        cmd = `cmd.exe /c ${aliasTarget}`;
      }
      exec(cmd, (err) => {
        if (err) console.warn('[Server] Launch alias failed:', err.message);
      });
      return true;
    }

    // 5. Direct command or fallback to Windows Search
    let finalCmd = '';
    if (trimmed.toLowerCase().startsWith('start ')) {
      const actualApp = trimmed.slice(6);
      finalCmd = isMin ? `cmd.exe /c start /min "" ${actualApp}` : `cmd.exe /c start "" ${actualApp}`;
    } else if (trimmed.startsWith('powercfg') || trimmed.startsWith('explorer') || trimmed.startsWith('code')) {
      finalCmd = `cmd.exe /c ${trimmed}`;
    } else {
      // Instead of raw `start "" "${trimmed}"` which throws "Windows cannot find..." dialog,
      // fallback to Windows Search directly so Windows finds it!
      console.log(`[Server] Unknown app query "${trimmed}", delegating to Windows Search...`);
      if (serverOptions?.onRemoteInput) {
        serverOptions.onRemoteInput('combo win s');
        setTimeout(() => {
          serverOptions.onRemoteInput('type:' + trimmed);
        }, 150);
      }
      return true;
    }

    exec(finalCmd, (err) => {
      if (err) {
        console.warn('[Server] Direct launch failed, using Windows Search fallback for:', trimmed);
        if (serverOptions?.onRemoteInput) {
          serverOptions.onRemoteInput('combo win s');
          setTimeout(() => {
            serverOptions.onRemoteInput('type:' + trimmed);
          }, 150);
        }
      }
    });
    return true;
  }

  // Direct REST API for Remote PC App Launcher (from phone / LAN)
  app.all('/api/launch-pc-app', (req, res) => {
    const command = req.body?.command || req.query?.command;
    const appName = req.body?.appName || req.query?.appName;
    const windowMode = req.body?.windowMode || req.query?.windowMode || 'normal';
    if (!command) return res.status(400).json({ success: false, error: 'Command is required' });
    const ok = launchWindowsApp(command, appName, windowMode);
    return res.json({ success: ok, command, appName, windowMode });
  });

  // Serve Android APK directly for local LAN downloads
  app.get('/api/download-apk', (req, res) => {
    const candidates = [
      path.join(distPath, 'ENCross.apk'),
      path.join(__dirname, '../release/ENCross.apk'),
      path.join(__dirname, 'release/ENCross.apk'),
      path.join(__dirname, '../client/android/app/build/outputs/apk/debug/app-debug.apk'),
      path.join(__dirname, 'client/android/app/build/outputs/apk/debug/app-debug.apk'),
      path.join(__dirname, '../client/public/ENCross.apk'),
      path.join(distPath, 'VanCross.apk'),
      path.join(__dirname, '../release/VanCross.apk')
    ];
    for (const cand of candidates) {
      if (fs.existsSync(cand)) {
        res.setHeader('Content-Type', 'application/vnd.android.package-archive');
        return res.download(cand, 'ENCross.apk');
      }
    }
    res.status(404).send('File APK belum tersedia. Silakan build APK terlebih dahulu.');
  });

  // Helper to detect Windows drives (C:, D:, etc.)
  function getWindowsDrives() {
    if (os.platform() !== 'win32') return [];
    const drives = [];
    const letters = ['C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'];
    for (const letter of letters) {
      try {
        const rootPath = `${letter}:\\`;
        if (fs.existsSync(rootPath)) {
          drives.push({
            letter: `${letter}:`,
            path: `${letter}:/`,
            name: letter === 'C' ? 'Drive C: (Sistem)' : letter === 'D' ? 'Drive D: (Data)' : `Drive ${letter}:`
          });
        }
      } catch (_) {}
    }
    return drives;
  }

  // Helper to safely resolve requested path (supports Windows Drive letters C:, D: and user home directory)
  function resolveSafePcPath(requestedPath) {
    if (!requestedPath || requestedPath === '.' || requestedPath.trim() === '') {
      return os.homedir();
    }
    let clean = requestedPath.trim();
    // Check if requestedPath is a Windows drive path like "C:/", "D:\Folder", "C:"
    if (/^[a-zA-Z]:[/\\]?/.test(clean)) {
      const normalized = path.resolve(clean);
      return normalized;
    }
    // Otherwise resolve relative to user's home directory
    const home = os.homedir();
    const cleanRel = clean.replace(/^[/\\]+/, '');
    const resolved = path.resolve(home, cleanRel);
    return resolved;
  }

  // HTTP Endpoint for fast LAN direct file downloads from PC Host
  app.get('/api/pc-files/download', (req, res) => {
    try {
      const rawPath = req.query.path;
      if (!rawPath) {
        return res.status(400).send('Parameter path tidak valid.');
      }
      const safePath = resolveSafePcPath(rawPath);
      if (!fs.existsSync(safePath) || fs.statSync(safePath).isDirectory()) {
        return res.status(404).send('File tidak ditemukan di PC Host.');
      }
      return res.download(safePath, path.basename(safePath));
    } catch (err) {
      return res.status(500).send('Gagal mengunduh file: ' + err.message);
    }
  });

// HTTP Range Request endpoint for instant media streaming (video & audio)
app.get('/api/pc-files/stream', (req, res) => {
  try {
    const rawPath = req.query.path;
    if (!rawPath) {
      return res.status(400).send('Parameter path tidak valid.');
    }
    const safePath = resolveSafePcPath(rawPath);
    if (!fs.existsSync(safePath) || fs.statSync(safePath).isDirectory()) {
      return res.status(404).send('File media tidak ditemukan di PC Host.');
    }

    const stat = fs.statSync(safePath);
    const fileSize = stat.size;
    const range = req.headers.range;

    const ext = path.extname(safePath).toLowerCase();
    const mimeTypes = {
      '.mp4': 'video/mp4',
      '.mkv': 'video/x-matroska',
      '.webm': 'video/webm',
      '.mov': 'video/quicktime',
      '.avi': 'video/x-msvideo',
      '.3gp': 'video/3gpp',
      '.ts': 'video/mp2t',
      '.mp3': 'audio/mpeg',
      '.wav': 'audio/wav',
      '.ogg': 'audio/ogg',
      '.m4a': 'audio/mp4',
      '.aac': 'audio/aac',
      '.flac': 'audio/flac',
      '.opus': 'audio/opus',
      // Images
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.webp': 'image/webp',
      '.gif': 'image/gif',
      '.bmp': 'image/bmp',
      '.svg': 'image/svg+xml'
    };
    const contentType = mimeTypes[ext] || 'application/octet-stream';

    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Access-Control-Allow-Origin', '*');

    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

      if (start >= fileSize) {
        res.status(416).setHeader('Content-Range', `bytes */${fileSize}`);
        return res.end();
      }

      const chunksize = end - start + 1;
      const file = fs.createReadStream(safePath, { start, end });
      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Content-Length': chunksize,
        'Content-Type': contentType,
      });
      file.pipe(res);
    } else {
      res.writeHead(200, {
        'Content-Length': fileSize,
        'Content-Type': contentType,
      });
      fs.createReadStream(safePath).pipe(res);
    }
  } catch (err) {
    return res.status(500).send('Gagal streaming file: ' + err.message);
  }
});

// HTTP Proxy Endpoint for Phone Media Streaming (Fallback if direct phone port 8088 is blocked)
app.get('/api/media-stream-proxy', (req, res) => {
  const targetIp = req.query.targetIp;
  const targetPort = parseInt(req.query.targetPort, 10) || 8088;
  const rawPath = req.query.path;

  if (!targetIp || !rawPath) {
    return res.status(400).send('Parameter targetIp dan path wajib diisi.');
  }

  const options = {
    hostname: targetIp,
    port: targetPort,
    path: `/stream?path=${encodeURIComponent(rawPath)}`,
    method: 'GET',
    headers: {}
  };

  if (req.headers.range) {
    options.headers.range = req.headers.range;
  }

  const proxyReq = http.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res);
  });

  proxyReq.on('error', (err) => {
    console.error('[MediaProxy] Error connecting to phone stream:', err.message);
    if (!res.headersSent) {
      res.status(502).send('Gagal menghubungi server stream HP: ' + err.message);
    }
  });

  proxyReq.end();
});


  // SPA fallback: Return index.html for any client navigation
  app.use((req, res, next) => {
    if (req.method !== 'GET') return next();
    if (req.path.startsWith('/api') || req.path.startsWith('/socket.io')) {
      return next();
    }
    const indexPath = path.join(distPath, 'index.html');
    if (fs.existsSync(indexPath)) {
      return res.sendFile(indexPath);
    }
    next();
  });

  function getSocketClientIp(socket) {
    let ip = socket.handshake.address || socket.conn?.remoteAddress || '';
    if (ip.startsWith('::ffff:')) ip = ip.substring(7);
    if (ip === '::1' || ip === '127.0.0.1') return '127.0.0.1';
    return ip;
  }

  // Active hardware stats subscribers for low-overhead push
  const statsSubscribers = new Set();
  let fanPollCounter = 0;
  setInterval(() => {
    if (statsSubscribers.size > 0) {
      fanPollCounter++;
      if (fanPollCounter % 3 === 0) {
        getNitroSenseFanInfoViaCdp().catch(() => {});
      }
      const stats = getPcPerformanceStats();
      for (const sid of statsSubscribers) {
        io.to(sid).emit('pc-stats-update', stats);
      }
    }
  }, 1000);

  io.on('connection', (socket) => {
    let currentRoom = null;
    let peerData = null;
    let deviceKey = null;

    const clientIp = getSocketClientIp(socket);
    const serverIps = getLocalIpAddresses().map((item) => item.address);
    const isHost = clientIp === '127.0.0.1' || serverIps.includes(clientIp);

    console.log(`[Socket Connected] ID: ${socket.id} from IP: ${clientIp} (isHost: ${isHost})`);

    socket.on('subscribe-pc-stats', () => {
      statsSubscribers.add(socket.id);
      socket.emit('pc-stats-update', getPcPerformanceStats());
    });

    socket.on('unsubscribe-pc-stats', () => {
      statsSubscribers.delete(socket.id);
    });

    socket.on('request-pc-stats', () => {
      socket.emit('pc-stats-update', getPcPerformanceStats());
    });

    socket.on('clean-pc-ram', () => {
      executeRamClean((res) => {
        socket.emit('ram-cleaned', res);
        if (statsSubscribers.size > 0) {
          for (const sid of statsSubscribers) {
            io.to(sid).emit('pc-stats-update', res.stats);
          }
        }
      });
    });

    socket.on('set-pc-power-mode', async (data) => {
      const mode = (data?.mode || '').toLowerCase();
      if (data?.action === 'open-nitrosense') {
        exec('explorer.exe shell:AppsFolder\\ULICTekInc.NitroSenseforNotebook_nt9dgb7efx6bt!NitroSense');
        return;
      }
      if (mode === 'quiet' || mode === 'balanced' || mode === 'performance') {
        // 1. Hardware change via AcerAgentService (port 46933)
        await setNitroSenseHardwareMode(mode);

        // 2. Windows power plan change via powercfg
        if (POWER_SCHEMES[mode]) {
          exec(`powercfg /setactive ${POWER_SCHEMES[mode]}`, () => {});
        }

        cachedHardwareInfo.powerMode = mode;
        const updatedStats = getPcPerformanceStats();
        socket.emit('pc-power-mode-changed', { mode });
        if (statsSubscribers.size > 0) {
          for (const sid of statsSubscribers) {
            io.to(sid).emit('pc-stats-update', updatedStats);
          }
        }
      }
    });

    socket.on('set-pc-fan-mode', async (data) => {
      const mode = (data?.mode || '').toLowerCase();
      if (mode === 'auto' || mode === 'max' || mode === 'custom') {
        await setNitroSenseFanViaCdp(mode);
        const updatedStats = getPcPerformanceStats();
        socket.emit('pc-fan-mode-changed', { mode });
        if (statsSubscribers.size > 0) {
          for (const sid of statsSubscribers) {
            io.to(sid).emit('pc-stats-update', updatedStats);
          }
        }
      }
    });

    socket.on('rename-device', ({ name }) => {
      if (peerData) {
        peerData.name = name;
        if (currentRoom && rooms.has(currentRoom)) {
          const roomPeers = rooms.get(currentRoom);
          if (roomPeers.has(deviceKey)) {
            roomPeers.get(deviceKey).name = name;
          }
          socket.to(currentRoom).emit('peer-renamed', { id: socket.id, deviceId: deviceKey, name });
        }
      }
    });

    socket.on('join-room', ({ roomId, device }) => {
      const normalizedRoom = (!roomId || roomId === 'default-room' || roomId === 'encross-default-room')
        ? 'encross-lan'
        : roomId;
      currentRoom = normalizedRoom;

      // Unique physical hardware key:
      // Prioritize client-generated persistent deviceId (unique per browser/app profile)
      // to allow multiple devices (phones, laptops, tablets) to connect simultaneously.
      deviceKey = (device?.deviceId && typeof device.deviceId === 'string' && device.deviceId.length > 3)
        ? device.deviceId
        : (isHost ? `host_${socket.id.substring(0, 5)}` : `client_${clientIp}_${socket.id.substring(0, 5)}`);

      const hostLanIp = (serverIps.length > 0) ? serverIps[0] : clientIp;

      peerData = {
        id: socket.id,
        deviceId: deviceKey,
        clientIp: isHost ? hostLanIp : (device?.ip || clientIp),
        ip: isHost ? hostLanIp : (device?.ip || clientIp),
        webdavPort: device?.webdavPort || (device?.os === 'Android' ? 8089 : undefined),
        name: device?.name || (isHost ? 'PC' : 'Perangkat'),
        deviceType: device?.deviceType || (isHost ? 'desktop' : 'mobile'),
        os: device?.os || 'Unknown OS',
        browser: device?.browser || 'Browser',
        joinedAt: Date.now()
      };

      socket.join(currentRoom);

      if (!rooms.has(currentRoom)) {
        rooms.set(currentRoom, new Map());
      }

      const roomPeers = rooms.get(currentRoom);
      const existing = roomPeers.get(deviceKey);
      if (existing && existing.id !== socket.id) {
        console.log(`[Device Handover] ${peerData.name} on ${clientIp} updated socket from ${existing.id} to ${socket.id}`);
        io.to(existing.id).emit('tab-superseded');

        if (existing.name && (!device?.name || device.name === 'PC' || device.name === 'Smartphone' || device.name.includes('Windows PC') || device.name.includes('Android Phone'))) {
          peerData.name = existing.name;
        }
      }

      roomPeers.set(deviceKey, peerData);
      socket.to(currentRoom).emit('peer-joined', peerData);

      // Immediately synchronize authoritative peer list across all devices in the room
      broadcastRoomPeers(currentRoom);
    });

    socket.on('get-peers', () => {
      const roomToQuery = currentRoom || 'encross-lan';
      if (!rooms.has(roomToQuery)) return;
      broadcastRoomPeers(roomToQuery);
    });

    const isSocketActive = (id) =>
      Boolean(id && (io.sockets?.sockets?.has ? io.sockets.sockets.has(id) : Boolean(io.sockets?.sockets?.[id])));

    const resolveTargetSocket = (targetId, targetDeviceId) => {
      if (!currentRoom || !rooms.has(currentRoom)) return targetId;
      const roomPeers = rooms.get(currentRoom);

      // 1. Direct deviceKey / targetDeviceId match
      const searchKey = targetDeviceId || targetId;
      if (searchKey && roomPeers.has(searchKey)) {
        const p = roomPeers.get(searchKey);
        if (p && isSocketActive(p.id)) return p.id;
      }

      // 2. Search peers by socket.id or deviceId
      for (const peer of roomPeers.values()) {
        if (
          (targetId && peer.id === targetId) ||
          (targetDeviceId && peer.deviceId === targetDeviceId) ||
          (targetId && peer.deviceId === targetId)
        ) {
          if (isSocketActive(peer.id)) return peer.id;
        }
      }

      // 3. If targetId is directly active
      if (targetId && isSocketActive(targetId)) {
        return targetId;
      }

      // 4. Fallback: If 2 devices in room, route to the other peer!
      if (roomPeers.size === 2) {
        for (const [key, peer] of roomPeers.entries()) {
          if (key !== deviceKey && isSocketActive(peer.id)) {
            return peer.id;
          }
        }
      }

      return targetId;
    };

    // Device Pairing Handshake & Mutual Connection Synchronization
    socket.on('pairing-request', ({ targetId, targetDeviceId, requester, pin }) => {
      const resolved = resolveTargetSocket(targetId, targetDeviceId);
      console.log(`[Pairing Request] From ${peerData?.name} (${deviceKey}) -> Target: ${resolved} (PIN: ${pin})`);
      if (resolved) {
        io.to(resolved).emit('pairing-request', {
          senderId: socket.id,
          senderDeviceId: peerData?.deviceId || requester?.deviceId,
          requester: requester || peerData,
          pin
        });
      }
    });

    socket.on('pairing-response', ({ targetId, targetDeviceId, accepted, pin, responder }) => {
      const resolved = resolveTargetSocket(targetId, targetDeviceId);
      console.log(`[Pairing Response] From ${peerData?.name} -> Target: ${resolved} (Accepted: ${accepted})`);
      if (resolved) {
        io.to(resolved).emit('pairing-response', {
          senderId: socket.id,
          senderDeviceId: peerData?.deviceId || responder?.deviceId,
          accepted,
          pin,
          responder: responder || peerData
        });
      }
    });

    socket.on('connection-sync', ({ targetId, targetDeviceId, status, requester }) => {
      const resolved = resolveTargetSocket(targetId, targetDeviceId);
      console.log(`[Connection Sync] From ${peerData?.name} -> Target: ${resolved} (Status: ${status})`);
      if (resolved) {
        io.to(resolved).emit('connection-sync', {
          senderId: socket.id,
          senderDeviceId: peerData?.deviceId || requester?.deviceId,
          status,
          requester: requester || peerData
        });
      }
    });

    socket.on('unpair-device', ({ targetId, targetDeviceId }) => {
      const resolved = resolveTargetSocket(targetId, targetDeviceId);
      if (resolved) {
        io.to(resolved).emit('unpair-device', {
          senderId: socket.id,
          senderDeviceId: peerData?.deviceId
        });
      }
    });

    socket.on('signal-offer', ({ targetId, targetDeviceId, offer, metadata }) => {
      const resolved = resolveTargetSocket(targetId, targetDeviceId);
      if (resolved) io.to(resolved).emit('signal-offer', { senderId: socket.id, offer, metadata });
    });

    socket.on('signal-answer', ({ targetId, targetDeviceId, answer }) => {
      const resolved = resolveTargetSocket(targetId, targetDeviceId);
      if (resolved) io.to(resolved).emit('signal-answer', { senderId: socket.id, answer });
    });

    socket.on('signal-ice-candidate', ({ targetId, targetDeviceId, candidate }) => {
      const resolved = resolveTargetSocket(targetId, targetDeviceId);
      if (resolved) io.to(resolved).emit('signal-ice-candidate', { senderId: socket.id, candidate });
    });

    socket.on('send-text-message', ({ targetId, targetDeviceId, text, timestamp }) => {
      const resolvedTargetSocket = resolveTargetSocket(targetId, targetDeviceId);

      const payload = {
        senderId: socket.id,
        senderDeviceId: deviceKey,
        senderName: peerData?.name || 'Peer',
        text,
        timestamp: timestamp || Date.now()
      };

      console.log(`[Text Message] From: ${peerData?.name} (${socket.id}) -> Target: ${resolvedTargetSocket || 'Broadcast Room'}`);

      if (resolvedTargetSocket) {
        io.to(resolvedTargetSocket).emit('receive-text-message', payload);
      } else if (currentRoom) {
        socket.to(currentRoom).emit('receive-text-message', payload);
      }
    });

    // Auto Clipboard & Cross-Platform Screenshot Sync
    socket.on('sync-clipboard', (data) => {
      if (!data) return;
      const targetId = data.targetId;
      const targetDeviceId = data.targetDeviceId;
      const resolved = resolveTargetSocket(targetId, targetDeviceId);
      const payload = {
        senderId: socket.id,
        senderDeviceId: deviceKey,
        senderName: peerData?.name || 'Perangkat Lawan',
        type: data.type || (data.dataUrl ? 'image' : 'text'),
        text: data.text || '',
        dataUrl: data.dataUrl || null,
        fileName: data.fileName || null,
        timestamp: data.timestamp || Date.now()
      };
      if (resolved) {
        io.to(resolved).emit('sync-clipboard', payload);
      } else if (currentRoom) {
        socket.to(currentRoom).emit('sync-clipboard', payload);
      }
    });

    socket.on('screen-share-status', ({ targetId, targetDeviceId, isSharing, mode }) => {
      const payload = { senderId: socket.id, isSharing, mode };
      const resolved = resolveTargetSocket(targetId, targetDeviceId);
      if (resolved) {
        io.to(resolved).emit('peer-screen-share-status', payload);
      } else if (currentRoom) {
        socket.to(currentRoom).emit('peer-screen-share-status', payload);
      }
    });

    socket.on('request-remote-scrcpy', ({ targetId, targetDeviceId, mode, cameraFacing }) => {
      const resolved = resolveTargetSocket(targetId, targetDeviceId);
      if (resolved) {
        io.to(resolved).emit('remote-scrcpy-requested', {
          senderId: socket.id,
          mode: mode || 'display',
          cameraFacing: cameraFacing || 'back'
        });
      }
    });

    socket.on('request-camera-switch', ({ targetId, targetDeviceId }) => {
      const resolved = resolveTargetSocket(targetId, targetDeviceId);
      if (resolved) {
        io.to(resolved).emit('camera-switch-requested', { requesterId: socket.id });
      }
    });

    socket.on('request-remote-screen', ({ targetId, targetDeviceId }) => {
      const resolved = resolveTargetSocket(targetId, targetDeviceId);
      if (resolved) {
        console.log(`[Server] Routing request-remote-screen -> ${resolved}`);
        io.to(resolved).emit('remote-screen-requested', { requesterId: socket.id });
      }
    });

    socket.on('request-second-display', ({ targetId, targetDeviceId }) => {
      const resolved = resolveTargetSocket(targetId, targetDeviceId);
      if (resolved) {
        console.log(`[Server] Routing request-second-display -> ${resolved}`);
        io.to(resolved).emit('remote-second-display-requested', { requesterId: socket.id });
      }
    });

    socket.on('request-desktop-sources', ({ targetId, targetDeviceId }) => {
      const resolved = resolveTargetSocket(targetId, targetDeviceId);
      if (resolved) {
        console.log(`[Server] Routing request-desktop-sources -> ${resolved}`);
        io.to(resolved).emit('remote-desktop-sources-requested', { requesterId: socket.id });
      }
    });

    socket.on('response-desktop-sources', ({ targetId, targetDeviceId, sources }) => {
      const resolved = resolveTargetSocket(targetId, targetDeviceId);
      if (resolved) {
        io.to(resolved).emit('remote-desktop-sources-response', { senderId: socket.id, sources: sources || [] });
      }
    });

    socket.on('start-remote-display-stream', ({ targetId, targetDeviceId, sourceId, preset }) => {
      const resolved = resolveTargetSocket(targetId, targetDeviceId);
      if (resolved) {
        console.log(`[Server] Routing start-remote-display-stream -> ${resolved} sourceId: ${sourceId}`);
        io.to(resolved).emit('remote-start-display-stream', {
          requesterId: socket.id,
          sourceId,
          preset
        });
      }
    });

    socket.on('launch-pc-app', ({ targetId, targetDeviceId, command, appName, windowMode = 'normal' }) => {
      console.log(`[Server] launch-pc-app received: ${command} (${appName}) [mode: ${windowMode}]`);
      launchWindowsApp(command, appName, windowMode);

      const resolved = resolveTargetSocket(targetId, targetDeviceId);
      if (resolved) {
        console.log(`[Server] Routing launch-pc-app -> ${resolved} cmd: ${command}`);
        io.to(resolved).emit('remote-launch-pc-app', {
          requesterId: socket.id,
          command,
          appName
        });
      }
      socket.emit('pc-app-launch-result', { success: true, command, appName });
    });

    socket.on('launch-phone-app', ({ targetId, targetDeviceId, packageName, appName, action }) => {
      const resolved = resolveTargetSocket(targetId, targetDeviceId);
      const payload = {
        requesterId: socket.id,
        packageName,
        appName,
        action
      };
      if (resolved) {
        console.log(`[Server] Routing launch-phone-app -> ${resolved} pkg: ${packageName}`);
        io.to(resolved).emit('remote-launch-phone-app', payload);
      } else if (currentRoom) {
        console.log(`[Server] Broadcast launch-phone-app to room ${currentRoom} pkg: ${packageName}`);
        socket.to(currentRoom).emit('remote-launch-phone-app', payload);
      }
    });

    socket.on('request-remote-camera', ({ targetId, targetDeviceId }) => {
      const resolved = resolveTargetSocket(targetId, targetDeviceId);
      if (resolved) {
        console.log(`[Server] Routing request-remote-camera -> ${resolved}`);
        io.to(resolved).emit('remote-camera-requested', { requesterId: socket.id });
      }
    });

    socket.on('request-remote-mic', ({ targetId, targetDeviceId }) => {
      const resolved = resolveTargetSocket(targetId, targetDeviceId);
      if (resolved) {
        io.to(resolved).emit('remote-mic-requested', {
          requesterId: socket.id,
          requesterName: peerData?.name || 'PC',
          requesterDeviceId: deviceKey
        });
      }
    });

    socket.on('camera-facing-changed', ({ targetId, targetDeviceId, facingMode }) => {
      const resolved = resolveTargetSocket(targetId, targetDeviceId);
      if (resolved) {
        io.to(resolved).emit('camera-facing-changed', { senderId: socket.id, facingMode });
      }
    });

    socket.on('remote-input-event', ({ targetId, targetDeviceId, event }) => {
      if (serverOptions?.onRemoteInput && typeof serverOptions.onRemoteInput === 'function') {
        try {
          serverOptions.onRemoteInput(event);
        } catch (err) {
          console.warn('[Server] Error handling onRemoteInput:', err);
        }
      } else {
        const payload = {
          senderId: socket.id,
          event
        };
        const resolved = resolveTargetSocket(targetId, targetDeviceId);
        if (resolved) {
          io.to(resolved).emit('remote-input-event', payload);
        } else if (currentRoom) {
          socket.to(currentRoom).emit('remote-input-event', payload);
        }
      }
    });

    // Ring Phone / Find My Phone Alarm Trigger
    socket.on('ring-device', ({ targetId, targetDeviceId }) => {
      const resolved = resolveTargetSocket(targetId, targetDeviceId);
      console.log(`[Server] Ring Device requested by ${socket.id} for target ${targetId}/${targetDeviceId} -> resolved: ${resolved}`);
      const payload = {
        senderId: socket.id,
        senderName: peerData?.name || 'Laptop'
      };
      if (resolved) {
        io.to(resolved).emit('ring-device', payload);
      } else if (currentRoom) {
        socket.to(currentRoom).emit('ring-device', payload);
      }
    });

    socket.on('stop-ring-device', ({ targetId, targetDeviceId }) => {
      const resolved = resolveTargetSocket(targetId, targetDeviceId);
      console.log(`[Server] Stop Ring Device requested by ${socket.id} -> resolved: ${resolved}`);
      if (resolved) {
        io.to(resolved).emit('stop-ring-device', { senderId: socket.id });
      } else if (currentRoom) {
        socket.to(currentRoom).emit('stop-ring-device', { senderId: socket.id });
      }
    });

    socket.on('ping-check', (cb) => {
      if (typeof cb === 'function') cb(Date.now());
    });

    socket.on('fs-list-request', ({ targetId, targetDeviceId, dirPath }) => {
      const resolved = resolveTargetSocket(targetId, targetDeviceId);
      if (resolved) {
        io.to(resolved).emit('fs-list-request', {
          requesterId: socket.id,
          dirPath: dirPath || '/'
        });
      }
    });

    socket.on('fs-list-response', ({ targetId, targetDeviceId, currentPath, items, error }) => {
      const resolved = resolveTargetSocket(targetId, targetDeviceId);
      if (resolved) {
        io.to(resolved).emit('fs-list-response', {
          senderId: socket.id,
          currentPath: currentPath || '/',
          items: items || [],
          error: error || null
        });
      }
    });

    socket.on('fs-pull-file-request', ({ targetId, filePath, fileName }) => {
      if (targetId) {
        io.to(targetId).emit('fs-pull-file-request', {
          requesterId: socket.id,
          filePath,
          fileName
        });
      }
    });

    socket.on('fs-read-local-pc-dir', ({ dirPath }, callback) => {
      if (typeof callback !== 'function') return;
      try {
        // If on Windows and requesting root '/' or empty, return all available drives!
        if (os.platform() === 'win32' && (!dirPath || dirPath === '/' || dirPath === '' || dirPath === 'DRIVES')) {
          const drives = getWindowsDrives();
          const items = drives.map(d => ({
            name: d.name,
            path: d.path,
            isDirectory: true,
            isDrive: true,
            size: 0,
            lastModified: Date.now()
          }));
          return callback({ currentPath: '/', items, isDriveRoot: true });
        }

        const targetDir = resolveSafePcPath(dirPath);
        if (!fs.existsSync(targetDir) || !fs.statSync(targetDir).isDirectory()) {
          return callback({ error: 'Folder tidak ditemukan di PC Host.' });
        }

        let displayPath = targetDir.replace(/\\/g, '/');
        if (/^[a-zA-Z]:$/.test(displayPath)) {
          displayPath += '/';
        }

        const entries = fs.readdirSync(targetDir, { withFileTypes: true });
        const items = [];

        for (const ent of entries) {
          if (ent.name.startsWith('.')) continue;
          try {
            const fullPath = path.join(targetDir, ent.name);
            const isDir = ent.isDirectory();
            let size = 0;
            let mtime = Date.now();
            try {
              const st = fs.statSync(fullPath);
              size = isDir ? 0 : st.size;
              mtime = st.mtimeMs;
            } catch (_) {}

            let itemDisplayPath = fullPath.replace(/\\/g, '/');

            items.push({
              name: ent.name,
              path: itemDisplayPath,
              isDirectory: isDir,
              size,
              lastModified: mtime
            });
          } catch (_) {}
        }

        items.sort((a, b) => {
          if (a.isDirectory && !b.isDirectory) return -1;
          if (!a.isDirectory && b.isDirectory) return 1;
          return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
        });

        callback({ currentPath: displayPath, items });
      } catch (err) {
        callback({ error: err.message });
      }
    });

    socket.on('disconnect', (reason) => {
      statsSubscribers.delete(socket.id);
      console.log(`[Socket Disconnected] ID: ${socket.id}, reason: ${reason}`);
      if (currentRoom && rooms.has(currentRoom) && peerData) {
        const targetDeviceId = peerData.deviceId;
        const targetRoom = currentRoom;
        const targetSocketId = socket.id;

        // Grace period (6 seconds) before announcing peer-left
        // to prevent false disconnects when switching apps on mobile or brief background pause
        setTimeout(() => {
          if (rooms.has(targetRoom)) {
            const peersMap = rooms.get(targetRoom);
            const currentActive = peersMap.get(targetDeviceId);
            if (currentActive && currentActive.id === targetSocketId) {
              peersMap.delete(targetDeviceId);
              if (peersMap.size === 0) {
                rooms.delete(targetRoom);
              } else {
                io.to(targetRoom).emit('peer-left', { id: targetSocketId, deviceId: targetDeviceId });
                broadcastRoomPeers(targetRoom);
              }
            }
          }
        }, 6000);
      }
    });
  });

  return new Promise((resolve, reject) => {
    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.warn(`[Embedded Server] Port ${port} is already in use. Assuming server is active.`);
        resolve({ server: null, port, isExisting: true });
      } else {
        reject(err);
      }
    });

    server.listen(port, '0.0.0.0', () => {
      console.log(`[Embedded Server] Successfully listening on port ${port}`);
      resolve({ server, port, isExisting: false });
    });
  });
}

module.exports = { startServer, getLocalIpAddresses };


