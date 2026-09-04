import { useState, useRef } from "react";
import { Camera, User } from "lucide-react";
import { useAuthStore } from "@/store";
import { useUpdateProfile } from "@/hooks/useUpdateProfile";
import { Button } from "@/components/ui/button";

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

export default function SettingsPage() {
  const user = useAuthStore((s) => s.user);
  const { updateProfile, uploadPhoto, saving, error } = useUpdateProfile();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(user?.name || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [email, setEmail] = useState(user?.email || "");
  const [specialization, setSpecialization] = useState(user?.specialization || "");
  const [dob, setDob] = useState(user?.dob ? user.dob.slice(0, 10) : "");
  const [gender, setGender] = useState(user?.gender || "");
  const [bloodGroup, setBloodGroup] = useState(user?.bloodGroup || "");
  const [emergencyContact, setEmergencyContact] = useState(user?.emergencyContact || "");
  const [success, setSuccess] = useState(false);

  const handleSave = async () => {
    setSuccess(false);
    const data: Record<string, string> = {};
    if (name !== (user?.name || "")) data.name = name;
    if (phone !== (user?.phone || "")) data.phone = phone;
    if (email !== (user?.email || "")) data.email = email;
    if (user?.role === "DOCTOR" && specialization !== (user?.specialization || "")) {
      data.specialization = specialization;
    }
    // Patient-specific fields
    if (user?.role === "PATIENT") {
      const currentDob = user?.dob ? user.dob.slice(0, 10) : "";
      if (dob !== currentDob) data.dob = dob;
      if (gender !== (user?.gender || "")) data.gender = gender;
      if (bloodGroup !== (user?.bloodGroup || "")) data.bloodGroup = bloodGroup;
      if (emergencyContact !== (user?.emergencyContact || "")) data.emergencyContact = emergencyContact;
    }

    if (Object.keys(data).length === 0) return;
    const result = await updateProfile(data);
    if (result) setSuccess(true);
  };

  const handlePhotoClick = () => fileInputRef.current?.click();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSuccess(false);
    await uploadPhoto(file);
  };

  if (!user) return null;

  const inputClass = "w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary";
  const selectClass = "w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary bg-white";

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-semibold">Settings</h1>

      {/* Profile Photo */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-sm font-medium text-muted-foreground">Profile Photo</h2>
        <div className="flex items-center gap-4">
          <div className="relative">
            {user.photoUrl ? (
              <img
                src={user.photoUrl}
                alt={user.name}
                className="h-20 w-20 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gray-100">
                <User className="h-8 w-8 text-gray-400" />
              </div>
            )}
            <button
              type="button"
              onClick={handlePhotoClick}
              disabled={saving}
              className="absolute bottom-0 right-0 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-primary text-white shadow-sm hover:bg-primary/90"
            >
              <Camera className="h-3.5 w-3.5" />
            </button>
          </div>
          <div>
            <p className="text-sm font-medium">{user.name}</p>
            <p className="text-xs text-muted-foreground">{user.role}</p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>
      </div>

      {/* Personal Info */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-sm font-medium text-muted-foreground">Personal Information</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Phone</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className={inputClass}
              placeholder="+91 98765 43210"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
              placeholder="you@example.com"
            />
          </div>
          {user.role === "DOCTOR" && (
            <div>
              <label className="mb-1 block text-sm font-medium">Specialization</label>
              <input
                type="text"
                value={specialization}
                onChange={(e) => setSpecialization(e.target.value)}
                className={inputClass}
                placeholder="e.g. General Medicine, Cardiology"
              />
            </div>
          )}
        </div>

        {error && <p className="mt-3 text-sm text-red-500">{error}</p>}
        {success && <p className="mt-3 text-sm text-green-600">Profile updated successfully.</p>}

        <div className="mt-6">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>

      {/* Health Details -Patient only */}
      {user.role === "PATIENT" && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-medium text-muted-foreground">Health Details</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">Date of Birth</label>
              <input
                type="date"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Gender</label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className={selectClass}
              >
                <option value="">Select gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Blood Group</label>
              <select
                value={bloodGroup}
                onChange={(e) => setBloodGroup(e.target.value)}
                className={selectClass}
              >
                <option value="">Select blood group</option>
                {BLOOD_GROUPS.map((bg) => (
                  <option key={bg} value={bg}>{bg}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Emergency Contact</label>
              <input
                type="tel"
                value={emergencyContact}
                onChange={(e) => setEmergencyContact(e.target.value)}
                className={inputClass}
                placeholder="+91 XXXXX XXXXX"
              />
            </div>
          </div>

          <p className="mt-3 text-xs text-muted-foreground">
            These details help nurses and doctors provide better care during your visits.
          </p>
        </div>
      )}
    </div>
  );
}
