import { useAuth } from "@/hooks/use-auth";
import { useRideHistory } from "@/hooks/use-api";
import { Card } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

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

      {/* 🔥 HEADER */}
      <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white p-6 rounded-b-3xl shadow-lg">
        <h1 className="text-2xl font-bold">💰 Earnings</h1>
        <p className="text-sm opacity-90">Track your income & performance</p>

        <div className="mt-4">
          <p className="text-sm">Total Earnings</p>
          <p className="text-3xl font-bold">
            ₹{totalDriver.toFixed(0)}
          </p>
        </div>
      </div>

      <div className="p-4 space-y-6">

        {/* TODAY */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="p-4 rounded-xl shadow border">
            <p className="text-xs text-muted-foreground">Today Total</p>
            <p className="text-xl font-bold">
              ₹{todayTotal.toFixed(0)}
            </p>
          </Card>

          <Card className="p-4 rounded-xl shadow border bg-green-50">
            <p className="text-xs text-muted-foreground">You Earned</p>
            <p className="text-2xl font-bold text-green-600">
              ₹{todayDriver.toFixed(0)}
            </p>
          </Card>
        </div>

        {/* WEEK / MONTH */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="p-4 rounded-xl shadow border">
            <p className="text-xs text-muted-foreground">Last 7 Days</p>
            <p className="text-lg font-semibold">
              ₹{weeklyDriver.toFixed(0)}
            </p>
          </Card>

          <Card className="p-4 rounded-xl shadow border">
            <p className="text-xs text-muted-foreground">This Month</p>
            <p className="text-lg font-semibold">
              ₹{monthlyDriver.toFixed(0)}
            </p>
          </Card>
        </div>

        {/* LIFETIME */}
        <Card className="p-5 rounded-2xl shadow-lg border bg-white">
          <p className="text-sm text-muted-foreground">Lifetime Earnings</p>
          <p className="text-2xl font-bold text-primary">
            ₹{totalDriver.toFixed(0)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Commission Paid: ₹{totalCommission.toFixed(0)}
          </p>
        </Card>

        {/* CHART */}
        <Card className="p-5 rounded-2xl shadow border">
          <p className="text-sm font-medium mb-3">
            Last 7 Days Performance
          </p>

          <div style={{ width: "100%", height: 250 }}>
            <ResponsiveContainer>
              <LineChart data={last7DaysData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="earnings"
                  stroke="#22c55e"
                  strokeWidth={3}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* RIDES */}
        <div>
          <h2 className="text-lg font-semibold mb-3">
            Completed Rides
          </h2>

          {!rides || rides.length === 0 ? (
            <p className="text-muted-foreground">
              No rides completed yet.
            </p>
          ) : (
            <div className="space-y-3">
              {rides.map((ride: any) => (
                <Card
                  key={ride.id}
                  className="p-4 rounded-xl shadow-sm border hover:shadow-md transition"
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
                        Commission ₹
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