import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { messaging } from "./firebase-admin";
import { io } from "./index";

async function requireAuth(req: any, res: any, next: any) {
  const userId = req.headers["x-user-id"];

  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const user = await storage.getUser(Number(userId));

  if (!user) {
    return res.status(401).json({ message: "Invalid user" });
  }

  req.user = user;
  next();
}
function requireAdmin(req: any, res: any, next: any) {
  if (!req.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Forbidden - Admin Only" });
  }

  next();
}
// 🔥 VEHICLE PRICING CONFIG (Editable Anytime)
const vehiclePricing: Record<
  string,
  { base: number; rate: number; minimum: number; commissionPercent: number }
> = {
  bike: { base: 12, rate: 7.5, minimum: 25, commissionPercent: 8.5 },
  auto: { base: 18, rate: 12, minimum: 50, commissionPercent: 9.5 },
  car: { base: 30, rate: 20, minimum: 90, commissionPercent: 10.5 },
};
function calculateFare(distanceKm: number, vehicleType: string) {
  const pricing = vehiclePricing[vehicleType];

  if (!pricing) {
    throw new Error("Invalid vehicle type");
  }

  let fare = pricing.base + distanceKm * pricing.rate;

  if (fare < pricing.minimum) {
    fare = pricing.minimum;
  }

  const commission = (fare * pricing.commissionPercent) / 100;
  const driverEarning = fare - commission;

  return {
    fare: fare.toFixed(2),
    commission: commission.toFixed(2),
    driverEarning: driverEarning.toFixed(2),
  };
}

// Haversine formula to calculate distance between two coordinates
function getDistanceFromLatLonInKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
) {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) *
      Math.cos(deg2rad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in km
  return d;
}

function deg2rad(deg: number) {
  return deg * (Math.PI / 180);
}
// 🔥 DRIVER LOOP SYSTEM (GLOBAL)
async function dispatchToNextDriver(rideId: number) {
  try {
const ride = await storage.getRide(rideId);
if (!ride) return;

// 🔥 STOP DISPATCH if ride is no longer valid
if (ride.status !== "requested") {
  console.log("⛔ Dispatch stopped (ride not requested):", ride.status);
  return;
}

    let queue: number[] = [];

try {
  queue = JSON.parse(ride.driverQueue || "[]");
} catch {
  queue = [];
}
    let currentIndex = ride.queueIndex ?? 0;
    console.log("🚀 Dispatching ride:", rideId);
console.log("👉 Queue:", queue);
console.log("👉 Current Index:", currentIndex);

if (currentIndex >= queue.length) {
  console.log("❌ No more drivers available for ride:", rideId);

  // 🔥 AUTO CANCEL + NOTIFY PASSENGER
await storage.updateRide(rideId, {
  status: "cancelled",
});

  const updatedRide = await storage.getRide(rideId);

  if (updatedRide?.passengerId) {
    io.to(`user-${updatedRide.passengerId}`).emit("ride-updated", updatedRide);
  }

  return;
}

    const driverId = queue[currentIndex];
    console.log("🎯 Trying driver:", driverId);
    const driver = await storage.getUser(driverId);
    if (!driver?.isOnline) {
  await storage.updateRide(rideId, {
    queueIndex: currentIndex + 1,
  });

  return dispatchToNextDriver(rideId);
}

    // 🔥 SOCKET (real-time)
io.to(`driver-${driverId}`).emit("new-ride-request", ride);

// 🔥 PUSH NOTIFICATION (NEW)
if (driver?.pushToken) {
  (messaging as any)
    .send({
      token: driver.pushToken,
      notification: {
        title: "🚕 New Ride Request",
        body: `New trip • Fare ₹${ride.fare}`,
      },
      data: {
  rideId: ride.id.toString(),
},
    })
    .catch((err: any) => {
      console.error("Push send error:", err);
    });
}

    console.log("Sent to driver:", driverId);

    setTimeout(async () => {
  const updatedRide = await storage.getRide(rideId);
if (!updatedRide) return;

// 🔥 STOP if ride already handled
if (updatedRide.status !== "requested") {
  console.log("⛔ Timeout stopped, ride already handled:", updatedRide.status);
  return;
}

// 🔥 STOP if index already moved (reject happened)
if ((updatedRide.queueIndex ?? 0) !== currentIndex) return;

  await storage.updateRide(rideId, {
    queueIndex: currentIndex + 1,
  });

  dispatchToNextDriver(rideId);
}, 10000);

  } catch (err) {
    console.error("Dispatch error:", err);
  }
}

export async function registerRoutes(
  httpServer: Server,
  app: Express,
): Promise<Server> {
  // 🔥 Attach user from x-user-id header
  app.use(async (req: any, res, next) => {
    const userId = req.headers["x-user-id"];

    if (userId) {
      const user = await storage.getUser(Number(userId));
      req.user = user;
    }

    next();
  });
  // -- Users API --
  app.post("/api/users/:id/push-token", async (req, res) => {
    try {
      const userId = Number(req.params.id);
      const { token } = req.body;

      await storage.updateUser(userId, {
        pushToken: token,
      });

      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ message: "Failed to save push token" });
    }
  });
  app.post(api.users.sync.path, async (req, res) => {
    try {
      const input = api.users.sync.input.parse(req.body);

      let user = await storage.getUserByFirebaseUid(input.firebaseUid);

      if (!user) {
        // Create new user
        const ADMIN_PHONE = "+91YOURNUMBER";

user = await storage.createUser({
  firebaseUid: input.firebaseUid,
  phone: input.phone,
  name: "New User",
  role: input.phone === ADMIN_PHONE ? "admin" : "passenger",
});
        res.status(201).json(user);
      } else {
  const ADMIN_PHONE = "+91YOURNUMBER";

  if (user.phone === ADMIN_PHONE && user.role !== "admin") {
    user = await storage.updateUser(user.id, { role: "admin" });
  }

  res.status(200).json(user);
}
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join("."),
        });
      }
      throw err;
    }
  });

  app.get(api.users.get.path, async (req, res) => {
    const user = await storage.getUser(Number(req.params.id));
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  });

  app.put(api.users.updateProfile.path, async (req, res) => {
    try {
      const input = api.users.updateProfile.input.parse(req.body);
      const user = await storage.updateUser(Number(req.params.id), input);
      if (!user) return res.status(404).json({ message: "User not found" });
      res.json(user);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join("."),
        });
      }
      throw err;
    }
  });

  app.patch(api.users.updateLocation.path, async (req, res) => {
    try {
      const input = api.users.updateLocation.input.parse(req.body);
      const user = await storage.updateUser(Number(req.params.id), {
        currentLat: (input.lat ?? "").toString(),
currentLng: (input.lng ?? "").toString(),
      });
      if (!user) return res.status(404).json({ message: "User not found" });
      res.json(user);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join("."),
        });
      }
      throw err;
    }
  });

  app.patch(api.users.toggleOnline.path, async (req, res) => {
    try {
      const input = api.users.toggleOnline.input.parse(req.body);
      const user = await storage.updateUser(Number(req.params.id), {
        isOnline: input.isOnline,
        currentLat: input.lat ? input.lat.toString() : null,
currentLng: input.lng ? input.lng.toString() : null,
      });
      if (!user) return res.status(404).json({ message: "User not found" });
      res.json(user);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join("."),
        });
      }
      throw err;
    }
  });

  app.get("/api/admin/stats", requireAuth, requireAdmin, async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      const rides = await storage.getAllRides();

      const totalUsers = users.length;
      const totalDrivers = users.filter((u) => u.role === "driver").length;
      const totalPassengers = users.filter(
        (u) => u.role === "passenger",
      ).length;

      const completedRides = rides.filter((r) => r.status === "completed");

      const totalCompleted = completedRides.length;

      const totalCommission = completedRides.reduce(
        (sum, r) => sum + Number(r.commission || 0),
        0,
      );

      res.json({
        totalUsers,
        totalDrivers,
        totalPassengers,
        totalCompleted,
        totalCommission,
      });
    } catch (err) {
      console.error("ADMIN ERROR:", err);
      res.status(500).json({ message: "Admin stats error" });
    }
  });

  app.get(
    "/api/admin/revenue-daily",
    requireAuth,
    requireAdmin,
    async (req, res) => {
      try {
        const rides = await storage.getAllRides();

        const completed = rides.filter((r) => r.status === "completed");

        const grouped: Record<string, number> = {};

        completed.forEach((ride) => {
          const date = new Date(ride.createdAt ?? new Date()).toLocaleDateString();

          if (!grouped[date]) grouped[date] = 0;

          grouped[date] += Number(ride.commission || 0);
        });

        const result = Object.entries(grouped).map(([date, revenue]) => ({
          date,
          revenue,
        }));

        res.json(result);
      } catch (err) {
        console.error("Revenue error:", err);
        res.status(500).json({ message: "Revenue error" });
      }
    },
  );

  app.get("/api/admin/rides", requireAuth, requireAdmin, async (req, res) => {
    try {
      const rides = await storage.getAllRides();
      res.json(rides);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch rides" });
    }
  });

  app.get(api.users.nearestDrivers.path, async (req, res) => {
    try {
      const lat = parseFloat(req.query.lat as string);
      const lng = parseFloat(req.query.lng as string);
      const vehicleType = req.query.vehicleType as string;

      if (isNaN(lat) || isNaN(lng) || !vehicleType) {
        return res
          .status(400)
          .json({ message: "Missing required query parameters" });
      }

      const onlineDrivers = await storage.getOnlineDrivers(vehicleType);

      // Calculate distances
      const driversWithDistances = onlineDrivers.map((driver) => {
        if (!driver.currentLat || !driver.currentLng)
          return { ...driver, distance: Infinity };

        const distance = getDistanceFromLatLonInKm(
          lat,
          lng,
          parseFloat((driver.currentLat ?? "0").toString()),
parseFloat((driver.currentLng ?? "0").toString()),
        );
        return { ...driver, distance };
      });

      // Sort by nearest
      driversWithDistances.sort((a, b) => a.distance - b.distance);

      // Remove distance property and return
      res.json(driversWithDistances.map(({ distance, ...rest }) => rest));
    } catch (err) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // -- Rides API --
  app.post(api.rides.request.path, async (req, res) => {
    try {
      const input = api.rides.request.input.parse(req.body);

      // find nearest drivers
      const onlineDrivers = await storage.getOnlineDrivers(input.vehicleType);

      // calculate distance
      const driversWithDistance = onlineDrivers
        .map((driver) => {
          if (!driver.currentLat || !driver.currentLng) return null;

          const distance = getDistanceFromLatLonInKm(
            Number(input.pickupLat),
            Number(input.pickupLng),
            Number(driver.currentLat ?? 0),
Number(driver.currentLng ?? 0),
          );

          // 🚀 Only consider drivers within 8km
          if (distance > 8) return null;

          return { ...driver, distance };
        })
        .filter(Boolean);

      // sort by nearest
      driversWithDistance.sort((a: any, b: any) => a.distance - b.distance);

      const nearestDrivers = driversWithDistance.slice(0, 5);
      // 🔥 STEP 1: CREATE DRIVER QUEUE
const driverQueueIds = nearestDrivers.map((d: any) => d.id);

      // calculate fare
      const { fare, commission, driverEarning } = calculateFare(
        parseFloat(input.distanceKm.toString()),
        input.vehicleType,
      );

      const generatedOtp = Math.floor(1000 + Math.random() * 9000).toString();

      const newRide = await storage.createRide({
        ...input,
        fare,
        commission,
        driverEarning,
        status: "requested",
        otp: generatedOtp,
        driverQueue: JSON.stringify(driverQueueIds),
        queueIndex: 0,
      });

      // 🚀 SEND SOCKET EVENT TO FIRST DRIVER

      // 🚀 Send ride to the nearest driver first (fast dispatch)

      if (nearestDrivers.length > 0) {
  // 🔥 START DISPATCH LOOP
dispatchToNextDriver(newRide.id);
}

      // 🚨 AUTO CANCEL IF NO DRIVER ACCEPTS (120 seconds)
      setTimeout(async () => {
        const ride = await storage.getRide(newRide.id);

        if (!ride) return;

if (ride && ride.status === "requested") {
  console.log("⏳ Global timeout triggered for ride:", newRide.id);
          console.log("Ride auto cancelled after 120 seconds");

          await storage.updateRide(newRide.id, {
            status: "cancelled",
          });
          const updatedRide = await storage.getRide(newRide.id);

if (updatedRide?.passengerId) {
  io.to(`user-${updatedRide.passengerId}`).emit("ride-updated", updatedRide);
}

if (updatedRide?.driverId) {
  io.to(`driver-${updatedRide.driverId}`).emit("ride-updated", updatedRide);
}
        }
      }, 120000);
      res.status(201).json(newRide);

      
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join("."),
        });
      }
      throw err;
    }
  });

  app.get("/api/rides/requested", async (req, res) => {
    try {
      const vehicleType = req.query.vehicleType as string;
      const driverId = Number(req.query.driverId);

      if (!vehicleType || !driverId) {
        return res.status(400).json({ message: "Missing parameters" });
      }

      const requestedRides = await storage.getRequestedRides(vehicleType);

      const filtered = requestedRides.filter(
        (ride: any) => ride.status === "requested"
      );

      res.json(filtered);
    } catch (err) {
      res.status(500).json({ message: "Server error" });
    }
  });
  app.get("/api/rides/estimate", async (req, res) => {
    try {
      const distanceKm = parseFloat(req.query.distanceKm as string);
      const vehicleType = req.query.vehicleType as string;

      if (!distanceKm || !vehicleType) {
        return res.status(400).json({ message: "Missing parameters" });
      }

      const { fare } = calculateFare(distanceKm, vehicleType);

      res.json({ fare });
    } catch (err) {
      res.status(500).json({ message: "Server error" });
    }
  });

  app.get(api.rides.get.path, async (req, res) => {
    const ride = await storage.getRide(Number(req.params.id));
    if (!ride) return res.status(404).json({ message: "Ride not found" });
    res.json(ride);
  });

  app.get(api.rides.getActiveForUser.path, async (req, res) => {
    const ride = await storage.getActiveRideForUser(Number(req.params.userId));

if (!ride) return res.json(null);

let driver = null;

if (ride.driverId) {
  const d = await storage.getUser(ride.driverId);
  if (d) {
    driver = {
      id: d.id,
      name: d.name,
      phone: d.phone,
      vehicleType: d.vehicleType,
      vehicleNumber: d.vehicleNumber,
    };
  }
}

res.json({
  ...ride,
  driver,
});
  });
  app.get("/api/users/:userId/rides", async (req, res) => {
    try {
      const userId = Number(req.params.userId);

      const rides = await storage.getCompletedRidesForUser(userId);

      res.json(rides);
    } catch (err) {
      res.status(500).json({ message: "Server error" });
    }
  });

  app.patch(api.rides.accept.path, async (req, res) => {
    try {
      const input = api.rides.accept.input.parse(req.body);

      const ride = await storage.getRide(Number(req.params.id));
      if (!ride) return res.status(404).json({ message: "Ride not found" });

      const activeRide = await storage.getActiveRideForUser(input.driverId);

      if (activeRide) {
        return res.status(400).json({
          message: "Driver already has an active ride",
        });
      }

      if (ride.status !== "requested" || ride.driverId) {
        return res.status(400).json({ message: "Ride already taken" });
      }

      const updatedRide = await storage.updateRide(Number(req.params.id), {
  driverId: input.driverId,
  status: "accepted",
});

// 🔥 GET DRIVER DETAILS
const driver = await storage.getUser(input.driverId);

// 🔥 ATTACH DRIVER TO RIDE
const rideWithDriver = {
  ...updatedRide,
  driver: driver
    ? {
        id: driver.id,
        name: driver.name,
        phone: driver.phone,
        vehicleType: driver.vehicleType,
        vehicleNumber: driver.vehicleNumber,
      }
    : null,
};

// 🔥 SEND TO PASSENGER + DRIVER
if (updatedRide?.passengerId) {
  io.to(`user-${updatedRide.passengerId}`).emit("ride-updated", rideWithDriver);
}

if (updatedRide?.driverId) {
  io.to(`driver-${updatedRide.driverId}`).emit("ride-updated", rideWithDriver);
}

res.json(rideWithDriver);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join("."),
        });
      }
      throw err;
    }
  });

  app.patch("/api/rides/:id/reject", async (req, res) => {
  try {
    const rideId = Number(req.params.id);
    const { driverId } = req.body;

    const ride = await storage.getRide(rideId);
    if (!ride) {
      return res.status(404).json({ message: "Ride not found" });
    }

    if (ride.status !== "requested") {
      return res.status(400).json({ message: "Ride not available" });
    }

    let queue: number[] = [];

    try {
      queue = JSON.parse(ride.driverQueue || "[]");
    } catch {
      queue = [];
    }

    let currentIndex = ride.queueIndex ?? 0;

    // ❌ If driver is not current → ignore
    if (queue[currentIndex] !== driverId) {
      return res.status(400).json({ message: "Not your turn" });
    }

    // 👉 Move to next driver immediately
    await storage.updateRide(rideId, {
      queueIndex: currentIndex + 1,
    });

    // 🔥 trigger next driver instantly
    dispatchToNextDriver(rideId);

    res.json({ success: true });

  } catch (err) {
    res.status(500).json({ message: "Reject error" });
  }
});

  app.patch(api.rides.updateStatus.path, async (req, res) => {
    try {
      const input = api.rides.updateStatus.input.parse(req.body);

      const ride = await storage.getRide(Number(req.params.id));
      if (!ride) {
        return res.status(404).json({ message: "Ride not found" });
      }

      // 🔥 STATUS TRANSITION GUARD
      const allowedTransitions: Record<string, string[]> = {
        requested: ["accepted", "cancelled"],
        accepted: ["arrived", "cancelled"],
        arrived: ["ongoing"],
        ongoing: ["payment_pending"],
        payment_pending: ["completed"],
        completed: [],
        cancelled: [],
      };

      if (!ride.status || !allowedTransitions[ride.status]?.includes(input.status)) {
        return res.status(400).json({
          message: `Invalid status transition from ${ride.status} to ${input.status}`,
        });
      }

      const updates: any = { status: input.status };

      if (input.paymentMethod) {
        updates.paymentMethod = input.paymentMethod;
      }

      const updatedRide = await storage.updateRide(
        Number(req.params.id),
        updates,
      );
      if (updatedRide && updatedRide.passengerId) {
  io.to(`user-${updatedRide.passengerId}`).emit("ride-updated", updatedRide);
}

      res.json(updatedRide);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join("."),
        });
      }
      throw err;
    }
  });

  app.patch(api.rides.confirmPayment.path, async (req, res) => {
    try {
      const input = api.rides.confirmPayment.input.parse(req.body);
      const rideId = Number(req.params.id);

      const ride = await storage.getRide(rideId);
      if (!ride) return res.status(404).json({ message: "Ride not found" });

      let customerPaid = ride.customerPaid || false;
      let driverConfirmed = ride.driverConfirmed || false;

      if (input.role === "passenger") {
        customerPaid = true;

        io.to(`driver-${ride.driverId}`).emit("passenger-paid", {
          rideId: rideId,
        });
      }

      if (input.role === "driver") {
        driverConfirmed = true;
      }

      let updates: any = {
        customerPaid,
        driverConfirmed,
      };

      // 🔥 If BOTH confirmed → complete ride

      if (ride.status !== "payment_pending") {
        return res.status(400).json({
          message: "Payment not allowed yet",
        });
      }

      if (customerPaid && driverConfirmed) {
        updates.status = "completed";

        // Add driver earnings
        if (ride.driverId) {
          const driver = await storage.getUser(ride.driverId);
          if (driver) {
            const currentEarnings = parseFloat(
              (driver.totalEarnings ?? "0").toString(),
            );

            const newEarnings =
              currentEarnings + parseFloat((ride.driverEarning ?? "0").toString());

            await storage.updateUser(ride.driverId, {
              totalEarnings: newEarnings.toString(),
            });
          }
        }
      }

      const updatedRide = await storage.updateRide(rideId, updates);

      res.json(updatedRide);
    } catch (err) {
      res.status(500).json({ message: "Server error" });
    }
  });

  app.patch("/api/rides/:id/verify-otp", async (req, res) => {
    try {
      const rideId = Number(req.params.id);
      const { otp } = req.body;

      const ride = await storage.getRide(rideId);
      if (!ride) {
        return res.status(404).json({ message: "Ride not found" });
      }

      if (ride.status !== "arrived") {
        return res
          .status(400)
          .json({ message: "Ride not ready for OTP verification" });
      }

      // 🔥 IMPORTANT: Convert both to string before comparing
      console.log("DB OTP:", ride.otp);
      console.log("Entered OTP:", otp);
      if (ride.otp?.toString() !== otp?.toString()) {
        return res.status(400).json({ message: "Invalid OTP" });
      }

      const updatedRide = await storage.updateRide(rideId, {
  status: "ongoing",
});

// 🔥🔥 ADD THIS (MOST IMPORTANT FIX)
if (updatedRide && updatedRide.passengerId) {
  io.to(`user-${updatedRide.passengerId}`).emit("ride-updated", updatedRide);
}

if (updatedRide && updatedRide.driverId) {
  io.to(`driver-${updatedRide.driverId}`).emit("ride-updated", updatedRide);
}

res.json(updatedRide);
    } catch (err) {
      res.status(500).json({ message: "Server error" });
    }
  });
  app.patch("/api/rides/:id/cancel", async (req, res) => {
    try {
      const rideId = Number(req.params.id);

      const ride = await storage.getRide(rideId);
      if (!ride) {
        return res.status(404).json({ message: "Ride not found" });
      }

      if (!["requested", "accepted"].includes((ride.status ?? ""))) {
        return res
          .status(400)
          .json({ message: "Ride cannot be cancelled now" });
      }

      const updatedRide = await storage.updateRide(rideId, {
        status: "cancelled",
      });

      res.json(updatedRide);
    } catch (err) {
      res.status(500).json({ message: "Server error" });
    }
  });
  return httpServer;
}
