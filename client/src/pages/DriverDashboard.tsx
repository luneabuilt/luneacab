import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import {
  useToggleOnline,
  useActiveRide,
  useAcceptRide,
  useUpdateRideStatus,
} from "@/hooks/use-api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import Map from "@/components/Map";
import { useToast } from "@/hooks/use-toast";
import { Power } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { getFCMToken } from "@/firebase-messaging";
import { socket } from "@/lib/socket";

const rideAlertSound = new Audio(
  "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3",
);

// Helper for coordinates

export default function DriverDashboard() {
  const { user } = useAuth();
  const { data: activeRide, refetch } = useActiveRide(user?.id);

  useEffect(() => {
    if (!user) return;

    socket.emit("register-driver", user.id);
  }, [user]);
  useEffect(() => {
    async function registerPushToken() {
      if (!user) return;
      await Notification.requestPermission();

      try {
        const token = await getFCMToken();

        if (!token) return;

        await fetch(`/api/users/${user.id}/push-token`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ token }),
        });

        console.log("Push token registered:", token);
      } catch (err) {
        console.error("Push registration error:", err);
      }
    }

    registerPushToken();
  }, [user]);
  const { toast } = useToast();

  // Mutations
  const toggleOnline = useToggleOnline();
  const acceptRide = useAcceptRide();
  const updateStatus = useUpdateRideStatus();

  // Polling for active rides assigned to this driver OR nearby requests (simulated)
  // In a real app, we'd use a separate hook to poll for 'requested' rides nearby
  const [incomingRequest, setIncomingRequest] = useState<any>(null);
  const [requestTimer, setRequestTimer] = useState<number>(10);
  const [enteredOtp, setEnteredOtp] = useState("");

  useEffect(() => {
    socket.on("new-ride-request", (ride) => {
      console.log("🚕 New ride received:", ride);

      setIncomingRequest(ride);

      rideAlertSound.play().catch(() => {});
    });

    return () => {
      socket.off("new-ride-request");
    };
  }, []);

  useEffect(() => {
    if (!navigator.serviceWorker) return;

    const handler = (event: any) => {
      if (event.data?.type === "ACCEPT_RIDE") {
        const rideId = event.data.rideId;

        acceptRide.mutate({
          rideId: rideId,
          driverId: user?.id,
        });
      }
    };

    navigator.serviceWorker.addEventListener("message", handler);

    return () => {
      navigator.serviceWorker.removeEventListener("message", handler);
    };
  }, [user]);

  useEffect(() => {
    socket.on("passenger-paid", (data) => {
      if (!activeRide) return;

      if (data.rideId !== activeRide.id) return;

      toast({
        title: "Passenger Paid",
        description: "Confirm payment to complete ride",
      });

      refetch();
    });

    return () => socket.off("passenger-paid");
  }, [activeRide]);

  const [routeCoords, setRouteCoords] = useState<any[]>([]);
  const [etaMinutes, setEtaMinutes] = useState<number | null>(null);
  const [distanceKm, setDistanceKm] = useState<number | null>(null);
  const [pickupDistanceKm, setPickupDistanceKm] = useState<number | null>(null);
  const [pickupName, setPickupName] = useState<string | null>(null);
  const [dropName, setDropName] = useState<string | null>(null);

  const [remainingDistance, setRemainingDistance] = useState<string | null>(
    null,
  );


  const [driverPosition, setDriverPosition] = useState<{
    lat: number;
    lng: number;
  } | null>(
    user?.currentLat && user?.currentLng
      ? {
          lat: Number(user.currentLat),
          lng: Number(user.currentLng),
        }
      : null,
  );

  useEffect(() => {
    if (!user || user.role !== "driver" || !user.isOnline) return;

    const interval = setInterval(
      () => {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const { latitude, longitude } = position.coords;

            setDriverPosition({
              lat: latitude,
              lng: longitude,
            });

            console.log("Driver live location:", latitude, longitude);
          },
          (error) => {
            console.error("GPS error:", error);
          },
          {
            enableHighAccuracy: true,
            maximumAge: 0,
            timeout: 5000,
          },
        );
      },
      activeRide ? 3000 : 10000,
    );

    return () => clearInterval(interval);
  }, [user, activeRide]);

  useEffect(() => {
    if (!incomingRequest) return;

    setRequestTimer(10);

    const timer = setInterval(() => {
      setRequestTimer((prev) => {
        if (prev <= 1) {
          setIncomingRequest(null);
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [incomingRequest?.id]);

  useEffect(() => {
    if (!driverPosition || !user?.id) return;

    const interval = setInterval(
      () => {
        socket.emit("driver-location", {
          driverId: user.id,
          lat: driverPosition.lat,
          lng: driverPosition.lng,
        });
      },
      activeRide ? 3000 : 10000,
    );

    return () => clearInterval(interval);
  }, [driverPosition, user, activeRide]);

  useEffect(() => {
    if (!activeRide || !driverPosition) return;

    let toLat: number | undefined;
    let toLng: number | undefined;

    if (activeRide.status === "accepted") {
      toLat = Number(activeRide.pickupLat);
      toLng = Number(activeRide.pickupLng);
    }

    if (activeRide.status === "ongoing") {
      toLat = Number(activeRide.dropLat);
      toLng = Number(activeRide.dropLng);
    }

    if (toLat === undefined || toLng === undefined) return;

    const fetchRoute = async () => {
      try {
        const res = await fetch(
          `https://router.project-osrm.org/route/v1/driving/${driverPosition.lng},${driverPosition.lat};${toLng},${toLat}?overview=full&geometries=geojson`,
        );

        const data = await res.json();

        if (data.routes?.length > 0) {
          const route = data.routes[0];

          const distanceKm = (route.distance / 1000).toFixed(2);
          const durationMin = Math.ceil(route.duration / 60);

          setRemainingDistance(distanceKm);

          const geometry = route.geometry.coordinates;

          setEtaMinutes(durationMin);
          setDistanceKm(Number(distanceKm));

          const formatted = geometry.map((coord: number[]) => [
            coord[1],
            coord[0],
          ]);

          setRouteCoords(formatted);
        }
      } catch (err) {
        console.error("Route fetch error:", err);
      }
    };

    fetchRoute();
  }, [
    activeRide?.status,
    activeRide?.pickupLat,
    activeRide?.pickupLng,
    activeRide?.dropLat,
    activeRide?.dropLng,
    driverPosition?.lat,
    driverPosition?.lng,
  ]);

  useEffect(() => {
    if (!activeRide) return;

    const fetchPlaceNames = async () => {
      try {
        const pickupRes = await fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${activeRide.pickupLat}&lon=${activeRide.pickupLng}&format=json`,
        );
        const pickupData = await pickupRes.json();
        setPickupName(pickupData.display_name);

        const dropRes = await fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${activeRide.dropLat}&lon=${activeRide.dropLng}&format=json`,
        );
        const dropData = await dropRes.json();
        setDropName(dropData.display_name);
      } catch (err) {
        console.error("Reverse geocode error:", err);
      }
    };

    fetchPlaceNames();
  }, [activeRide]);

  const handleGoOnline = (checked: boolean) => {
    toggleOnline.mutate(checked);
    if (!checked) setIncomingRequest(null);
  };

  const handleAccept = () => {
    if (!user || !incomingRequest) return;

    acceptRide.mutate({
      rideId: incomingRequest.id,
      driverId: user.id,
    });

    toast({
      title: "Ride Accepted",
      description: "Navigating to pickup...",
    });

    setIncomingRequest(null);
  };

  return (
    <div className="h-screen w-full relative flex flex-col bg-background">
      {activeRide && (
        <div className="absolute bottom-0 left-0 right-0 z-30 bg-white rounded-t-3xl shadow-2xl flex flex-col max-h-[45%]">
          {/* 🔹 SCROLLABLE CONTENT */}
          <div className="flex-1 overflow-y-auto p-5">
            <h2 className="text-xl font-bold mb-2">Active Ride</h2>
            <p className="text-muted-foreground mb-4">
              Passenger ID: {activeRide.passengerId}
            </p>

            <div className="space-y-4">
              {/* Pickup */}
              <div className="flex items-start gap-3">
                <div className="h-3 w-3 rounded-full bg-green-500 mt-2" />
                <div>
                  <p className="text-xs text-muted-foreground">Pickup</p>
                  <p className="font-medium text-sm">
                    {pickupName || "Loading pickup..."}
                  </p>
                </div>
              </div>

              {/* Drop */}
              <div className="flex items-start gap-3">
                <div className="h-3 w-3 rounded-full bg-red-500 mt-2" />
                <div>
                  <p className="text-xs text-muted-foreground">Drop</p>
                  <p className="font-medium text-sm">
                    {dropName || "Loading drop..."}
                  </p>
                </div>
              </div>

              <div className="pt-3 border-t text-sm space-y-1">
                <p>
                  <strong>Payment:</strong> {activeRide.paymentMethod}
                </p>
                <p>
                  <strong>Status:</strong> {activeRide.status}
                </p>
              </div>
            </div>
          </div>

          {/* 🔹 FIXED BUTTON AREA */}
          <div className="p-4 border-t bg-white space-y-3">
            {activeRide?.status === "accepted" && (
              <>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    const lat = activeRide.pickupLat;
                    const lng = activeRide.pickupLng;

                    window.open(
                      `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`,
                      "_blank",
                    );
                  }}
                >
                  Navigate to Pickup (Google Maps)
                </Button>

                <Button
                  className="w-full"
                  onClick={() =>
                    updateStatus.mutate({
                      rideId: activeRide.id,
                      status: "arrived",
                    })
                  }
                >
                  Mark Arrived
                </Button>

                <Button
                  variant="destructive"
                  className="w-full"
                  onClick={async () => {
                    await fetch(`/api/rides/${activeRide.id}/cancel`, {
                      method: "PATCH",
                    });

                    toast({
                      title: "Ride Cancelled",
                    });

                    await refetch();
                  }}
                >
                  Cancel Ride
                </Button>
              </>
            )}

            {activeRide?.status === "arrived" && (
              <>
                <input
                  type="text"
                  placeholder="Enter Passenger OTP"
                  value={enteredOtp}
                  onChange={(e) => setEnteredOtp(e.target.value)}
                  className="w-full border rounded p-2"
                />

                <Button
                  className="w-full"
                  onClick={async () => {
                    const res = await fetch(
                      `/api/rides/${activeRide.id}/verify-otp`,
                      {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ otp: enteredOtp }),
                      },
                    );

                    if (res.ok) {
                      toast({
                        title: "OTP Verified",
                        description: "Ride Started",
                      });
                      setEnteredOtp("");
                    } else {
                      toast({
                        title: "Invalid OTP",
                        variant: "destructive",
                      });
                    }
                  }}
                >
                  Verify & Start Ride
                </Button>
              </>
            )}

            {activeRide?.status === "ongoing" && (
              <>
                <Button
                  className="w-full"
                  onClick={() =>
                    updateStatus.mutate({
                      rideId: activeRide.id,
                      status: "payment_pending",
                    })
                  }
                >
                  End Ride
                </Button>
              </>
            )}

            {activeRide?.status === "payment_pending" && (
              <Button
                className="w-full"
                onClick={async () => {
                  fetch(`/api/rides/${activeRide.id}/payment`, {
  method: "PATCH",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ role: "driver" }),
});

                  if (res.ok) {
                    toast({
                      title: "Payment Confirmed",
                      description: "Ride Completed Successfully",
                    });

                    await refetch();
                  }
                }}
              >
                Confirm Payment Received
              </Button>
            )}
          </div>
        </div>
      )}
      {/* Map Background */}
      {driverPosition && (
        <div className="absolute inset-0 z-0 opacity-80">
          {activeRide && activeRide.status !== "completed" && (
            <div className="absolute top-1/2 right-4 -translate-y-1/2 z-[1000]">
              <button
                onClick={() => {
                  const lat =
                    activeRide.status === "accepted"
                      ? activeRide.pickupLat
                      : activeRide.dropLat;

                  const lng =
                    activeRide.status === "accepted"
                      ? activeRide.pickupLng
                      : activeRide.dropLng;

                  window.open(
                    `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`,
                    "_blank",
                  );
                }}
                className="h-14 w-14 rounded-full bg-black text-white shadow-2xl flex items-center justify-center"
              >
                🧭
              </button>
            </div>
          )}
          {activeRide && (
            <div className="absolute top-20 left-1/2 -translate-x-1/2 z-20 bg-white px-4 py-2 rounded-full shadow-md text-sm font-medium">
              {activeRide?.status === "accepted" && "Navigating to Pickup"}
              {activeRide?.status === "ongoing" && "Trip in Progress"}
              {activeRide?.status === "payment_pending" &&
                "Waiting for Payment"}
            </div>
          )}
          <Map
            center={driverPosition}
            zoom={13}
            markers={[
              {
                lat: driverPosition.lat,
                lng: driverPosition.lng,
                type: "driver" as const,
                vehicleType: user?.vehicleType || "car",
                id: "me",
              },
              ...(activeRide
                ? [
                    {
                      lat: Number(activeRide.pickupLat),
                      lng: Number(activeRide.pickupLng),
                      type: "pickup" as const,
                      id: "pickup",
                    },
                    {
                      lat: Number(activeRide.dropLat),
                      lng: Number(activeRide.dropLng),
                      type: "drop" as const,
                      id: "drop",
                    },
                  ]
                : []),
            ]}
            route={routeCoords}
          />
        </div>
      )}

      {/* Top Bar */}
      <div className="absolute top-0 left-0 right-0 p-4 z-10">
        <Card className="border-0 shadow-lg bg-white/95 backdrop-blur">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`h-3 w-3 rounded-full ${user?.isOnline ? "bg-green-500 animate-pulse" : "bg-red-500"}`}
              />
              <span className="font-semibold">
                {user?.isOnline ? "You are Online" : "You are Offline"}
              </span>
            </div>
            <Switch
              checked={user?.isOnline || false}
              onCheckedChange={handleGoOnline}
            />
          </CardContent>
        </Card>
      </div>

      {/* Ride Status Pill */}
      {activeRide && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-20">
          <div className="bg-white shadow-lg px-6 py-3 rounded-full text-sm font-semibold text-center">
            <div>
              {activeRide?.status === "accepted" && (
                <>
                  🚗 Pickup • {etaMinutes ?? "--"} min • {distanceKm ?? "--"} km
                </>
              )}

              {activeRide?.status === "ongoing" && (
                <>
                  🛣 To Drop • {etaMinutes ?? "--"} min • {distanceKm ?? "--"}{" "}
                  km
                </>
              )}

              {activeRide?.status === "payment_pending" && (
                <>💰 Waiting for Payment</>
              )}
            </div>

            {remainingDistance && etaMinutes !== null && (
              <div className="text-xs text-muted-foreground mt-1">
                {remainingDistance} km • {etaMinutes} min
              </div>
            )}
          </div>
        </div>
      )}

      {/* Stats Overlay when Offline */}
      {!user?.isOnline && (
        <div className="absolute inset-0 z-0 bg-background/80 flex items-center justify-center p-6">
          <div className="text-center space-y-6 w-full max-w-sm">
            <div className="h-24 w-24 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Power className="w-10 h-10 text-primary" />
            </div>
            <h2 className="text-2xl font-bold">Go Online to Start Earning</h2>
            <div className="grid grid-cols-2 gap-4"></div>
          </div>
        </div>
      )}

      {/* Incoming Request Popup */}
      <AnimatePresence>
        {incomingRequest && user?.isOnline && (
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            className="absolute bottom-0 left-0 right-0 bg-white z-20 rounded-t-3xl shadow-2xl p-6 pb-24 border-t-4 border-primary"
          >
            <div className="flex justify-between items-start mb-6">
              <div>
                <Badge className="mb-2 bg-green-500 hover:bg-green-600">
                  New Request
                </Badge>
                <h2 className="text-2xl font-bold">₹{incomingRequest.fare}</h2>
                <p className="text-muted-foreground text-sm">
                  Pickup: {pickupDistanceKm ?? "--"} km away
                </p>

                <p className="text-muted-foreground text-sm">
                  Trip: {incomingRequest.distanceKm ?? "--"} km
                </p>
              </div>
              <div className="text-right">
                <div className="h-10 w-10 bg-secondary rounded-full flex items-center justify-center ml-auto mb-1">
                  <span className="font-bold">{requestTimer}s</span>
                </div>
              </div>
            </div>

            <div className="space-y-4 mb-6 relative">
              <div className="absolute left-[11px] top-3 bottom-3 w-0.5 bg-gray-200" />
              <div className="flex items-center gap-3">
                <div className="h-6 w-6 rounded-full bg-green-100 flex items-center justify-center z-10 border-2 border-white">
                  <div className="h-2 w-2 rounded-full bg-green-600" />
                </div>
                <p className="font-medium">{incomingRequest.pickup}</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-6 w-6 rounded-full bg-red-100 flex items-center justify-center z-10 border-2 border-white">
                  <div className="h-2 w-2 rounded-full bg-red-600" />
                </div>
                <p className="font-medium">{incomingRequest.drop}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Button
                variant="outline"
                className="h-12"
                onClick={() => setIncomingRequest(null)}
              >
                Reject
              </Button>
              <Button
                className="h-12 text-lg shadow-lg shadow-primary/20"
                onClick={handleAccept}
              >
                Accept Ride
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
