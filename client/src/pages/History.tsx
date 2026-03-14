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
    <div className="h-screen bg-white p-4 pb-24">
      <h1 className="text-2xl font-bold mb-6">Ride History</h1>

      {!rides || rides.length === 0 ? (
        <p className="text-muted-foreground">No completed rides yet.</p>
      ) : (
        <div className="space-y-4">
          {rides.map((ride: any) => (
            <Card key={ride.id} className="p-4 shadow-sm">
              <div className="flex justify-between items-center mb-2">
                <p className="font-semibold capitalize">{ride.vehicleType}</p>
                <p className="font-bold text-primary">
                  ₹{Math.round(Number(ride.fare))}
                </p>
              </div>

              <div className="text-sm text-muted-foreground space-y-1">
                <p>Distance: {Number(ride.distanceKm).toFixed(2)} km</p>
                <p>Payment: {ride.paymentMethod}</p>
                <p>Date: {new Date(ride.createdAt).toLocaleDateString()}</p>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
