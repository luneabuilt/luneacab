import { io } from "socket.io-client";

const SOCKET_URL = import.meta.env.PROD
  ? "https://luneacab-production.up.railway.app"
  : "http://192.168.1.42:3000";

export const socket = io(SOCKET_URL, {
  transports: ["websocket"], // force websocket only (no polling)
  autoConnect: true,

  reconnection: true,
  reconnectionAttempts: 5, // stop infinite reconnect loop
  reconnectionDelay: 5000, // wait 5 seconds before retry
  timeout: 20000, // prevent quick reconnect spam
});
