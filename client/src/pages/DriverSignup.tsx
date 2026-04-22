import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { BASE_URL } from "@/lib/config";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { UploadCloud, Loader2 } from "lucide-react";

export default function DriverSignup() {
  const { setUser, user } = useAuth();

  const [step, setStep] = useState(1);

  const [name, setName] = useState("");
  const [vehicleNumber, setVehicleNumber] = useState("");

  const [licenseFile, setLicenseFile] = useState<File | null>(null);
  const [vehicleFile, setVehicleFile] = useState<File | null>(null);
  const [profileFile, setProfileFile] = useState<File | null>(null);

  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  // 🔥 COMPRESS IMAGE
const compressImage = (file: File): Promise<File> => {
  return new Promise((resolve) => {
    const img = new Image();
    const reader = new FileReader();

    reader.onload = (e: any) => {
      img.src = e.target.result;
    };

    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      // 🔥 DYNAMIC RESIZE BASED ON SIZE
      let maxWidth = 1200;

      if (file.size > 5 * 1024 * 1024) {
        maxWidth = 800;
      }

      if (file.size > 10 * 1024 * 1024) {
        maxWidth = 600;
      }

      const scale = maxWidth / img.width;

      canvas.width = maxWidth;
      canvas.height = img.height * scale;

      ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);

      // 🔥 DYNAMIC QUALITY
      let quality = 0.8;

      if (file.size > 5 * 1024 * 1024) {
        quality = 0.6;
      }

      if (file.size > 10 * 1024 * 1024) {
        quality = 0.5;
      }

      canvas.toBlob(
        (blob) => {
          if (!blob) return resolve(file);

          const compressed = new File([blob], file.name, {
            type: "image/jpeg",
          });

          console.log(
            "Original:",
            (file.size / 1024 / 1024).toFixed(2),
            "MB"
          );
          console.log(
            "Compressed:",
            (compressed.size / 1024 / 1024).toFixed(2),
            "MB"
          );

          resolve(compressed);
        },
        "image/jpeg",
        quality
      );
    };

    reader.readAsDataURL(file);
  });
};

  // 🔥 OCR (FUTURE READY)
  const runOCR = async (file: File) => {
    try {
      // 👇 future: integrate Tesseract.js or backend OCR
      console.log("OCR placeholder running...");
    } catch (err) {
      console.log("OCR failed (safe ignore)");
    }
  };

  // 🔥 UPLOAD WITH PROGRESS
  const uploadFile = async (file: File) => {
    const compressed = await compressImage(file);

    await runOCR(compressed);

    return new Promise<string>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const formData = new FormData();

      formData.append("file", compressed);

      xhr.open("POST", `${BASE_URL}/api/upload`);

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 100);
          setProgress(percent);
        }
      };

      xhr.onload = () => {
        const res = JSON.parse(xhr.response);
        resolve(res.url);
      };

      xhr.onerror = () => reject("Upload failed");

      xhr.send(formData);
    });
  };

  const handleSubmit = async () => {
    if (!user || loading) return;

    if (!licenseFile || !vehicleFile || !profileFile) {
      alert("Please upload all files");
      return;
    }

    setLoading(true);
    setProgress(0);

    try {
      const licenseUrl = await uploadFile(licenseFile);
      const vehicleImageUrl = await uploadFile(vehicleFile);
      const profileImageUrl = await uploadFile(profileFile);

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

      alert("Application submitted successfully!");
      window.location.href = "/profile";
    } catch (err) {
      console.error(err);
      alert("Upload failed. Try again.");
    } finally {
      setLoading(false);
      setProgress(0);
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
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (!f) return;

            if (!f.type.startsWith("image/")) {
              alert("Only images allowed");
              return;
            }

            setFile(f);
          }}
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

  const ProgressBar = () => (
    <div className="flex gap-2 mb-6">
      {[1, 2, 3].map((s) => (
        <div
          key={s}
          className={`flex-1 h-2 rounded-full ${
            step >= s ? "bg-indigo-500" : "bg-gray-200"
          }`}
        />
      ))}
    </div>
  );

  const canGoStep2 = name.length > 2 && vehicleNumber.length > 5;
  const canSubmit = licenseFile && vehicleFile && profileFile;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-xl rounded-2xl border-0">
        <CardContent className="p-6 space-y-6">

          <div className="text-center">
            <h1 className="text-2xl font-bold">🚗 Driver Onboarding</h1>
            <p className="text-sm text-muted-foreground">
              Step {step} of 3
            </p>
          </div>

          <ProgressBar />

          {/* STEP 1 */}
          {step === 1 && (
            <div className="space-y-4">
              <Input
                placeholder="Full Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />

              <Input
                placeholder="Vehicle Number"
                value={vehicleNumber}
                onChange={(e) =>
                  setVehicleNumber(e.target.value.toUpperCase())
                }
              />

              <Button
                className="w-full"
                disabled={!canGoStep2}
                onClick={() => setStep(2)}
              >
                Continue
              </Button>
            </div>
          )}

          {/* STEP 2 */}
          {step === 2 && (
            <div className="space-y-4">
              <FileUpload label="Driving License" file={licenseFile} setFile={setLicenseFile} />
              <FileUpload label="Vehicle Photo" file={vehicleFile} setFile={setVehicleFile} />

              <div className="flex gap-2">
                <Button variant="outline" className="w-full" onClick={() => setStep(1)}>
                  Back
                </Button>
                <Button
                  className="w-full"
                  disabled={!licenseFile || !vehicleFile}
                  onClick={() => setStep(3)}
                >
                  Continue
                </Button>
              </div>
            </div>
          )}

          {/* STEP 3 */}
          {step === 3 && (
            <div className="space-y-4">
              <FileUpload label="Profile Photo" file={profileFile} setFile={setProfileFile} />

              {/* 🔥 PROGRESS BAR */}
              {loading && (
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-indigo-500 h-2 rounded-full"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              )}

              <div className="flex gap-2">
                <Button variant="outline" className="w-full" onClick={() => setStep(2)}>
                  Back
                </Button>

                <Button
                  className="w-full"
                  disabled={!canSubmit || loading}
                  onClick={handleSubmit}
                >
                  {loading ? (
                    <>
                      <Loader2 className="animate-spin mr-2" />
                      {progress}%
                    </>
                  ) : (
                    "Submit Application"
                  )}
                </Button>
              </div>
            </div>
          )}

          <p className="text-xs text-center text-muted-foreground">
            Your account will be verified before going online
          </p>

        </CardContent>
      </Card>
    </div>
  );
}