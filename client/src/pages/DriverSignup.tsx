import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { BASE_URL } from "@/lib/config";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { UploadCloud, Loader2 } from "lucide-react";

export default function DriverSignup() {
  const { setUser, user } = useAuth();

  const [name, setName] = useState("");
  const [vehicleNumber, setVehicleNumber] = useState("");

  const [licenseFile, setLicenseFile] = useState<File | null>(null);
  const [vehicleFile, setVehicleFile] = useState<File | null>(null);
  const [profileFile, setProfileFile] = useState<File | null>(null);

  const [loading, setLoading] = useState(false);

  const uploadFile = async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch(`${BASE_URL}/api/upload`, {
      method: "POST",
      body: formData,
    });

    const data = await res.json();
    return data.url;
  };

  const handleSubmit = async () => {
    if (!user) return;

    setLoading(true);

    try {
      const licenseUrl = licenseFile
        ? await uploadFile(licenseFile)
        : null;

      const vehicleImageUrl = vehicleFile
        ? await uploadFile(vehicleFile)
        : null;

      const profileImageUrl = profileFile
        ? await uploadFile(profileFile)
        : null;

      await fetch(`${BASE_URL}/api/users/${user.id}/documents`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          vehicleNumber,
          role: "driver",
          isApproved: false,
          licenseUrl,
          vehicleImageUrl,
          profileImageUrl,
        }),
      });

      const res = await fetch(`${BASE_URL}/api/users/${user.id}`);
      const updatedUser = await res.json();

      setUser(updatedUser);

      window.location.href = "/profile";
    } catch (err) {
      console.error("❌ Signup error:", err);
    } finally {
      setLoading(false);
    }
  };

  const FileUpload = ({ label, file, setFile }: any) => (
    <div className="space-y-2">
      <p className="text-sm font-medium">{label}</p>

      <label className="flex flex-col items-center justify-center border-2 border-dashed rounded-xl h-32 cursor-pointer hover:bg-gray-50 transition">
        <UploadCloud className="w-6 h-6 text-gray-400 mb-2" />
        <span className="text-xs text-muted-foreground">
          {file ? file.name : "Click to upload"}
        </span>

        <input
          type="file"
          className="hidden"
          onChange={(e) =>
            setFile(e.target.files?.[0] || null)
          }
        />
      </label>

      {file && (
        <img
          src={URL.createObjectURL(file)}
          className="h-24 w-full object-cover rounded-lg border"
        />
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">

      <Card className="w-full max-w-md shadow-xl rounded-2xl border-0">
        <CardContent className="p-6 space-y-6">

          {/* HEADER */}
          <div className="text-center space-y-1">
            <h1 className="text-2xl font-bold">
              🚗 Become a Driver
            </h1>
            <p className="text-sm text-muted-foreground">
              Start earning by accepting rides
            </p>
          </div>

          {/* INPUTS */}
          <div className="space-y-4">

            <Input
              placeholder="Full Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-11"
            />

            <Input
              placeholder="Vehicle Number"
              value={vehicleNumber}
              onChange={(e) => setVehicleNumber(e.target.value)}
              className="h-11 uppercase"
            />
          </div>

          {/* FILE UPLOADS */}
          <div className="space-y-4">

            <FileUpload
              label="Driving License"
              file={licenseFile}
              setFile={setLicenseFile}
            />

            <FileUpload
              label="Vehicle Photo"
              file={vehicleFile}
              setFile={setVehicleFile}
            />

            <FileUpload
              label="Profile Photo"
              file={profileFile}
              setFile={setProfileFile}
            />
          </div>

          {/* SUBMIT */}
          <Button
            onClick={handleSubmit}
            className="w-full h-12 text-lg rounded-xl"
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="animate-spin" />
            ) : (
              "Submit & Apply"
            )}
          </Button>

          {/* INFO */}
          <p className="text-xs text-center text-muted-foreground">
            Your account will be reviewed before approval
          </p>
        </CardContent>
      </Card>
    </div>
  );
}