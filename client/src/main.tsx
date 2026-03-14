import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);

// 🔔 Register service worker for push notifications
if ("serviceWorker" in navigator) {
  navigator.serviceWorker
    .register("/firebase-messaging-sw.js")
    .then((registration) => {
      console.log("Service Worker registered:", registration);
    })
    .catch((err) => {
      console.log("Service Worker registration failed:", err);
    });
}
