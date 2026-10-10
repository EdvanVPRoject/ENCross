// Helper to inspect client device info and generate friendly identities

export function getDeviceInfo() {
  const ua = navigator.userAgent;

  // OS detection
  let os = 'Unknown OS';
  if (/Windows/i.test(ua)) os = 'Windows';
  else if (/Android/i.test(ua)) os = 'Android';
  else if (/iPhone|iPad|iPod/i.test(ua)) os = 'iOS';
  else if (/Macintosh|Mac OS X/i.test(ua)) os = 'macOS';
  else if (/Linux/i.test(ua)) os = 'Linux';

  // Device type detection
  let deviceType = 'desktop';
  if (/Mobile|Android|iP(hone|od)/i.test(ua)) {
    deviceType = 'mobile';
  } else if (/iPad|Tablet/i.test(ua)) {
    deviceType = 'tablet';
  }

  // Browser detection
  let browser = 'Browser';
  if (/Chrome|CriOS/i.test(ua) && !/Edg/i.test(ua)) browser = 'Chrome';
  else if (/Edg/i.test(ua)) browser = 'Edge';
  else if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) browser = 'Safari';
  else if (/Firefox|FxiOS/i.test(ua)) browser = 'Firefox';

  // Persistent Device ID
  let deviceId = localStorage.getItem('vancross_device_id');
  if (!deviceId) {
    deviceId = 'dev_' + Math.random().toString(36).substring(2, 10);
    localStorage.setItem('vancross_device_id', deviceId);
  }

  // Persistent / Friendly Name
  let name = localStorage.getItem('vancross_device_name');
  if (!name) {
    const adjectives = ['Swift', 'Hyper', 'Nova', 'Cyber', 'Apex', 'Solar', 'Echo', 'Neon'];
    const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
    name = `${adj} ${os} ${deviceType === 'desktop' ? 'PC' : 'Phone'}`;
    localStorage.setItem('vancross_device_name', name);
  }

  return {
    deviceId,
    name,
    deviceType,
    os,
    browser
  };
}

export function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}
