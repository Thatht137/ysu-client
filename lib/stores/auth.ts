import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"
import { secureStorage } from "../storage/secure"
import { STORAGE_KEYS } from "../storage/keys"

interface AuthState {
  credential: string | null
  jwxtSession: string | null
  mobileSession: string | null
  username: string | null
  isAuthenticated: boolean
  sessionExpired: boolean
  setSessionExpired: (expired: boolean) => void
  hasHydrated: boolean
  setCredential: (credential: string, username?: string) => void
  setJWXTSession: (session: string) => void
  setMobileSession: (session: string) => void
  clearCredential: () => void
  setHasHydrated: (v: boolean) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      credential: null,
      jwxtSession: null,
      mobileSession: null,
      username: null,
      isAuthenticated: false,
      sessionExpired: false,
      setSessionExpired: (sessionExpired) => set({ sessionExpired }),
      hasHydrated: false,
      setCredential: (credential, username) =>
        set({
          credential,
          username,
          isAuthenticated: true,
          sessionExpired: false,
        }),
      setJWXTSession: (jwxtSession) => set({ jwxtSession }),
      setMobileSession: (mobileSession) => set({ mobileSession }),
      clearCredential: () =>
        set({
          credential: null,
          jwxtSession: null,
          mobileSession: null,
          username: null,
          isAuthenticated: false,
          sessionExpired: false,
        }),
      setHasHydrated: (v) => set({ hasHydrated: v }),
    }),
    {
      name: STORAGE_KEYS.auth,
      storage: createJSONStorage(() => secureStorage),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true)
      },
    }
  )
)
