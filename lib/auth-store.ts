import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

interface AuthState {
  credential: string | null;
  username: string | null;
  isAuthenticated: boolean;
  hasHydrated: boolean;
  setCredential: (credential: string, username?: string) => void;
  clearCredential: () => void;
  setHasHydrated: (v: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      credential: null,
      username: null,
      isAuthenticated: false,
      hasHydrated: false,
      setCredential: (credential, username) =>
        set({ credential, username, isAuthenticated: true }),
      clearCredential: () =>
        set({ credential: null, username: null, isAuthenticated: false }),
      setHasHydrated: (v) => set({ hasHydrated: v }),
    }),
    {
      name: "ysu-auth",
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);
