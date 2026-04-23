package com.luneacab.app;

import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;

import android.app.NotificationManager;
import android.content.Context;

import androidx.core.app.NotificationCompat;

public class MyFirebaseService extends FirebaseMessagingService {

  @Override
  public void onMessageReceived(RemoteMessage remoteMessage) {

    String title = remoteMessage.getNotification().getTitle();
    String body = remoteMessage.getNotification().getBody();

    NotificationCompat.Builder builder =
      new NotificationCompat.Builder(getApplicationContext(), "default")
        .setSmallIcon(R.drawable.ic_stat_notify)
        .setContentTitle(title)
        .setContentText(body)
        .setPriority(NotificationCompat.PRIORITY_HIGH);

    NotificationManager manager =
      (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);

    manager.notify(1, builder.build());
  }
}