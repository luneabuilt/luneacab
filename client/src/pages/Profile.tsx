import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useUpdateProfile } from "@/hooks/use-api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, User, Save, LogOut } from "lucide-react";

export default function Profile() {
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();
  const updateProfile = useUpdateProfile();

  const form = useForm({
    defaultValues: {
      name: "",
      vehicleNumber: "",
      upiId: "",
    },
  });

  useEffect(() => {
    if (!user) return;

    form.reset({
      name: user.name || "",
      vehicleNumber: user.vehicleNumber || "",
      upiId: user.upiId || "",
    });
  }, [user]);

  const onSubmit = (data: any) => {
    updateProfile.mutate(data);
  };

  const handleLogout = () => {
    logout();
    setLocation("/auth");
  };

  if (!user) {
    return <div className="p-6 text-center">Loading...</div>;
  }

  return (
    <div className="pb-24 pt-6 px-4 max-w-2xl mx-auto">
      
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Profile</h1>
        <Button variant="ghost" size="icon" onClick={handleLogout}>
          <LogOut className="w-5 h-5 text-destructive" />
        </Button>
      </div>

      <Card className="border-0 shadow-lg">
        <CardHeader className="flex flex-row items-center gap-4">
          
          {/* Avatar */}
          <div className="h-16 w-16 rounded-full bg-gray-100 flex items-center justify-center">
            <User className="h-8 w-8 text-gray-400" />
          </div>

          {/* Info */}
          <div>
            <CardTitle>{user.phone}</CardTitle>
            <p className="text-sm text-muted-foreground capitalize">
              {user.role}
            </p>

            {user.role === "driver" && (
              <p className="text-xs mt-1 text-green-600">
                {user.isApproved ? "✅ Approved" : "⏳ Pending"}
              </p>
            )}
          </div>
        </CardHeader>

        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            
            {/* Name */}
            <div>
              <Label>Name</Label>
              <Input {...form.register("name")} />
            </div>

            {/* Driver Only Fields */}
            {user.role === "driver" && (
              <>
                <div>
                  <Label>Vehicle Number</Label>
                  <Input {...form.register("vehicleNumber")} />
                </div>

                <div>
                  <Label>UPI ID</Label>
                  <Input {...form.register("upiId")} />
                </div>
              </>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={updateProfile.isPending}
            >
              {updateProfile.isPending ? (
                <Loader2 className="animate-spin" />
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}