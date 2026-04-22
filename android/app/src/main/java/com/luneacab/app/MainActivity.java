package com.luneacab.app;

import android.os.Bundle;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.os.Build;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

  @Override
  public void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);

    createNotificationChannel();
  }

  private void createNotificationChannel() {
  if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {

    NotificationChannel channel = new NotificationChannel(
      "default",
      "Default Channel",
      NotificationManager.IMPORTANCE_HIGH
    );

    channel.setDescription("Ride Notifications");

    // 🔥 ADD THESE (CRITICAL FOR POPUP)
    channel.enableLights(true);
    channel.enableVibration(true);
    channel.setVibrationPattern(new long[]{0, 500, 500, 500});
    channel.setLockscreenVisibility(android.app.Notification.VISIBILITY_PUBLIC);

    NotificationManager manager = getSystemService(NotificationManager.class);
    manager.createNotificationChannel(channel);
  }
}
}