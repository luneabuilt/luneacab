import { useAuth } from "@/hooks/use-auth";
import { useRideHistory } from "@/hooks/use-api";
import { Card } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { useState } from "react";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

export default function Earnings() {
  const { user } = useAuth();
  const { data: rides, isLoading } = useRideHistory(user?.id);

  const [filter, setFilter] = useState("all");

  if (!user?.isOnline && (!rides || rides.length === 0)) {
    return (
      <div className="h-screen flex items-center justify-center text-muted-foreground">
        Go online and complete rides to see earnings.
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  const now = new Date();
  const todayStr = now.toDateString();

  const startOfWeek = new Date();
  startOfWeek.setDate(now.getDate() - 7);

  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  // 🔥 APPLY FILTER TO RIDES
  const filteredRides = (rides || []).filter((ride: any) => {
    const rideDate = new Date(ride.createdAt);

    if (filter === "today") {
      return rideDate.toDateString() === todayStr;
    }

    if (filter === "week") {
      return rideDate >= startOfWeek;
    }

    if (filter === "month") {
      return rideDate >= startOfMonth;
    }

    return true;
  });

  // 🔥 CALCULATE BASED ON FILTERED DATA
  let totalDriver = 0;
  let totalCommission = 0;
  let totalFare = 0;

  filteredRides.forEach((ride: any) => {
    totalDriver += Number(ride.driverEarning || 0);
    totalCommission += Number(ride.commission || 0);
    totalFare += Number(ride.fare || 0);
  });

  // 🔥 LAST 7 DAYS CHART (ALSO FILTER AWARE)
  const last7DaysData: { day: string; earnings: number }[] = [];

  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);

    const dayString = date.toDateString();
    let dailyEarning = 0;

    filteredRides.forEach((ride: any) => {
      const rideDate = new Date(ride.createdAt).toDateString();
      if (rideDate === dayString) {
        dailyEarning += Number(ride.driverEarning || 0);
      }
    });

    last7DaysData.push({
      day: date.toLocaleDateString("en-IN", { weekday: "short" }),
      earnings: dailyEarning,
    });
  }

  const subscribe = async (plan: string) => {
  await fetch("/api/driver/subscribe", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-user-id": user?.id?.toString() || "",
    },
    body: JSON.stringify({
      driverId: user?.id,
      plan,
    }),
  });

  alert("Subscription activated!");
};

  return (
    <div className="min-h-screen bg-gray-50 pb-24">

      {/* HEADER */}
      <div className="bg-gradient-to-r from-emerald-500 to-green-600 text-white p-6 rounded-b-3xl shadow">
        <h1 className="text-2xl font-bold">💰 Earnings</h1>
        <p className="text-sm opacity-90 capitalize">
          {filter} summary
        </p>

        <p className="mt-3 text-3xl font-bold">
          ₹{totalDriver.toFixed(0)}
        </p>
      </div>

      <div className="p-4 space-y-6">

{user?.role === "driver" && (
  <div className="bg-white p-4 rounded-xl border">
    <h2 className="text-lg font-bold mb-2">🚀 Subscription Plans</h2>

    <p className="text-sm mb-2">
      Current: {user.subscriptionType || "None"}
    </p>

    <p className="text-xs mb-3">
      Valid Till: {user.subscriptionEnd || "N/A"}
    </p>

    {/* BIKE */}
    {user.vehicleType === "bike" && (
      <div className="space-y-2">
        <button onClick={() => subscribe("daily")} className="w-full bg-black text-white py-2 rounded">
          Daily ₹19
        </button>
        <button onClick={() => subscribe("weekly")} className="w-full bg-black text-white py-2 rounded">
          Weekly ₹99
        </button>
        <button onClick={() => subscribe("monthly")} className="w-full bg-black text-white py-2 rounded">
          Monthly ₹299
        </button>
      </div>
    )}

    {/* AUTO */}
    {user.vehicleType === "auto" && (
      <div className="space-y-2">
        <button onClick={() => subscribe("daily")} className="w-full bg-black text-white py-2 rounded">
          Daily ₹59
        </button>
        <button onClick={() => subscribe("weekly")} className="w-full bg-black text-white py-2 rounded">
          Weekly ₹249
        </button>
        <button onClick={() => subscribe("monthly")} className="w-full bg-black text-white py-2 rounded">
          Monthly ₹999
        </button>
      </div>
    )}

    {/* CAR */}
    {user.vehicleType === "car" && (
      <div className="space-y-2">
        <button onClick={() => subscribe("daily")} className="w-full bg-black text-white py-2 rounded">
          Daily ₹99
        </button>
        <button onClick={() => subscribe("weekly")} className="w-full bg-black text-white py-2 rounded">
          Weekly ₹449
        </button>
        <button onClick={() => subscribe("monthly")} className="w-full bg-black text-white py-2 rounded">
          Monthly ₹1499
        </button>
      </div>
    )}
  </div>
)}

        {/* 💼 WALLET SECTION */}
<div className="bg-white rounded-2xl shadow-md p-4 border">
  <h2 className="text-lg font-semibold mb-3">💼 Driver Wallet</h2>

  <div className="grid grid-cols-2 gap-4">

    {/* Pending Commission */}
    <div className="p-3 rounded-xl bg-red-50 border">
      <p className="text-xs text-muted-foreground">Pending Commission</p>
      <p className="text-xl font-bold text-red-600">
        ₹{Number(user?.walletBalance || 0).toFixed(0)}
      </p>
    </div>

    {/* Paid */}
    <div className="p-3 rounded-xl bg-green-50 border">
      <p className="text-xs text-muted-foreground">Paid to App</p>
      <p className="text-xl font-bold text-green-600">
        ₹{Number(user?.walletPaid || 0).toFixed(0)}
      </p>
    </div>

  </div>

  {/* UPI Button */}
  <button
    onClick={() => {
      window.location.href = `upi://pay?pa=7002491493@kotak811&pn=CabApp&am=${user?.walletBalance || 0}`;
    }}
    className="mt-4 w-full bg-black text-white py-2 rounded-xl"
  >
    Pay Commission via UPI
  </button>
</div>

        {/* FILTERS */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {["all", "today", "week", "month"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded-full text-sm whitespace-nowrap ${
                filter === f
                  ? "bg-green-600 text-white"
                  : "bg-white border"
              }`}
            >
              {f.toUpperCase()}
            </button>
          ))}
        </div>

        {/* STATS */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="p-4 rounded-xl border bg-white">
            <p className="text-xs text-muted-foreground">Your Earnings</p>
            <p className="text-lg font-semibold">
              ₹{totalDriver.toFixed(0)}
            </p>
          </Card>

          <Card className="p-4 rounded-xl border bg-white">
            <p className="text-xs text-muted-foreground">Total Fare</p>
            <p className="text-lg font-semibold">
              ₹{totalFare.toFixed(0)}
            </p>
          </Card>

          <Card className="p-4 rounded-xl border bg-white">
            <p className="text-xs text-muted-foreground">Commission</p>
            <p className="text-lg font-semibold text-red-500">
              ₹{totalCommission.toFixed(0)}
            </p>
          </Card>

          <Card className="p-4 rounded-xl border bg-white">
            <p className="text-xs text-muted-foreground">Rides</p>
            <p className="text-lg font-semibold">
              {filteredRides.length}
            </p>
          </Card>
        </div>

        {/* CHART */}
        <Card className="p-5 rounded-2xl border bg-white">
          <p className="text-sm font-medium mb-3">
            Earnings Trend
          </p>

          <div style={{ width: "100%", height: 220 }}>
            <ResponsiveContainer>
              <LineChart data={last7DaysData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="earnings"
                  stroke="#16a34a"
                  strokeWidth={3}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* RIDES */}
        <div>
          <h2 className="text-lg font-semibold mb-3">
            Ride History
          </h2>

          {filteredRides.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No rides found
            </p>
          ) : (
            <div className="space-y-3">
              {filteredRides.map((ride: any) => (
                <Card
                  key={ride.id}
                  className="p-4 rounded-xl border bg-white hover:shadow-md transition"
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium capitalize">
                        {ride.vehicleType}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(
                          ride.createdAt
                        ).toLocaleDateString()}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="font-bold text-green-600">
                        ₹{Number(ride.driverEarning).toFixed(0)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Fee ₹
                        {Number(ride.commission).toFixed(0)}
                      </p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}