import {
  pgTable,
  serial,
  integer,
  text,
  boolean,
  numeric,
  varchar,
  timestamp,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { index } from "drizzle-orm/pg-core";

// --- Enums ---
export const roleEnum = z.enum(["passenger", "driver", "admin"]);
export const vehicleTypeEnum = z.enum(["bike", "auto", "car"]);
export const rideStatusEnum = z.enum([
  "requested",
  "accepted",
  "arrived",
  "ongoing",
  "payment_pending",
  "completed",
  "cancelled",
]);
export const paymentMethodEnum = z.enum(["upi", "cash"]);

// --- Users Table ---
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  firebaseUid: text("firebase_uid").notNull().unique(), // Link to Firebase Auth
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  role: text("role").notNull().default("passenger"), // passenger | driver | admin
  vehicleType: text("vehicle_type"), // bike | auto | car (for drivers)
  vehicleNumber: text("vehicle_number"),
  isOnline: boolean("is_online").default(false),
  pushToken: text("push_token"),
  currentLat: numeric("current_lat"),
  currentLng: numeric("current_lng"),
  upiId: text("upi_id"),
  upiName: text("upi_name"),
  totalEarnings: numeric("total_earnings").default("0"),

  walletBalance: numeric("wallet_balance").default("0"),
  walletPaid: numeric("wallet_paid").default("0"),

  createdAt: timestamp("created_at").defaultNow(),
  licenseUrl: text("license_url"),
vehicleImageUrl: text("vehicle_image_url"),
profileImageUrl: text("profile_image_url"),
isApproved: boolean("is_approved").default(false),
});

// --- Rides Table ---
export const rides = pgTable("rides", {
  id: serial("id").primaryKey(),
  passengerId: integer("passenger_id").notNull(),
  driverId: integer("driver_id"), // Nullable initially until assigned
  assignedDriverId: integer("assigned_driver_id"),
  vehicleType: text("vehicle_type").notNull(),
  pickupLat: numeric("pickup_lat").notNull(),
  pickupLng: numeric("pickup_lng").notNull(),
  dropLat: numeric("drop_lat").notNull(),
  dropLng: numeric("drop_lng").notNull(),
  distanceKm: numeric("distance_km", { precision: 10, scale: 2 }).notNull(),
  fare: numeric("fare", { precision: 10, scale: 2 }).notNull(),
  commission: numeric("commission", { precision: 10, scale: 2 }).notNull(),
  driverEarning: numeric("driver_earning", {
    precision: 10,
    scale: 2,
  }).notNull(),
  status: varchar("status", { length: 30 }).default("requested"),
  otp: varchar("otp", { length: 10 }),
  paymentMethod: text("payment_method").default("cash"),
  customerPaid: boolean("customer_paid").default(false),
  driverConfirmed: boolean("driver_confirmed").default(false),
  driverQueue: text("driver_queue"),
  queueIndex: integer("queue_index").default(0),
  rejectedDrivers: text("rejected_drivers"),
  createdAt: timestamp("created_at").defaultNow(),
  pickupAddress: text("pickup_address"),
dropAddress: text("drop_address"),

  
});
// --- Schemas ---
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});
export const insertRideSchema = createInsertSchema(rides).omit({
  id: true,
  createdAt: true,
  customerPaid: true,
  driverConfirmed: true,
});

// --- Types ---
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Ride = typeof rides.$inferSelect;
export type InsertRide = z.infer<typeof insertRideSchema>;

// API Request Types
export type UpdateLocationRequest = { lat: number; lng: number };
export type AcceptRideRequest = { driverId: number };
export type CompleteRideRequest = { paymentMethod: string };
export type ConfirmPaymentRequest = { role: "passenger" | "driver" };
