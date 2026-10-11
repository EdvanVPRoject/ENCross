package com.vancross.app;

import android.media.MediaScannerConnection;
import android.os.Bundle;
import android.os.Environment;
import android.util.Base64;
import android.webkit.JavascriptInterface;
import android.widget.Toast;
import com.getcapacitor.BridgeActivity;
import java.io.File;
import java.io.FileOutputStream;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        this.getBridge().getWebView().addJavascriptInterface(new Object() {
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
}

