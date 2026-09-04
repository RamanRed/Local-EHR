import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, ArrowLeft, ShieldCheck, UserPlus } from "lucide-react";
import { authApi } from "@/services/api";
import { useAuthStore } from "@/store";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/ui/form-field";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { Role } from "@vox/shared-types";

function getRoleHome(role: Role) {
  if (role === "NURSE") return "/nurse";
  if (role === "DOCTOR") return "/doctor";
  return "/patient";
}

export default function AadhaarLoginPage() {
  const [step, setStep] = useState<"aadhaar" | "otp" | "onboard">("aadhaar");
  const [aadhaarNumber, setAadhaarNumber] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [name, setName] = useState("");
  const [dob, setDob] = useState("");
  const [gender, setGender] = useState("");
  const [bloodGroup, setBloodGroup] = useState("");
  const [emergencyContact, setEmergencyContact] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [maskedAadhaar, setMaskedAadhaar] = useState("");

  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!/^\d{12}$/.test(aadhaarNumber)) {
      setError("Enter a valid 12-digit Aadhaar number");
      return;
    }

    setLoading(true);
    try {
      await authApi.sendAadhaarOtp({ aadhaarNumber });
      setMaskedAadhaar("XXXX XXXX " + aadhaarNumber.slice(8));
      setStep("otp");
    } catch (err: any) {
      setError(err.response?.data?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length === 6) {
      setOtp(pasted.split(""));
      otpRefs.current[5]?.focus();
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const otpString = otp.join("");
    if (otpString.length !== 6) {
      setError("Enter the complete 6-digit OTP");
      return;
    }

    setLoading(true);
    try {
      const res = await authApi.verifyAadhaarOtp({ aadhaarNumber, otp: otpString });

      if ("needsOnboarding" in res) {
        // New user -show onboarding form
        setStep("onboard");
      } else {
        // Existing user -log in directly
        setAuth(res.user, res.token);
        navigate(getRoleHome(res.user.role), { replace: true });
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleOnboard = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("Please enter your name");
      return;
    }

    setLoading(true);
    try {
      const res = await authApi.aadhaarOnboard({
        aadhaarNumber,
        name: name.trim(),
        dob: dob || undefined,
        gender: gender || undefined,
        bloodGroup: bloodGroup || undefined,
        emergencyContact: emergencyContact || undefined,
      });
      setAuth(res.user, res.token);
      navigate("/patient", { replace: true });
    } catch (err: any) {
      setError(err.response?.data?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setError("");
    setOtp(["", "", "", "", "", ""]);
    setLoading(true);
    try {
      await authApi.sendAadhaarOtp({ aadhaarNumber });
      setError("");
    } catch (err: any) {
      setError(err.response?.data?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title={step === "onboard" ? "Complete Registration" : "Aadhaar Login"}
      subtitle={step === "onboard" ? "Set up your patient account" : "Sign in with your Aadhaar number"}
    >
      {step === "onboard" ? (
        <form onSubmit={handleOnboard} className="space-y-4">
          <div className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2">
            <UserPlus className="h-4 w-4 text-primary" />
            <p className="text-xs text-muted-foreground">
              Aadhaar <span className="font-medium text-foreground">{maskedAadhaar}</span> verified. Enter your name to create your account.
            </p>
          </div>

          <FormField label="Full Name" htmlFor="name">
            <Input
              id="name"
              placeholder="Enter your full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </FormField>

          <FormField label="Date of Birth (optional)" htmlFor="onboard-dob">
            <Input
              id="onboard-dob"
              type="date"
              value={dob}
              onChange={(e) => setDob(e.target.value)}
            />
          </FormField>

          <FormField label="Gender (optional)" htmlFor="onboard-gender">
            <select
              id="onboard-gender"
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <option value="">Select gender</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </FormField>

          <FormField label="Blood Group (optional)" htmlFor="onboard-bloodGroup">
            <select
              id="onboard-bloodGroup"
              value={bloodGroup}
              onChange={(e) => setBloodGroup(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <option value="">Select blood group</option>
              <option value="A+">A+</option>
              <option value="A-">A-</option>
              <option value="B+">B+</option>
              <option value="B-">B-</option>
              <option value="AB+">AB+</option>
              <option value="AB-">AB-</option>
              <option value="O+">O+</option>
              <option value="O-">O-</option>
            </select>
          </FormField>

          <FormField label="Emergency Contact (optional)" htmlFor="onboard-emergency">
            <Input
              id="onboard-emergency"
              placeholder="+91 XXXXX XXXXX"
              value={emergencyContact}
              onChange={(e) => setEmergencyContact(e.target.value)}
            />
          </FormField>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {loading ? "Creating account..." : "Complete Registration"}
          </Button>
        </form>
      ) : step === "aadhaar" ? (
        <form onSubmit={handleSendOtp} className="space-y-4">
          <div className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2">
            <ShieldCheck className="h-4 w-4 text-primary" />
            <p className="text-xs text-muted-foreground">
              OTP will be sent to your registered mobile number
            </p>
          </div>

          <FormField label="Aadhaar Number" htmlFor="aadhaar">
            <Input
              id="aadhaar"
              placeholder="Enter 12-digit Aadhaar number"
              maxLength={12}
              inputMode="numeric"
              value={aadhaarNumber}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, "");
                setAadhaarNumber(val);
              }}
            />
          </FormField>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {loading ? "Sending OTP..." : "Send OTP"}
          </Button>
        </form>
      ) : (
        <form onSubmit={handleVerifyOtp} className="space-y-4">
          <button
            type="button"
            onClick={() => {
              setStep("aadhaar");
              setOtp(["", "", "", "", "", ""]);
              setError("");
            }}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Change Aadhaar number
          </button>

          <p className="text-sm text-muted-foreground">
            Enter the 6-digit OTP sent to the mobile linked with Aadhaar{" "}
            <span className="font-medium text-foreground">{maskedAadhaar}</span>
          </p>

          <div className="flex justify-center gap-2" onPaste={handleOtpPaste}>
            {otp.map((digit, i) => (
              <input
                key={i}
                ref={(el) => { otpRefs.current[i] = el; }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleOtpChange(i, e.target.value)}
                onKeyDown={(e) => handleOtpKeyDown(i, e)}
                className="h-12 w-10 rounded-md border border-input bg-background text-center text-lg font-semibold ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
            ))}
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {loading ? "Verifying..." : "Verify & Sign in"}
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            Didn't receive the OTP?{" "}
            <button
              type="button"
              onClick={handleResendOtp}
              disabled={loading}
              className="font-medium text-primary hover:underline disabled:opacity-50"
            >
              Resend
            </button>
          </p>
        </form>
      )}
    </AuthLayout>
  );
}
