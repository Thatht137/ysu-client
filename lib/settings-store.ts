import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

interface SettingsState {
  updateMirror: string;
  setUpdateMirror: (mirror: string) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      updateMirror: "",
      setUpdateMirror: (updateMirror) => set({ updateMirror }),
    }),
    {
      name: "ysu-settings",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
