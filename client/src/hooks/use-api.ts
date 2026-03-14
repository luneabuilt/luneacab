import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { User, Ride, InsertRide } from "@shared/schema";
import { useAuth } from "./use-auth";
import { useToast } from "./use-toast";

// --- Users ---
export function useUser(id?: number) {
  return useQuery({
    queryKey: [api.users.get.path, id],
    queryFn: async () => {
      if (!id) return null;
      const url = buildUrl(api.users.get.path, { id });
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch user");
      return (await res.json()) as User;
    },
    enabled: !!id,
  });
}

export function useSyncUser() {
  const { setUser } = useAuth();
  return useMutation({
    mutationFn: async (data: { firebaseUid: string; phone: string }) => {
      const res = await fetch(`/api/users/sync`, {
        method: api.users.sync.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Sync failed");
      return (await res.json()) as User;
    },
    onSuccess: (user) => {
      setUser(user);
    },
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const { user, setUser } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: Partial<User>) => {
      if (!user) throw new Error("Not logged in");
      const url = buildUrl(api.users.updateProfile.path, { id: user.id });
      const res = await fetch(url, {
        method: api.users.updateProfile.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Update failed");
      return (await res.json()) as User;
    },
    onSuccess: (updatedUser) => {
      setUser(updatedUser);
      queryClient.invalidateQueries({
        queryKey: [api.users.get.path, updatedUser.id],
      });
      toast({
        title: "Profile updated",
        description: "Your changes have been saved.",
      });
    },
  });
}

export function useNearestDrivers(
  lat?: string,
  lng?: string,
  vehicleType?: string,
) {
  return useQuery({
    queryKey: [api.users.nearestDrivers.path, lat, lng, vehicleType],
    queryFn: async () => {
      if (!lat || !lng) return [];
      const queryParams = new URLSearchParams({
        lat,
        lng,
        ...(vehicleType ? { vehicleType } : {}),
      });
      const res = await fetch(
        `${api.users.nearestDrivers.path}?${queryParams}`,
      );
      if (!res.ok) throw new Error("Failed to fetch drivers");
      return (await res.json()) as User[];
    },
    enabled: !!lat && !!lng && false,
    refetchInterval: false,
  });
}

export function useToggleOnline() {
  const queryClient = useQueryClient();
  const { user, setUser } = useAuth();

  return useMutation({
    mutationFn: async (isOnline: boolean) => {
      if (!user) throw new Error("Not logged in");

      let lat: number | undefined;
      let lng: number | undefined;

      if (isOnline) {
        const position = await new Promise<GeolocationPosition>(
          (resolve, reject) =>
            navigator.geolocation.getCurrentPosition(resolve, reject),
        );
        lat = position.coords.latitude;
        lng = position.coords.longitude;
      }

      const url = buildUrl(api.users.toggleOnline.path, { id: user.id });

      const res = await fetch(url, {
        method: api.users.toggleOnline.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isOnline,
          lat,
          lng,
        }),
      });

      if (!res.ok) throw new Error("Toggle failed");

      return (await res.json()) as User;
    },
    onSuccess: (updatedUser) => {
      setUser(updatedUser);
      queryClient.invalidateQueries({
        queryKey: [api.users.get.path, updatedUser.id],
      });
    },
  });
}

// --- Rides ---
export function useRequestRide() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: InsertRide) => {
      const res = await fetch(api.rides.request.path, {
        method: api.rides.request.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Ride request failed");
      return (await res.json()) as Ride;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: [api.rides.getActiveForUser.path, variables.passengerId],
      });
      toast({
        title: "Ride Requested",
        description: "Looking for nearby drivers...",
      });
    },
  });
}

export function useActiveRide(userId?: number) {
  return useQuery({
    queryKey: [api.rides.getActiveForUser.path, userId],
    queryFn: async () => {
      if (!userId) return null;

      const url = buildUrl(api.rides.getActiveForUser.path, { userId });

      const res = await fetch(url);

      if (!res.ok) {
        throw new Error("Failed to fetch active ride");
      }

      return res.json();
    },
    enabled: !!userId,
    refetchInterval: 3000,
    refetchOnWindowFocus: false,
    staleTime: 10000,
  });
}

export function useAcceptRide() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      rideId,
      driverId,
    }: {
      rideId: number;
      driverId: number;
    }) => {
      const url = buildUrl(api.rides.accept.path, { id: rideId });
      const res = await fetch(url, {
        method: api.rides.accept.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ driverId }),
      });
      if (!res.ok) throw new Error("Failed to accept ride");
      return (await res.json()) as Ride;
    },
    onSuccess: (updatedRide) => {
      queryClient.invalidateQueries({
        queryKey: ["active-ride"],
      });

      toast({
        title: "Ride Accepted",
        description: "Head to the pickup location.",
      });
    },
  });
}

export function useUpdateRideStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      rideId,
      status,
      paymentMethod,
    }: {
      rideId: number;
      status: string;
      paymentMethod?: string;
    }) => {
      const url = buildUrl(api.rides.updateStatus.path, { id: rideId });
      const res = await fetch(url, {
        method: api.rides.updateStatus.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, paymentMethod }),
      });

      if (!res.ok) throw new Error("Failed to update status");

      return (await res.json()) as Ride;
    },

    onSuccess: (updatedRide) => {
      // 🔥 THIS IS THE CORRECT INVALIDATION
      queryClient.invalidateQueries({
        queryKey: ["active-ride"],
      });
    },
  });
}
// --- Ride History ---
export function useRideHistory(userId?: number) {
  return useQuery({
    queryKey: ["ride-history", userId],
    queryFn: async () => {
      if (!userId) return [];

      const res = await fetch(`/api/users/${userId}/rides`);
      if (!res.ok) throw new Error("Failed to fetch history");

      return res.json();
    },
    enabled: !!userId,
  });
}
