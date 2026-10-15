package com.vancross.app;

import android.content.Context;
import android.content.Intent;
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
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.os.Handler;
import android.os.HandlerThread;
import android.util.Base64;
import android.util.DisplayMetrics;
import android.webkit.JavascriptInterface;
import android.widget.Toast;
import androidx.core.content.ContextCompat;
import com.getcapacitor.BridgeActivity;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.nio.ByteBuffer;

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
                    while (en.hasMoreElements()) {
                        java.net.NetworkInterface intf = en.nextElement();
                        java.util.Enumeration<java.net.InetAddress> enumIpAddr = intf.getInetAddresses();
                        while (enumIpAddr.hasMoreElements()) {
                            java.net.InetAddress inetAddress = enumIpAddr.nextElement();
                            if (!inetAddress.isLoopbackAddress() && inetAddress instanceof java.net.Inet4Address) {
                                return inetAddress.getHostAddress();
                            }
                        }
                    }
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

    @Override
    public void onDestroy() {
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
