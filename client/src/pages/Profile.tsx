import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useUpdateProfile } from "@/hooks/use-api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, User, Save, LogOut } from "lucide-react";

export default function Profile() {
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();
  const updateProfile = useUpdateProfile();

  const form = useForm();
  const [selectedRole, setSelectedRole] = useState(user?.role || "passenger");

  useEffect(() => {
    if (!user || !user.id) return;

    form.reset({
      name: user.name || "",
      vehicleType: user.vehicleType || "bike",
      vehicleNumber: user.vehicleNumber || "",
      upiId: user.upiId || "",
      
    });
    setSelectedRole(user.role || "passenger");
  }, [user]);
  

  useEffect(() => {
    if (!user || !user.id) return;

if (
  selectedRole === "driver" &&
      (!user.licenseUrl ||
        !user.vehicleImageUrl ||
        !user.profileImageUrl)
    ) {
      setLocation("/driver-signup");
    }
  }, [user]);


const onSubmit = (data: any) => {
  updateProfile.mutate(
    {
      ...data,
      role: selectedRole,
    },
    {
      onSuccess: () => {
        if (selectedRole === "passenger") {
          setLocation("/home");
        } else {
          setLocation("/driver-signup");
        }
      },
    }
  );
};

  const handleLogout = () => {
    logout();
    setLocation("/auth");
  };

  if (!user || !user.id) {
    return <div className="p-6 text-center">Loading...</div>;
  }

  return (
    <div className="pb-24 pt-6 px-4 max-w-2xl mx-auto space-y-6">

      {/* 🔥 HEADER */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">👤 Profile</h1>
        <Button variant="ghost" size="icon" onClick={handleLogout}>
          <LogOut className="w-5 h-5 text-destructive" />
        </Button>
      </div>

      {/* 🔥 PROFILE CARD */}
      <Card className="rounded-2xl shadow-xl border-0 overflow-hidden">

        {/* TOP GRADIENT */}
        <div className="h-24 bg-gradient-to-r from-indigo-500 to-purple-500" />

        <CardContent className="p-6 -mt-12">

          {/* AVATAR */}
          <div className="flex flex-col items-center text-center">
            <div className="h-24 w-24 rounded-full border-4 border-white shadow overflow-hidden bg-gray-100">
              {user?.profileImageUrl ? (
                <img
                  src={user.profileImageUrl}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <User className="h-10 w-10 text-gray-400" />
                </div>
              )}
            </div>

            <h2 className="mt-3 text-lg font-semibold">
              {user.name || "User"}
            </h2>

            <p className="text-sm text-muted-foreground">
              {user.phone}
            </p>

            <span className="mt-2 text-xs px-3 py-1 rounded-full bg-gray-100 capitalize">
              {selectedRole}
            </span>

            {selectedRole === "driver" && (
              <span
                className={`mt-2 text-xs px-3 py-1 rounded-full ${
                  user.isApproved
                    ? "bg-green-100 text-green-700"
                    : "bg-yellow-100 text-yellow-700"
                }`}
              >
                {user.isApproved ? "Approved" : "Pending Approval"}
              </span>
            )}
          </div>

          {/* 🔥 FORM */}
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-6 mt-6"
          >

            {/* NAME */}
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input
                {...form.register("name")}
                placeholder="Enter your name"
                className="h-11"
              />
            </div>

            {/* ROLE */}
            <div className="space-y-3">
              <Label>Select Role</Label>

<RadioGroup
  value={selectedRole}
  onValueChange={(val) => setSelectedRole(val as any)}

                className="grid grid-cols-2 gap-3"
              >
                {["passenger", "driver"].map((role) => (
                  <Label
                    key={role}
                    className={`flex flex-col items-center justify-center border rounded-xl p-4 cursor-pointer transition ${
                      selectedRole === role
                        ? "border-indigo-500 bg-indigo-50"
                        : "hover:bg-gray-50"
                    }`}
                  >
                    <RadioGroupItem
                      value={role}
                      className="hidden"
                    />
                    <User className="mb-2 h-6 w-6" />
                    <span className="capitalize">{role}</span>
                  </Label>
                ))}
              </RadioGroup>
            </div>

            {/* DRIVER SECTION */}
            {selectedRole === "driver" && (
              <div className="space-y-4 border-t pt-4">

                <h3 className="font-semibold">🚗 Vehicle Details</h3>

                {/* VEHICLE TYPE */}
                <RadioGroup
                  value={form.watch("vehicleType") || "bike"}
                  onValueChange={(val) =>
                    form.setValue("vehicleType", val as any)
                  }
                  className="grid grid-cols-3 gap-2"
                >
                  {["bike", "auto", "car"].map((type) => (
                    <Label
                      key={type}
                      className={`text-center border rounded-lg py-2 cursor-pointer capitalize ${
                        form.watch("vehicleType") === type
                          ? "bg-indigo-500 text-white"
                          : "hover:bg-gray-100"
                      }`}
                    >
                      <RadioGroupItem value={type} className="hidden" />
                      {type}
                    </Label>
                  ))}
                </RadioGroup>

                {/* VEHICLE NUMBER */}
                <div className="space-y-2">
                  <Label>Vehicle Number</Label>
                  <Input
                    {...form.register("vehicleNumber")}
                    placeholder="AS 01 AB 1234"
                    className="uppercase"
                  />
                </div>

                {/* UPI */}
                <div className="space-y-2">
                  <Label>UPI ID</Label>
                  <Input
                    {...form.register("upiId")}
                    placeholder="yourname@upi"
                  />
                </div>
              </div>
            )}


            {/* SAVE BUTTON */}
            <Button
              type="submit"
              className="w-full h-12 text-lg rounded-xl"
              disabled={updateProfile.isPending}
            >
              {updateProfile.isPending ? (
                <Loader2 className="animate-spin" />
              ) : (
                <>
                  <Save className="w-5 h-5 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
