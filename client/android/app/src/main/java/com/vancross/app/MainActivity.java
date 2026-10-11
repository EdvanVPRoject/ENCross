package com.vancross.app;

import android.graphics.Color;
import android.media.MediaScannerConnection;
import android.os.Bundle;
import android.os.Environment;
import android.util.Base64;
import android.webkit.JavascriptInterface;
import android.widget.Toast;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;
import com.getcapacitor.BridgeActivity;
import java.io.File;
import java.io.FileOutputStream;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Dark status bar and navigation bar matching dark theme
        getWindow().setStatusBarColor(Color.parseColor("#09090b"));
        getWindow().setNavigationBarColor(Color.parseColor("#09090b"));
        findViewById(android.R.id.content).setBackgroundColor(Color.parseColor("#09090b"));

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

                    // Refresh Android MediaStore/Gallery so new files appear immediately
                    MediaScannerConnection.scanFile(
                        MainActivity.this,
                        new String[]{targetFile.getAbsolutePath()},
                        null,
                        null
                    );

                    final String folderName = (subfolder != null && !subfolder.trim().isEmpty())
                            ? "Downloads/ENCross/" + subfolder.trim()
                            : "Downloads/ENCross";

                    runOnUiThread(new Runnable() {
                        @Override
                        public void run() {
                            Toast.makeText(MainActivity.this, "Disimpan di " + folderName + "/" + fileName, Toast.LENGTH_SHORT).show();
                        }
                    });

                    return true;
                } catch (Exception e) {
                    e.printStackTrace();
                    return false;
                }
            }
        }, "AndroidDownloader");
    }

    @Override
    public void onBackPressed() {
        if (this.getBridge() != null && this.getBridge().getWebView() != null) {
            this.getBridge().getWebView().evaluateJavascript(
                "(function() { return (window.__handleAndroidBack && window.__handleAndroidBack()) ? 'true' : 'false'; })()",
                value -> {
                    if (value != null && value.contains("true")) {
                        // Back press was consumed by active modal, drawer, or stream
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

