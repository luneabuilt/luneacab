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
    // 📱 MOBILE APP
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

    // ✅ Push permission (REQUIRED)
    const perm = await PushNotifications.requestPermissions();

    if (perm.receive !== "granted") {
      console.log("Push permission denied");
      return;
    }

    // ✅ Local notification permission (VERY IMPORTANT)
    await LocalNotifications.requestPermissions();

    // ✅ Register device
    await PushNotifications.register();

    // 🔥 Prevent duplicate listeners
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

    // ❌ ERROR HANDLING
    PushNotifications.addListener("registrationError", (err) => {
      console.error("❌ Registration error:", err);
    });

    // =========================
    // 🔔 SHOW NOTIFICATION (FIX)
    // =========================
    PushNotifications.addListener(
      "pushNotificationReceived",
      async (notification) => {
        console.log("🔔 PUSH RECEIVED:", notification);

        // 🔥 FORCE SYSTEM NOTIFICATION
        await LocalNotifications.schedule({
          notifications: [
            {
              id: Date.now(),
              title: notification.title || "New Ride Request",
              body: notification.body || "",
              schedule: { at: new Date(Date.now() + 100) },
              sound: "default",
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

          // 👉 Later: auto navigate or accept
        }
      }
    );

  } catch (err) {
    console.error("Push setup error:", err);
  }
};