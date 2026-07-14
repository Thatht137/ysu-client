"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Building2, CalendarDays, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTranslation } from "@/lib/i18n/use-translation";
import {
  useClassPeriods,
  useClassrooms,
  useClassroomSchedule,
  useCurrentWeek,
  useTeachingClasses,
  useTeachingClassSchedule,
} from "@/providers/hooks";
import type {
  ClassPeriod,
  Classroom,
  PublicScheduleEntry,
  TeachingClass,
} from "@/providers/types";
import { PublicScheduleGrid } from "./public-schedule-grid";

type QueryMode = "empty" | "class" | "room";

function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function currentMinute(): number {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

function selectDefaultSection(
  periods: Array<{ section: number; startMinute?: number; endMinute?: number; isInUse: boolean }>,
): number {
  const active = periods.filter((period) => period.isInUse && period.section > 0);
  if (active.length === 0) return 1;
  const minute = currentMinute();
  const current = active.find(
    (period) =>
      period.startMinute !== undefined &&
      period.endMinute !== undefined &&
      minute >= period.startMinute &&
      minute <= period.endMinute,
  );
  if (current) return current.section;
  const next = active.find(
    (period) => period.startMinute !== undefined && period.startMinute > minute,
  );
  return next?.section ?? active[0]!.section;
}

function entryMatchesSlot(
  entry: PublicScheduleEntry,
  week: number,
  weekday: number,
  section: number,
): boolean {
  if (entry.weekday !== weekday) return false;
  if (section < entry.startSection || section > entry.endSection) return false;
  return !entry.weekList?.length || entry.weekList.includes(week);
}

function EmptyRoomsPanel({
  classrooms,
  semester,
  week,
  weekday,
  section,
}: {
  classrooms: Classroom[];
  semester?: string;
  week: number;
  weekday: number;
  section: number;
}) {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [building, setBuilding] = useState("");

  const buildings = useMemo(
    () =>
      Array.from(
        new Set(classrooms.map((room) => room.building).filter((value): value is string => !!value)),
      ).sort(),
    [classrooms],
  );

  useEffect(() => {
    if (!building && buildings[0]) setBuilding(buildings[0]);
  }, [building, buildings]);

  const candidateRooms = useMemo(
    () =>
      classrooms.filter(
        (room) =>
          room.isSchedulable &&
          (building === "__all__" || !building || room.building === building),
      ),
    [building, classrooms],
  );
  const classroomIds = useMemo(
    () => candidateRooms.map((room) => room.id),
    [candidateRooms],
  );
  const schedule = useClassroomSchedule({ semester, week, classroomIds });

  useEffect(() => {
    if (schedule.error) toast.error(schedule.error.message);
  }, [schedule.error]);

  const occupiedIds = useMemo(() => {
    const ids = new Set<string>();
    for (const entry of schedule.data ?? []) {
      if (entryMatchesSlot(entry, week, weekday, section) && entry.classroomId) {
        ids.add(entry.classroomId);
      }
    }
    return ids;
  }, [schedule.data, section, week, weekday]);

  const emptyRooms = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return candidateRooms
      .filter((room) => !occupiedIds.has(room.id))
      .filter((room) =>
        keyword
          ? [room.name, room.building, room.campus, room.roomType]
              .filter(Boolean)
              .some((value) => value!.toLowerCase().includes(keyword))
          : true,
      )
      .sort(
        (left, right) =>
          (left.building ?? "").localeCompare(right.building ?? "") ||
          left.name.localeCompare(right.name),
      );
  }, [candidateRooms, occupiedIds, search]);

  if (schedule.isLoading && !schedule.data) {
    return <Skeleton className="h-72" />;
  }

  if (schedule.error) {
    return (
      <p className="rounded-lg border p-6 text-center text-sm text-muted-foreground">
        {schedule.error.message}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t("classrooms.searchRoom")}
            className="pl-9"
          />
        </div>
        <Select value={building} onValueChange={setBuilding}>
          <SelectTrigger>
            <SelectValue placeholder={t("classrooms.building")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">{t("classrooms.allBuildings")}</SelectItem>
            {buildings.map((item) => (
              <SelectItem key={item} value={item}>
                {item}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <span className="text-muted-foreground">
          {t("classrooms.emptySummary", { count: emptyRooms.length })}
        </span>
        <Badge variant="secondary">
          {t("classrooms.occupiedSummary", { count: occupiedIds.size })}
        </Badge>
      </div>

      {emptyRooms.length === 0 ? (
        <p className="rounded-lg border p-6 text-center text-sm text-muted-foreground">
          {t("classrooms.noEmptyRooms")}
        </p>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {emptyRooms.map((room) => (
            <div key={room.id} className="rounded-lg border bg-card p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{room.name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {[room.building, room.campus].filter(Boolean).join(" · ") || "-"}
                  </p>
                </div>
                {room.capacity !== undefined && (
                  <Badge variant="outline" className="shrink-0 text-[10px]">
                    {t("classrooms.seats", { count: room.capacity })}
                  </Badge>
                )}
              </div>
              {room.roomType && (
                <p className="mt-2 text-xs text-muted-foreground">{room.roomType}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function RoomScheduleResult({
  semester,
  week,
  classroomId,
  periods,
}: {
  semester?: string;
  week: number;
  classroomId: string;
  periods: ClassPeriod[];
}) {
  const schedule = useClassroomSchedule({ semester, week, classroomId });

  useEffect(() => {
    if (schedule.error) toast.error(schedule.error.message);
  }, [schedule.error]);

  if (schedule.isLoading && !schedule.data) {
    return <Skeleton className="h-64" />;
  }
  if (schedule.error) {
    return (
      <p className="rounded-lg border p-6 text-center text-sm text-muted-foreground">
        {schedule.error.message}
      </p>
    );
  }
  return (
    <PublicScheduleGrid
      entries={schedule.data ?? []}
      periods={periods}
      week={week}
      secondary="class"
    />
  );
}

function RoomSchedulePanel({
  classrooms,
  semester,
  week,
  periods,
}: {
  classrooms: Classroom[];
  semester?: string;
  week: number;
  periods: ClassPeriod[];
}) {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState("");

  const options = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return classrooms
      .filter((room) =>
        keyword
          ? [room.name, room.building, room.campus]
              .filter(Boolean)
              .some((value) => value!.toLowerCase().includes(keyword))
          : true,
      )
      .slice(0, 100);
  }, [classrooms, search]);

  return (
    <div className="flex flex-col gap-3">
      <Input
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder={t("classrooms.searchRoom")}
      />
      <Select value={selectedId} onValueChange={setSelectedId}>
        <SelectTrigger>
          <SelectValue placeholder={t("classrooms.selectRoom")} />
        </SelectTrigger>
        <SelectContent>
          {options.map((room) => (
            <SelectItem key={room.id} value={room.id}>
              {[room.name, room.building].filter(Boolean).join(" · ")}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {!selectedId ? (
        <p className="rounded-lg border p-6 text-center text-sm text-muted-foreground">
          {t("classrooms.selectRoomHint")}
        </p>
      ) : (
        <RoomScheduleResult
          semester={semester}
          week={week}
          classroomId={selectedId}
          periods={periods}
        />
      )}
    </div>
  );
}

function TeachingClassScheduleResult({
  semester,
  week,
  classId,
  periods,
}: {
  semester?: string;
  week: number;
  classId: string;
  periods: ClassPeriod[];
}) {
  const schedule = useTeachingClassSchedule({ semester, week, classId });

  useEffect(() => {
    if (schedule.error) toast.error(schedule.error.message);
  }, [schedule.error]);

  if (schedule.isLoading && !schedule.data) {
    return <Skeleton className="h-64" />;
  }
  if (schedule.error) {
    return (
      <p className="rounded-lg border p-6 text-center text-sm text-muted-foreground">
        {schedule.error.message}
      </p>
    );
  }
  return (
    <PublicScheduleGrid
      entries={schedule.data ?? []}
      periods={periods}
      week={week}
      secondary="room"
    />
  );
}

function ClassSchedulePanel({
  semester,
  week,
  periods,
}: {
  semester?: string;
  week: number;
  periods: ClassPeriod[];
}) {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const classes = useTeachingClasses({ semester });

  useEffect(() => {
    if (classes.error) toast.error(classes.error.message);
  }, [classes.error]);

  const options = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return (classes.data ?? [])
      .filter((item: TeachingClass) =>
        keyword
          ? [item.name, item.grade, item.department, item.major]
              .filter(Boolean)
              .some((value) => value!.toLowerCase().includes(keyword))
          : true,
      )
      .slice(0, 100);
  }, [classes.data, search]);

  return (
    <div className="flex flex-col gap-3">
      <Input
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder={t("classrooms.searchClass")}
      />
      <Select value={selectedId} onValueChange={setSelectedId}>
        <SelectTrigger>
          <SelectValue placeholder={t("classrooms.selectClass")} />
        </SelectTrigger>
        <SelectContent>
          {options.map((item) => (
            <SelectItem key={item.id} value={item.id}>
              {[item.name, item.department].filter(Boolean).join(" · ")}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {!selectedId ? (
        <p className="rounded-lg border p-6 text-center text-sm text-muted-foreground">
          {t("classrooms.selectClassHint")}
        </p>
      ) : (
        <TeachingClassScheduleResult
          semester={semester}
          week={week}
          classId={selectedId}
          periods={periods}
        />
      )}
    </div>
  );
}

export default function ClassroomsPage() {
  const { t } = useTranslation();
  const today = useMemo(() => formatLocalDate(new Date()), []);
  const [mode, setMode] = useState<QueryMode>("empty");
  const [date, setDate] = useState(today);
  const [section, setSection] = useState(0);
  const currentWeek = useCurrentWeek({ date });
  const periods = useClassPeriods();
  const semester = currentWeek.data?.semester;
  const week = currentWeek.data?.week ?? 1;
  const weekday =
    currentWeek.data?.weekday ??
    (() => {
      const day = new Date(`${date}T12:00:00`).getDay();
      return day === 0 ? 7 : day;
    })();
  const classrooms = useClassrooms({ semester });

  useEffect(() => {
    const errors = [currentWeek.error, periods.error, classrooms.error].filter(Boolean);
    if (errors[0]) toast.error(errors[0].message);
  }, [classrooms.error, currentWeek.error, periods.error]);

  useEffect(() => {
    if (section > 0 || !periods.data?.length) return;
    setSection(date === today ? selectDefaultSection(periods.data) : 1);
  }, [date, periods.data, section, today]);

  const availablePeriods = useMemo(
    () => (periods.data ?? []).filter((period) => period.isInUse && period.section > 0),
    [periods.data],
  );
  const loading =
    (currentWeek.isLoading && !currentWeek.data) ||
    (periods.isLoading && !periods.data) ||
    (classrooms.isLoading && !classrooms.data);

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <div className="flex items-start gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-md border bg-muted">
              <Building2 className="size-4" />
            </div>
            <div>
              <CardTitle>{t("classrooms.title")}</CardTitle>
              <CardDescription>{t("classrooms.description")}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          <Select value={mode} onValueChange={(value) => setMode(value as QueryMode)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="empty">{t("classrooms.modes.empty")}</SelectItem>
              <SelectItem value="class">{t("classrooms.modes.class")}</SelectItem>
              <SelectItem value="room">{t("classrooms.modes.room")}</SelectItem>
            </SelectContent>
          </Select>
          <div className="relative">
            <CalendarDays className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="date"
              value={date}
              onChange={(event) => {
                setDate(event.target.value);
                setSection(0);
              }}
              className="pl-9"
            />
          </div>
          <Select
            value={String(section || 1)}
            onValueChange={(value) => setSection(Number(value))}
          >
            <SelectTrigger>
              <SelectValue placeholder={t("classrooms.section")} />
            </SelectTrigger>
            <SelectContent>
              {availablePeriods.map((period) => (
                <SelectItem key={period.section} value={String(period.section)}>
                  {t("classrooms.sectionItem", {
                    section: period.section,
                    time: [period.startTime, period.endTime].filter(Boolean).join("-"),
                  })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        <Badge variant="secondary">{semester || "-"}</Badge>
        <Badge variant="outline">{t("classrooms.week", { week })}</Badge>
        <Badge variant="outline">{t("classrooms.weekday", { day: weekday })}</Badge>
        <Badge variant="outline">{t("classrooms.sectionBadge", { section: section || 1 })}</Badge>
      </div>

      {loading ? (
        <Skeleton className="h-80" />
      ) : mode === "empty" ? (
        <EmptyRoomsPanel
          classrooms={classrooms.data ?? []}
          semester={semester}
          week={week}
          weekday={weekday}
          section={section || 1}
        />
      ) : mode === "class" ? (
        <ClassSchedulePanel semester={semester} week={week} periods={availablePeriods} />
      ) : (
        <RoomSchedulePanel
          classrooms={classrooms.data ?? []}
          semester={semester}
          week={week}
          periods={availablePeriods}
        />
      )}
    </div>
  );
}
