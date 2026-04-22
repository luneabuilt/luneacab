import { Capacitor } from "@capacitor/core";
import { Geolocation } from "@capacitor/geolocation";
import { PushNotifications } from "@capacitor/push-notifications";
import { LocalNotifications } from "@capacitor/local-notifications";

// ✅ Detect platform
export const isNative = () => Capacitor.isNativePlatform();

// =========================
// 📍 LOCATION (WORKS BOTH)
// =========================
export const getLocation = async () => {
  try {
    if (isNative()) {
      const perm = await Geolocation.requestPermissions();

      if (perm.location !== "granted") {
        throw new Error("Location permission denied");
      }

      const position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
      });

      return {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      };
    }

    // 🌐 WEB
    return new Promise<{ lat: number; lng: number }>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          resolve({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          });
        },
        (err) => reject(err),
        { enableHighAccuracy: true }
      );
    });
  } catch (err) {
    console.error("Location error:", err);
    return null;
  }
};

// =========================
// 🔔 PUSH (MOBILE ONLY)
// =========================
export const setupPush = async (userId: number, baseUrl: string) => {
  try {
    if (!isNative()) return;

    // =========================
    // 🔐 PERMISSIONS
    // =========================
    const perm = await PushNotifications.requestPermissions();
    console.log("🔐 Push permission:", perm);

    if (perm.receive !== "granted") {
      alert("Enable notification permission from settings");
      return;
    }

    await LocalNotifications.requestPermissions();

    // =========================
    // 🔔 CREATE CHANNEL (CRITICAL FIX)
    // =========================
    await LocalNotifications.createChannel({
      id: "default",
      name: "Default Notifications",
      description: "Ride alerts",
      importance: 5, // 🔥 HIGH PRIORITY
      visibility: 1,
    });

    // =========================
    // 📲 REGISTER DEVICE
    // =========================
    await PushNotifications.register();

    await PushNotifications.removeAllListeners();

    // =========================
    // 🔥 TOKEN REGISTER
    // =========================
    PushNotifications.addListener("registration", async (token) => {
      console.log("🔥 FCM TOKEN:", token.value);

      await fetch(`${baseUrl}/api/users/${userId}/push-token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: token.value }),
      });
    });

    PushNotifications.addListener("registrationError", (err) => {
      console.error("❌ Registration error:", err);
    });

    // =========================
    // 🔔 FORCE POPUP (MAIN FIX)
    // =========================
    PushNotifications.addListener(
      "pushNotificationReceived",
      async (notification) => {
        console.log("🔔 PUSH RECEIVED:", notification);

        await LocalNotifications.schedule({
          notifications: [
            {
              id: Date.now(),
              title: notification.title || "🚕 New Ride Request",
              body: notification.body || "",
              schedule: { at: new Date(Date.now() + 100) },
              sound: "default",
              smallIcon: "ic_launcher",
              channelId: "default", // 🔥 MUST MATCH CHANNEL
              extra: notification.data,
            },
          ],
        });
      }
    );

    // =========================
    // 📲 CLICK HANDLER
    // =========================
    PushNotifications.addListener(
      "pushNotificationActionPerformed",
      (action) => {
        console.log("📲 Notification clicked:", action);

        const rideId = action.notification.data?.rideId;

        if (rideId) {
          console.log("🚕 Ride ID:", rideId);
        }
      }
    );

  } catch (err) {
    console.error("Push setup error:", err);
  }
};