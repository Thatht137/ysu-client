import { APP_VERSION } from "@/lib/version";
import { isCapacitor } from "@/lib/platform";
import { useSettingsStore } from "@/lib/settings-store";

const FEEDBACK_ENDPOINT = "https://ysu.welain.com/api/feedback";

function generateId(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const now = new Date();
  const datePrefix = now.getFullYear().toString() +
    String(now.getMonth() + 1).padStart(2, "0") +
    String(now.getDate()).padStart(2, "0");
  let randomPart = "";
  for (let i = 0; i < 8; i++) {
    randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `${datePrefix}-${randomPart}`;
}

export async function submitFeedback(rating: number, text: string): Promise<string> {
  const id = generateId();
  const res = await fetch(FEEDBACK_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      id,
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

  const state = useSettingsStore.getState();
  const newIds = [id, ...state.feedbackIds.filter((fid) => fid !== id)];
  state.setFeedbackIds(newIds);
  const newHistory = [
    { id, rating, text: text.trim(), ts: Date.now() },
    ...state.feedbackHistory.filter((h) => h.id !== id),
  ];
  state.setFeedbackHistory(newHistory);

  return id;
}

export type FeedbackReplyResult =
  | { reply: string; repliedAt: number }
  | { notFound: true }
  | null;

export async function checkFeedbackReply(id: string): Promise<FeedbackReplyResult> {
  try {
    const res = await fetch(`${FEEDBACK_ENDPOINT}?id=${id}`, { method: "GET" });
    if (res.status === 404) {
      return { notFound: true };
    }
    if (!res.ok) return null;
    const data = await res.json();
    if (data.adminReply) {
      return { reply: data.adminReply, repliedAt: data.repliedAt };
    }
    return null;
  } catch {
    return null;
  }
}
