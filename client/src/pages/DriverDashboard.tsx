import React, { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import {
  useToggleOnline,
  useActiveRide,
  useAcceptRide,
  useUpdateRideStatus,
} from "@/hooks/use-api";
import { Button } from "@/components/ui/button";

import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import Map from "@/components/Map";
import { useToast } from "@/hooks/use-toast";
import { Power, Navigation } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { socket } from "@/lib/socket";
import { useQueryClient } from "@tanstack/react-query";
import { BASE_URL } from "@/lib/config";


import { getLocation, setupPush } from "@/utils/platform";

import { PushNotifications } from "@capacitor/push-notifications";

const rideAlertSound = new Audio(
  "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3",
);

// Helper for coordinates

export default function DriverDashboard() {
  const { user } = useAuth();

  const [isOnlineLocal, setIsOnlineLocal] = useState(false);
  const queryClient = useQueryClient();
  const { data: activeRide, refetch } = useActiveRide(user?.id);

  const { toast } = useToast();
  const toggleOnline = useToggleOnline();
  const acceptRide = useAcceptRide();
  const updateStatus = useUpdateRideStatus();

  const [incomingRequest, setIncomingRequest] = useState<any>(null);
  const [requestTimer, setRequestTimer] = useState<number>(10);
  const [enteredOtp, setEnteredOtp] = useState("");

    useEffect(() => {
  if (user) {
    setIsOnlineLocal(user.isOnline ?? false);
  }
}, [user?.id, user?.isOnline]);

  

  useEffect(() => {
  if (!user || !user.isOnline) return;

  socket.emit("register-driver", user.id);
  console.log("Driver socket registered:", user.id);
}, [user?.id, user?.isOnline]);


useEffect(() => {
  if (!user) return;

  setupPush(user.id, BASE_URL);
}, [user?.id, user?.isOnline]);

useEffect(() => {
  if (!user) return;

  socket.on("new-ride-request", (ride) => {
    if (!user?.isOnline) return;

    console.log("🚕 DRIVER RECEIVED:", ride);
    setIncomingRequest(ride);
    rideAlertSound.currentTime = 0;
rideAlertSound.play().catch(() => {});
  });

  return () => {
    socket.off("new-ride-request");
  };
}, [user?.id, user?.isOnline]);


  useEffect(() => {
  const handler = (data: any) => {
    if (!activeRide) return;
    if (data.rideId !== activeRide.id) return;

    toast({
      title: "Passenger Paid",
      description: "Confirm payment to complete ride",
    });

    refetch();
  };

  socket.on("passenger-paid", handler);

  return () => {
    socket.off("passenger-paid", handler);
  };
}, [activeRide]);

useEffect(() => {
  const handler = (ride: any) => {
    if (!user) return;

    // 🔥 CLOSE INCOMING REQUEST POPUP
if (ride.status === "cancelled") {
  setIncomingRequest(null);
}

    // 🔥 REFRESH ACTIVE RIDE
    queryClient.invalidateQueries({
      queryKey: ["/api/rides/active", user?.id],
    });
  };

  socket.on("ride-updated", handler);

  return () => {
    socket.off("ride-updated", handler);
  };
}, [user?.id, user?.isOnline, incomingRequest]);

  const [routeCoords, setRouteCoords] = useState<any[]>([]);
  const [etaMinutes, setEtaMinutes] = useState<number | null>(null);
  const [distanceKm, setDistanceKm] = useState<number | null>(null);

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
  if (!user || user.role !== "driver") return;

  const interval = setInterval(async () => {
    const loc = await getLocation();

    if (!loc) return;

    const { lat, lng } = loc;

    setDriverPosition({ lat, lng });

    await fetch(`${BASE_URL}/api/users/${user.id}/location`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lat, lng }),
    });

    console.log("Driver Location:", lat, lng);

  }, activeRide ? 3000 : 10000);

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
if (!user?.isOnline) return;
        socket.emit("update-driver-location", {
  driverId: user.id,
  lat: driverPosition.lat,
  lng: driverPosition.lng,
  vehicleType: user.vehicleType,
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
  if (!user) return;

  // 🔥 instant UI update
  setIsOnlineLocal(checked);

  toggleOnline.mutate(checked, {
    onSuccess: (updatedUser) => {
      setIsOnlineLocal(updatedUser.isOnline ?? false);

      if (updatedUser.isOnline) {
        socket.emit("register-driver", updatedUser.id);
        console.log("Driver ONLINE:", updatedUser.id);
      } else {
        console.log("Driver OFFLINE:", updatedUser.id);
        setIncomingRequest(null);
      }
    },
    onError: () => {
      // rollback if failed
      setIsOnlineLocal(!checked);
    },
  });
};

  const handleAccept = () => {
  if (!user || !incomingRequest) return;

  acceptRide.mutate({
    rideId: incomingRequest.id,
    driverId: user.id,
  });

  // ✅ ADD THIS (VERY IMPORTANT)
  socket.emit("ride-accepted", {
    ...incomingRequest,
    driverId: user.id,
  });

  toast({
    title: "Ride Accepted",
    description: "Navigating to pickup...",
  });

  setIncomingRequest(null);
};

  if (!user) {
  return <div>Loading...</div>;
}

  if (user?.role === "driver" && !user?.isApproved) {
  return (
    <div className="h-screen flex items-center justify-center">
      <div className="text-center space-y-4">
        <h2 className="text-2xl font-bold">⏳ Waiting for Approval</h2>
        <p className="text-muted-foreground">
          Your documents are under review by admin.
        </p>
      </div>
    </div>
  );
}

  return (
    <div className="h-screen w-full relative flex flex-col bg-background">


    {/* 🔥 DEBUG BUTTON */}
    <button
      style={{
        position: "absolute",
        top: 80,
        left: 20,
        zIndex: 9999,
        padding: "10px",
        background: "black",
        color: "white",
      }}
      onClick={async () => {
        const perm = await PushNotifications.requestPermissions();
        alert(JSON.stringify(perm));
      }}
    >
      Check Notification Permission
    </button>
      


      {activeRide && (
        <div className="absolute bottom-[70px] left-3 right-3 z-30 
bg-white/90 backdrop-blur-xl 
rounded-3xl shadow-[0_10px_40px_rgba(0,0,0,0.12)] 
flex flex-col max-h-[40%] border border-gray-200">
          {/* 🔹 SCROLLABLE CONTENT */}
          <div className="flex-1 overflow-y-auto p-5">
<div className="flex items-center justify-between mb-3">
  <h2 className="text-lg font-semibold">Active Ride</h2>
  <span className="text-xs bg-primary/10 text-primary px-3 py-1 rounded-full font-medium">
    ID: {activeRide.passengerId}
  </span>
</div>

<div className="space-y-3">
  <div className="flex items-start gap-3">
    <div className="h-2.5 w-2.5 rounded-full bg-green-500 mt-2" />
    <div>
      <p className="text-xs text-gray-500">Pickup</p>
      <p className="text-sm font-medium leading-tight line-clamp-2">
        {pickupName || "Loading pickup..."}
      </p>
    </div>
  </div>

  <div className="flex items-start gap-3">
    <div className="h-2.5 w-2.5 rounded-full bg-red-500 mt-2" />
    <div>
      <p className="text-xs text-gray-500">Drop</p>
      <p className="text-sm font-medium leading-tight line-clamp-2">
        {dropName || "Loading drop..."}
      </p>
    </div>
  </div>

              <div className="pt-3 mt-3 border-t text-xs text-gray-600 flex justify-between">
  <span>💳 {activeRide.paymentMethod}</span>
  <span className="capitalize">🚦 {activeRide.status}</span>
              </div>
            </div>
          </div>

          {/* 🔹 FIXED BUTTON AREA */}
          <div className="p-3 border-t bg-white/80 backdrop-blur space-y-2">
            {activeRide?.status === "accepted" && (
              <>
                <Button
  variant="outline"
  className="w-full h-11 rounded-xl"
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
  className="w-full h-11 rounded-xl"
                  onClick={async () => {
  await updateStatus.mutateAsync({
    rideId: activeRide.id,
    status: "arrived",
  });

  socket.emit("ride-updated", {
    ...activeRide,
    status: "arrived",
  });
}}
                >
                  Mark Arrived
                </Button>

<Button
  variant="destructive"
  className="w-full h-11 rounded-xl"
                  onClick={async () => {
                    await fetch(`${BASE_URL}/api/rides/${activeRide.id}/cancel`, {
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

<Button className="w-full h-11 rounded-xl"
                  onClick={async () => {
                    const res = await fetch(`${BASE_URL}/api/rides/${activeRide.id}/verify-otp`,
                      {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ otp: enteredOtp }),
                      },
                    );

if (res.ok) {
  const ride = await res.json(); // ✅ IMPORTANT

  toast({
    title: "OTP Verified",
    description: "Ride Started",
  });

  setEnteredOtp("");

  socket.emit("ride-updated", ride); // ✅ REAL DATA

  await refetch();
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
<Button className="w-full h-11 rounded-xl"
                  onClick={async () => {
  await updateStatus.mutateAsync({
    rideId: activeRide.id,
    status: "payment_pending",
  });
}}
                >
                  End Ride
                </Button>
              </>
            )}

            {activeRide?.status === "payment_pending" && (
<Button className="w-full h-11 rounded-xl"
                onClick={async () => {
                  const res = await fetch(`${BASE_URL}/api/rides/${activeRide.id}/payment`, {
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
                className="h-12 w-12 rounded-full bg-white shadow-lg flex items-center justify-center border transition transform hover:scale-110 active:scale-95"
              >
                <Navigation className="w-5 h-5 text-gray-700" />
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
                vehicleType: (user?.vehicleType as "bike" | "auto" | "car") || "car",
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
{!(
  activeRide &&
  ["accepted", "ongoing", "payment_pending"].includes(activeRide.status)
) && (
  <div className="absolute top-4 left-4 right-4 z-[500]">
  <div className="bg-white/90 backdrop-blur-md shadow-[0_8px_30px_rgba(0,0,0,0.08)] rounded-xl px-4 py-2 flex items-center justify-between border border-gray-200">
    
    {/* LEFT SIDE */}
    <div className="flex items-center gap-2">
      <div
        className={`h-2.5 w-2.5 rounded-full ${
          isOnlineLocal ? "bg-green-500 animate-pulse" : "bg-red-500"
        }`}
      />
      <span className="text-sm font-medium">
        {isOnlineLocal ? "You are Online" : "You are Offline"}
      </span>
    </div>

    {/* RIGHT SIDE → KEEP YOUR SWITCH */}
    <Switch
      checked={isOnlineLocal}
      onCheckedChange={handleGoOnline}
    />

  </div>
</div>
)}

      {/* Ride Status Pill */}
      {activeRide && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-20">
          <div className="bg-white shadow-lg px-6 py-3 rounded-full text-sm font-semibold text-center">
            <div>
              {activeRide?.status === "accepted" && (
                <>
                   Pickup • {etaMinutes ?? "--"} min • {distanceKm ?? "--"} km
                </>
              )}

              {activeRide?.status === "ongoing" && (
                <>
                   To Drop • {etaMinutes ?? "--"} min • {distanceKm ?? "--"}{" "}
                  km
                </>
              )}

              {activeRide?.status === "payment_pending" && (
                <>Waiting for Payment</>
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
      {!isOnlineLocal && (
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
  className="
    absolute bottom-0 left-0 right-0 z-20
    bg-white/80 backdrop-blur-2xl
    rounded-t-[28px]
    shadow-[0_-10px_40px_rgba(0,0,0,0.15)]
    border border-white/20
    p-5 pb-24
  "
>
<div className="flex items-center justify-between mb-5">

  <div>
    <Badge className="bg-green-500/10 text-green-600 font-medium px-3 py-1 rounded-full mb-2">
      New Request
    </Badge>

    <h2 className="text-3xl font-bold tracking-tight text-gray-900">
      ₹{incomingRequest.fare}
    </h2>
  </div>

  <div className="h-12 w-12 rounded-full bg-black text-white flex items-center justify-center shadow-md">
    <span className="font-semibold text-sm">{requestTimer}s</span>
  </div>

</div>


<div className="flex gap-3 mb-6">

  {/* LINE */}
  <div className="flex flex-col items-center mt-1">
    <div className="w-2.5 h-2.5 bg-green-500 rounded-full"></div>
    <div className="w-[2px] h-12 bg-gradient-to-b from-green-400 to-red-400 my-1"></div>
    <div className="w-2.5 h-2.5 bg-red-500 rounded-full"></div>
  </div>

  {/* TEXT */}
  <div className="flex flex-col gap-3.5">

<div>
  <p className="text-xs text-gray-400 uppercase tracking-wide">Pickup</p>

  <p className="text-sm font-semibold text-gray-900 leading-snug">
    {incomingRequest.pickupAddress
      ? incomingRequest.pickupAddress.split(",").slice(0, 2).join(", ")
      : "Pickup location"}
  </p>

  {/* 🔥 ADD THIS */}
  <p className="text-xs text-green-400 font-medium mt-1">
     {incomingRequest.pickupDistanceKm ?? "--"} km
  </p>
</div>

<div>
  <p className="text-xs text-gray-400 uppercase tracking-wide">Drop</p>

  <p className="text-sm font-semibold text-gray-900 leading-snug">
    {incomingRequest.dropAddress
      ? incomingRequest.dropAddress.split(",").slice(0, 2).join(", ")
      : "Drop location"}
  </p>

  {/* 🔥 ADD THIS */}
  <p className="text-xs text-red-400 font-medium mt-1">
     {incomingRequest.distanceKm ?? "--"} km
  </p>
</div>
  </div>

</div>

<div className="grid grid-cols-2 gap-3">

  <Button
    variant="outline"
    className="
      h-12 rounded-xl border-gray-300
      text-gray-700 font-medium
      hover:bg-gray-100 transition
    "
    onClick={async () => {
      if (!incomingRequest || !user) return;

      await fetch(`${BASE_URL}/api/rides/${incomingRequest.id}/reject`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ driverId: user.id }),
      });

      setIncomingRequest(null);
    }}
  >
    Reject
  </Button>

  <Button
    className="
      h-12 rounded-xl font-semibold text-white
      bg-gradient-to-r from-indigo-500 to-blue-600
      shadow-lg shadow-blue-500/30
      hover:scale-[1.02] active:scale-[0.98]
      transition-all
    "
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
