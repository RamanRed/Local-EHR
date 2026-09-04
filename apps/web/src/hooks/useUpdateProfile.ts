import { useState } from "react";
import type { UpdateProfilePayload, UserPublic } from "@vox/shared-types";
import { authApi, uploadApi } from "@/services/api";
import { useAuthStore } from "@/store";

export function useUpdateProfile() {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const setAuth = useAuthStore((s) => s.setAuth);
  const token = useAuthStore((s) => s.token);

  const updateProfile = async (data: UpdateProfilePayload): Promise<UserPublic | null> => {
    setSaving(true);
    setError(null);
    try {
      const user = await authApi.updateProfile(data);
      if (token) setAuth(user, token);
      return user;
    } catch (e: any) {
      setError(e.response?.data?.message || "Failed to update profile");
      return null;
    } finally {
      setSaving(false);
    }
  };

  const uploadPhoto = async (file: File): Promise<string | null> => {
    setSaving(true);
    setError(null);
    try {
      const url = await uploadApi.image(file);
      const user = await authApi.updateProfile({ photoUrl: url });
      if (token) setAuth(user, token);
      return url;
    } catch (e: any) {
      setError(e.response?.data?.message || "Failed to upload photo");
      return null;
    } finally {
      setSaving(false);
    }
  };

  return { updateProfile, uploadPhoto, saving, error };
}
