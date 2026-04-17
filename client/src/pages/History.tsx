import { useAuth } from "@/hooks/use-auth";
import { useRideHistory } from "@/hooks/use-api";
import { Card } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { useState } from "react";

export default function History() {
  const { user } = useAuth();
  const { data: rides, isLoading } = useRideHistory(user?.id);

  const [filter, setFilter] = useState("all");
  const [selectedRide, setSelectedRide] = useState<any>(null);

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  // 🔥 FILTER LOGIC
  const now = new Date();

  const filteredRides = (rides || []).filter((ride: any) => {
    const date = new Date(ride.createdAt);

    if (filter === "today") {
      return date.toDateString() === now.toDateString();
    }

    if (filter === "week") {
      const weekAgo = new Date();
      weekAgo.setDate(now.getDate() - 7);
      return date >= weekAgo;
    }

    if (filter === "month") {
      return (
        date.getMonth() === now.getMonth() &&
        date.getFullYear() === now.getFullYear()
      );
    }

    return true;
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white pb-24">

      {/* 🔥 HEADER */}
      <div className="p-4 pt-6">
        <h1 className="text-2xl font-semibold">🧾 Ride History</h1>
        <p className="text-sm text-muted-foreground">
          Your completed & paid rides
        </p>
      </div>

      {/* 🔥 FILTER BUTTONS */}
      <div className="px-4 flex gap-2 mb-4">
        {["all", "today", "week", "month"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-full text-sm capitalize ${
              filter === f
                ? "bg-black text-white"
                : "bg-gray-100 text-gray-700"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="px-4 space-y-4">

        {!filteredRides || filteredRides.length === 0 ? (
          <div className="text-center mt-20 text-muted-foreground">
            No rides found.
          </div>
        ) : (
          filteredRides.map((ride: any) => (
            <Card
              key={ride.id}
              onClick={() => setSelectedRide(ride)}
              className="p-4 rounded-2xl border shadow-sm bg-white hover:shadow-md transition cursor-pointer"
            >

              {/* TOP */}
              <div className="flex justify-between items-center mb-3">
                <div>
                  <p className="font-semibold capitalize">
                    {ride.vehicleType}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(ride.createdAt).toLocaleDateString()}
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-lg font-bold text-primary">
                    ₹{Math.round(Number(ride.fare))}
                  </p>

                  <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-600">
                    Completed
                  </span>
                </div>
              </div>

              {/* DETAILS */}
              <div className="border-t pt-3 text-sm text-muted-foreground space-y-1">

                <div className="flex justify-between">
                  <span>Distance</span>
                  <span>
                    {Number(ride.distanceKm).toFixed(2)} km
                  </span>
                </div>

                <div className="flex justify-between">
                  <span>Payment</span>
                  <span className="capitalize">
                    {ride.paymentMethod}
                  </span>
                </div>

              </div>
            </Card>
          ))
        )}
      </div>

      {/* 🔥 MODAL (RIDE DETAILS) */}
      {selectedRide && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50"
          onClick={() => setSelectedRide(null)}
        >
          <div
            className="bg-white rounded-2xl p-6 w-[90%] max-w-md space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold">
              Ride #{selectedRide.id}
            </h2>

            <div className="text-sm space-y-2">
              <p>
                <strong>Vehicle:</strong>{" "}
                {selectedRide.vehicleType}
              </p>

              <p>
                <strong>Distance:</strong>{" "}
                {Number(selectedRide.distanceKm).toFixed(2)} km
              </p>

              <p>
                <strong>Fare Paid:</strong> ₹
                {Math.round(Number(selectedRide.fare))}
              </p>

              <p>
                <strong>Payment Method:</strong>{" "}
                {selectedRide.paymentMethod}
              </p>

              <p>
                <strong>Date:</strong>{" "}
                {new Date(
                  selectedRide.createdAt
                ).toLocaleString()}
              </p>
            </div>

            <button
              onClick={() => setSelectedRide(null)}
              className="w-full bg-black text-white py-2 rounded-lg"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}