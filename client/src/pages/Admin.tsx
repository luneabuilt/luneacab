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
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [walletDrivers, setWalletDrivers] = useState<any[]>([]);

  useEffect(() => {
    if (!user || user.role !== "admin") return;

    fetch("/api/admin/drivers/pending", {
      headers: { "x-user-id": user.id.toString() },
    })
      .then((res) => res.json())
      .then((data) => setPendingDrivers(Array.isArray(data) ? data : []))
      .catch(() => setPendingDrivers([]));

    fetch("/api/admin/stats", {
      headers: { "x-user-id": user.id.toString() },
    })
      .then((res) => res.json())
      .then(setStats);

    fetch("/api/admin/rides", {
      headers: { "x-user-id": user.id.toString() },
    })
      .then((res) => res.json())
      .then((data) => setRides(Array.isArray(data) ? data : []))
      .catch(() => setRides([]));

      fetch("/api/admin/wallet/pending", {
  headers: { "x-user-id": user.id.toString() },
})
  .then((res) => res.json())
  .then((data) => setWalletDrivers(Array.isArray(data) ? data : []))
  .catch(() => setWalletDrivers([]));

    fetch("/api/admin/revenue-daily", {
      headers: { "x-user-id": user.id.toString() },
    })
      .then((res) => res.json())
      .then((data) => setRevenueData(Array.isArray(data) ? data : []))
      .catch(() => setRevenueData([]));
  }, [user]);

  const approveDriver = async (id: number) => {
    if (!user) return;

    await fetch(`/api/admin/drivers/${id}/approve`, {
      method: "PATCH",
      headers: { "x-user-id": user.id.toString() },
    });

    setPendingDrivers((prev) => prev.filter((d) => d.id !== id));
  };


  const markWalletPaid = async (id: number) => {
  if (!user) return;

  await fetch(`/api/admin/wallet/${id}/pay`, {
    method: "PATCH",
    headers: { "x-user-id": user.id.toString() },
  });

  setWalletDrivers((prev) => prev.filter((d) => d.id !== id));
};



  const rejectDriver = async (id: number) => {
    if (!user) return;

    await fetch(`/api/admin/drivers/${id}/reject`, {
      method: "PATCH",
      headers: { "x-user-id": user.id.toString() },
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

      {/* 🔥 HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">🚀 Admin Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Manage drivers, rides & earnings
          </p>
        </div>

        <div className="bg-white px-4 py-2 rounded-xl shadow text-sm">
          👤 {user.phone}
        </div>
      </div>

      {/* 🔥 STATS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="rounded-2xl shadow">
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Users</p>
            <p className="text-2xl font-bold">{stats.totalUsers}</p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl shadow">
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Drivers</p>
            <p className="text-2xl font-bold">{stats.totalDrivers}</p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl shadow">
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Passengers</p>
            <p className="text-2xl font-bold">{stats.totalPassengers}</p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl shadow">
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Completed</p>
            <p className="text-2xl font-bold">{stats.totalCompleted}</p>
          </CardContent>
        </Card>
      </div>

      {/* 🔥 REVENUE */}
      <Card className="rounded-2xl shadow-lg">
        <CardContent className="p-6">
          <div className="flex justify-between mb-4">
            <h2 className="text-xl font-semibold">Revenue</h2>
            <p className="text-lg font-bold text-green-600">
              ₹{Number(stats.totalCommission).toFixed(2)}
            </p>
          </div>

          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="revenue" strokeWidth={3} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

            {/* 🔥 DRIVER APPROVALS */}
      <Card className="rounded-2xl shadow">
        <CardContent className="p-6">
          <h2 className="text-xl font-bold mb-4 flex justify-between">
            Pending Drivers
            <span className="text-sm text-muted-foreground">
              {pendingDrivers.length}
            </span>
          </h2>

          {pendingDrivers.length === 0 && (
            <div className="text-center py-10 text-muted-foreground">
              🚫 No pending driver requests
            </div>
          )}

          <div className="space-y-3">
            {pendingDrivers.map((driver) => (
              <div
                key={driver.id}
                className="border rounded-2xl p-4 bg-white shadow-sm hover:shadow-xl transition"
              >
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-semibold">{driver.name}</p>
                    <span className="text-xs px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full">
                      Pending
                    </span>
                    <p className="text-sm text-muted-foreground">
                      {driver.phone}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => approveDriver(driver.id)}
                      className="bg-green-500 text-white px-4 py-2 rounded-xl"
                    >
                      Approve
                    </button>

                    <button
                      onClick={() => rejectDriver(driver.id)}
                      className="bg-red-500 text-white px-4 py-2 rounded-xl"
                    >
                      Reject
                    </button>
                  </div>
                </div>

                {/* DOCUMENTS */}
                <div className="grid grid-cols-3 gap-3 mt-3">
                  {driver.profileImageUrl && (
                    <img
                      src={driver.profileImageUrl}
                      onClick={() => setPreviewImage(driver.profileImageUrl)}
                      className="h-24 w-full object-cover rounded-lg cursor-pointer"
                    />
                  )}

                  {driver.licenseUrl && (
                    <img
                      src={driver.licenseUrl}
                      onClick={() => setPreviewImage(driver.licenseUrl)}
                      className="h-24 w-full object-cover rounded-lg cursor-pointer"
                    />
                  )}

                  {driver.vehicleImageUrl && (
                    <img
                      src={driver.vehicleImageUrl}
                      onClick={() => setPreviewImage(driver.vehicleImageUrl)}
                      className="h-24 w-full object-cover rounded-lg cursor-pointer"
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 🔥 DRIVER WALLET CONTROL */}
<Card className="rounded-2xl shadow">
  <CardContent className="p-6">
    <h2 className="text-xl font-bold mb-4 flex justify-between">
      Driver Wallet (Pending Payments)
      <span className="text-sm text-muted-foreground">
        {walletDrivers.length}
      </span>
    </h2>

    {walletDrivers.length === 0 && (
      <div className="text-center py-8 text-muted-foreground">
        ✅ All drivers cleared
      </div>
    )}

    <div className="space-y-3">
      {walletDrivers.map((driver) => (
        <div
          key={driver.id}
          className="border rounded-xl p-4 bg-white flex justify-between items-center"
        >
          <div>
            <p className="font-semibold">{driver.name}</p>
            <p className="text-sm text-muted-foreground">
              {driver.phone}
            </p>

            <p className="text-red-600 font-bold mt-1">
              ₹{Number(driver.walletBalance).toFixed(0)} pending
            </p>
          </div>

          <button
            onClick={() => markWalletPaid(driver.id)}
            className="bg-green-600 text-white px-4 py-2 rounded-xl"
          >
            Mark Paid
          </button>
        </div>
      ))}
    </div>
  </CardContent>
</Card>

      {/* 🔥 RIDE HISTORY */}
      <Card className="rounded-2xl shadow">
        <CardContent className="p-6">
          <h2 className="text-xl font-semibold mb-4">Ride History</h2>

          <div className="overflow-x-auto max-h-[350px] overflow-y-auto">
            <table className="w-full text-sm border rounded-xl overflow-hidden">
              <thead className="sticky top-0 bg-white z-10">
                <tr className="border-b bg-gray-50">
                  <th className="py-2 text-left">Ride</th>
                  <th className="text-left">Passenger</th>
                  <th className="text-left">Driver</th>
                  <th className="text-left">Status</th>
                  <th className="text-left">Fare</th>
                  <th className="text-left">Commission</th>
                  <th className="text-left">Date</th>
                </tr>
              </thead>

              <tbody>
                {[...rides]
  .sort(
    (a, b) =>
      new Date(b.createdAt).getTime() -
      new Date(a.createdAt).getTime()
  )
  .map((ride) => (
                  <tr key={ride.id} className="border-b hover:bg-gray-50 text-xs">
                    <td className="py-1.5">{ride.id}</td>
                    <td>{ride.passengerId}</td>
                    <td>{ride.driverId || "-"}</td>
                    <td>
  <span
    className={`px-2 py-1 rounded-full text-xs font-medium
    ${
      ride.status === "completed"
        ? "bg-green-100 text-green-700"
        : ride.status === "cancelled"
        ? "bg-red-100 text-red-700"
        : "bg-yellow-100 text-yellow-700"
    }`}
  >
    {ride.status}
  </span>
</td>
                    <td>₹{Number(ride.fare).toFixed(2)}</td>
                    <td>₹{Number(ride.commission).toFixed(2)}</td>
                    <td>
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


      {/* 🔥 IMAGE PREVIEW */}
      {previewImage && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50"
          onClick={() => setPreviewImage(null)}
        >
          <img
            src={previewImage}
            className="max-h-[90%] max-w-[90%] rounded-lg"
          />
        </div>
      )}
    </div>
  );
}