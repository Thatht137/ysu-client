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
import { cacheGet, cacheSet, cacheKey } from "@/lib/cache";
import type { Course, ClassPeriod, CurrentWeek } from "@/lib/types";
import { ChevronDown, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { isCourseActiveInWeek } from "./schedule-utils";
import { ScheduleDesktop } from "./schedule-desktop";
import { ScheduleMobile } from "./schedule-mobile";

export default function SchedulePage() {
  const credential = useAuthStore((s) => s.credential);
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const [courses, setCourses] = useState<Course[]>([]);
  const [periods, setPeriods] = useState<ClassPeriod[]>([]);
  const [currentWeek, setCurrentWeek] = useState<CurrentWeek | null>(null);
  const [selectedWeek, setSelectedWeek] = useState<number>(0);
  const [term, setTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);

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

  useEffect(() => {
    if (!credential) return;

    const cachedCourses = cacheGet<Course[]>(cacheKey(["schedule", credential]));
    const cachedPeriods = cacheGet<ClassPeriod[]>(cacheKey(["periods", credential]));
    const cachedWeek = cacheGet<CurrentWeek>(cacheKey(["week", credential]));

    if (cachedCourses) setCourses(cachedCourses);
    if (cachedPeriods) setPeriods(cachedPeriods);
    if (cachedWeek) {
      setCurrentWeek(cachedWeek);
      if (cachedWeek.week) setSelectedWeek(cachedWeek.week);
    }

    let refreshing = false;
    const hasCache = cachedCourses || cachedPeriods || cachedWeek;
    if (hasCache) {
      setLoading(false);
      useRefreshStore.getState().start();
      refreshing = true;
    }

    async function load() {
      try {
        const [c, p, w] = await Promise.all([
          getExperimentalSchedule(credential!, undefined, "all"),
          getClassPeriods(credential!),
          getCurrentWeek(credential!),
        ]);
        setCourses(c);
        setPeriods(p.filter((x) => x.is_in_use).sort((a, b) => a.section - b.section));
        setCurrentWeek(w);
        if (w?.week) {
          const cachedWeekValue = cachedWeek?.week;
          setSelectedWeek((curr) => {
            if (curr === 0 || curr === cachedWeekValue) return w.week;
            return curr;
          });
        }
        cacheSet(cacheKey(["schedule", credential!]), c);
        cacheSet(cacheKey(["periods", credential!]), p.filter((x) => x.is_in_use).sort((a, b) => a.section - b.section));
        cacheSet(cacheKey(["week", credential!]), w);
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
      setFilterDrawerOpen(false);
    } catch (err) {
      toast.error((err as Error).message || t("app.updating"));
    } finally {
      setLoading(false);
    }
  }

  useMobileHeaderRight(
    <Button
      variant="ghost"
      size="sm"
      onClick={() => setFilterDrawerOpen(true)}
      className="h-8 px-2 text-sm"
    >
      {selectedWeek ? t("schedule.weekShort", { week: selectedWeek }) : t("schedule.weekLabel")}
      <ChevronDown className="ml-0.5 size-3.5" />
    </Button>,
    [selectedWeek, t],
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
    <div className="flex flex-col gap-6">
      <Card className="hidden md:block">
        <CardHeader>
          <CardTitle>{t("schedule.title")}</CardTitle>
          <CardDescription>{t("schedule.description")}</CardDescription>
        </CardHeader>
        <CardContent>{filterControls}</CardContent>
      </Card>

      {isMobile ? (
        <div
          className="flex flex-col -mx-4 -mt-4 -mb-4 md:m-0"
          style={{ minHeight: "calc(100dvh - 102px)" }}
        >
          <ScheduleMobile
            courses={filteredCourses}
            periods={periods}
            currentWeekday={currentWeekday}
            currentWeek={currentWeek}
            selectedWeek={selectedWeek}
            nowMinutes={nowMinutes}
            onPrevWeek={() => shiftWeek(-1)}
            onNextWeek={() => shiftWeek(1)}
          />
        </div>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <ScheduleDesktop
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
