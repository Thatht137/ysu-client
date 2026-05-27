import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type CardStyle = "solid" | "translucent" | "glass";
export type BackgroundStyle = "overlay" | "blur-overlay";
export type LandingPage = "overview" | "schedule";

interface SettingsState {
  updateMirror: string;
  backgroundImage: string;
  backgroundOverlayOpacity: number;
  backgroundStyle: BackgroundStyle;
  backgroundBlurAmount: number;
  cardStyle: CardStyle;
  cardOpacity: number;
  defaultLandingPage: LandingPage;
  widgetSyncReminderHours: number;
  widgetShowNextDaySchedule: boolean;
  avatarImage: string;
  customCerBaseUrl: string;
  customJwxtBaseUrl: string;
  schoolId: string;
  scheduleCompactMode: boolean;
  notifyEnabled: boolean;
  notifyCheckInterval: number;
  notifyGrades: boolean;
  notifyExams: boolean;
  classReminderEnabled: boolean;
  classReminderMinutes: number;
  classReminderDays: number;
  hasHydrated: boolean;
  setUpdateMirror: (mirror: string) => void;
  setBackgroundImage: (image: string) => void;
  setBackgroundOverlayOpacity: (opacity: number) => void;
  setBackgroundStyle: (style: BackgroundStyle) => void;
  setBackgroundBlurAmount: (amount: number) => void;
  setCardStyle: (style: CardStyle) => void;
  setCardOpacity: (opacity: number) => void;
  setDefaultLandingPage: (page: LandingPage) => void;
  setWidgetSyncReminderHours: (hours: number) => void;
  setWidgetShowNextDaySchedule: (v: boolean) => void;
  setAvatarImage: (image: string) => void;
  setCustomCerBaseUrl: (url: string) => void;
  setCustomJwxtBaseUrl: (url: string) => void;
  setSchoolId: (id: string) => void;
  setScheduleCompactMode: (v: boolean) => void;
  setNotifyEnabled: (v: boolean) => void;
  setNotifyCheckInterval: (v: number) => void;
  setNotifyGrades: (v: boolean) => void;
  setNotifyExams: (v: boolean) => void;
  setClassReminderEnabled: (v: boolean) => void;
  setClassReminderMinutes: (v: number) => void;
  setClassReminderDays: (v: number) => void;
  setHasHydrated: (v: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      updateMirror: "https://ysu.welain.com/updates/",
      backgroundImage: "",
      backgroundOverlayOpacity: 75,
      backgroundStyle: "overlay",
      backgroundBlurAmount: 20,
      cardStyle: "solid",
      cardOpacity: 100,
      defaultLandingPage: "overview",
      widgetSyncReminderHours: 24,
      widgetShowNextDaySchedule: false,
      avatarImage: "",
      customCerBaseUrl: "",
      customJwxtBaseUrl: "",
      schoolId: "ysu",
      scheduleCompactMode: false,
      notifyEnabled: false,
      notifyCheckInterval: 60,
      notifyGrades: true,
      notifyExams: true,
      classReminderEnabled: false,
      classReminderMinutes: 15,
      classReminderDays: 7,
      hasHydrated: false,
      setUpdateMirror: (updateMirror) => set({ updateMirror }),
      setBackgroundImage: (backgroundImage) => set({ backgroundImage }),
      setBackgroundOverlayOpacity: (backgroundOverlayOpacity) => set({ backgroundOverlayOpacity }),
      setBackgroundStyle: (backgroundStyle) => set({ backgroundStyle }),
      setBackgroundBlurAmount: (backgroundBlurAmount) => set({ backgroundBlurAmount }),
      setCardStyle: (cardStyle) => set({ cardStyle }),
      setCardOpacity: (cardOpacity) => set({ cardOpacity }),
      setDefaultLandingPage: (defaultLandingPage) => set({ defaultLandingPage }),
      setWidgetSyncReminderHours: (widgetSyncReminderHours) => set({ widgetSyncReminderHours }),
      setWidgetShowNextDaySchedule: (widgetShowNextDaySchedule) => set({ widgetShowNextDaySchedule }),
      setAvatarImage: (avatarImage) => set({ avatarImage }),
      setCustomCerBaseUrl: (customCerBaseUrl) => set({ customCerBaseUrl }),
      setCustomJwxtBaseUrl: (customJwxtBaseUrl) => set({ customJwxtBaseUrl }),
      setSchoolId: (schoolId) => set({ schoolId }),
      setScheduleCompactMode: (scheduleCompactMode) => set({ scheduleCompactMode }),
      setNotifyEnabled: (notifyEnabled) => set({ notifyEnabled }),
      setNotifyCheckInterval: (notifyCheckInterval) => set({ notifyCheckInterval }),
      setNotifyGrades: (notifyGrades) => set({ notifyGrades }),
      setNotifyExams: (notifyExams) => set({ notifyExams }),
      setClassReminderEnabled: (classReminderEnabled) => set({ classReminderEnabled }),
      setClassReminderMinutes: (classReminderMinutes) => set({ classReminderMinutes }),
      setClassReminderDays: (classReminderDays) => set({ classReminderDays }),
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
