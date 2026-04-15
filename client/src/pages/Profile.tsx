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
import { useToast } from "@/hooks/use-toast";
import { Loader2, User, Save, LogOut } from "lucide-react";

export default function Profile() {
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();
  const updateProfile = useUpdateProfile();
  const { toast } = useToast();
  
  const form = useForm({
    defaultValues: {
      name: user?.name || "",
      role: user?.role || "passenger",
      vehicleType: user?.vehicleType || "bike",
      vehicleNumber: user?.vehicleNumber || "",
      upiId: user?.upiId || "",
    }
  });

  const selectedRole = form.watch("role");

  const onSubmit = (data: any) => {
    updateProfile.mutate(data, {
      onSuccess: () => {
        // Redirect to appropriate dashboard after profile update if needed
        if (data.role === "passenger") setLocation("/home");
        else setLocation("/driver");
      }
    });
  };

  const handleLogout = () => {
    logout();
    setLocation("/auth");
  };

  if (!user) {
    setLocation("/auth");
    return null;
  }

  return (
    <div className="pb-24 pt-6 px-4 max-w-2xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Profile</h1>
        <Button variant="ghost" size="icon" onClick={handleLogout}>
          <LogOut className="w-5 h-5 text-destructive" />
        </Button>
      </div>

      <Card className="border-0 shadow-lg mb-6">
        <CardHeader className="flex flex-row items-center gap-4 pb-2">
<div className="h-16 w-16 rounded-full overflow-hidden bg-gray-100">
  {user.profileImageUrl ? (
    <img
      src={user.profileImageUrl}
      className="h-full w-full object-cover"
    />
  ) : (
    <div className="flex items-center justify-center h-full">
      <User className="h-8 w-8 text-gray-400" />
    </div>
  )}
</div>
          <div>
            <CardTitle className="text-xl">{user.phone}</CardTitle>
            <p className="text-sm text-muted-foreground capitalize">{user.role}</p>
{user.role === "driver" && (
  <p className={`text-xs mt-1 ${user.isApproved ? "text-green-600" : "text-yellow-600"}`}>
    {user.isApproved ? "✅ Approved Driver" : "⏳ Pending Approval"}
  </p>
)}
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input {...form.register("name")} placeholder="John Doe" />
            </div>

            <div className="space-y-3">
              <Label>I am a...</Label>
              <RadioGroup 
                defaultValue={form.getValues("role")} 
                onValueChange={(val) => form.setValue("role", val as any)}
                className="grid grid-cols-2 gap-4"
              >
                <div>
                  <RadioGroupItem value="passenger" id="passenger" className="peer sr-only" />
                  <Label
                    htmlFor="passenger"
                    className="flex flex-col items-center justify-between rounded-xl border-2 border-muted bg-transparent p-4 hover:bg-accent/5 hover:text-accent-foreground peer-data-[state=checked]:border-primary peer-data-[state=checked]:text-primary cursor-pointer transition-all"
                  >
                    <User className="mb-2 h-6 w-6" />
                    Passenger
                  </Label>
                </div>
                <div>
                  <RadioGroupItem value="driver" id="driver" className="peer sr-only" />
                  <Label
                    htmlFor="driver"
                    className="flex flex-col items-center justify-between rounded-xl border-2 border-muted bg-transparent p-4 hover:bg-accent/5 hover:text-accent-foreground peer-data-[state=checked]:border-primary peer-data-[state=checked]:text-primary cursor-pointer transition-all"
                  >
                    <User className="mb-2 h-6 w-6" />
                    Driver
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {selectedRole === "driver" && (
              <div className="space-y-4 pt-4 border-t">
                <h3 className="font-semibold">Vehicle Details</h3>
                
                <div className="space-y-3">
                  <Label>Vehicle Type</Label>
                  <RadioGroup 
                    defaultValue={form.getValues("vehicleType") || "bike"} 
                    onValueChange={(val) => form.setValue("vehicleType", val as any)}
                    className="grid grid-cols-3 gap-2"
                  >
                    {["bike", "auto", "car"].map((type) => (
                      <div key={type}>
                        <RadioGroupItem value={type} id={type} className="peer sr-only" />
                        <Label
                          htmlFor={type}
                          className="flex flex-col items-center justify-center rounded-lg border border-muted bg-transparent p-2 text-sm capitalize hover:bg-accent/5 peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 peer-data-[state=checked]:text-primary cursor-pointer"
                        >
                          {type}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>

                <div className="space-y-2">
                  <Label>Vehicle Number</Label>
                  <Input {...form.register("vehicleNumber")} placeholder="AB 12 CD 3456" className="uppercase" />
                </div>
                
                <div className="space-y-2">
                  <Label>UPI ID (for payments)</Label>
                  <Input {...form.register("upiId")} placeholder="username@upi" />
                </div>
              </div>
            )}

            {user.role === "driver" && (
  <div className="space-y-4 pt-6 border-t">
    <h3 className="font-semibold">Documents</h3>

    {/* License */}
    {user.licenseUrl && (
      <div>
        <p className="text-sm mb-1">Driving License</p>
        <img src={user.licenseUrl} className="w-full h-32 object-cover rounded" />
      </div>
    )}

    {/* Vehicle */}
    {user.vehicleImageUrl && (
      <div>
        <p className="text-sm mb-1">Vehicle Photo</p>
        <img src={user.vehicleImageUrl} className="w-full h-32 object-cover rounded" />
      </div>
    )}
  </div>
)}

            <Button 
              type="submit" 
              className="w-full h-12 text-lg" 
              disabled={updateProfile.isPending}
            >
              {updateProfile.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                <>
                  <Save className="w-5 h-5 mr-2" /> Save Profile
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
