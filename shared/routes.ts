import { z } from "zod";
import { insertUserSchema, insertRideSchema, users, rides } from "./schema";

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

export const api = {
  users: {
    // Register or get user after Firebase Auth
    sync: {
      method: "POST" as const,
      path: "/api/users/sync" as const,
      input: z.object({
        firebaseUid: z.string(),
        phone: z.string(),
      }),
      responses: {
        200: z.custom<typeof users.$inferSelect>(),
        201: z.custom<typeof users.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    get: {
      method: "GET" as const,
      path: "/api/users/:id" as const,
      responses: {
        200: z.custom<typeof users.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    updateProfile: {
      method: "PUT" as const,
      path: "/api/users/:id" as const,
      input: insertUserSchema.partial(),
      responses: {
        200: z.custom<typeof users.$inferSelect>(),
        400: errorSchemas.validation,
        404: errorSchemas.notFound,
      },
    },
    updateLocation: {
      method: "PATCH" as const,
      path: "/api/users/:id/location" as const,
      input: z.object({
        lat: z.number(),
        lng: z.number(),
      }),
      responses: {
        200: z.custom<typeof users.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    toggleOnline: {
      method: "PATCH" as const,
      path: "/api/users/:id/online" as const,
      input: z.object({
        isOnline: z.boolean(),
        lat: z.number().optional(),
        lng: z.number().optional(),
      }),
      responses: {
        200: z.custom<typeof users.$inferSelect>(),
      },
    },
    nearestDrivers: {
      method: "GET" as const,
      path: "/api/drivers/nearest" as const,
      input: z
        .object({
          lat: z.string(),
          lng: z.string(),
          vehicleType: z.string(),
        })
        .optional(), // handled via query params
      responses: {
        200: z.array(z.custom<typeof users.$inferSelect>()),
      },
    },
  },
  rides: {
    request: {
      method: "POST" as const,
      path: "/api/rides" as const,
      input: insertRideSchema,
      responses: {
        201: z.custom<typeof rides.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    get: {
      method: "GET" as const,
      path: "/api/rides/:id" as const,
      responses: {
        200: z.custom<typeof rides.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    getActiveForUser: {
      method: "GET" as const,
      path: "/api/users/:userId/active-ride" as const,
      responses: {
        200: z.custom<typeof rides.$inferSelect>().nullable(),
      },
    },
    accept: {
      method: "PATCH" as const,
      path: "/api/rides/:id/accept" as const,
      input: z.object({
        driverId: z.number(),
      }),
      responses: {
        200: z.custom<typeof rides.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    updateStatus: {
      method: "PATCH" as const,
      path: "/api/rides/:id/status" as const,
      input: z.object({
        status: z.enum([
          "requested",
          "accepted",
          "arrived",
          "ongoing",
          "payment_pending",
          "completed",
          "cancelled",
        ]),
        paymentMethod: z.enum(["upi", "cash"]).optional(),
      }),
      responses: {
        200: z.custom<typeof rides.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    confirmPayment: {
      method: "PATCH" as const,
      path: "/api/rides/:id/payment" as const,
      input: z.object({
        role: z.enum(["passenger", "driver"]),
      }),
      responses: {
        200: z.custom<typeof rides.$inferSelect>(),
      },
    },
  },
};

export function buildUrl(
  path: string,
  params?: Record<string, string | number>,
): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
