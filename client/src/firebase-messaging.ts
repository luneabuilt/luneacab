import { getMessaging, getToken } from "firebase/messaging";
import app from "./lib/firebase";

const messaging = getMessaging(app);

export async function getFCMToken() {
  try {
    const token = await getToken(messaging, {
      vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
    });

    return token;
  } catch (error) {
    console.error("FCM Token error:", error);
    return null;
  }
}