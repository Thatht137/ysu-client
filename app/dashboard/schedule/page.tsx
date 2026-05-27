"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import {
  Field,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { useAuthStore } from "@/lib/auth-store";
import { useTranslation } from "@/lib/i18n/use-translation";
import { useIsMobile } from "@/hooks/use-mobile";
import { useMobileHeaderRight } from "@/lib/mobile-header-store";
import { useRefreshStore } from "@/lib/refresh-store";
import { getExperimentalSchedule, getClassPeriods, getCurrentWeek } from "@/lib/api";
import { cacheGetStale, cacheSet, cacheKey, dedupedFetch } from "@/lib/cache";
import { useCachedData } from "@/lib/use-cached-data";
import type { Course, ClassPeriod, CurrentWeek } from "@/lib/types";
import { ChevronDown, ChevronLeft, ChevronRight, Search, Grid3x2, Grid3x3 } from "lucide-react";
import { cn } from "@/lib/utils";
import { isCourseActiveInWeek } from "./schedule-utils";
import { ScheduleTablet } from "./schedule-tablet";
import { ScheduleMobile } from "./schedule-mobile";
import { syncScheduleToWidget } from "@/lib/widget-bridge";
import { syncClassAlarmsToNative } from "@/lib/notify";
import { useSettingsStore } from "@/lib/settings-store";

export default function SchedulePage() {
  const credential = useAuthStore((s) => s.credential);
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const compactMode = useSettingsStore((s) => s.scheduleCompactMode);
  const setCompactMode = useSettingsStore((s) => s.setScheduleCompactMode);
  const [courses, setCourses] = useState<Course[]>([]);
  const [currentWeek, setCurrentWeek] = useState<CurrentWeek | null>(null);
  const [selectedWeek, setSelectedWeek] = useState<number>(0);
  const [term, setTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);

  // In compact mode, adjust <main> padding-bottom to match the actual nav bar height,
  // so the content area ends exactly at the nav top edge.
  useEffect(() => {
    if (!compactMode) return;
    const main = document.querySelector("main");
    const nav = document.querySelector('nav[aria-label="Primary"]');
    if (!main || !nav) return;
    const adjust = () => {
      main.style.paddingBottom = `${nav.getBoundingClientRect().height}px`;
    };
    adjust();
    const observer = new ResizeObserver(adjust);
    observer.observe(nav);
    return () => {
      observer.disconnect();
      main.style.paddingBottom = "";
    };
  }, [compactMode]);

  const periodsHook = useCachedData(["periods", credential], {
    fetch: () => getClassPeriods(),
  });
  const periods = useMemo(() => {
    if (!periodsHook.data) return [];
    return periodsHook.data.filter((x) => x.is_in_use).sort((a, b) => a.section - b.section);
  }, [periodsHook.data]);

  const [nowMinutes, setNowMinutes] = useState(() => {
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes();
  });

  useEffect(() => {
    const id = setInterval(() => {
      const now = new Date();
      setNowMinutes(now.getHours() * 60 + now.getMinutes());
    }, 60_000);
    return () => clearInterval(id);
  }, []);

  function shiftWeek(delta: number) {
    setSelectedWeek((w) => Math.max(1, (w || 1) + delta));
  }

  // 用 ref 持有最新的 periods 数据，避免 periods 变化触发 effect 重新执行
  const periodsRef = useRef(periods);
  periodsRef.current = periods;

  useEffect(() => {
    if (!credential) return;

    const schedKey = cacheKey(["schedule", credential]);
    const weekKey = cacheKey(["week", credential]);
    const cachedCourses = cacheGetStale<Course[]>(schedKey);
    const cachedWeek = cacheGetStale<CurrentWeek>(weekKey);

    if (cachedCourses) setCourses(cachedCourses.data);
    if (cachedWeek) {
      setCurrentWeek(cachedWeek.data);
      if (cachedWeek.data.week) setSelectedWeek(cachedWeek.data.week);
    }

    const hasCache = !!(cachedCourses || cachedWeek);
    let refreshing = false;
    if (hasCache) {
      setLoading(false);
      useRefreshStore.getState().start();
      refreshing = true;
    }

    async function load() {
      try {
        const [c, w] = await Promise.all([
          dedupedFetch(schedKey, () => getExperimentalSchedule(credential!, undefined, "all")),
          dedupedFetch(weekKey, () => getCurrentWeek(credential!)),
        ]);
        setCourses(c);
        setCurrentWeek(w);
        if (w?.week) {
          const cachedWeekValue = cachedWeek?.data.week;
          setSelectedWeek((curr) => {
            if (curr === 0 || curr === cachedWeekValue) return w.week;
            return curr;
          });
        }
        cacheSet(schedKey, c);
        cacheSet(weekKey, w);
        const activeCourses = w?.week ? c.filter((course) => isCourseActiveInWeek(course, w.week)) : c;
        syncScheduleToWidget(activeCourses, w, periodsRef.current, useSettingsStore.getState().widgetSyncReminderHours, useSettingsStore.getState().widgetShowNextDaySchedule).catch(() => {});
        syncClassAlarmsToNative(activeCourses, w, periodsRef.current).catch(() => {});
        useRefreshStore.getState().markFresh();
      } catch (err) {
        if (hasCache) {
          useRefreshStore.getState().markStale();
        } else {
          toast.error((err as Error).message || t("app.updating"));
        }
      } finally {
        setLoading(false);
        if (refreshing) useRefreshStore.getState().end();
      }
    }
    load();
  }, [credential, t]);

  async function handleQuery() {
    if (!credential) return;
    setLoading(true);
    try {
      const [c, w] = await Promise.all([
        getExperimentalSchedule(credential, term || undefined, "all").catch(() => null),
        getCurrentWeek(credential!, term || undefined).catch(() => null),
      ]);
      if (c !== null) {
        setCourses(c);
        cacheSet(cacheKey(["schedule", credential!]), c);
      }
      if (w !== null) {
        setCurrentWeek(w);
        cacheSet(cacheKey(["week", credential!]), w);
      }
      if (c !== null && w !== null) {
        const activeCourses = w.week ? c.filter((course) => isCourseActiveInWeek(course, w.week)) : c;
        syncScheduleToWidget(activeCourses, w, periods, useSettingsStore.getState().widgetSyncReminderHours, useSettingsStore.getState().widgetShowNextDaySchedule).catch(() => {});
        syncClassAlarmsToNative(activeCourses, w, periodsRef.current).catch(() => {});
      }
      setFilterDrawerOpen(false);
    } catch (err) {
      toast.error((err as Error).message || t("app.updating"));
    } finally {
      setLoading(false);
    }
  }

  useMobileHeaderRight(
    <div className="flex items-center gap-0.5">
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => setCompactMode(!compactMode)}
        className="h-8 w-8"
        aria-label={t("schedule.compactHint")}
      >
        {compactMode ? <Grid3x3 className="size-4" /> : <Grid3x2 className="size-4" />}
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setFilterDrawerOpen(true)}
        className="h-8 px-2 text-sm"
      >
        {selectedWeek ? t("schedule.weekShort", { week: selectedWeek }) : t("schedule.weekLabel")}
        <ChevronDown className="ml-0.5 size-3.5" />
      </Button>
    </div>,
    [selectedWeek, t, compactMode, setCompactMode],
  );

  const filteredCourses = useMemo(() => {
    if (selectedWeek <= 0) return courses;
    return courses.filter((c) => isCourseActiveInWeek(c, selectedWeek));
  }, [courses, selectedWeek]);

  const currentWeekday = currentWeek?.weekday ?? 0;

  if (loading && courses.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-12" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  const filterControls = (
    <FieldGroup className="flex flex-row flex-wrap items-end gap-3">
      <Field className="w-48">
        <FieldLabel htmlFor="schedule-term">{t("schedule.termLabel")}</FieldLabel>
        <Input
          id="schedule-term"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder={t("schedule.termPlaceholder")}
        />
      </Field>
      <Field className="min-w-[16rem]">
        <FieldLabel htmlFor="schedule-week">{t("schedule.weekLabel")}</FieldLabel>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              onClick={() => shiftWeek(-1)}
              aria-label={t("schedule.weekPrev")}
            >
              <ChevronLeft />
            </Button>
            <Input
              id="schedule-week"
              type="number"
              value={selectedWeek || ""}
              onChange={(e) => setSelectedWeek(parseInt(e.target.value, 10) || 0)}
              placeholder={t("schedule.weeks")}
              className="w-20 text-center"
            />
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              onClick={() => shiftWeek(1)}
              aria-label={t("schedule.weekNext")}
            >
              <ChevronRight />
            </Button>
          </div>
          {currentWeek?.week && (
            <Badge variant="secondary">{t("schedule.currentWeekBadge", { week: currentWeek.week })}</Badge>
          )}
        </div>
      </Field>
      <Button onClick={handleQuery} disabled={loading}>
        {loading ? (
          <Spinner data-icon="inline-start" />
        ) : (
          <Search data-icon="inline-start" />
        )}
        {t("schedule.query")}
      </Button>
    </FieldGroup>
  );

  return (
    <div className={compactMode && isMobile ? "flex flex-1 flex-col min-h-0" : "flex flex-col gap-6"}>
      <Card className="hidden md:block">
        <CardHeader>
          <CardTitle>{t("schedule.title")}</CardTitle>
          <CardDescription>{t("schedule.description")}</CardDescription>
        </CardHeader>
        <CardContent>{filterControls}</CardContent>
      </Card>

      {isMobile ? (
        <div
          className={cn(
            "flex flex-col -mx-4 -mt-4 -mb-4 md:m-0",
            compactMode && "flex-1 min-h-0 overflow-hidden",
          )}
          style={compactMode ? undefined : { minHeight: "calc(100dvh - 102px)" }}
        >
          <ScheduleMobile
            courses={filteredCourses}
            periods={periods}
            currentWeekday={currentWeekday}
            currentWeek={currentWeek}
            selectedWeek={selectedWeek}
            nowMinutes={nowMinutes}
            compact={compactMode}
            onPrevWeek={() => shiftWeek(-1)}
            onNextWeek={() => shiftWeek(1)}
          />
        </div>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <ScheduleTablet
              courses={filteredCourses}
              periods={periods}
              currentWeekday={currentWeekday}
              currentWeek={currentWeek}
              selectedWeek={selectedWeek}
              nowMinutes={nowMinutes}
            />
          </CardContent>
        </Card>
      )}

      <Drawer open={filterDrawerOpen} onOpenChange={setFilterDrawerOpen}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>{t("schedule.title")}</DrawerTitle>
            <DrawerDescription>{t("schedule.description")}</DrawerDescription>
          </DrawerHeader>
          <div className="px-4 pb-6">{filterControls}</div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
