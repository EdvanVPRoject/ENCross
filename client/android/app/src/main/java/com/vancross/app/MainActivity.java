package com.vancross.app;

import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.BroadcastReceiver;
import android.media.AudioManager;
import android.media.Ringtone;
import android.media.RingtoneManager;
import android.media.AudioAttributes;
import android.os.BatteryManager;
import android.os.Vibrator;
import android.os.VibrationEffect;
import android.graphics.Bitmap;
import android.graphics.Color;
import android.graphics.PixelFormat;
import android.hardware.display.DisplayManager;
import android.hardware.display.VirtualDisplay;
import android.media.Image;
import android.media.ImageReader;
import android.media.MediaScannerConnection;
import android.media.projection.MediaProjection;
import android.media.projection.MediaProjectionManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.os.Handler;
import android.os.HandlerThread;
import android.os.Looper;
import android.os.PowerManager;
import android.provider.Settings;
import android.util.Base64;
import android.util.DisplayMetrics;
import android.webkit.JavascriptInterface;
import android.widget.Toast;
import androidx.core.content.ContextCompat;
import androidx.core.app.ActivityCompat;
import com.getcapacitor.BridgeActivity;
import org.json.JSONArray;
import org.json.JSONObject;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.nio.ByteBuffer;
import java.util.Arrays;
import java.util.Comparator;
import java.io.InputStream;
import java.io.OutputStream;
import java.io.InputStreamReader;
import java.io.BufferedReader;
import java.io.RandomAccessFile;
import java.net.ServerSocket;
import java.net.Socket;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;
import java.util.TimeZone;

public class MainActivity extends BridgeActivity {
    private static final int REQUEST_MEDIA_PROJECTION = 2001;

    private MediaProjectionManager projectionManager;
    private MediaProjection mediaProjection;
    private VirtualDisplay virtualDisplay;
    private MediaStreamServer mediaStreamServer;
    private WebDavServer webDavServer;
    private ImageReader imageReader;
    private HandlerThread captureThread;
    private Handler captureHandler;
    private volatile boolean isCapturingScreen = false;
    private volatile boolean isDispatchingFrame = false;
    private long lastFrameTime = 0;
    private Ringtone alarmRingtone = null;
    private Vibrator phoneVibrator = null;
    private BroadcastReceiver batteryReceiver = null;

    public void checkAndRequestStoragePermission() {
        runOnUiThread(() -> {
            try {
                // 1. Standard Runtime Storage Permissions
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) { // Android 13+
                    java.util.List<String> perms = new java.util.ArrayList<>();
                    if (ContextCompat.checkSelfPermission(this, android.Manifest.permission.READ_MEDIA_IMAGES) != android.content.pm.PackageManager.PERMISSION_GRANTED) {
                        perms.add(android.Manifest.permission.READ_MEDIA_IMAGES);
                    }
                    if (ContextCompat.checkSelfPermission(this, android.Manifest.permission.READ_MEDIA_VIDEO) != android.content.pm.PackageManager.PERMISSION_GRANTED) {
                        perms.add(android.Manifest.permission.READ_MEDIA_VIDEO);
                    }
                    if (ContextCompat.checkSelfPermission(this, android.Manifest.permission.READ_MEDIA_AUDIO) != android.content.pm.PackageManager.PERMISSION_GRANTED) {
                        perms.add(android.Manifest.permission.READ_MEDIA_AUDIO);
                    }
                    if (!perms.isEmpty()) {
                        ActivityCompat.requestPermissions(this, perms.toArray(new String[0]), 1001);
                    }
                } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    java.util.List<String> perms = new java.util.ArrayList<>();
                    if (ContextCompat.checkSelfPermission(this, android.Manifest.permission.READ_EXTERNAL_STORAGE) != android.content.pm.PackageManager.PERMISSION_GRANTED) {
                        perms.add(android.Manifest.permission.READ_EXTERNAL_STORAGE);
                    }
                    if (ContextCompat.checkSelfPermission(this, android.Manifest.permission.WRITE_EXTERNAL_STORAGE) != android.content.pm.PackageManager.PERMISSION_GRANTED) {
                        perms.add(android.Manifest.permission.WRITE_EXTERNAL_STORAGE);
                    }
                    if (!perms.isEmpty()) {
                        ActivityCompat.requestPermissions(this, perms.toArray(new String[0]), 1001);
                    }
                }

                // 2. All Files Access (MANAGE_EXTERNAL_STORAGE) for Android 11+
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                    if (!Environment.isExternalStorageManager()) {
                        try {
                            Intent intent = new Intent(Settings.ACTION_MANAGE_APP_ALL_FILES_ACCESS_PERMISSION);
                            intent.setData(Uri.parse("package:" + getPackageName()));
                            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                            startActivity(intent);
                        } catch (Exception e) {
                            try {
                                Intent intent = new Intent(Settings.ACTION_MANAGE_ALL_FILES_ACCESS_PERMISSION);
                                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                                startActivity(intent);
                            } catch (Exception ex) {
                                ex.printStackTrace();
                            }
                        }
                    }
                }
            } catch (Exception e) {
                e.printStackTrace();
            }
        });
    }

    public void startBackgroundSyncService() {
        try {
            Intent serviceIntent = new Intent(this, BackgroundSyncService.class);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                startForegroundService(serviceIntent);
            } else {
                startService(serviceIntent);
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    public void checkAndRequestBatteryOptimization() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            try {
                PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
                if (pm != null && !pm.isIgnoringBatteryOptimizations(getPackageName())) {
                    Intent intent = new Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS);
                    intent.setData(Uri.parse("package:" + getPackageName()));
                    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    startActivity(intent);
                }
            } catch (Exception e) {
                e.printStackTrace();
            }
        }
    }

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Start Foreground Service to keep app and network connections alive in background
        startBackgroundSyncService();

        // Dark status bar and navigation bar matching dark theme
        getWindow().setStatusBarColor(Color.parseColor("#09090b"));
        getWindow().setNavigationBarColor(Color.parseColor("#09090b"));
        findViewById(android.R.id.content).setBackgroundColor(Color.parseColor("#09090b"));

        // Prompt storage permission on launch
        new Handler(Looper.getMainLooper()).postDelayed(this::checkAndRequestStoragePermission, 600);

        // Start embedded HTTP media range stream server on port 8088
        try {
            mediaStreamServer = new MediaStreamServer();
            mediaStreamServer.start();
        } catch (Exception e) {
            e.printStackTrace();
        }

        // Start embedded WebDAV server on port 8089 for Windows Explorer mapping
        try {
            webDavServer = new WebDavServer();
            webDavServer.start();
        } catch (Exception e) {
            e.printStackTrace();
        }

        // Native Downloader & Device Info Bridge
        this.getBridge().getWebView().addJavascriptInterface(new Object() {
            @JavascriptInterface
            public int getWebDavPort() {
                return 8089;
            }

            @JavascriptInterface
            public String getDeviceIp() {
                try {
                    java.util.Enumeration<java.net.NetworkInterface> en = java.net.NetworkInterface.getNetworkInterfaces();
                    String fallbackIp = "";
                    while (en.hasMoreElements()) {
                        java.net.NetworkInterface intf = en.nextElement();
                        String name = intf.getName().toLowerCase();
                        if (name.contains("tun") || name.contains("ppp") || name.contains("p2p") || name.contains("rmnet") || name.contains("dummy")) {
                            continue;
                        }
                        boolean isWifiOrEth = name.startsWith("wlan") || name.startsWith("ap") || name.startsWith("eth");
                        java.util.Enumeration<java.net.InetAddress> enumIpAddr = intf.getInetAddresses();
                        while (enumIpAddr.hasMoreElements()) {
                            java.net.InetAddress inetAddress = enumIpAddr.nextElement();
                            if (!inetAddress.isLoopbackAddress() && inetAddress instanceof java.net.Inet4Address) {
                                String host = inetAddress.getHostAddress();
                                if (isWifiOrEth) {
                                    return host;
                                }
                                if (fallbackIp.isEmpty()) {
                                    fallbackIp = host;
                                }
                            }
                        }
                    }
                    return fallbackIp;
                } catch (Exception ex) {
                    ex.printStackTrace();
                }
                return "";
            }

            @JavascriptInterface
            public boolean isAudioPermissionGranted() {
                return ContextCompat.checkSelfPermission(MainActivity.this, android.Manifest.permission.RECORD_AUDIO) == android.content.pm.PackageManager.PERMISSION_GRANTED;
            }

            @JavascriptInterface
            public void requestAudioPermission() {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    runOnUiThread(() -> {
                        ActivityCompat.requestPermissions(MainActivity.this, new String[]{android.Manifest.permission.RECORD_AUDIO}, 2002);
                    });
                }
            }

            @JavascriptInterface
            public boolean saveToEncross(String fileName, String base64Data, String subfolder) {
                try {
                    File downloadsDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS);
                    File encrossDir = (subfolder != null && !subfolder.trim().isEmpty())
                            ? new File(downloadsDir, "ENCross" + File.separator + subfolder.trim())
                            : new File(downloadsDir, "ENCross");

                    if (!encrossDir.exists()) {
                        encrossDir.mkdirs();
                    }

                    File targetFile = new File(encrossDir, fileName);
                    byte[] decodedBytes = Base64.decode(base64Data, Base64.DEFAULT);

                    FileOutputStream fos = new FileOutputStream(targetFile);
                    fos.write(decodedBytes);
                    fos.flush();
                    fos.close();

                    MediaScannerConnection.scanFile(
                        MainActivity.this,
                        new String[]{targetFile.getAbsolutePath()},
                        null,
                        null
                    );

                    final String folderName = (subfolder != null && !subfolder.trim().isEmpty())
                            ? "Downloads/ENCross/" + subfolder.trim()
                            : "Downloads/ENCross";

                    runOnUiThread(() -> {
                        Toast.makeText(MainActivity.this, "Disimpan di " + folderName + "/" + fileName, Toast.LENGTH_SHORT).show();
                    });

                    return true;
                } catch (Exception e) {
                    e.printStackTrace();
                    return false;
                }
            }

            @JavascriptInterface
            public boolean hasStoragePermission() {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                    return Environment.isExternalStorageManager();
                } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                    return ContextCompat.checkSelfPermission(MainActivity.this, android.Manifest.permission.READ_MEDIA_IMAGES) == android.content.pm.PackageManager.PERMISSION_GRANTED;
                } else {
                    return ContextCompat.checkSelfPermission(MainActivity.this, android.Manifest.permission.READ_EXTERNAL_STORAGE) == android.content.pm.PackageManager.PERMISSION_GRANTED;
                }
            }

            @JavascriptInterface
            public void requestStoragePermission() {
                checkAndRequestStoragePermission();
            }

            @JavascriptInterface
            public void minimizeToBackground() {
                runOnUiThread(() -> moveTaskToBack(true));
            }
        }, "AndroidDownloader");

        // Native Remote Two-Way File System Bridge
        this.getBridge().getWebView().addJavascriptInterface(new Object() {
            @JavascriptInterface
            public boolean hasStoragePermission() {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                    return Environment.isExternalStorageManager();
                } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                    return ContextCompat.checkSelfPermission(MainActivity.this, android.Manifest.permission.READ_MEDIA_IMAGES) == android.content.pm.PackageManager.PERMISSION_GRANTED;
                } else {
                    return ContextCompat.checkSelfPermission(MainActivity.this, android.Manifest.permission.READ_EXTERNAL_STORAGE) == android.content.pm.PackageManager.PERMISSION_GRANTED;
                }
            }

            @JavascriptInterface
            public void requestStoragePermission() {
                checkAndRequestStoragePermission();
            }

            @JavascriptInterface
            public void minimizeToBackground() {
                runOnUiThread(() -> moveTaskToBack(true));
            }

            @JavascriptInterface
            public String listDirectory(String subPath) {
                try {
                    File root = Environment.getExternalStorageDirectory();
                    File targetDir = (subPath == null || subPath.trim().isEmpty() || subPath.equals("/") || subPath.equals("."))
                            ? root
                            : new File(root, subPath.trim());

                    String canonicalRoot = root.getCanonicalPath();
                    String canonicalTarget = targetDir.getCanonicalPath();
                    if (!canonicalTarget.startsWith(canonicalRoot)) {
                        targetDir = root;
                    }

                    JSONObject result = new JSONObject();
                    String relPath = targetDir.getAbsolutePath().substring(root.getAbsolutePath().length());
                    if (relPath.isEmpty()) relPath = "/";
                    result.put("currentPath", relPath.replace("\\", "/"));

                    JSONArray items = new JSONArray();
                    File[] files = targetDir.listFiles();
                    if (files != null) {
                        Arrays.sort(files, (a, b) -> {
                            if (a.isDirectory() && !b.isDirectory()) return -1;
                            if (!a.isDirectory() && b.isDirectory()) return 1;
                            return a.getName().compareToIgnoreCase(b.getName());
                        });

                        for (File f : files) {
                            if (f.getName().startsWith(".")) continue;
                            JSONObject item = new JSONObject();
                            item.put("name", f.getName());
                            String itemRel = f.getAbsolutePath().substring(root.getAbsolutePath().length()).replace("\\", "/");
                            item.put("path", itemRel);
                            item.put("isDirectory", f.isDirectory());
                            item.put("size", f.isDirectory() ? 0 : f.length());
                            item.put("lastModified", f.lastModified());
                            items.put(item);
                        }
                    }
                    result.put("items", items);
                    return result.toString();
                } catch (Exception e) {
                    e.printStackTrace();
                    try {
                        JSONObject err = new JSONObject();
                        err.put("error", e.getMessage());
                        return err.toString();
                    } catch (Exception ex) {
                        return "{\"error\":\"" + e.getMessage() + "\"}";
                    }
                }
            }

            @JavascriptInterface
            public String readFileBase64(String subPath) {
                try {
                    File root = Environment.getExternalStorageDirectory();
                    File targetFile = (subPath != null && !subPath.trim().isEmpty())
                            ? new File(root, subPath.trim())
                            : null;
                    if (targetFile == null || !targetFile.exists() || targetFile.isDirectory()) {
                        return "";
                    }

                    String canonicalRoot = root.getCanonicalPath();
                    String canonicalTarget = targetFile.getCanonicalPath();
                    if (!canonicalTarget.startsWith(canonicalRoot)) {
                        return "";
                    }

                    long maxSafeSize = 150L * 1024 * 1024; // 150 MB safe ceiling
                    if (targetFile.length() > maxSafeSize) {
                        return "ERROR:FILE_TOO_LARGE";
                    }

                    byte[] fileBytes = new byte[(int) targetFile.length()];
                    FileInputStream fis = new FileInputStream(targetFile);
                    int bytesRead = 0;
                    while (bytesRead < fileBytes.length) {
                        int read = fis.read(fileBytes, bytesRead, fileBytes.length - bytesRead);
                        if (read == -1) break;
                        bytesRead += read;
                    }
                    fis.close();
                    return Base64.encodeToString(fileBytes, Base64.NO_WRAP);
                } catch (Exception e) {
                    e.printStackTrace();
                    return "";
                }
            }
        }, "AndroidFileSystem");

        // Native MediaProjection Screen Mirroring Bridge
        this.getBridge().getWebView().addJavascriptInterface(new Object() {
            @JavascriptInterface
            public boolean isScreenCaptureAvailable() {
                return true;
            }

            @JavascriptInterface
            public void startScreenCapture() {
                runOnUiThread(() -> {
                    if (projectionManager == null) {
                        projectionManager = (MediaProjectionManager) getSystemService(Context.MEDIA_PROJECTION_SERVICE);
                    }
                    if (projectionManager != null) {
                        startActivityForResult(projectionManager.createScreenCaptureIntent(), REQUEST_MEDIA_PROJECTION);
                    } else {
                        notifyScreenError("MediaProjectionManager tidak didukung pada perangkat ini.");
                    }
                });
            }

            @JavascriptInterface
            public void stopScreenCapture() {
                runOnUiThread(() -> stopScreenCaptureInternal());
            }
        }, "AndroidScreenShare");

        // Native Ringer / Alarm Bridge
        this.getBridge().getWebView().addJavascriptInterface(new Object() {
            @JavascriptInterface
            public void startRinging() {
                MainActivity.this.startRinging();
            }

            @JavascriptInterface
            public void stopRinging() {
                MainActivity.this.stopRinging();

            }
        }, "AndroidRinger");

        // Native Battery Bridge
        this.getBridge().getWebView().addJavascriptInterface(new Object() {
            @JavascriptInterface
            public String getBatteryStatus() {
                return MainActivity.this.getBatteryStatus();
            }
        }, "AndroidBattery");

        // Native Notification Bridge
        this.getBridge().getWebView().addJavascriptInterface(new Object() {
            @JavascriptInterface
            public boolean isNotificationAccessGranted() {
                try {
                    String pkg = getPackageName();
                    String flat = Settings.Secure.getString(getContentResolver(), "enabled_notification_listeners");
                    return flat != null && flat.contains(pkg);
                } catch (Exception e) {
                    return false;
                }
            }

            @JavascriptInterface
            public void openNotificationAccessSettings() {
                try {
                    Intent intent = new Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS);
                    startActivity(intent);
                } catch (Exception e) {
                    e.printStackTrace();
                }
            }
        }, "AndroidNotifications");

        // Notification Mirror Service Callback
        NotificationMirrorService.setCallback((appName, title, text, packageName) -> {
            runOnUiThread(() -> {
                try {
                    JSONObject notif = new JSONObject();
                    notif.put("appName", appName);
                    notif.put("title", title);
                    notif.put("text", text);
                    notif.put("packageName", packageName);
                    getBridge().getWebView().evaluateJavascript("window.onAndroidNotificationReceived && window.onAndroidNotificationReceived(" + JSONObject.quote(notif.toString()) + ");", null);
                } catch (Exception ignored) {}
            });
        });

        // Battery State Changed Receiver
        batteryReceiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                try {
                    String batteryJson = getBatteryStatus();
                    getBridge().getWebView().evaluateJavascript("window.onAndroidBatteryChanged && window.onAndroidBatteryChanged(" + JSONObject.quote(batteryJson) + ");", null);
                } catch (Exception ignored) {}
            }
        };
        try {
            registerReceiver(batteryReceiver, new IntentFilter(Intent.ACTION_BATTERY_CHANGED));
        } catch (Exception ignored) {}

        // Native Clipboard Bridge
        this.getBridge().getWebView().addJavascriptInterface(new Object() {
            @JavascriptInterface
            public String getClipboardText() {
                try {
                    android.content.ClipboardManager clipboard = (android.content.ClipboardManager) getSystemService(Context.CLIPBOARD_SERVICE);
                    if (clipboard != null && clipboard.hasPrimaryClip()) {
                        android.content.ClipData.Item item = clipboard.getPrimaryClip().getItemAt(0);
                        if (item != null && item.getText() != null) {
                            return item.getText().toString();
                        }
                    }
                } catch (Exception e) {
                    e.printStackTrace();
                }
                return "";
            }

            @JavascriptInterface
            public boolean setClipboardText(String text) {
                if (text == null) return false;
                runOnUiThread(() -> {
                    try {
                        android.content.ClipboardManager clipboard = (android.content.ClipboardManager) getSystemService(Context.CLIPBOARD_SERVICE);
                        if (clipboard != null) {
                            android.content.ClipData clip = android.content.ClipData.newPlainText("ENCross", text);
                            clipboard.setPrimaryClip(clip);
                        }
                    } catch (Exception e) {
                        e.printStackTrace();
                    }
                });
                return true;
            }
        }, "AndroidClipboard");

        // Clipboard change listener
        try {
            android.content.ClipboardManager cm = (android.content.ClipboardManager) getSystemService(Context.CLIPBOARD_SERVICE);
            if (cm != null) {
                cm.addPrimaryClipChangedListener(() -> {
                    runOnUiThread(() -> {
                        try {
                            if (cm.hasPrimaryClip()) {
                                android.content.ClipData.Item item = cm.getPrimaryClip().getItemAt(0);
                                if (item != null && item.getText() != null) {
                                    String text = item.getText().toString();
                                    String escaped = org.json.JSONObject.quote(text);
                                    getBridge().getWebView().evaluateJavascript("window.onAndroidClipboardChanged && window.onAndroidClipboardChanged(" + escaped + ");", null);
                                }
                            }
                        } catch (Exception ignored) {}
                    });
                });
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);

        if (requestCode == REQUEST_MEDIA_PROJECTION) {
            if (resultCode == RESULT_OK && data != null) {
                // Start Foreground Service first as required by Android 10/14+
                Intent serviceIntent = new Intent(this, MediaProjectionService.class);
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    ContextCompat.startForegroundService(this, serviceIntent);
                } else {
                    startService(serviceIntent);
                }

                // Short delay to ensure ForegroundService notification is registered
                new Handler().postDelayed(() -> {
                    startMediaProjectionCapture(resultCode, data);
                }, 100);
            } else {
                notifyScreenError("Izin siaran layar dibatalkan.");
            }
        }
    }

    private void startMediaProjectionCapture(int resultCode, Intent data) {
        try {
            if (projectionManager == null) {
                projectionManager = (MediaProjectionManager) getSystemService(Context.MEDIA_PROJECTION_SERVICE);
            }
            mediaProjection = projectionManager.getMediaProjection(resultCode, data);
            if (mediaProjection == null) {
                notifyScreenError("Gagal menginisialisasi MediaProjection.");
                return;
            }

            DisplayMetrics metrics = getResources().getDisplayMetrics();
            int screenWidth = metrics.widthPixels;
            int screenHeight = metrics.heightPixels;
            int density = metrics.densityDpi;

            // Target width 540p for ultra-smooth 25 FPS Wi-Fi stream
            int targetWidth = 540;
            int targetHeight = (int) Math.round((double) screenHeight * targetWidth / screenWidth);
            if (targetWidth % 2 != 0) targetWidth++;
            if (targetHeight % 2 != 0) targetHeight++;

            final int fWidth = targetWidth;
            final int fHeight = targetHeight;

            captureThread = new HandlerThread("ScreenCaptureThread");
            captureThread.start();
            captureHandler = new Handler(captureThread.getLooper());

            mediaProjection.registerCallback(new MediaProjection.Callback() {
                @Override
                public void onStop() {
                    runOnUiThread(() -> stopScreenCaptureInternal());
                }
            }, captureHandler);

            imageReader = ImageReader.newInstance(fWidth, fHeight, PixelFormat.RGBA_8888, 2);

            virtualDisplay = mediaProjection.createVirtualDisplay(
                "ENCrossMirror",
                fWidth,
                fHeight,
                density,
                DisplayManager.VIRTUAL_DISPLAY_FLAG_AUTO_MIRROR,
                imageReader.getSurface(),
                null,
                captureHandler
            );

            isCapturingScreen = true;
            lastFrameTime = 0;

            imageReader.setOnImageAvailableListener(reader -> {
                Image image = null;
                try {
                    image = reader.acquireLatestImage();
                    if (image == null || !isCapturingScreen) {
                        if (image != null) image.close();
                        return;
                    }

                    if (isDispatchingFrame) {
                        image.close();
                        return;
                    }

                    long now = System.currentTimeMillis();
                    if (now - lastFrameTime < 45) { // ~22 FPS cap
                        image.close();
                        return;
                    }
                    lastFrameTime = now;

                    Image.Plane[] planes = image.getPlanes();
                    ByteBuffer buffer = planes[0].getBuffer();
                    int pixelStride = planes[0].getPixelStride();
                    int rowStride = planes[0].getRowStride();
                    int rowPadding = rowStride - pixelStride * fWidth;

                    Bitmap bitmap = Bitmap.createBitmap(
                        fWidth + rowPadding / pixelStride,
                        fHeight,
                        Bitmap.Config.ARGB_8888
                    );
                    bitmap.copyPixelsFromBuffer(buffer);

                    Bitmap finalBitmap = bitmap;
                    if (rowPadding != 0) {
                        finalBitmap = Bitmap.createBitmap(bitmap, 0, 0, fWidth, fHeight);
                        bitmap.recycle();
                    }

                    ByteArrayOutputStream baos = new ByteArrayOutputStream();
                    finalBitmap.compress(Bitmap.CompressFormat.JPEG, 65, baos);
                    finalBitmap.recycle();
                    byte[] jpegBytes = baos.toByteArray();
                    baos.close();

                    final String base64 = Base64.encodeToString(jpegBytes, Base64.NO_WRAP);
                    isDispatchingFrame = true;

                    runOnUiThread(() -> {
                        try {
                            if (getBridge() != null && getBridge().getWebView() != null && isCapturingScreen) {
                                getBridge().getWebView().evaluateJavascript(
                                    "window.__onNativeScreenFrame && window.__onNativeScreenFrame('" + base64 + "')",
                                    val -> {
                                        isDispatchingFrame = false;
                                    }
                                );
                            } else {
                                isDispatchingFrame = false;
                            }
                        } catch (Exception ex) {
                            isDispatchingFrame = false;
                        }
                    });
                } catch (Exception ex) {
                    isDispatchingFrame = false;
                } finally {
                    if (image != null) {
                        image.close();
                    }
                }
            }, captureHandler);

            runOnUiThread(() -> {
                if (getBridge() != null && getBridge().getWebView() != null) {
                    getBridge().getWebView().evaluateJavascript(
                        "window.__onNativeScreenStarted && window.__onNativeScreenStarted(" + fWidth + ", " + fHeight + ")",
                        null
                    );
                }
            });

        } catch (Exception e) {
            e.printStackTrace();
            notifyScreenError("Gagal memulai siaran layar: " + e.getMessage());
        }
    }

    private void stopScreenCaptureInternal() {
        isCapturingScreen = false;
        isDispatchingFrame = false;
        try {
            if (virtualDisplay != null) {
                virtualDisplay.release();
                virtualDisplay = null;
            }
            if (imageReader != null) {
                imageReader.close();
                imageReader = null;
            }
            if (mediaProjection != null) {
                mediaProjection.stop();
                mediaProjection = null;
            }
            if (captureThread != null) {
                captureThread.quitSafely();
                captureThread = null;
                captureHandler = null;
            }
            stopService(new Intent(this, MediaProjectionService.class));

            if (getBridge() != null && getBridge().getWebView() != null) {
                getBridge().getWebView().evaluateJavascript(
                    "window.__onNativeScreenStopped && window.__onNativeScreenStopped()",
                    null
                );
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private void notifyScreenError(String errorMsg) {
        stopScreenCaptureInternal();
        runOnUiThread(() -> {
            if (getBridge() != null && getBridge().getWebView() != null) {
                getBridge().getWebView().evaluateJavascript(
                    "window.__onNativeScreenError && window.__onNativeScreenError('" + errorMsg.replace("'", "\\'") + "')",
                    null
                );
            }
        });
    }

    @Override
    public void onPause() {
        super.onPause();
        // Keep WebView timers running in background so WebSockets, WebRTC, and LAN transfers remain alive
        if (this.getBridge() != null && this.getBridge().getWebView() != null) {
            this.getBridge().getWebView().resumeTimers();
        }
    }

    @Override
    public void onStop() {
        super.onStop();
        // Keep WebView timers running when activity is stopped in background
        if (this.getBridge() != null && this.getBridge().getWebView() != null) {
            this.getBridge().getWebView().resumeTimers();
        }
    }

    public void startRinging() {
        runOnUiThread(() -> {
            try {
                AudioManager am = (AudioManager) getSystemService(Context.AUDIO_SERVICE);
                if (am != null) {
                    int maxVol = am.getStreamMaxVolume(AudioManager.STREAM_ALARM);
                    am.setStreamVolume(AudioManager.STREAM_ALARM, maxVol, 0);
                }

                if (alarmRingtone != null && alarmRingtone.isPlaying()) {
                    alarmRingtone.stop();
                }

                Uri alarmUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM);
                if (alarmUri == null) {
                    alarmUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE);
                }

                alarmRingtone = RingtoneManager.getRingtone(getApplicationContext(), alarmUri);
                if (alarmRingtone != null) {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                        AudioAttributes aa = new AudioAttributes.Builder()
                                .setUsage(AudioAttributes.USAGE_ALARM)
                                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                                .build();
                        alarmRingtone.setAudioAttributes(aa);
                    }
                    alarmRingtone.play();
                }

                if (phoneVibrator == null) {
                    phoneVibrator = (Vibrator) getSystemService(Context.VIBRATOR_SERVICE);
                }
                if (phoneVibrator != null) {
                    long[] pattern = {0, 800, 400, 800, 400, 800};
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                        phoneVibrator.vibrate(VibrationEffect.createWaveform(pattern, 0));
                    } else {
                        phoneVibrator.vibrate(pattern, 0);
                    }
                }
            } catch (Exception e) {
                e.printStackTrace();
            }
        });
    }

    public void stopRinging() {
        runOnUiThread(() -> {
            try {
                if (alarmRingtone != null) {
                    alarmRingtone.stop();
                    alarmRingtone = null;
                }
                if (phoneVibrator != null) {
                    phoneVibrator.cancel();
                }
            } catch (Exception e) {
                e.printStackTrace();
            }
        });
    }

    public String getBatteryStatus() {
        try {
            Intent intent = registerReceiver(null, new IntentFilter(Intent.ACTION_BATTERY_CHANGED));
            if (intent != null) {
                int level = intent.getIntExtra(BatteryManager.EXTRA_LEVEL, -1);
                int scale = intent.getIntExtra(BatteryManager.EXTRA_SCALE, -1);
                int percent = (scale > 0) ? (int) Math.round((level * 100.0) / scale) : level;
                int status = intent.getIntExtra(BatteryManager.EXTRA_STATUS, -1);
                boolean isCharging = (status == BatteryManager.BATTERY_STATUS_CHARGING || status == BatteryManager.BATTERY_STATUS_FULL);
                int tempTenths = intent.getIntExtra(BatteryManager.EXTRA_TEMPERATURE, 0);
                double temperature = tempTenths / 10.0;

                JSONObject obj = new JSONObject();
                obj.put("level", percent);
                obj.put("isCharging", isCharging);
                obj.put("temperature", temperature);
                return obj.toString();
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        return "{\"level\":-1,\"isCharging\":false,\"temperature\":0}";
    }

    @Override
    public void onDestroy() {
        stopRinging();
        if (batteryReceiver != null) {
            try {
                unregisterReceiver(batteryReceiver);
            } catch (Exception ignored) {}
        }
        if (webDavServer != null) {
            try { webDavServer.stop(); } catch (Exception ignored) {}
        }
        if (mediaStreamServer != null) {
            try { mediaStreamServer.stop(); } catch (Exception ignored) {}
        }
        stopScreenCaptureInternal();
        try { stopService(new Intent(this, BackgroundSyncService.class)); } catch (Exception ignored) {}
        super.onDestroy();
    }

    @Override
    public void onBackPressed() {
        if (this.getBridge() != null && this.getBridge().getWebView() != null) {
            this.getBridge().getWebView().evaluateJavascript(
                "(function() { return (window.__handleAndroidBack && window.__handleAndroidBack()) ? 'true' : 'false'; })()",
                value -> {
                    if (value != null && value.contains("true")) {
                        return;
                    }
                    runOnUiThread(() -> moveTaskToBack(true));
                }
            );
            return;
        }
        moveTaskToBack(true);
    }

    // =========================================================================
    // Embedded Lightweight HTTP Range Streaming Server for Media (Video / Audio)
    // Port 8088 - Runs on background daemon thread, handles instant seek and partial content
    // =========================================================================
    private class MediaStreamServer {
        private final int port = 8088;
        private ServerSocket serverSocket;
        private volatile boolean isRunning = false;
        private Thread serverThread;
        private final ExecutorService executor = Executors.newCachedThreadPool();

        public void start() {
            if (isRunning) return;
            isRunning = true;
            serverThread = new Thread(() -> {
                try {
                    serverSocket = new ServerSocket(port);
                    while (isRunning && serverSocket != null && !serverSocket.isClosed()) {
                        Socket clientSocket = serverSocket.accept();
                        executor.submit(() -> handleClient(clientSocket));
                    }
                } catch (Exception ignored) {
                }
            });
            serverThread.setDaemon(true);
            serverThread.start();
        }

        public void stop() {
            isRunning = false;
            try {
                if (serverSocket != null && !serverSocket.isClosed()) {
                    serverSocket.close();
                }
            } catch (Exception ignored) {}
            try {
                executor.shutdownNow();
            } catch (Exception ignored) {}
        }

        private void handleClient(Socket socket) {
            try {
                socket.setSoTimeout(30000);
                InputStream is = socket.getInputStream();
                OutputStream os = socket.getOutputStream();
                BufferedReader reader = new BufferedReader(new InputStreamReader(is, StandardCharsets.UTF_8));

                String requestLine = reader.readLine();
                if (requestLine == null || requestLine.isEmpty()) {
                    socket.close();
                    return;
                }

                String[] parts = requestLine.split(" ");
                if (parts.length < 2) {
                    socket.close();
                    return;
                }
                String method = parts[0];
                String uri = parts[1];

                String rangeHeader = null;
                String headerLine;
                while ((headerLine = reader.readLine()) != null && !headerLine.isEmpty()) {
                    if (headerLine.toLowerCase().startsWith("range:")) {
                        rangeHeader = headerLine.substring(6).trim();
                    }
                }

                if ("OPTIONS".equalsIgnoreCase(method)) {
                    String corsResponse = "HTTP/1.1 200 OK\r\n" +
                            "Access-Control-Allow-Origin: *\r\n" +
                            "Access-Control-Allow-Methods: GET, HEAD, OPTIONS\r\n" +
                            "Access-Control-Allow-Headers: Range, Content-Type, Accept\r\n" +
                            "Content-Length: 0\r\n\r\n";
                    os.write(corsResponse.getBytes(StandardCharsets.UTF_8));
                    os.flush();
                    socket.close();
                    return;
                }

                String subPath = "";
                if (uri.contains("?")) {
                    String query = uri.substring(uri.indexOf("?") + 1);
                    for (String param : query.split("&")) {
                        String[] pair = param.split("=", 2);
                        if (pair.length == 2 && "path".equalsIgnoreCase(pair[0])) {
                            subPath = URLDecoder.decode(pair[1], "UTF-8");
                            break;
                        }
                    }
                }

                File root = Environment.getExternalStorageDirectory();
                File targetFile = (subPath != null && !subPath.trim().isEmpty())
                        ? new File(root, subPath.trim())
                        : null;

                if (targetFile == null || !targetFile.exists() || targetFile.isDirectory()) {
                    String notFound = "HTTP/1.1 404 Not Found\r\nContent-Type: text/plain\r\nAccess-Control-Allow-Origin: *\r\nContent-Length: 14\r\n\r\nFile Not Found";
                    os.write(notFound.getBytes(StandardCharsets.UTF_8));
                    os.flush();
                    socket.close();
                    return;
                }

                String canonicalRoot = root.getCanonicalPath();
                String canonicalTarget = targetFile.getCanonicalPath();
                if (!canonicalTarget.startsWith(canonicalRoot)) {
                    String forbidden = "HTTP/1.1 403 Forbidden\r\nAccess-Control-Allow-Origin: *\r\nContent-Length: 9\r\n\r\nForbidden";
                    os.write(forbidden.getBytes(StandardCharsets.UTF_8));
                    os.flush();
                    socket.close();
                    return;
                }

                long fileLength = targetFile.length();
                String mimeType = getMimeType(targetFile.getName());

                long start = 0;
                long end = fileLength - 1;
                boolean isRange = false;

                if (rangeHeader != null && rangeHeader.startsWith("bytes=")) {
                    isRange = true;
                    String rangeValues = rangeHeader.substring(6).trim();
                    String[] rangeParts = rangeValues.split("-", 2);
                    try {
                        start = Long.parseLong(rangeParts[0].trim());
                        if (rangeParts.length > 1 && !rangeParts[1].trim().isEmpty()) {
                            end = Long.parseLong(rangeParts[1].trim());
                        }
                    } catch (NumberFormatException ignored) {}

                    if (start >= fileLength) {
                        String unsat = "HTTP/1.1 416 Range Not Satisfiable\r\nContent-Range: bytes */" + fileLength + "\r\nAccess-Control-Allow-Origin: *\r\n\r\n";
                        os.write(unsat.getBytes(StandardCharsets.UTF_8));
                        os.flush();
                        socket.close();
                        return;
                    }
                    if (end >= fileLength) {
                        end = fileLength - 1;
                    }
                }

                long chunkLength = end - start + 1;

                StringBuilder sb = new StringBuilder();
                if (isRange) {
                    sb.append("HTTP/1.1 206 Partial Content\r\n");
                    sb.append("Content-Range: bytes ").append(start).append("-").append(end).append("/").append(fileLength).append("\r\n");
                } else {
                    sb.append("HTTP/1.1 200 OK\r\n");
                }
                sb.append("Content-Type: ").append(mimeType).append("\r\n");
                sb.append("Content-Length: ").append(chunkLength).append("\r\n");
                sb.append("Accept-Ranges: bytes\r\n");
                sb.append("Access-Control-Allow-Origin: *\r\n");
                sb.append("Connection: close\r\n\r\n");

                os.write(sb.toString().getBytes(StandardCharsets.UTF_8));
                os.flush();

                if (!"HEAD".equalsIgnoreCase(method)) {
                    RandomAccessFile raf = new RandomAccessFile(targetFile, "r");
                    raf.seek(start);
                    byte[] buffer = new byte[65536];
                    long remaining = chunkLength;
                    while (remaining > 0) {
                        int toRead = (int) Math.min(buffer.length, remaining);
                        int read = raf.read(buffer, 0, toRead);
                        if (read == -1) break;
                        os.write(buffer, 0, read);
                        remaining -= read;
                    }
                    os.flush();
                    raf.close();
                }
            } catch (Exception ignored) {
            } finally {
                try { socket.close(); } catch (Exception ignored) {}
            }
        }

        private String getMimeType(String name) {
            String lower = name.toLowerCase();
            if (lower.endsWith(".mp4")) return "video/mp4";
            if (lower.endsWith(".mkv")) return "video/x-matroska";
            if (lower.endsWith(".webm")) return "video/webm";
            if (lower.endsWith(".mov")) return "video/quicktime";
            if (lower.endsWith(".avi")) return "video/x-msvideo";
            if (lower.endsWith(".3gp")) return "video/3gpp";
            if (lower.endsWith(".mp3")) return "audio/mpeg";
            if (lower.endsWith(".wav")) return "audio/wav";
            if (lower.endsWith(".ogg")) return "audio/ogg";
            if (lower.endsWith(".m4a")) return "audio/mp4";
            if (lower.endsWith(".aac")) return "audio/aac";
            if (lower.endsWith(".flac")) return "audio/flac";
            if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
            if (lower.endsWith(".png")) return "image/png";
            if (lower.endsWith(".webp")) return "image/webp";
            if (lower.endsWith(".gif")) return "image/gif";
            if (lower.endsWith(".bmp")) return "image/bmp";
            if (lower.endsWith(".svg")) return "image/svg+xml";
            return "application/octet-stream";
        }
    }

    // =========================================================================
    // Embedded Lightweight WebDAV Server (Port 8089)
    // Enables Windows File Explorer to mount Android phone storage as a native drive
    // Supports OPTIONS, PROPFIND, GET, HEAD, PUT, MKCOL, DELETE, MOVE, LOCK, UNLOCK
    // =========================================================================
    private class WebDavServer {
        private final int port = 8089;
        private ServerSocket serverSocket;
        private volatile boolean isRunning = false;
        private Thread serverThread;
        private final ExecutorService executor = Executors.newCachedThreadPool();
        private final SimpleDateFormat rfc1123 = new SimpleDateFormat("EEE, dd MMM yyyy HH:mm:ss 'GMT'", Locale.US);

        public WebDavServer() {
            rfc1123.setTimeZone(TimeZone.getTimeZone("GMT"));
        }

        public void start() {
            if (isRunning) return;
            isRunning = true;
            serverThread = new Thread(() -> {
                try {
                    serverSocket = new ServerSocket(port);
                    while (isRunning && serverSocket != null && !serverSocket.isClosed()) {
                        Socket clientSocket = serverSocket.accept();
                        executor.submit(() -> handleClient(clientSocket));
                    }
                } catch (Exception ignored) {
                }
            });
            serverThread.setDaemon(true);
            serverThread.start();
        }

        public void stop() {
            isRunning = false;
            try {
                if (serverSocket != null && !serverSocket.isClosed()) {
                    serverSocket.close();
                }
            } catch (Exception ignored) {}
            try {
                executor.shutdownNow();
            } catch (Exception ignored) {}
        }

        private void handleClient(Socket socket) {
            try {
                socket.setSoTimeout(30000);
                InputStream is = socket.getInputStream();
                OutputStream os = socket.getOutputStream();
                BufferedReader reader = new BufferedReader(new InputStreamReader(is, StandardCharsets.UTF_8));

                String requestLine = reader.readLine();
                if (requestLine == null || requestLine.isEmpty()) {
                    socket.close();
                    return;
                }

                String[] parts = requestLine.split(" ");
                if (parts.length < 2) {
                    socket.close();
                    return;
                }
                String method = parts[0].toUpperCase(Locale.US);
                String rawUri = parts[1];

                // Read all HTTP headers
                String headerLine;
                int depth = 1;
                long contentLength = -1;
                String destination = null;
                boolean overwrite = true;
                while ((headerLine = reader.readLine()) != null && !headerLine.isEmpty()) {
                    String lower = headerLine.toLowerCase(Locale.US);
                    if (lower.startsWith("depth:")) {
                        try {
                            depth = Integer.parseInt(headerLine.substring(6).trim());
                        } catch (Exception ignored) {}
                    } else if (lower.startsWith("content-length:")) {
                        try {
                            contentLength = Long.parseLong(headerLine.substring(15).trim());
                        } catch (Exception ignored) {}
                    } else if (lower.startsWith("destination:")) {
                        destination = headerLine.substring(12).trim();
                    } else if (lower.startsWith("overwrite:")) {
                        overwrite = !"F".equalsIgnoreCase(headerLine.substring(10).trim());
                    }
                }

                File rootDir = Environment.getExternalStorageDirectory();
                String pathOnly = rawUri.contains("?") ? rawUri.substring(0, rawUri.indexOf("?")) : rawUri;
                String decodedPath = URLDecoder.decode(pathOnly, "UTF-8").replace('\\', '/');
                if (decodedPath.startsWith("/")) {
                    decodedPath = decodedPath.substring(1);
                }

                File targetFile = (decodedPath.isEmpty() || decodedPath.equals("."))
                        ? rootDir
                        : new File(rootDir, decodedPath);

                String canonicalRoot = rootDir.getCanonicalPath();
                String canonicalTarget = targetFile.getCanonicalPath();
                if (!canonicalTarget.startsWith(canonicalRoot)) {
                    sendResponse(os, "HTTP/1.1 403 Forbidden\r\nContent-Length: 0\r\nConnection: close\r\n\r\n");
                    socket.close();
                    return;
                }

                switch (method) {
                    case "OPTIONS": {
                        String optionsResp = "HTTP/1.1 200 OK\r\n" +
                                "DAV: 1, 2\r\n" +
                                "MS-Author-Via: DAV\r\n" +
                                "Allow: OPTIONS, GET, HEAD, PROPFIND, PROPPATCH, MKCOL, PUT, DELETE, COPY, MOVE, LOCK, UNLOCK\r\n" +
                                "Accept-Ranges: bytes\r\n" +
                                "Content-Length: 0\r\n" +
                                "Connection: close\r\n\r\n";
                        sendResponse(os, optionsResp);
                        break;
                    }

                    case "PROPFIND": {
                        if (!targetFile.exists()) {
                            sendResponse(os, "HTTP/1.1 404 Not Found\r\nContent-Length: 0\r\nConnection: close\r\n\r\n");
                            break;
                        }
                        String xml = buildPropfindXml(rawUri, targetFile, rootDir, depth);
                        byte[] xmlBytes = xml.getBytes(StandardCharsets.UTF_8);
                        String propResp = "HTTP/1.1 207 Multi-Status\r\n" +
                                "Content-Type: application/xml; charset=\"utf-8\"\r\n" +
                                "Content-Length: " + xmlBytes.length + "\r\n" +
                                "Connection: close\r\n\r\n";
                        os.write(propResp.getBytes(StandardCharsets.UTF_8));
                        os.write(xmlBytes);
                        os.flush();
                        break;
                    }

                    case "GET":
                    case "HEAD": {
                        if (!targetFile.exists()) {
                            sendResponse(os, "HTTP/1.1 404 Not Found\r\nContent-Length: 0\r\nConnection: close\r\n\r\n");
                            break;
                        }
                        if (targetFile.isDirectory()) {
                            String html = buildDirectoryHtml(rawUri, targetFile, rootDir);
                            byte[] htmlBytes = html.getBytes(StandardCharsets.UTF_8);
                            String getResp = "HTTP/1.1 200 OK\r\n" +
                                    "Content-Type: text/html; charset=\"utf-8\"\r\n" +
                                    "Content-Length: " + htmlBytes.length + "\r\n" +
                                    "Connection: close\r\n\r\n";
                            os.write(getResp.getBytes(StandardCharsets.UTF_8));
                            if (!"HEAD".equalsIgnoreCase(method)) {
                                os.write(htmlBytes);
                            }
                            os.flush();
                            break;
                        }

                        long fileLength = targetFile.length();
                        String mimeType = getMimeType(targetFile.getName());
                        String fileResp = "HTTP/1.1 200 OK\r\n" +
                                "Content-Type: " + mimeType + "\r\n" +
                                "Content-Length: " + fileLength + "\r\n" +
                                "Last-Modified: " + formatHttpDate(targetFile.lastModified()) + "\r\n" +
                                "Accept-Ranges: bytes\r\n" +
                                "Connection: close\r\n\r\n";
                        os.write(fileResp.getBytes(StandardCharsets.UTF_8));
                        if (!"HEAD".equalsIgnoreCase(method)) {
                            FileInputStream fis = new FileInputStream(targetFile);
                            byte[] buf = new byte[65536];
                            int read;
                            while ((read = fis.read(buf)) != -1) {
                                os.write(buf, 0, read);
                            }
                            fis.close();
                        }
                        os.flush();
                        break;
                    }

                    case "PUT": {
                        File parent = targetFile.getParentFile();
                        if (parent != null && !parent.exists()) {
                            parent.mkdirs();
                        }
                        FileOutputStream fos = new FileOutputStream(targetFile);
                        byte[] buffer = new byte[65536];
                        long remaining = contentLength;
                        if (contentLength >= 0) {
                            while (remaining > 0) {
                                int toRead = (int) Math.min(buffer.length, remaining);
                                int r = is.read(buffer, 0, toRead);
                                if (r == -1) break;
                                fos.write(buffer, 0, r);
                                remaining -= r;
                            }
                        } else {
                            int r;
                            while ((r = is.read(buffer)) != -1) {
                                fos.write(buffer, 0, r);
                            }
                        }
                        fos.flush();
                        fos.close();

                        try {
                            MediaScannerConnection.scanFile(MainActivity.this, new String[]{targetFile.getAbsolutePath()}, null, null);
                        } catch (Exception ignored) {}

                        sendResponse(os, "HTTP/1.1 201 Created\r\nContent-Length: 0\r\nConnection: close\r\n\r\n");
                        break;
                    }

                    case "MKCOL": {
                        boolean created = targetFile.mkdirs();
                        if (created || targetFile.exists()) {
                            sendResponse(os, "HTTP/1.1 201 Created\r\nContent-Length: 0\r\nConnection: close\r\n\r\n");
                        } else {
                            sendResponse(os, "HTTP/1.1 403 Forbidden\r\nContent-Length: 0\r\nConnection: close\r\n\r\n");
                        }
                        break;
                    }

                    case "DELETE": {
                        if (!targetFile.exists()) {
                            sendResponse(os, "HTTP/1.1 404 Not Found\r\nContent-Length: 0\r\nConnection: close\r\n\r\n");
                            break;
                        }
                        deleteRecursively(targetFile);
                        try {
                            MediaScannerConnection.scanFile(MainActivity.this, new String[]{targetFile.getAbsolutePath()}, null, null);
                        } catch (Exception ignored) {}
                        sendResponse(os, "HTTP/1.1 204 No Content\r\nContent-Length: 0\r\nConnection: close\r\n\r\n");
                        break;
                    }

                    case "MOVE": {
                        if (!targetFile.exists()) {
                            sendResponse(os, "HTTP/1.1 404 Not Found\r\nContent-Length: 0\r\nConnection: close\r\n\r\n");
                            break;
                        }
                        if (destination == null || destination.isEmpty()) {
                            sendResponse(os, "HTTP/1.1 400 Bad Request\r\nContent-Length: 0\r\nConnection: close\r\n\r\n");
                            break;
                        }
                        String destPath = destination;
                        if (destPath.contains("://")) {
                            destPath = destPath.substring(destPath.indexOf("://") + 3);
                            if (destPath.contains("/")) {
                                destPath = destPath.substring(destPath.indexOf("/"));
                            }
                        }
                        String cleanDest = URLDecoder.decode(destPath, "UTF-8").replace('\\', '/');
                        if (cleanDest.startsWith("/")) cleanDest = cleanDest.substring(1);
                        File destFile = new File(rootDir, cleanDest);

                        if (destFile.exists()) {
                            if (!overwrite) {
                                sendResponse(os, "HTTP/1.1 412 Precondition Failed\r\nContent-Length: 0\r\nConnection: close\r\n\r\n");
                                break;
                            }
                            deleteRecursively(destFile);
                        }

                        File destParent = destFile.getParentFile();
                        if (destParent != null && !destParent.exists()) {
                            destParent.mkdirs();
                        }

                        boolean moved = targetFile.renameTo(destFile);
                        if (moved) {
                            try {
                                MediaScannerConnection.scanFile(MainActivity.this, new String[]{targetFile.getAbsolutePath(), destFile.getAbsolutePath()}, null, null);
                            } catch (Exception ignored) {}
                            sendResponse(os, "HTTP/1.1 201 Created\r\nContent-Length: 0\r\nConnection: close\r\n\r\n");
                        } else {
                            sendResponse(os, "HTTP/1.1 500 Internal Server Error\r\nContent-Length: 0\r\nConnection: close\r\n\r\n");
                        }
                        break;
                    }

                    case "LOCK": {
                        String lockToken = "urn:uuid:12345678-1111-2222-3333-123456789abc";
                        String lockXml = "<?xml version=\"1.0\" encoding=\"utf-8\" ?>\r\n" +
                                "<D:prop xmlns:D=\"DAV:\">\r\n" +
                                "  <D:lockdiscovery>\r\n" +
                                "    <D:activelock>\r\n" +
                                "      <D:locktype><D:write/></D:locktype>\r\n" +
                                "      <D:lockscope><D:exclusive/></D:lockscope>\r\n" +
                                "      <D:depth>0</D:depth>\r\n" +
                                "      <D:timeout>Second-3600</D:timeout>\r\n" +
                                "      <D:locktoken><D:href>" + lockToken + "</D:href></D:locktoken>\r\n" +
                                "      <D:lockroot><D:href>" + escapeXml(rawUri) + "</D:href></D:lockroot>\r\n" +
                                "    </D:activelock>\r\n" +
                                "  </D:lockdiscovery>\r\n" +
                                "</D:prop>";
                        byte[] lockBytes = lockXml.getBytes(StandardCharsets.UTF_8);
                        String lockResp = "HTTP/1.1 200 OK\r\n" +
                                "Lock-Token: <" + lockToken + ">\r\n" +
                                "Content-Type: application/xml; charset=\"utf-8\"\r\n" +
                                "Content-Length: " + lockBytes.length + "\r\n" +
                                "Connection: close\r\n\r\n";
                        os.write(lockResp.getBytes(StandardCharsets.UTF_8));
                        os.write(lockBytes);
                        os.flush();
                        break;
                    }

                    case "UNLOCK": {
                        sendResponse(os, "HTTP/1.1 204 No Content\r\nContent-Length: 0\r\nConnection: close\r\n\r\n");
                        break;
                    }

                    case "PROPPATCH": {
                        String patchXml = "<?xml version=\"1.0\" encoding=\"utf-8\" ?>\r\n" +
                                "<D:multistatus xmlns:D=\"DAV:\">\r\n" +
                                "  <D:response>\r\n" +
                                "    <D:href>" + escapeXml(rawUri) + "</D:href>\r\n" +
                                "    <D:propstat>\r\n" +
                                "      <D:status>HTTP/1.1 200 OK</D:status>\r\n" +
                                "    </D:propstat>\r\n" +
                                "  </D:response>\r\n" +
                                "</D:multistatus>";
                        byte[] patchBytes = patchXml.getBytes(StandardCharsets.UTF_8);
                        String patchResp = "HTTP/1.1 207 Multi-Status\r\n" +
                                "Content-Type: application/xml; charset=\"utf-8\"\r\n" +
                                "Content-Length: " + patchBytes.length + "\r\n" +
                                "Connection: close\r\n\r\n";
                        os.write(patchResp.getBytes(StandardCharsets.UTF_8));
                        os.write(patchBytes);
                        os.flush();
                        break;
                    }

                    default:
                        sendResponse(os, "HTTP/1.1 501 Not Implemented\r\nContent-Length: 0\r\nConnection: close\r\n\r\n");
                        break;
                }
            } catch (Exception ignored) {
            } finally {
                try { socket.close(); } catch (Exception ignored) {}
            }
        }

        private void sendResponse(OutputStream os, String response) throws Exception {
            os.write(response.getBytes(StandardCharsets.UTF_8));
            os.flush();
        }

        private synchronized String formatHttpDate(long ms) {
            return rfc1123.format(new Date(ms));
        }

        private void deleteRecursively(File file) {
            if (file.isDirectory()) {
                File[] children = file.listFiles();
                if (children != null) {
                    for (File c : children) {
                        deleteRecursively(c);
                    }
                }
            }
            file.delete();
        }

        private String buildPropfindXml(String requestUri, File target, File root, int depth) {
            StringBuilder sb = new StringBuilder();
            sb.append("<?xml version=\"1.0\" encoding=\"utf-8\" ?>\r\n");
            sb.append("<D:multistatus xmlns:D=\"DAV:\">\r\n");

            appendResourceNode(sb, requestUri, target, root);

            if (depth > 0 && target.isDirectory()) {
                File[] list = target.listFiles();
                if (list != null) {
                    for (File child : list) {
                        if (child.getName().startsWith(".")) continue;
                        String childUri = requestUri;
                        if (!childUri.endsWith("/")) childUri += "/";
                        childUri += Uri.encode(child.getName());
                        if (child.isDirectory()) childUri += "/";
                        appendResourceNode(sb, childUri, child, root);
                    }
                }
            }

            sb.append("</D:multistatus>");
            return sb.toString();
        }

        private void appendResourceNode(StringBuilder sb, String href, File file, File root) {
            boolean isDir = file.isDirectory();
            String name = file.equals(root) ? "VanCross Storage" : file.getName();
            sb.append("  <D:response>\r\n");
            sb.append("    <D:href>").append(escapeXml(href)).append("</D:href>\r\n");
            sb.append("    <D:propstat>\r\n");
            sb.append("      <D:prop>\r\n");
            sb.append("        <D:displayname>").append(escapeXml(name)).append("</D:displayname>\r\n");
            if (isDir) {
                sb.append("        <D:resourcetype><D:collection/></D:resourcetype>\r\n");
            } else {
                sb.append("        <D:resourcetype/>\r\n");
                sb.append("        <D:getcontentlength>").append(file.length()).append("</D:getcontentlength>\r\n");
                sb.append("        <D:getcontenttype>").append(getMimeType(file.getName())).append("</D:getcontenttype>\r\n");
            }
            sb.append("        <D:getlastmodified>").append(formatHttpDate(file.lastModified())).append("</D:getlastmodified>\r\n");
            sb.append("        <D:supportedlock>\r\n");
            sb.append("          <D:lockentry>\r\n");
            sb.append("            <D:lockscope><D:exclusive/></D:lockscope>\r\n");
            sb.append("            <D:locktype><D:write/></D:locktype>\r\n");
            sb.append("          </D:lockentry>\r\n");
            sb.append("        </D:supportedlock>\r\n");
            sb.append("      </D:prop>\r\n");
            sb.append("      <D:status>HTTP/1.1 200 OK</D:status>\r\n");
            sb.append("    </D:propstat>\r\n");
            sb.append("  </D:response>\r\n");
        }

        private String buildDirectoryHtml(String uri, File dir, File root) {
            StringBuilder sb = new StringBuilder();
            sb.append("<!DOCTYPE html><html><head><meta charset=\"utf-8\"><title>VanCross WebDAV Storage</title>");
            sb.append("<style>body{font-family:sans-serif;background:#18181b;color:#f4f4f5;padding:20px;}a{color:#38bdf8;text-decoration:none;}ul{list-style:none;padding:0;}li{padding:8px 0;border-bottom:1px solid #27272a;}</style></head><body>");
            sb.append("<h2>📂 VanCross Storage: ").append(escapeXml(uri)).append("</h2>");
            sb.append("<ul>");
            if (!dir.equals(root)) {
                sb.append("<li><a href='../'>⬅ [Folder Induk]</a></li>");
            }
            File[] files = dir.listFiles();
            if (files != null) {
                Arrays.sort(files, (a, b) -> {
                    if (a.isDirectory() && !b.isDirectory()) return -1;
                    if (!a.isDirectory() && b.isDirectory()) return 1;
                    return a.getName().compareToIgnoreCase(b.getName());
                });
                for (File f : files) {
                    if (f.getName().startsWith(".")) continue;
                    String link = Uri.encode(f.getName()) + (f.isDirectory() ? "/" : "");
                    String icon = f.isDirectory() ? "📁 " : "📄 ";
                    String size = f.isDirectory() ? "" : " (" + f.length() + " bytes)";
                    sb.append("<li>").append(icon).append("<a href='").append(link).append("'>").append(escapeXml(f.getName())).append("</a>").append(size).append("</li>");
                }
            }
            sb.append("</ul></body></html>");
            return sb.toString();
        }

        private String escapeXml(String text) {
            if (text == null) return "";
            return text.replace("&", "&amp;")
                       .replace("<", "&lt;")
                       .replace(">", "&gt;")
                       .replace("\"", "&quot;")
                       .replace("'", "&apos;");
        }

        private String getMimeType(String name) {
            String lower = name.toLowerCase(Locale.US);
            if (lower.endsWith(".mp4")) return "video/mp4";
            if (lower.endsWith(".mkv")) return "video/x-matroska";
            if (lower.endsWith(".webm")) return "video/webm";
            if (lower.endsWith(".mov")) return "video/quicktime";
            if (lower.endsWith(".avi")) return "video/x-msvideo";
            if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
            if (lower.endsWith(".png")) return "image/png";
            if (lower.endsWith(".gif")) return "image/gif";
            if (lower.endsWith(".webp")) return "image/webp";
            if (lower.endsWith(".pdf")) return "application/pdf";
            if (lower.endsWith(".zip")) return "application/zip";
            if (lower.endsWith(".txt")) return "text/plain";
            if (lower.endsWith(".mp3")) return "audio/mpeg";
            if (lower.endsWith(".wav")) return "audio/wav";
            return "application/octet-stream";
        }
    }

}
