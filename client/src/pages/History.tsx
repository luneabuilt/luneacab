import { useAuth } from "@/hooks/use-auth";
import { useRideHistory } from "@/hooks/use-api";
import { Card } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

export default function History() {
  const { user } = useAuth();
  const { data: rides, isLoading } = useRideHistory(user?.id);

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white pb-24">

      {/* 🔥 HEADER */}
      <div className="p-4 pt-6">
        <h1 className="text-2xl font-semibold">🧾 Ride History</h1>
        <p className="text-sm text-muted-foreground">
          All your completed trips
        </p>
      </div>

      <div className="px-4 space-y-4">

        {!rides || rides.length === 0 ? (
          <div className="text-center mt-20 text-muted-foreground">
            No completed rides yet.
          </div>
        ) : (
          rides.map((ride: any) => (
            <Card
              key={ride.id}
              className="p-4 rounded-2xl border shadow-sm bg-white hover:shadow-md transition"
            >

              {/* TOP */}
              <div className="flex justify-between items-center mb-3">
                <div>
                  <p className="font-semibold capitalize">
                    {ride.vehicleType}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(
                      ride.createdAt
                    ).toLocaleDateString()}
                  </p>
                </div>

                <p className="text-lg font-bold text-primary">
                  ₹{Math.round(Number(ride.fare))}
                </p>
              </div>

              {/* DIVIDER */}
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

                {/* OPTIONAL DRIVER VIEW */}
                {ride.driverEarning && (
                  <div className="flex justify-between text-green-600 font-medium">
                    <span>Your Earnings</span>
                    <span>
                      ₹{Number(ride.driverEarning).toFixed(0)}
                    </span>
                  </div>
                )}

              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}