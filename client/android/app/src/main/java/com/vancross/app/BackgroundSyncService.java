package com.vancross.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.os.Build;
import android.os.IBinder;
import android.os.PowerManager;
import android.net.wifi.WifiManager;
import androidx.core.app.NotificationCompat;

public class BackgroundSyncService extends Service {
    public static final String CHANNEL_ID = "encross_background_channel";
    public static final int NOTIFICATION_ID = 2002;
    public static final String ACTION_STOP_SERVICE = "com.vancross.app.STOP_BACKGROUND_SERVICE";

    private PowerManager.WakeLock wakeLock = null;
    private WifiManager.WifiLock wifiLock = null;

    @Override
    public void onCreate() {
        super.onCreate();
        createNotificationChannel();
        acquireWakeLock();
        acquireWifiLock();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null && ACTION_STOP_SERVICE.equals(intent.getAction())) {
            stopForeground(true);
            stopSelf();
            return START_NOT_STICKY;
        }

        Notification notification = createNotification();

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC);
        } else {
            startForeground(NOTIFICATION_ID, notification);
        }

        return START_STICKY;
    }

    private void acquireWakeLock() {
        try {
            PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
            if (pm != null && wakeLock == null) {
                wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "ENCross:BackgroundSyncWakeLock");
                wakeLock.setReferenceCounted(false);
                wakeLock.acquire(24 * 60 * 60 * 1000L); // Safeguard 24h
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private void releaseWakeLock() {
        try {
            if (wakeLock != null && wakeLock.isHeld()) {
                wakeLock.release();
                wakeLock = null;
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private void acquireWifiLock() {
        try {
            WifiManager wm = (WifiManager) getApplicationContext().getSystemService(Context.WIFI_SERVICE);
            if (wm != null && wifiLock == null) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    wifiLock = wm.createWifiLock(WifiManager.WIFI_MODE_FULL_LOW_LATENCY, "ENCross:BackgroundSyncWifiLock");
                } else {
                    wifiLock = wm.createWifiLock(WifiManager.WIFI_MODE_FULL_HIGH_PERF, "ENCross:BackgroundSyncWifiLock");
                }
                wifiLock.setReferenceCounted(false);
                wifiLock.acquire();
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private void releaseWifiLock() {
        try {
            if (wifiLock != null && wifiLock.isHeld()) {
                wifiLock.release();
                wifiLock = null;
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                "ENCross Layanan Latar Belakang",
                NotificationManager.IMPORTANCE_LOW
            );
            channel.setDescription("Menjaga koneksi LAN dan transfer file ENCross tetap berjalan di latar belakang");
            channel.setShowBadge(false);

            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) {
                manager.createNotificationChannel(channel);
            }
        }
    }

    private Notification createNotification() {
        Intent openIntent = new Intent(this, MainActivity.class);
        openIntent.setAction(Intent.ACTION_MAIN);
        openIntent.addCategory(Intent.CATEGORY_LAUNCHER);
        openIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);

        PendingIntent openPendingIntent = PendingIntent.getActivity(
            this,
            0,
            openIntent,
            Build.VERSION.SDK_INT >= Build.VERSION_CODES.M ? PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT : PendingIntent.FLAG_UPDATE_CURRENT
        );

        Intent stopIntent = new Intent(this, BackgroundSyncService.class);
        stopIntent.setAction(ACTION_STOP_SERVICE);
        PendingIntent stopPendingIntent = PendingIntent.getService(
            this,
            1,
            stopIntent,
            Build.VERSION.SDK_INT >= Build.VERSION_CODES.M ? PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT : PendingIntent.FLAG_UPDATE_CURRENT
        );

        return new NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("ENCross Aktif di Latar Belakang")
            .setContentText("Siap terhubung, transfer file, dan sinkronisasi LAN")
            .setSmallIcon(getApplicationInfo().icon)
            .setOngoing(true)
            .setContentIntent(openPendingIntent)
            .addAction(android.R.drawable.ic_menu_close_clear_cancel, "Hentikan", stopPendingIntent)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setCategory(NotificationCompat.CATEGORY_SERVICE)
            .build();
    }

    @Override
    public void onDestroy() {
        releaseWakeLock();
        releaseWifiLock();
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
