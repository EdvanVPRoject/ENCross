// Helper to inspect client device info and generate accurate, friendly identities

export function detectDeviceModel() {
  const ua = navigator.userAgent;

  // OS detection
  let os = 'Windows';
  let deviceType = 'desktop';

  if (/iPhone/i.test(ua)) {
    os = 'iOS';
    deviceType = 'mobile';
    return { name: 'iPhone', os, deviceType, browser: getBrowserName(ua) };
  } else if (/iPad/i.test(ua)) {
    os = 'iPadOS';
    deviceType = 'tablet';
    return { name: 'iPad', os, deviceType, browser: getBrowserName(ua) };
  } else if (/Android/i.test(ua)) {
    os = 'Android';
    deviceType = 'mobile';

    // Try detecting Android manufacturer / model
    let model = 'Android Phone';
    if (/Samsung|SM-[A-Z0-9]+/i.test(ua)) {
      model = 'Samsung Galaxy';
    } else if (/Xiaomi|Redmi|POCO|Mi /i.test(ua)) {
      model = 'Xiaomi Phone';
    } else if (/Pixel/i.test(ua)) {
      model = 'Google Pixel';
    } else if (/Oppo|CPH[0-9]+/i.test(ua)) {
      model = 'OPPO Phone';
    } else if (/Vivo|V[0-9]+/i.test(ua)) {
      model = 'Vivo Phone';
    }
    return { name: model, os, deviceType, browser: getBrowserName(ua) };
  } else if (/Macintosh|Mac OS X/i.test(ua)) {
    os = 'macOS';
    return { name: 'MacBook', os, deviceType: 'desktop', browser: getBrowserName(ua) };
  } else if (/Linux/i.test(ua)) {
    os = 'Linux';
    return { name: 'Linux PC', os, deviceType: 'desktop', browser: getBrowserName(ua) };
  } else {
    // Default Windows
    return { name: 'Windows PC', os: 'Windows', deviceType: 'desktop', browser: getBrowserName(ua) };
  }
}

function getBrowserName(ua) {
  if (/Edg/i.test(ua)) return 'Edge';
  if (/Chrome|CriOS/i.test(ua)) return 'Chrome';
  if (/Safari/i.test(ua)) return 'Safari';
  if (/Firefox|FxiOS/i.test(ua)) return 'Firefox';
  return 'Browser';
}

export function getDeviceInfo(serverHostname) {
  const detected = detectDeviceModel();

  // Persistent Device ID
  let deviceId = localStorage.getItem('vancross_device_id');
  if (!deviceId) {
    deviceId = 'dev_' + Math.random().toString(36).substring(2, 10);
    localStorage.setItem('vancross_device_id', deviceId);
  }

  // Persistent Device Name (user-defined or default accurate name)
  let name = localStorage.getItem('vancross_device_name');
  if (!name) {
    // If desktop and serverHostname is available, use hostname
    if (detected.deviceType === 'desktop' && serverHostname) {
      name = `${serverHostname} (PC)`;
    } else {
      name = detected.name;
    }
    localStorage.setItem('vancross_device_name', name);
  }

  return {
    deviceId,
    name,
    deviceType: detected.deviceType,
    os: detected.os,
    browser: detected.browser
  };
}

export function setCustomDeviceName(newName) {
  if (newName && newName.trim()) {
    const cleaned = newName.trim();
    localStorage.setItem('vancross_device_name', cleaned);
    return cleaned;
  }
  return null;
}

export function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}
