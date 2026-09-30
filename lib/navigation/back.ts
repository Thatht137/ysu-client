export const BACK_PRIORITY = {
  page: 10,
  gesture: 20,
  overlay: 100,
  foreground: 200,
} as const

type BackEntry = { onBack: () => void; priority: number }

const layers = new Set<BackEntry>()
let navigationBack: ((canGoBack?: boolean) => void) | undefined

export function registerBackHandler(
  onBack: () => void,
  priority: number
): () => void {
  const entry = { onBack, priority }
  layers.add(entry)
  return () => {
    layers.delete(entry)
  }
}

export function consumeBackLayer(): boolean {
  let top: BackEntry | undefined
  for (const entry of layers) {
    if (!top || entry.priority >= top.priority) top = entry
  }
  if (!top) return false
  top.onBack()
  return true
}

export function setNavigationBackHandler(
  handler: (canGoBack?: boolean) => void
): () => void {
  navigationBack = handler
  return () => {
    if (navigationBack === handler) navigationBack = undefined
  }
}

export function requestBack(canGoBack?: boolean): void {
  if (!consumeBackLayer()) navigationBack?.(canGoBack)
}
