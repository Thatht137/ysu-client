import { APP_VERSION } from "@/lib/version";
import { isCapacitor } from "@/lib/platform";

const FEEDBACK_ENDPOINT = "https://ysu.welain.com/api/feedback";

export async function submitFeedback(rating: number, text: string): Promise<void> {
  const res = await fetch(FEEDBACK_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      rating,
      text: text.trim(),
      version: APP_VERSION,
      platform: isCapacitor() ? "capacitor" : "web",
      ua: navigator.userAgent,
      viewport: `${window.screen.width}x${window.screen.height}`,
      screen: `${Math.round(window.screen.width * window.devicePixelRatio)}x${Math.round(window.screen.height * window.devicePixelRatio)}`,
    }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `HTTP ${res.status}`);
  }
}
