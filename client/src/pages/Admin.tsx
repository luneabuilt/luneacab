import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent } from "@/components/ui/card";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

export default function Admin() {
  const { user } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [revenueData, setRevenueData] = useState<any[]>([]);
  const [rides, setRides] = useState<any[]>([]);
  const [pendingDrivers, setPendingDrivers] = useState<any[]>([]);

  useEffect(() => {
    if (!user || user.role !== "admin") return;

    fetch("/api/admin/drivers/pending", {
  headers: {
    "x-user-id": user.id.toString(),
  },
})
  .then((res) => res.json())
  .then((data) => {
    if (Array.isArray(data)) {
      setPendingDrivers(data);
    } else {
      setPendingDrivers([]);
    }
  })
  .catch(() => setPendingDrivers([]));

    // Fetch stats
    fetch("/api/admin/stats", {
      headers: {
        "x-user-id": user.id.toString(),
      },
    })
      .then((res) => res.json())
      .then(setStats);

    fetch("/api/admin/rides", {
      headers: {
        "x-user-id": user.id.toString(),
      },
    })
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setRides(data);
        } else {
          setRides([]);
        }
      })
      .catch(() => setRides([]));

    // Fetch daily revenue
    fetch("/api/admin/revenue-daily", {
      headers: {
        "x-user-id": user.id.toString(),
      },
    })
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setRevenueData(data);
        } else {
          setRevenueData([]);
        }
      })
      .catch(() => setRevenueData([]));
  }, [user]);

  const approveDriver = async (id: number) => {
  if (!user) return; // ✅ ADD THIS LINE

  await fetch(`/api/admin/drivers/${id}/approve`, {
    method: "PATCH",
    headers: {
      "x-user-id": user.id.toString(),
    },
  });

  setPendingDrivers((prev) => prev.filter((d) => d.id !== id));
};

const rejectDriver = async (id: number) => {
  if (!user) return; // ✅ ADD THIS LINE

  await fetch(`/api/admin/drivers/${id}/reject`, {
    method: "PATCH",
    headers: {
      "x-user-id": user.id.toString(),
    },
  });

  setPendingDrivers((prev) => prev.filter((d) => d.id !== id));
};

  if (!user || user.role !== "admin") {
    return <div className="p-6 text-center">Unauthorized</div>;
  }

  if (!stats) {
    return <div className="p-6 text-center">Loading Admin Dashboard...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold">Admin Dashboard</h1>

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="text-2xl font-bold">{stats.totalUsers}</div>
            <div>Total Users</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="text-2xl font-bold">{stats.totalDrivers}</div>
            <div>Total Drivers</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="text-2xl font-bold">{stats.totalPassengers}</div>
            <div>Total Passengers</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="text-2xl font-bold">{stats.totalCompleted}</div>
            <div>Completed Rides</div>
          </CardContent>
        </Card>

        <Card className="col-span-2">
          <CardContent className="p-6">
            <div className="text-2xl font-bold">
              ₹{Number(stats.totalCommission).toFixed(2)}
            </div>
            <div>Total Commission Earned</div>
          </CardContent>
        </Card>

        <Card className="col-span-2">
          <CardContent className="p-6">
            <h2 className="text-xl font-semibold mb-4">
              Daily Commission Revenue
            </h2>

            {revenueData.length === 0 && (
              <p className="text-sm text-muted-foreground mb-4">
                No revenue data available yet.
              </p>
            )}

            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={revenueData || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="#6366f1"
                  strokeWidth={3}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="col-span-2">
          <CardContent className="p-6">
            <h2 className="text-xl font-semibold mb-4">All Ride History</h2>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">Ride ID</th>
                    <th className="text-left py-2">Passenger</th>
                    <th className="text-left py-2">Driver</th>
                    <th className="text-left py-2">Status</th>
                    <th className="text-left py-2">Fare</th>
                    <th className="text-left py-2">Commission</th>
                    <th className="text-left py-2">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {rides.map((ride) => (
                    <tr key={ride.id} className="border-b">
                      <td className="py-2">{ride.id}</td>
                      <td className="py-2">{ride.passengerId}</td>
                      <td className="py-2">{ride.driverId || "-"}</td>
                      <td className="py-2">{ride.status}</td>
                      <td className="py-2">₹{Number(ride.fare).toFixed(2)}</td>
                      <td className="py-2">
                        ₹{Number(ride.commission).toFixed(2)}
                      </td>
                      <td className="py-2">
                        {ride.createdAt
                          ? new Date(ride.createdAt).toLocaleDateString()
                          : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
        <Card className="col-span-2">
  <CardContent className="p-6 max-h-[400px] overflow-y-auto">
    <h2 className="text-xl font-bold mb-4 flex items-center justify-between">
  Pending Driver Approvals
  <span className="text-sm text-muted-foreground">
    {pendingDrivers.length} requests
  </span>
</h2>

    {pendingDrivers.length === 0 && (
      <p className="text-sm text-muted-foreground">
        No pending drivers
      </p>
    )}

    <div className="space-y-3">
      {pendingDrivers.map((driver) => (
<div
  key={driver.id}
  className="border p-4 rounded-xl shadow-sm bg-white space-y-3"
>
  {/* 🔹 DRIVER BASIC INFO */}
  <div className="flex justify-between items-center">
    <div>
      <p className="font-semibold text-base">{driver.name}</p>
      <p className="text-sm text-muted-foreground">{driver.phone}</p>
      <p className="text-xs">
        Vehicle: {driver.vehicleType || "-"}
      </p>
    </div>

    <div className="flex gap-2">
      <button
        onClick={() => approveDriver(driver.id)}
        className="bg-green-600 hover:bg-green-700 text-white px-4 py-1.5 rounded-lg text-sm"
      >
        Approve
      </button>

      <button
        onClick={() => rejectDriver(driver.id)}
        className="bg-red-600 hover:bg-red-700 text-white px-4 py-1.5 rounded-lg text-sm"
      >
        Reject
      </button>
    </div>
  </div>

  {/* 🔥 DOCUMENTS SECTION */}
  <div className="grid grid-cols-3 gap-3 mt-3">

    {/* Profile */}
    {driver.profileImageUrl && (
      <div>
        <p className="text-xs mb-1">Profile</p>
        <img
          src={driver.profileImageUrl}
          alt="profile"
          className="h-24 w-full object-cover rounded-lg border"
        />
      </div>
    )}

    {/* License */}
    {driver.licenseUrl && (
      <div>
        <p className="text-xs mb-1">License</p>
        <img
          src={driver.licenseUrl}
          alt="license"
          className="h-24 w-full object-cover rounded-lg border"
        />
      </div>
    )}

    {/* Vehicle */}
    {driver.vehicleImageUrl && (
      <div>
        <p className="text-xs mb-1">Vehicle</p>
        <img
          src={driver.vehicleImageUrl}
          alt="vehicle"
          className="h-24 w-full object-cover rounded-lg border"
        />
      </div>
    )}

  </div>
</div>
      ))}
    </div>
  </CardContent>
</Card>
      </div>
    </div>
  );
}
