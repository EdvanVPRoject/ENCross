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
import android.provider.Settings;
import android.util.Base64;
import android.util.DisplayMetrics;
import android.webkit.JavascriptInterface;
import android.widget.Toast;
import androidx.core.content.ContextCompat;
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

public class MainActivity extends BridgeActivity {
    private static final int REQUEST_MEDIA_PROJECTION = 2001;

    private MediaProjectionManager projectionManager;
    private MediaProjection mediaProjection;
    private VirtualDisplay virtualDisplay;
    private ImageReader imageReader;
    private HandlerThread captureThread;
    private Handler captureHandler;
    private volatile boolean isCapturingScreen = false;
    private volatile boolean isDispatchingFrame = false;
    private long lastFrameTime = 0;
    private Ringtone alarmRingtone = null;
    private Vibrator phoneVibrator = null;
    private BroadcastReceiver batteryReceiver = null;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Dark status bar and navigation bar matching dark theme
        getWindow().setStatusBarColor(Color.parseColor("#09090b"));
        getWindow().setNavigationBarColor(Color.parseColor("#09090b"));
        findViewById(android.R.id.content).setBackgroundColor(Color.parseColor("#09090b"));

        // Native Downloader & Device Info Bridge
        this.getBridge().getWebView().addJavascriptInterface(new Object() {
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
        }, "AndroidDownloader");

        // Native Remote Two-Way File System Bridge
        this.getBridge().getWebView().addJavascriptInterface(new Object() {
            @JavascriptInterface
            public boolean hasStoragePermission() {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                    return Environment.isExternalStorageManager();
                } else {
                    return ContextCompat.checkSelfPermission(MainActivity.this, android.Manifest.permission.READ_EXTERNAL_STORAGE) == android.content.pm.PackageManager.PERMISSION_GRANTED;
                }
            }

            @JavascriptInterface
            public void requestStoragePermission() {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                    try {
                        Intent intent = new Intent(Settings.ACTION_MANAGE_APP_ALL_FILES_ACCESS_PERMISSION);
                        intent.setData(Uri.parse("package:" + getPackageName()));
                        startActivity(intent);
                    } catch (Exception e) {
                        try {
                            Intent intent = new Intent(Settings.ACTION_MANAGE_ALL_FILES_ACCESS_PERMISSION);
                            startActivity(intent);
                        } catch (Exception ex) {
                            ex.printStackTrace();
                        }
                    }
                }
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
        if (isCapturingScreen) {
            // Keep WebView rendering active during background screen mirroring
            return;
        }
        super.onPause();
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
        stopScreenCaptureInternal();
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
                    runOnUiThread(() -> MainActivity.super.onBackPressed());
                }
            );
            return;
        }
        super.onBackPressed();
    }
}


