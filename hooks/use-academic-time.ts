"use client"

import { useMemo, useSyncExternalStore } from "react"
import { App } from "@capacitor/app"
import type { CurrentWeek, TermCalendar } from "@/providers/types"
import { isCapacitor } from "@/lib/native/platform"
import {
  getAcademicClock,
  resolveAcademicWeek,
} from "@/lib/academic/academic-time"

const listeners = new Set<() => void>()
let stopClock: (() => void) | undefined
const getSnapshot = () => Math.floor(Date.now() / 60_000) * 60_000
const getServerSnapshot = () => 0

function startClock() {
  let disposed = false
  let nativeActive = true
  let timer: number | undefined
  let nativeListener: { remove: () => Promise<void> } | undefined
  const refresh = () => {
    clearTimeout(timer)
    if (disposed || !nativeActive || document.visibilityState === "hidden")
      return
    for (const listener of listeners) listener()
    if (!disposed)
      timer = window.setTimeout(refresh, 60_000 - (Date.now() % 60_000))
  }
  window.addEventListener("focus", refresh)
  document.addEventListener("visibilitychange", refresh)
  if (isCapacitor()) {
    void App.addListener("appStateChange", ({ isActive }) => {
      nativeActive = isActive
      refresh()
    })
      .then((handle) => {
        if (disposed) void handle.remove()
        else nativeListener = handle
      })
      .catch(() => {})
  }
  refresh()
  return () => {
    disposed = true
    clearTimeout(timer)
    window.removeEventListener("focus", refresh)
    document.removeEventListener("visibilitychange", refresh)
    void nativeListener?.remove()
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  if (listeners.size === 1) stopClock = startClock()
  return () => {
    listeners.delete(listener)
    if (listeners.size === 0) {
      stopClock?.()
      stopClock = undefined
    }
  }
}

export function useAcademicTime(
  snapshot: CurrentWeek | null,
  calendar: TermCalendar | undefined,
  requestedSemester?: string
) {
  const timestamp = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot
  )
  const now = useMemo(() => new Date(timestamp), [timestamp])
  const clock = useMemo(() => getAcademicClock(now), [now])
  const currentWeek = useMemo(
    () =>
      resolveAcademicWeek(snapshot, calendar, clock.date, requestedSemester),
    [snapshot, calendar, clock.date, requestedSemester]
  )
  return {
    now,
    date: clock.date,
    weekday: clock.weekday,
    nowMinutes: clock.minutes,
    currentWeek,
  }
}
