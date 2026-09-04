import { create } from "zustand";
import type { UserPublic } from "@vox/shared-types";

interface AuthStore {
  user: UserPublic | null;
  token: string | null;
  isLoading: boolean;

  setAuth: (user: UserPublic, token: string) => void;
  clearAuth: () => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  token: localStorage.getItem("token"),
  isLoading: true,

  setAuth: (user, token) => {
    localStorage.setItem("token", token);
    set({ user, token, isLoading: false });
  },

  clearAuth: () => {
    localStorage.removeItem("token");
    set({ user: null, token: null, isLoading: false });
  },

  setLoading: (isLoading) => set({ isLoading }),
}));
