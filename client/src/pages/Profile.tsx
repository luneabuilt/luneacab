import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useUpdateProfile } from "@/hooks/use-api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, User, Save, LogOut } from "lucide-react";

export default function Profile() {
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();
  const updateProfile = useUpdateProfile();

  const form = useForm({
  defaultValues: {
    name: "",
    role: "passenger",
    vehicleType: "bike",
    vehicleNumber: "",
    upiId: "",
  },
});

  // ✅ Reset form when user loads
useEffect(() => {
  if (!user || !user.id) return;

  setTimeout(() => {
    form.reset({
      name: user.name || "",
      role: user.role || "passenger",
      vehicleType: user.vehicleType || "bike",
      vehicleNumber: user.vehicleNumber || "",
      upiId: user.upiId || "",
    });
  }, 0);
}, [user]);

  // ✅ SAFE redirect (no infinite loop)
useEffect(() => {
  if (!user || !user.id) return;

  if (user.role === "driver" && !user.licenseUrl) {
    setTimeout(() => {
      setLocation("/driver-signup");
    }, 0);
  }
}, [user]);

  // ✅ safer role watch
  const selectedRole = form.getValues("role") || user?.role || "passenger";

  const onSubmit = (data: any) => {
    updateProfile.mutate(data, {
      onSuccess: () => {
        if (data.role === "passenger") {
          setLocation("/home");
        } else {
          setLocation("/driver-signup");
        }
      },
    });
  };

  const handleLogout = () => {
    logout();
    setLocation("/auth");
  };

  // ✅ HARD SAFETY (prevents white screen)
  if (!user || !user.id) {
    return <div className="p-6 text-center">Loading...</div>;
  }

  return (
  <div style={{ padding: 20 }}>
    <h1>Profile Debug</h1>

    <pre>{JSON.stringify(user, null, 2)}</pre>

    <button onClick={handleLogout}>Logout</button>
  </div>
);
}