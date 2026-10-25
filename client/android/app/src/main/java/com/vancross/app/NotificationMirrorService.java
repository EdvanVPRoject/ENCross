package com.vancross.app;

import android.service.notification.NotificationListenerService;
import android.service.notification.StatusBarNotification;
import android.app.Notification;
import android.os.Bundle;

public class NotificationMirrorService extends NotificationListenerService {
    public interface NotificationCallback {
        void onNotificationPosted(String appName, String title, String text, String packageName);
    }

    private static NotificationCallback sCallback = null;

    public static void setCallback(NotificationCallback callback) {
        sCallback = callback;
    }

    @Override
    public void onNotificationPosted(StatusBarNotification sbn) {
        if (sbn == null || sCallback == null) return;
        try {
            String packageName = sbn.getPackageName();
            if (packageName != null && (packageName.contains("vancross") || packageName.contains("encross") || packageName.equals("android"))) {
                return; // Ignore own notifications
            }

            Notification notification = sbn.getNotification();
            if (notification == null) return;
            Bundle extras = notification.extras;
            if (extras == null) return;

            String title = extras.getString(Notification.EXTRA_TITLE);
            CharSequence textChars = extras.getCharSequence(Notification.EXTRA_TEXT);
            String text = textChars != null ? textChars.toString() : "";

            if ((title != null && !title.trim().isEmpty()) || (text != null && !text.trim().isEmpty())) {
                String appName = packageName;
                try {
                    appName = getPackageManager().getApplicationLabel(getPackageManager().getApplicationInfo(packageName, 0)).toString();
                } catch (Exception ignored) {}

                sCallback.onNotificationPosted(appName, title != null ? title : "", text, packageName != null ? packageName : "");
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
