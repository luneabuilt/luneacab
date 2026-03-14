import { db } from "./db";
import {
  users,
  rides,
  type InsertUser,
  type InsertRide,
  type User,
  type Ride,
  roleEnum,
  vehicleTypeEnum,
  rideStatusEnum,
  paymentMethodEnum,
} from "@shared/schema";
import { eq, and, or, inArray, desc } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByFirebaseUid(uid: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(
    id: number,
    updates: Partial<InsertUser>,
  ): Promise<User | undefined>;
  getOnlineDrivers(vehicleType: string): Promise<User[]>;

  // Rides
  getRide(id: number): Promise<Ride | undefined>;
  getActiveRideForUser(userId: number): Promise<Ride | undefined>;
  createRide(ride: InsertRide): Promise<Ride>;
  updateRide(
    id: number,
    updates: Partial<InsertRide>,
  ): Promise<Ride | undefined>;
}

export class DatabaseStorage implements IStorage {
  // --- Users ---
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }


  async getAllUsers() {
    return await db.select().from(users);
  }
  
  async getUserByFirebaseUid(uid: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.firebaseUid, uid));
    return user;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [created] = await db.insert(users).values(user).returning();
    return created;
  }

  async updateUser(
    id: number,
    updates: Partial<InsertUser>,
  ): Promise<User | undefined> {
    const [updated] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, id))
      .returning();
    return updated;
  }

  async getOnlineDrivers(vehicleType: string): Promise<User[]> {
    return await db
      .select()
      .from(users)
      .where(
        and(
          eq(users.role, "driver"),
          eq(users.isOnline, true),
          eq(users.vehicleType, vehicleType),
        ),
      )
      .limit(50); // only check nearest 50 drivers
  }

  // --- Rides ---
  async getRide(id: number): Promise<Ride | undefined> {
    const [ride] = await db.select().from(rides).where(eq(rides.id, id));
    return ride;
  }

  async getActiveRideForUser(userId: number): Promise<Ride | undefined> {
    const activeStatuses = [
      "requested",
      "accepted",
      "arrived",
      "ongoing",
      "payment_pending",
    ];

    const [ride] = await db
      .select()
      .from(rides)
      .where(
        and(
          or(eq(rides.passengerId, userId), eq(rides.driverId, userId)),
          inArray(rides.status, activeStatuses),
        ),
      )
      .limit(1);

    return ride;
  }

  async getAllRides() {
    return await db.select().from(rides);
  }

  async getRequestedRides(vehicleType: string) {
    return await db
      .select()
      .from(rides)
      .where(
        and(eq(rides.status, "requested"), eq(rides.vehicleType, vehicleType)),
      );
  }

  async createRide(ride: InsertRide): Promise<Ride> {
    const [created] = await db.insert(rides).values(ride).returning();
    return created;
  }

  async updateRide(
    id: number,
    updates: Partial<InsertRide>,
  ): Promise<Ride | undefined> {
    const [updated] = await db
      .update(rides)
      .set(updates)
      .where(eq(rides.id, id))
      .returning();
    return updated;
  }

  async getCompletedRidesForUser(userId: number) {
    return await db
      .select()
      .from(rides)
      .where(
        and(
          eq(rides.status, "completed"),
          or(eq(rides.passengerId, userId), eq(rides.driverId, userId)),
        ),
      )
      .orderBy(desc(rides.createdAt));
  }
}

export const storage = new DatabaseStorage();
