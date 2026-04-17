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

  let todayTotal = 0;
  let todayDriver = 0;
  let weeklyDriver = 0;
  let monthlyDriver = 0;
  let totalDriver = 0;
  let totalCommission = 0;

  let filteredRides = rides || [];

  filteredRides = filteredRides.filter((ride: any) => {
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

  rides?.forEach((ride: any) => {
    const rideDate = new Date(ride.createdAt);
    const fare = Number(ride.fare || 0);
    const driverEarning = Number(ride.driverEarning || 0);
    const commission = Number(ride.commission || 0);

    totalDriver += driverEarning;
    totalCommission += commission;

    if (rideDate.toDateString() === todayStr) {
      todayTotal += fare;
      todayDriver += driverEarning;
    }

    if (rideDate >= startOfWeek) {
      weeklyDriver += driverEarning;
    }

    if (rideDate >= startOfMonth) {
      monthlyDriver += driverEarning;
    }
  });

  const last7DaysData: { day: string; earnings: number }[] = [];

  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);

    const dayString = date.toDateString();
    let dailyEarning = 0;

    rides?.forEach((ride: any) => {
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

  return (
    <div className="min-h-screen bg-gray-50 pb-24">

      {/* HEADER */}
      <div className="bg-gradient-to-r from-emerald-500 to-green-600 text-white p-6 rounded-b-3xl shadow">
        <h1 className="text-2xl font-bold">💰 Earnings</h1>
        <p className="text-sm opacity-90">Your performance overview</p>

        <p className="mt-3 text-3xl font-bold">
          ₹{totalDriver.toFixed(0)}
        </p>
      </div>

      <div className="p-4 space-y-6">

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
          <Card className="p-4 rounded-xl shadow-sm border bg-white">
            <p className="text-xs text-muted-foreground">Today</p>
            <p className="text-lg font-semibold">
              ₹{todayDriver.toFixed(0)}
            </p>
          </Card>

          <Card className="p-4 rounded-xl shadow-sm border bg-white">
            <p className="text-xs text-muted-foreground">This Week</p>
            <p className="text-lg font-semibold">
              ₹{weeklyDriver.toFixed(0)}
            </p>
          </Card>

          <Card className="p-4 rounded-xl shadow-sm border bg-white">
            <p className="text-xs text-muted-foreground">This Month</p>
            <p className="text-lg font-semibold">
              ₹{monthlyDriver.toFixed(0)}
            </p>
          </Card>

          <Card className="p-4 rounded-xl shadow-sm border bg-white">
            <p className="text-xs text-muted-foreground">Commission</p>
            <p className="text-lg font-semibold text-red-500">
              ₹{totalCommission.toFixed(0)}
            </p>
          </Card>
        </div>

        {/* CHART */}
        <Card className="p-5 rounded-2xl shadow-sm border bg-white">
          <p className="text-sm font-medium mb-3">
            Last 7 Days Earnings
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