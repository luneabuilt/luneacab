import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import {
  useNearestDrivers,
  useRequestRide,
  useActiveRide,
  useUpdateProfile,
} from "@/hooks/use-api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import Map from "@/components/Map";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2,
  MapPin,
  Navigation,
  Bike,
  Car,
  Truck,
  ArrowRight,
  Wallet,
  CheckCircle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { socket } from "@/lib/socket";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";

import { getLocation } from "@/utils/platform";
import { BASE_URL } from "@/lib/config"; // ADD at top

// Helper for coordinates

export default function PassengerHome() {
  const [driverPosition, setDriverPosition] = useState<{
  lat: number;
  lng: number;
  vehicleType: "bike" | "auto" | "car";
} | null>(null);

  const { user } = useAuth();

// ✅ ADD THIS RIGHT HERE
useEffect(() => {
  if (!user) return;

  socket.emit("register-user", user.id);
  console.log("Passenger registered:", user.id);
}, [user]);
  const { toast } = useToast();

  // States
  const [isLocationLoading, setIsLocationLoading] = useState(true);
  const [currentLocationName, setCurrentLocationName] = useState<string>(
    "Getting location...",
  );
  const [pickup, setPickup] = useState<{ lat: number; lng: number } | null>(
    null,
  );
  const [drop, setDrop] = useState<{ lat: number; lng: number } | null>(null);
  const [searchText, setSearchText] = useState("");
  const [suggestions, setSuggestions] = useState<any[]>([]);

  const [pickupSearchText, setPickupSearchText] = useState("");
  const [pickupSuggestions, setPickupSuggestions] = useState<any[]>([]);
  const [activeField, setActiveField] = useState<"pickup" | "drop" | null>(
    null,
  );
  const [sheetHeight, setSheetHeight] = useState(30); // starts small
  const SNAP = {
  small: 30,
  medium: 55,
  large: 75, // max height
};
const toggleSheet = () => {
  if (sheetHeight === SNAP.small) {
    setSheetHeight(SNAP.medium);
  } else if (sheetHeight === SNAP.medium) {
    setSheetHeight(SNAP.large);
  } else {
    setSheetHeight(SNAP.small);
  }
};

  const [isSearching, setIsSearching] = useState(false);
  const [distanceKm, setDistanceKm] = useState<number | null>(null);
  const [routeCoords, setRouteCoords] = useState<any[]>([]);
  const [driverEta, setDriverEta] = useState<number | null>(null);
  const [vehicleType, setVehicleType] = useState<"bike" | "auto" | "car">(
    "auto",
  );
  const [estimatedFares, setEstimatedFares] = useState<any>({});
  const [stage, setStage] = useState<
    "search" | "confirm" | "searching" | "ride"
  >("search");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "upi">("cash");

  // 🔥 Trip Timer
  const [tripSeconds, setTripSeconds] = useState(0);
  // 🔥 Searching Countdown
  const [searchSeconds, setSearchSeconds] = useState(120);

  const [paymentProcessing, setPaymentProcessing] = useState(false);

  // Queries & Mutations
  const { data: drivers } = useNearestDrivers(
    stage === "search" ? (pickup ? String(pickup.lat) : "") : "",
    stage === "search" ? (pickup ? String(pickup.lng) : "") : "",
    vehicleType,
  );

  const queryClient = useQueryClient();

  const { data: activeRide, refetch } = useActiveRide(user?.id);
useEffect(() => {
  console.log("ACTIVE RIDE:", activeRide);
}, [activeRide]);
useEffect(() => {
  console.log("DRIVER DATA:", activeRide?.driver);
}, [activeRide]);

const driver = activeRide?.driver;

  const getProgressStep = () => {
    if (!activeRide) return 0;

    switch (activeRide.status) {
      case "requested":
        return 1;
      case "accepted":
        return 2;
      case "arrived":
        return 3;
      case "ongoing":
        return 4;
      case "payment_pending":
        return 5;
      default:
        return 0;
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;

    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  const requestRide = useRequestRide();
  const handleCancelRide = async () => {
    if (!activeRide) return;

    try {
      await fetch(`${BASE_URL}/api/rides/${activeRide.id}/cancel`, {
        method: "PATCH",
      });

      toast({
        title: "Ride Cancelled",
        description: "Your request has been cancelled",
      });

      await refetch();
      setStage("search");
    } catch (err) {
      console.error("Cancel error:", err);
    }
  };
const handlePayment = async () => {
  if (!activeRide) return;
  if (activeRide?.status === "completed") {
  return; // 🚫 stop duplicate payment
}

  setPaymentProcessing(true);

  try {
    const res = await fetch(
      `${BASE_URL}/api/rides/${activeRide.id}/payment`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
  role: "passenger",
  paymentMethod: paymentMethod, // 🔥 ADD THIS
}),
      }
    );

    if (!res.ok) throw new Error("Payment failed");

    const updatedRide = await res.json();

    console.log("Updated Ride:", updatedRide);

    await refetch();

queryClient.invalidateQueries({
  queryKey: ["/api/rides/active", user?.id],
});

    socket.emit("passenger-paid", {
      rideId: activeRide.id,
    });

    setTimeout(() => {
  setStage("search");
}, 1500);

    toast({
      title: "Payment Successful",
    });

  } catch (err) {
    console.error(err);

    toast({
      title: "Payment Failed",
      variant: "destructive",
    });
  }

  setPaymentProcessing(false);
};
  const handleUPIPayment = () => {
  if (!activeRide) return;

  const upiId = "7002491493@kotak811";
  const amount = activeRide.fare;
  const name = "Lunea Ride";
  const note = `Ride Payment ${activeRide.id}`;

  const upiLink = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(name)}&am=${amount}&cu=INR&tn=${encodeURIComponent(note)}`;

  setPaymentMethod("upi");

  // ✅ Open UPI app
  window.open(upiLink, "_system");

  // ✅ Ask confirmation instead of auto success
  setTimeout(() => {
    const confirm = window.confirm("Did you complete the payment?");

    if (confirm) {
      handlePayment(); // only then call backend
    } else {
      toast({
        title: "Payment not completed",
        variant: "destructive",
      });
    }
  }, 3000);
};

  // Effects
  useEffect(() => {
  const handler = (data: any) => {
    if (!activeRide || data.driverId !== activeRide.driverId) return;

setDriverPosition((prev) => {
  if (!prev) {
    return {
      lat: data.lat,
      lng: data.lng,
      vehicleType:
        data.vehicleType ||
        activeRide?.driver?.vehicleType ||
        "car",
    };
  }

  const smoothLat = prev.lat + (data.lat - prev.lat) * 0.5;
  const smoothLng = prev.lng + (data.lng - prev.lng) * 0.5;

  return {
    lat: smoothLat,
    lng: smoothLng,
    vehicleType:
      data.vehicleType ||
      prev.vehicleType ||
      activeRide?.driver?.vehicleType ||
      "car",
  };
});
  };

  socket.on("update-driver-location", handler);

  return () => {
    socket.off("update-driver-location", handler);
  };
}, [activeRide]);
  useEffect(() => {
  const handler = (ride: any) => {
    if (!user || ride.passengerId !== user.id) return; {
queryClient.setQueryData(
  [api.rides.getActiveForUser.path, user?.id],
  (old: any) => ({
    ...old,
    ...ride,
    driver: ride?.driver ?? old?.driver, // ✅ PRESERVE DRIVER
  })
);
    }
  };

  socket.on("ride-accepted", handler);

  return () => {
    socket.off("ride-accepted", handler);
  };
}, [user]);

// ✅ ADD HERE (new useEffect)
useEffect(() => {
  const handler = (ride: any) => {
    if (!user || ride.passengerId !== user.id) return; {
queryClient.setQueryData(
  [api.rides.getActiveForUser.path, user?.id],
  (old: any) => ({
    ...old,
    ...ride,
    driver: ride?.driver ?? old?.driver,  // ✅ PRESERVE DRIVER
  })
);
    }
  };

  socket.on("ride-updated", handler);

  return () => {
    socket.off("ride-updated", handler);
  };
}, [user]);


  useEffect(() => {
    if (!pickup || !drop) return;

    const fetchDistance = async () => {
      const res = await fetch(
        `https://router.project-osrm.org/route/v1/driving/${pickup.lng},${pickup.lat};${drop.lng},${drop.lat}?overview=false`,
      );

      const data = await res.json();

      if (data.routes && data.routes.length > 0) {
        const meters = data.routes[0].distance;
        const km = meters / 1000;

        // 🔥 Restrict ride distance from pickup (max 109km)
        const MAX_DISTANCE_KM = 109;

        if (km > MAX_DISTANCE_KM) {
          alert(`Maximum ride distance is ${MAX_DISTANCE_KM} km`);
          setDrop(null);
          setDistanceKm(null);
          return;
        }

        setDistanceKm(km);
        console.log("Road Distance KM:", km);
      }
    };

    fetchDistance();
  }, [pickup, drop]);

  useEffect(() => {
  if (!activeRide || !driverPosition) return;

  let fromLat: number | undefined;
  let fromLng: number | undefined;
  let toLat: number | undefined;
  let toLng: number | undefined;

  // Driver → Pickup
  if (activeRide.status === "accepted") {
    fromLat = driverPosition.lat;
    fromLng = driverPosition.lng;
    toLat = Number(activeRide.pickupLat);
    toLng = Number(activeRide.pickupLng);
  }

  // Driver → Drop
  if (activeRide.status === "ongoing") {
    fromLat = driverPosition.lat;
    fromLng = driverPosition.lng;
    toLat = Number(activeRide.dropLat);
    toLng = Number(activeRide.dropLng);
  }

  if (!fromLat || !toLat) return;

  const fetchRoute = async () => {
    const res = await fetch(
      `https://router.project-osrm.org/route/v1/driving/${fromLng},${fromLat};${toLng},${toLat}?overview=full&geometries=geojson`,
    );

    const data = await res.json();

    if (data.routes && data.routes.length > 0) {
      const geometry = data.routes[0].geometry.coordinates;

      const formatted = geometry.map((coord: number[]) => [
        coord[1],
        coord[0],
      ]);

      setRouteCoords(formatted);

      const durationSeconds = data.routes[0].duration;
      const minutes = Math.ceil(durationSeconds / 60);

      setDriverEta(minutes);
    }
  };

  fetchRoute();
}, [activeRide, driverPosition]);

  useEffect(() => {
    if (!activeRide) {
      setStage("search");
      return;
    }

    if (activeRide.status === "completed") {
      setStage("search");
      return;
    }

    if (activeRide.status === "requested") {
      setStage("searching");
      return;
    }

    if (
      activeRide.status === "accepted" ||
      activeRide.status === "arrived" ||
      activeRide.status === "ongoing" ||
      activeRide.status === "payment_pending"
    ) {
      setStage("ride");
      return;
    }

    setStage("search");
  }, [activeRide?.status]);

  // 🔥 Start Trip Timer When Ride Is Ongoing
  useEffect(() => {
    if (!activeRide) return;

    if (activeRide.status !== "ongoing") {
      setTripSeconds(0);
      return;
    }

    const interval = setInterval(() => {
      setTripSeconds((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [activeRide?.status]);

  // 🔥 Searching Countdown Timer
  useEffect(() => {
    if (!activeRide) return;
    if (activeRide.status !== "requested") return;

    setSearchSeconds(120);

    const interval = setInterval(() => {
      setSearchSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [activeRide?.status]);

  useEffect(() => {
    if (distanceKm === null) return;

    const fetchEstimates = async () => {
      const types = ["bike", "auto", "car"];
      const fares: any = {};

      for (const type of types) {
        const res = await fetch(`${BASE_URL}/api/rides/estimate?distanceKm=${distanceKm}&vehicleType=${type}`);
        const data = await res.json();
        fares[type] = Math.round(Number(data.fare));
      }

      setEstimatedFares(fares);
    };

    fetchEstimates();
  }, [distanceKm]);


useEffect(() => {
  if (!user) return;

  const loadLocation = async () => {
    setIsLocationLoading(true);

    const loc = await getLocation();

    if (!loc) {
      console.log("❌ Location not received");

      toast({
        title: "Location Error",
        description: "Please enable GPS permission",
        variant: "destructive",
      });

      setIsLocationLoading(false);
      return;
    }

    const { lat, lng } = loc;

    console.log("✅ Passenger Location:", lat, lng);

    try {
      await fetch(`${BASE_URL}/api/users/${user.id}/location`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lat, lng }),
      });

      setPickup({ lat, lng });
      setPickupSearchText("Current Location");
      // 🔥 Get city name from lat/lng
try {
  const res = await fetch(
    `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
    {
      headers: {
        "User-Agent": "cab-app",
      },
    }
  );

  const data = await res.json();

const city =
  data.address.city ||
  data.address.town ||
  data.address.municipality ||
  data.address.county ||
  data.address.village ||
  data.address.state_district || // ⭐ VERY IMPORTANT
  data.address.state;
  
  setCurrentLocationName(city || "Unknown location");
} catch (err) {
  console.error("Reverse geocode error:", err);
  setCurrentLocationName("Location not found");
}
    } catch (err) {
      console.error("❌ Backend update failed", err);
    }

    setIsLocationLoading(false);
  };

  loadLocation();
}, [user]);

  // Handlers
  const handleMapClick = (lat: number, lng: number) => {
    if (stage !== "search") return;

    if (activeField === "pickup") {
      setPickup({ lat, lng });
      setPickupSearchText("Selected on map");
      setPickupSuggestions([]);
    }

    if (activeField === "drop") {
      setDrop({ lat, lng });
      setSearchText("Selected on map");
      setSuggestions([]);
    }

    setActiveField(null); // VERY IMPORTANT
  };

  const handleRequestRide = () => {
  if (!drop || !pickup || !user || !distanceKm) return;

  const fare = estimatedFares[vehicleType]; // ✅ FIX

  requestRide.mutate({
    passengerId: user.id,
    vehicleType,
    pickupLat: String(pickup.lat),
    pickupLng: String(pickup.lng),
    dropLat: String(drop.lat),
    dropLng: String(drop.lng),
    distanceKm: distanceKm.toString(),
    paymentMethod,
    fare: String(fare), // ✅ FIX
    commission: "0",
    driverEarning: String(fare),
  });

  setStage("searching");
};

  // Render Helpers

  const renderVehicleOption = (
    type: "bike" | "auto" | "car",
    price: number,
    time: string,
  ) => (
<div
  onClick={() => setVehicleType(type)}
  className={`
    flex items-center justify-between p-4 rounded-2xl cursor-pointer
    transition-all duration-300
    ${
      vehicleType === type
        ? "bg-gradient-to-r from-primary/10 to-primary/5 border border-primary shadow-md scale-[1.02]"
        : "bg-white/60 border border-gray-200 hover:shadow-md hover:scale-[1.01]"
    }
  `}
>
  <div className="flex items-center gap-4">
    <div className={`
      h-10 w-12 rounded-xl flex items-center justify-center
      ${vehicleType === type ? "bg-primary text-white" : "bg-gray-100"}
    `}>
      {type === "bike" && <Bike className="w-6 h-6" />}
      {type === "auto" && <Truck className="w-6 h-6" />}
      {type === "car" && <Car className="w-6 h-6" />}
    </div>

    <div>
      <p className="font-semibold text-base capitalize">{type}</p>
      <p className="text-xs text-gray-500">{time} away</p>
    </div>
  </div>

  <p className="text-lg font-bold text-primary">₹{price}</p>
</div>
  );

  return (
    <div className="h-screen w-full relative flex flex-col">
      
      {/* Map Background */}
      <div className="absolute inset-0 z-0">
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
        {pickup && (
          <Map
  center={activeRide ? driverPosition || pickup : pickup}
  zoom={activeRide ? 16 : 14}
            markers={
              [
                ...(pickup
                  ? [
                      {
                        lat: pickup.lat,
                        lng: pickup.lng,
                        type: "pickup",
                        id: "p1",
                      },
                    ]
                  : []),
                ...(drop
                  ? [{ lat: drop.lat, lng: drop.lng, type: "drop", id: "d1" }]
                  : []),

                ...(driverPosition
  ? [
      {
  lat: driverPosition.lat,
  lng: driverPosition.lng,
  type: "driver",
  id: "live-driver",
  vehicleType: driverPosition?.vehicleType ?? driver?.vehicleType ?? "car",
},
    ]
  : []),

...(activeRide &&
  activeRide.driver &&
  !driverPosition
  ? [
      {
        lat: Number(activeRide.pickupLat), // fallback
        lng: Number(activeRide.pickupLng),
        type: "driver",
        id: activeRide.driver.id,
        vehicleType: activeRide.driver.vehicleType || "car",
      },
    ]
  : []),
              ] as any
            }
            route={routeCoords}
            onMapClick={handleMapClick}
          />
        )}
      </div>

      {/* Floating Header */}
 <div className="absolute top-4 left-4 right-4 z-[500]">
  <div className="bg-white/90 backdrop-blur-md shadow-[0_8px_30px_rgba(0,0,0,0.08)] rounded-xl px-4 py-2 flex items-center gap-3 border border-gray-200">
    
    {/* ICON */}
    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
      <MapPin className="text-primary w-4 h-4" />
    </div>

    {/* TEXT */}
    <div className="flex flex-col leading-tight flex-1">
      <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
        Current Location
      </span>
      <span className="text-sm font-medium truncate">
        {currentLocationName || "Fetching location..."}
      </span>
    </div>

  </div>
</div>

      {/* Bottom Sheet UI */}
      <div className="absolute bottom-[64px] left-0 right-0 z-40">
        <AnimatePresence mode="wait">
          {stage === "search" && (
<motion.div
  animate={{ height: `${sheetHeight}vh` }}
  transition={{ type: "spring", stiffness: 120, damping: 20 }}
className="
bg-white/70 backdrop-blur-2xl
border-t border-white/30
rounded-t-[32px]
shadow-[0_-10px_40px_rgba(0,0,0,0.12)]
px-5 pt-4 pb-10
"
>
<div
  onClick={toggleSheet}
  className="flex flex-col items-center mb-2 cursor-pointer"
>
<div className="w-14 h-1.5 bg-gradient-to-r from-gray-300 to-gray-400 rounded-full mb-2" />
  <span className="text-xs text-gray-500">Swipe up</span>
</div>
              <div className="h-full overflow-y-auto pr-1">
                <h2 className="text-xl font-bold mb-4">Where to?</h2>
                <div className="space-y-3">
                  <div className="relative">
                    <div className="absolute left-3 top-3.5 h-3 w-3 rounded-full bg-green-500 ring-4 ring-green-100" />

                    <Input
                      value={pickupSearchText}
                      placeholder="Search pickup location"
                      className="pl-10 h-12 bg-secondary/30 border-0"
                      onFocus={() => {
                        setActiveField("pickup");

                        if (pickupSearchText === "Current Location") {
                          setPickupSearchText("");
                        }
                      }}
                      onChange={async (e) => {
                        const value = e.target.value;
                        setPickupSearchText(value);

                        if (value.length < 3) {
                          setPickupSuggestions([]);
                          return;
                        }

                        if (!pickup) return;

                        const res = await fetch(
                          `https://photon.komoot.io/api/?q=${value}&limit=5&lat=${pickup.lat}&lon=${pickup.lng}`,
                        );

                        const data = await res.json();
                        setPickupSuggestions(data.features || []);
                      }}
                    />

                    {pickupSuggestions.length > 0 && (
                      <div className="absolute left-0 right-0 bg-white shadow-lg rounded-xl mt-1 z-50 max-h-60 overflow-y-auto">
                        {pickupSuggestions.map((place, index) => (
                          <div
                            key={index}
                            className="p-3 hover:bg-gray-100 cursor-pointer text-sm"
                            onClick={() => {
                              const lat = place.geometry.coordinates[1];
                              const lon = place.geometry.coordinates[0];

                              setPickup({ lat, lng: lon });
                              setPickupSearchText(
                                [
                                  place.properties.name,
                                  place.properties.postcode,
                                  place.properties.city,
                                  place.properties.state,
                                ]
                                  .filter(Boolean)
                                  .join(", "),
                              );
                              setPickupSuggestions([]);
                            }}
                          >
                            {[
                              place.properties.name,
                              place.properties.postcode,
                              place.properties.city,
                              place.properties.state,
                            ]
                              .filter(Boolean)
                              .join(", ")}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="relative">
                    <Input
                      value={searchText}
                      placeholder="Search destination"
                      className="pl-10 h-12 bg-secondary/30 border-0"
                      onFocus={() => setActiveField("drop")}
                      onChange={async (e) => {
                        const value = e.target.value;
                        setSearchText(value);

                        if (value.length < 3) {
                          setSuggestions([]);
                          return;
                        }

                        setIsSearching(true);

                        if (!pickup) return;

                        const res = await fetch(
                          `https://photon.komoot.io/api/?q=${value}&limit=5&lat=${pickup.lat}&lon=${pickup.lng}`,
                        );

                        const data = await res.json();
                        setSuggestions(data.features || []);
                      }}
                    />

                    {/* Suggestions Dropdown */}
                    {suggestions.length > 0 && (
                      <div className="absolute left-0 right-0 bg-white shadow-lg rounded-xl mt-1 z-50 max-h-60 overflow-y-auto">
                        {suggestions.map((place, index) => (
                          <div
                            key={index}
                            className="p-3 hover:bg-gray-100 cursor-pointer text-sm"
                            onClick={() => {
                              const lat = place.geometry.coordinates[1];
                              const lon = place.geometry.coordinates[0];

                              setDrop({ lat, lng: lon });

                              setSearchText(
                                [
                                  place.properties.name,
                                  place.properties.postcode,
                                  place.properties.street,
                                  place.properties.city,
                                  place.properties.state,
                                  place.properties.country,
                                ]
                                  .filter(Boolean)
                                  .join(", "),
                              );

                              setSuggestions([]);
                            }}
                          >
                            {[
                              place.properties.name,
                              place.properties.postcode,
                              place.properties.city,
                              place.properties.state,
                            ]
                              .filter(Boolean)
                              .join(", ")}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {drop && (
                  <div className="mt-6 space-y-3">
                    <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">
                      Choose Ride
                    </h3>
                    {distanceKm && (
                      <div className="bg-secondary/30 p-3 rounded-xl text-sm flex justify-between">
                        <span>Trip Distance</span>
                        <span className="font-semibold">
                          {distanceKm.toFixed(2)} km
                        </span>
                      </div>
                    )}
                    {renderVehicleOption(
                      "bike",
                      estimatedFares.bike || 0,
                      "3 min",
                    )}
                    {renderVehicleOption(
                      "auto",
                      estimatedFares.auto || 0,
                      "5 min",
                    )}
                    {renderVehicleOption(
                      "car",
                      estimatedFares.car || 0,
                      "8 min",
                    )}

                    <Button
                      onClick={handleRequestRide}
className="
w-full h-14 text-lg font-semibold
bg-gradient-to-r from-primary to-indigo-500
shadow-lg shadow-primary/30
hover:scale-[1.02] active:scale-[0.98]
transition-all duration-200
"
                    >
                      Book Ride <ArrowRight className="ml-2" />
                    </Button>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {stage === "searching" && (
<motion.div
  animate={{ height: `${sheetHeight}vh` }}
  transition={{ type: "spring", stiffness: 120, damping: 20 }}
className="
bg-white/70 backdrop-blur-2xl
border-t border-white/30
rounded-t-[32px]
shadow-[0_-10px_40px_rgba(0,0,0,0.12)]
px-5 pt-4 pb-10
"
>
  <div
  onClick={toggleSheet}
  className="flex flex-col items-center mb-2 cursor-pointer"
>
  <div className="w-12 h-1.5 bg-gray-400/60 rounded-full mb-2" />
  <span className="text-xs text-gray-500">Swipe up</span>
</div>
    
             <div className="h-full overflow-y-auto pr-1">
                <div className="mx-auto w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-4 relative">
                  <div className="absolute inset-0 rounded-full border-4 border-primary/30 border-t-primary animate-spin" />
                  <Navigation className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-xl font-bold mb-2">
                  Finding nearby drivers... {searchSeconds}s
                </h3>
                <p className="text-muted-foreground mb-6">
                  Connecting you with the best ride
                </p>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleCancelRide}
                >
                  Cancel Request
                </Button>
              </div>
            </motion.div>
          )}

          {stage === "ride" && activeRide && (
<motion.div
  animate={{ height: `${sheetHeight}vh` }}
  transition={{ type: "spring", stiffness: 120, damping: 20 }}
className="
bg-white/70 backdrop-blur-2xl
border-t border-white/30
rounded-t-[32px]
shadow-[0_-10px_40px_rgba(0,0,0,0.12)]
px-5 pt-4 pb-10
"
>
  <div
  onClick={toggleSheet}
  className="flex flex-col items-center mb-2 cursor-pointer"
>
  <div className="w-12 h-1.5 bg-gray-400/60 rounded-full mb-2" />
  <span className="text-xs text-gray-500">Swipe up</span>
</div>
              <div className="h-full overflow-y-auto pr-1">
                {activeRide.status === "payment_pending" && !paymentProcessing ? (
                  <div className="text-center space-y-4">
                    <div className="h-16 w-16 bg-green-100 rounded-full flex items-center justify-center mx-auto text-green-600">
                      <CheckCircle className="w-8 h-8" />
                    </div>
                    <h2 className="text-2xl font-bold">Payment Pending</h2>
<div className="
bg-gradient-to-br from-primary/10 to-indigo-100
p-5 rounded-2xl
border border-primary/20
">
                      <p className="text-sm text-muted-foreground">
                        Total Fare
                      </p>
<p className="text-4xl font-extrabold text-primary tracking-tight">
                        ₹{activeRide.fare}
                      </p>
                    </div>
                    {paymentProcessing && (
                      <p className="text-sm text-blue-600 font-medium animate-pulse">
                        Processing Payment...
                      </p>
                    )}
                    <div className="grid grid-cols-2 gap-3">
                      <Button
                        className="h-12"
                        variant="outline"
                        disabled={paymentProcessing}
                        onClick={() => {
                          setPaymentMethod("cash");
                          handlePayment();
                        }}
                      >
                        {paymentProcessing ? (
                          <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                        ) : (
                          "Pay to Driver"
                        )}
                      </Button>

                      <Button
                        className="h-12"
                        disabled={paymentProcessing}
                        onClick={handleUPIPayment}
                      >
                        {paymentProcessing ? (
                          <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                        ) : (
                          "Pay to App"
                        )}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Please complete payment to finish the ride.
                    </p>
                  </div>
                ) : (
                  <motion.div
  initial={{ opacity: 0, y: 30 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.4 }}
  className="space-y-6"
>
                    {/* 🔥 Ride Progress Tracker */}
                    <div className="mb-6">
                      <div className="flex justify-between text-xs text-muted-foreground mb-2">
                        <span>Requested</span>
                        <span>Accepted</span>
                        <span>Arrived</span>
                        <span>Trip</span>
                        <span>Payment</span>
                      </div>

<div className="flex gap-2 mt-2">
  {[1, 2, 3, 4, 5].map((step) => (
    <div
      key={step}
      className={`
        h-2 flex-1 rounded-full transition-all duration-500
        ${
          getProgressStep() >= step
            ? "bg-gradient-to-r from-primary to-indigo-500"
            : "bg-gray-200"
        }
      `}
    />
  ))}
</div>
                    </div>

                    <div className="flex justify-between items-center border-b pb-4">
                      <div>
                        {activeRide.status === "accepted" && (
                          <>
                            <h3 className="font-bold text-lg">On the way</h3>
                            <p className="text-sm text-muted-foreground">
                              Driver arriving in{" "}
                              {driverEta
                                ? `${driverEta} min`
                                : "calculating..."}
                            </p>
                          </>
                        )}

                        {activeRide.status === "arrived" && (
                          <>
                            <h3 className="font-bold text-lg text-green-600">
                              Driver Arrived
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              Please share OTP to start ride
                            </p>
                          </>
                        )}

                        {activeRide.status === "ongoing" && (
                          <>
                            <h3 className="font-bold text-lg text-primary">
                              Trip in Progress
                            </h3>

                            <p className="text-sm text-muted-foreground">
                              Trip Time: {formatTime(tripSeconds)}
                            </p>
                          </>
                        )}
                      </div>
                      {activeRide.status === "arrived" && (
                        <div className="bg-primary/10 px-3 py-1 rounded-full text-primary font-bold text-sm">
                          OTP: {activeRide?.otp}
                        </div>
                      )}
                    </div>

<div className="
flex items-center gap-4
bg-white/70 backdrop-blur-xl
p-4 rounded-2xl
border border-gray-200
shadow-sm
">
<div className="h-14 w-14 rounded-full overflow-hidden ring-2 ring-primary/20">
                        <img
                          src="https://images.unsplash.com/photo-1633332755192-727a05c4013d?w=100&h=100&fit=crop"
                          alt="Driver"
                        />
                      </div>
                      <div>
                        <p className="font-bold text-lg">
  {driver?.name || "Driver"}
</p>

<p className="text-sm text-muted-foreground">
  {driver?.vehicleType?.toUpperCase() || "VEHICLE"} •{" "}
  {driver?.vehicleNumber
    ? driver.vehicleNumber
        .toUpperCase()
        .replace(/(.{2})(.{2})(.{2})(.{4})/, "$1 $2 $3 $4")
    : "----"}
</p>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <Button
                        className="flex-1"
                        variant="outline"
                        onClick={() => {
                          if (!driver?.phone) {
                            alert("Driver phone not available");
                            return;
                          }

                          window.location.href = `tel:${driver.phone}`;
                        }}
                      >
                        Call Driver
                      </Button>
                      <Button
                        className="flex-1"
                        variant="destructive"
                        onClick={() => {
                          const confirmCall = window.confirm(
                            "Call National Emergency Helpline (112)?",
                          );

                          if (confirmCall) {
                            window.location.href = "tel:112";
                          }
                        }}
                      >
                        Emergency
                      </Button>
                    </div>
                    {activeRide.status === "accepted" && (
                      <Button
                        className="w-full mt-3"
                        variant="destructive"
                        onClick={handleCancelRide}
                      >
                        Cancel Ride
                      </Button>
                    )}
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
