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
  bike: { base: 12, rate: 9, minimum: 25, commissionPercent: 8 },
  auto: { base: 18, rate: 13, minimum: 50, commissionPercent: 10 },
  car: { base: 30, rate: 21, minimum: 75, commissionPercent: 11 },
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
        assignedDriverId: null,
        driverQueue: null,
        queueIndex: 0,
      });

      // 🚀 SEND SOCKET EVENT TO FIRST DRIVER

      // 🚀 Send ride to the nearest driver first (fast dispatch)

      if (nearestDrivers.length > 0) {
  const firstDriver = nearestDrivers[0] as any;

  io.to(`driver-${firstDriver.id}`).emit("new-ride-request", newRide);

  if (firstDriver.pushToken) {
    (messaging as any)
  .send({
        token: firstDriver.pushToken,
        notification: {
          title: "🚕 New Ride Request",
          body: `Pickup ${input.distanceKm} km trip • Fare ₹${fare}`,
        },
        data: {
          rideId: newRide.id.toString(),
        },
      } as any)
      .catch((err: any) => {
        console.error("Push send error:", err);
      });
  }
}

      // 🚨 AUTO CANCEL IF NO DRIVER ACCEPTS (120 seconds)
      setTimeout(async () => {
        const ride = await storage.getRide(newRide.id);

        if (!ride) return;

        if (ride && ride.status === "requested") {
          console.log("Ride auto cancelled after 120 seconds");

          await storage.updateRide(newRide.id, {
            status: "cancelled",
          });
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
    res.json(ride || null);
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
      if (updatedRide && updatedRide.passengerId) {
  io.to(`user-${updatedRide.passengerId}`).emit("ride-accepted", updatedRide);
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

      if (!allowedTransitions[ride.status]?.includes(input.status)) {
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

      if (!["requested", "accepted"].includes(ride.status)) {
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
