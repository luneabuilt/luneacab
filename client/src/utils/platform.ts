import { Capacitor } from "@capacitor/core";
import { Geolocation } from "@capacitor/geolocation";
import { PushNotifications } from "@capacitor/push-notifications";

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
    // 📱 ONLY run on mobile
    if (!isNative()) return;

    // ✅ Ask permission
    const perm = await PushNotifications.requestPermissions();

    if (perm.receive !== "granted") {
      console.log("Push permission denied");
      return;
    }

    // ✅ Register device
    await PushNotifications.register();

    // 🔥 IMPORTANT: prevent duplicate listeners
    await PushNotifications.removeAllListeners();

    // 🔥 TOKEN REGISTER
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

    // 🔔 FOREGROUND NOTIFICATION
    PushNotifications.addListener(
      "pushNotificationReceived",
      (notification) => {
        console.log("🔔 Foreground Notification:", notification);

        alert(notification.title + "\n" + notification.body);
      }
    );

    // 📲 USER CLICKED NOTIFICATION
    PushNotifications.addListener(
      "pushNotificationActionPerformed",
      (action) => {
        console.log("📲 Notification clicked:", action);

        const rideId = action.notification.data?.rideId;

        if (rideId) {
          console.log("🚕 Ride ID from notification:", rideId);

          // 👉 You can later auto-accept or navigate here
        }
      }
    );
  } catch (err) {
    console.error("Push setup error:", err);
  }
};