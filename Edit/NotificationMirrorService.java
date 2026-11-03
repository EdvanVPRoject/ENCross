package com.vancross.app;

import android.service.notification.NotificationListenerService;
import android.service.notification.StatusBarNotification;
import android.app.Notification;
import android.app.RemoteInput;
import android.content.Context;
import android.content.Intent;
import android.os.Bundle;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

public class NotificationMirrorService extends NotificationListenerService {
    public interface NotificationCallback {
        void onNotificationPosted(String key, String appName, String title, String text, String packageName, boolean canReply);
    }

    private static class ReplyActionHolder {
        final Notification.Action action;
        final RemoteInput remoteInput;

        ReplyActionHolder(Notification.Action action, RemoteInput remoteInput) {
            this.action = action;
            this.remoteInput = remoteInput;
        }
    }

    private static NotificationCallback sCallback = null;
    private static final Map<String, ReplyActionHolder> sReplyActions = new ConcurrentHashMap<>();

    public static void setCallback(NotificationCallback callback) {
        sCallback = callback;
    }

    public static boolean replyToNotification(Context context, String key, String replyText) {
        if (key == null || replyText == null || context == null) return false;
        ReplyActionHolder holder = sReplyActions.get(key);
        if (holder == null || holder.action == null || holder.remoteInput == null) return false;

        try {
            Intent intent = new Intent();
            Bundle bundle = new Bundle();
            bundle.putCharSequence(holder.remoteInput.getResultKey(), replyText);
            RemoteInput.addResultsToIntent(new RemoteInput[]{holder.remoteInput}, intent, bundle);
            holder.action.actionIntent.send(context, 0, intent);
            return true;
        } catch (Exception e) {
            e.printStackTrace();
            return false;
        }
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

                String notifKey = sbn.getKey();
                boolean canReply = false;

                // Check for Quick Reply action (e.g. WhatsApp, SMS, Telegram)
                if (notification.actions != null && notifKey != null) {
                    for (Notification.Action action : notification.actions) {
                        if (action.getRemoteInputs() != null) {
                            for (RemoteInput ri : action.getRemoteInputs()) {
                                if (ri.getAllowFreeFormInput()) {
                                    sReplyActions.put(notifKey, new ReplyActionHolder(action, ri));
                                    canReply = true;
                                    break;
                                }
                            }
                        }
                        if (canReply) break;
                    }
                }

                sCallback.onNotificationPosted(
                    notifKey != null ? notifKey : "",
                    appName,
                    title != null ? title : "",
                    text,
                    packageName != null ? packageName : "",
                    canReply
                );
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    @Override
    public void onNotificationRemoved(StatusBarNotification sbn) {
        if (sbn != null && sbn.getKey() != null) {
            sReplyActions.remove(sbn.getKey());
        }
    }
}
