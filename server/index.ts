import "dotenv/config";
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";

process.on("uncaughtException", (err) => {
  console.error("💥 UNCAUGHT EXCEPTION:", err);
});

process.on("unhandledRejection", (err) => {
  console.error("💥 UNHANDLED REJECTION:", err);
});

const app = express();

app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PATCH", "PUT", "DELETE"],
  credentials: true
}));

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: "*" },
  transports: ["websocket"],
});
export { io };

const activeDrivers: Record<
  number,
  { lat: number; lng: number; socketId: string }
> = {};

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}
app.get("/api/health", (req, res) => {
  res.status(200).json({
    status: "healthy",
    uptime: process.uptime(),
  });
});

app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  try {
    console.log("🚀 Starting server...");

    await registerRoutes(httpServer, app);

    console.log("✅ Routes registered");
  } catch (err) {
    console.error("❌ CRASH BEFORE START:", err);
    process.exit(1);
  }

  app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    console.error("Internal Server Error:", err);

    if (res.headersSent) {
      return next(err);
    }

    return res.status(status).json({ message });
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (process.env.NODE_ENV === "production") {
  serveStatic(app);


} else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.

  io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id);

  // ✅ ADD THIS BLOCK
  socket.on("register-user", (userId) => {
    socket.join(`user-${userId}`);
    console.log("Passenger registered in room:", userId);
  });

  // EXISTING CODE (KEEP)
  socket.on("register-driver", (driverId) => {
    socket.join(`driver-${driverId}`);
    console.log("Driver registered in room:", driverId);
  });

    socket.on("driver-location", (data) => {
      activeDrivers[data.driverId] = {
        lat: data.lat,
        lng: data.lng,
        socketId: socket.id,
      };

      io.emit("update-driver-location", {
        driverId: data.driverId,
        lat: data.lat,
        lng: data.lng,
      });
    });

    socket.on("disconnect", () => {
  console.log("Socket disconnected:", socket.id);

  // ✅ remove driver from activeDrivers
  for (const driverId in activeDrivers) {
    if (activeDrivers[driverId].socketId === socket.id) {
      delete activeDrivers[driverId];
      console.log("Removed inactive driver:", driverId);
    }
  }
});
  });

  function calculateDistance(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number,
  ) {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  function findNearestDriver(pickupLat: number, pickupLng: number) {
    let nearestDriver = null;
    let minDistance = Infinity;

    for (const driverId in activeDrivers) {
      const driver = activeDrivers[driverId];

      const distance = calculateDistance(
        pickupLat,
        pickupLng,
        driver.lat,
        driver.lng,
      );

      if (distance < minDistance) {
        minDistance = distance;
        nearestDriver = driverId;
      }
    }

    return nearestDriver;
  }

  function sendRideToNearestDriver(ride: any) {
    const driverId = findNearestDriver(ride.pickupLat, ride.pickupLng);

    if (!driverId) {
      console.log("No drivers available");
      return;
    }

    const driver = activeDrivers[driverId];

    if (!driver) return;

    io.to(driver.socketId).emit("new-ride-request", ride);

    console.log("Ride sent to driver:", driverId);
  }

  const port = Number(process.env.PORT) || 3000;

try {
  httpServer.listen(port, () => {
    log(`serving on port ${port}`);
  });
} catch (err) {
  console.error("💥 SERVER START CRASH:", err);
}
})();
