import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { BASE_URL } from "@/lib/config";

export default function DriverSignup() {
  const { user } = useAuth();

  const [name, setName] = useState("");
  const [vehicleNumber, setVehicleNumber] = useState("");

  const [licenseFile, setLicenseFile] = useState<File | null>(null);
  const [vehicleFile, setVehicleFile] = useState<File | null>(null);
  const [profileFile, setProfileFile] = useState<File | null>(null);

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

    // upload all files
    const licenseUrl = licenseFile ? await uploadFile(licenseFile) : null;
    const vehicleImageUrl = vehicleFile ? await uploadFile(vehicleFile) : null;
    const profileImageUrl = profileFile ? await uploadFile(profileFile) : null;

    // save to backend
    await fetch(`${BASE_URL}/api/users/${user.id}/documents`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        vehicleNumber,
        role: "driver",
        licenseUrl,
        vehicleImageUrl,
        profileImageUrl,
      }),
    });

    alert("Submitted! Wait for admin approval.");
  };

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-xl font-bold">Driver Registration</h1>

      <input
        placeholder="Full Name"
        className="border p-2 w-full"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />

      <input
        placeholder="Vehicle Number"
        className="border p-2 w-full"
        value={vehicleNumber}
        onChange={(e) => setVehicleNumber(e.target.value)}
      />

      <div>
        <p>Upload License</p>
        <input type="file" onChange={(e) => setLicenseFile(e.target.files?.[0] || null)} />
      </div>

      <div>
        <p>Upload Vehicle Photo</p>
        <input type="file" onChange={(e) => setVehicleFile(e.target.files?.[0] || null)} />
      </div>

      <div>
        <p>Upload Profile Photo</p>
        <input type="file" onChange={(e) => setProfileFile(e.target.files?.[0] || null)} />
      </div>

      <button
        onClick={handleSubmit}
        className="bg-black text-white px-4 py-2 rounded"
      >
        Submit
      </button>
    </div>
  );
}