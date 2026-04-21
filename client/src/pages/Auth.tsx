import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useSyncUser } from "@/hooks/use-api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Loader2, Car, Smartphone, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { auth } from "@/lib/firebase";
import { RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";

let globalVerificationId: string | null = null;

export default function Auth() {
  const [, setLocation] = useLocation();
  const syncUser = useSyncUser();
  const { toast } = useToast();
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<"phone" | "otp">("phone");

  useEffect(() => {
    if (!(window as any).recaptchaVerifier) {
      (window as any).recaptchaVerifier = new RecaptchaVerifier(
        auth,
        "recaptcha-container",
        { size: "invisible" }
      );
    }
  }, []);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();

    const appVerifier = (window as any).recaptchaVerifier;
    const formattedPhone = phone.startsWith("+") ? phone : `+91${phone}`;

    try {
      const confirmation = await signInWithPhoneNumber(
        auth,
        formattedPhone,
        appVerifier
      );

      (window as any).confirmationResult = confirmation;
      setStep("otp");
    } catch (error: any) {
      console.error(error);
      alert(error.message);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const confirmation = (window as any).confirmationResult;

      if (!confirmation) {
        throw new Error("No confirmation found");
      }

      const result = await confirmation.confirm(otp);
      const user = result.user;

      await syncUser.mutateAsync({
        firebaseUid: user.uid,
        phone: user.phoneNumber || phone,
      });

      setLocation("/profile");
    } catch (error: any) {
      console.error(error);
      alert(error.message);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4 relative">
      
      {/* subtle glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(99,102,241,0.15),transparent)]"></div>

      <div id="recaptcha-container"></div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md relative"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="mx-auto w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-3xl flex items-center justify-center shadow-lg shadow-indigo-200 mb-4">
            <Car className="w-10 h-10 text-white" />
          </div>

          <h1 className="text-3xl font-semibold tracking-tight text-gray-800">
            RideGo
          </h1>

          <p className="text-gray-500 text-sm mt-2">
            The fastest way to get there.
          </p>
        </div>

        {/* Card */}
        <Card className="border border-white/40 backdrop-blur-xl bg-white/70 shadow-xl rounded-3xl overflow-hidden">
          <CardHeader className="pb-6">
            <CardTitle className="text-xl text-gray-800">
              {step === "phone" ? "Get Started" : "Verify Number"}
            </CardTitle>

            <CardDescription className="text-gray-500">
              {step === "phone"
                ? "Enter your phone number to continue"
                : `Enter the code sent to ${phone}`}
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-4">
            {step === "phone" ? (
              <form onSubmit={handleSendOtp} className="space-y-4">
                <div className="relative">
                  <Smartphone className="absolute left-3 top-3 h-5 w-5 text-gray-400" />

                  <Input
                    placeholder="98765 43210"
                    className="pl-10 h-12 text-lg bg-white/80 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 transition-all shadow-sm"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    type="tel"
                    required
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full h-12 text-lg font-medium rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-md hover:shadow-lg hover:scale-[1.02] transition-all"
                  disabled={isLoading || phone.length < 10}
                >
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      Continue <ArrowRight className="ml-2 w-5 h-5" />
                    </>
                  )}
                </Button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <Input
                  className="h-14 text-center text-2xl font-bold bg-white/80 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 tracking-widest"
                  maxLength={6}
                  placeholder="000000"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  required
                />

                <Button
                  type="submit"
                  className="w-full h-12 text-lg font-medium rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-md hover:shadow-lg hover:scale-[1.02] transition-all"
                  disabled={isLoading || otp.length < 6}
                >
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    "Verify & Login"
                  )}
                </Button>

                <button
                  type="button"
                  onClick={() => setStep("phone")}
                  className="w-full text-sm text-gray-400 hover:text-indigo-500 transition-colors"
                >
                  Wrong number? Go back
                </button>
              </form>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}