package com.luneacab.app;

import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;

import android.app.NotificationManager;
import android.content.Context;

import androidx.core.app.NotificationCompat;

public class MyFirebaseService extends FirebaseMessagingService {

@Override
public void onMessageReceived(RemoteMessage remoteMessage) {

    String title = "New Ride";
    String body = "You have a new notification";

    // ✅ SAFE handling (VERY IMPORTANT)
    if (remoteMessage.getNotification() != null) {
        title = remoteMessage.getNotification().getTitle();
        body = remoteMessage.getNotification().getBody();
    }

    if (remoteMessage.getData().size() > 0) {
        if (remoteMessage.getData().get("title") != null) {
            title = remoteMessage.getData().get("title");
        }
        if (remoteMessage.getData().get("body") != null) {
            body = remoteMessage.getData().get("body");
        }
    }

    NotificationCompat.Builder builder =
        new NotificationCompat.Builder(getApplicationContext(), "default")
            .setSmallIcon(R.drawable.ic_stat_notify)
            .setContentTitle(title)
            .setContentText(body)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true);

    NotificationManager manager =
        (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);

    manager.notify((int) System.currentTimeMillis(), builder.build());
}
}