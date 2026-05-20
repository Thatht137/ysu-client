import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type CardStyle = "solid" | "translucent" | "glass";
export type BackgroundStyle = "overlay" | "blur-overlay";

interface SettingsState {
  updateMirror: string;
  backgroundImage: string;
  backgroundOverlayOpacity: number;
  backgroundStyle: BackgroundStyle;
  backgroundBlurAmount: number;
  cardStyle: CardStyle;
  cardOpacity: number;
  hasHydrated: boolean;
  setUpdateMirror: (mirror: string) => void;
  setBackgroundImage: (image: string) => void;
  setBackgroundOverlayOpacity: (opacity: number) => void;
  setBackgroundStyle: (style: BackgroundStyle) => void;
  setBackgroundBlurAmount: (amount: number) => void;
  setCardStyle: (style: CardStyle) => void;
  setCardOpacity: (opacity: number) => void;
  setHasHydrated: (v: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      updateMirror: "",
      backgroundImage: "",
      backgroundOverlayOpacity: 75,
      backgroundStyle: "overlay",
      backgroundBlurAmount: 20,
      cardStyle: "solid",
      cardOpacity: 100,
      hasHydrated: false,
      setUpdateMirror: (updateMirror) => set({ updateMirror }),
      setBackgroundImage: (backgroundImage) => set({ backgroundImage }),
      setBackgroundOverlayOpacity: (backgroundOverlayOpacity) => set({ backgroundOverlayOpacity }),
      setBackgroundStyle: (backgroundStyle) => set({ backgroundStyle }),
      setBackgroundBlurAmount: (backgroundBlurAmount) => set({ backgroundBlurAmount }),
      setCardStyle: (cardStyle) => set({ cardStyle }),
      setCardOpacity: (cardOpacity) => set({ cardOpacity }),
      setHasHydrated: (v) => set({ hasHydrated: v }),
    }),
    {
      name: "ysu-settings",
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);
