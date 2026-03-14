import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import PassengerHome from "./PassengerHome";
import DriverDashboard from "./DriverDashboard";
import { useEffect } from "react";

export default function Home() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!user) {
      setLocation("/auth");
    }
  }, [user, setLocation]);

  if (!user) return null;

  return user.role === "driver" ? <DriverDashboard /> : <PassengerHome />;
}
