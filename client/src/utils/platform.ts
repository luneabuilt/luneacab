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
// 🔔 PUSH TOKEN (WORKS BOTH)
// =========================
export const setupPush = async (userId: number, baseUrl: string) => {
  try {
    // 📱 MOBILE APP
    if (isNative()) {
      const perm = await PushNotifications.requestPermissions();

      if (perm.receive !== "granted") {
        console.log("Push denied");
        return;
      }

      await PushNotifications.register();

      PushNotifications.addListener("registration", async (token) => {
        console.log("🔥 FCM TOKEN:", token.value);

        await fetch(`${baseUrl}/api/users/${userId}/push-token`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: token.value }),
        });
      });

      PushNotifications.addListener("pushNotificationReceived", (notification) => {
  console.log("🔔 Foreground Notification:", notification);

  alert(
    notification.title + "\n" + notification.body
  );
});

      return;
    }

    // 🌐 WEB (your existing system)
    const permission = await Notification.requestPermission();

    if (permission !== "granted") return;

    const registration = await navigator.serviceWorker.register(
      "/firebase-messaging-sw.js"
    );

    const { getMessaging, getToken } = await import("firebase/messaging");
    const { default: app } = await import("@/lib/firebase");

    const messaging = getMessaging(app);

    const token = await getToken(messaging, {
      vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
      serviceWorkerRegistration: registration,
    });

    console.log("🔥 WEB TOKEN:", token);

    await fetch(`${baseUrl}/api/users/${userId}/push-token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
    navigator.serviceWorker.addEventListener("message", (event) => {
  const data = event.data;

  if (data?.notification) {
    alert(data.notification.title + "\n" + data.notification.body);
  }
});

  } catch (err) {
    console.error("Push setup error:", err);
  }
};