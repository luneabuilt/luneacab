package com.luneacab.app;

import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;

import android.app.NotificationManager;
import android.app.NotificationChannel;
import android.os.Build;

import androidx.core.app.NotificationCompat;

public class MyFirebaseService extends FirebaseMessagingService {

  @Override
  public void onMessageReceived(RemoteMessage remoteMessage) {

    String title = remoteMessage.getNotification().getTitle();
    String body = remoteMessage.getNotification().getBody();

    NotificationCompat.Builder builder = new NotificationCompat.Builder(this, "default")
      .setSmallIcon(R.drawable.ic_stat_notify) // 🔥 THIS FIXES YOUR ISSUE
      .setContentTitle(title)
      .setContentText(body)
      .setPriority(NotificationCompat.PRIORITY_HIGH);

    NotificationManager manager = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
    manager.notify(1, builder.build());
  }
}