import { getMessaging, getToken } from "firebase/messaging";
import app from "./lib/firebase";

const messaging = getMessaging(app);

export async function getFCMToken() {
  try {
    // 🔥 Register your custom service worker
    const registration = await navigator.serviceWorker.register(
      "/firebase-messaging-sw.js"
    );

    const token = await getToken(messaging, {
      vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
      serviceWorkerRegistration: registration, // ✅ THIS FIXES EVERYTHING
    });

    return token;
  } catch (error) {
    console.error("FCM Token error:", error);
    return null;
  }
}