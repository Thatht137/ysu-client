import { useSettingsStore } from "@/lib/settings-store";
import { checkFeedbackReply } from "@/lib/feedback";
import { getText } from "@/lib/i18n/get-text";
import { toast } from "sonner";

export async function syncFeedbackReplies(): Promise<void> {
  const state = useSettingsStore.getState();
  const { feedbackIds } = state;
  if (!feedbackIds.length) return;

  let changed = false;
  let ids = [...feedbackIds];
  let history = [...state.feedbackHistory];

  for (const id of feedbackIds) {
    const result = await checkFeedbackReply(id);
    if (result === null) continue;

    if ("notFound" in result) {
      ids = ids.filter((fid) => fid !== id);
      history = history.filter((h) => h.id !== id);
      changed = true;
      continue;
    }

    if ("reply" in result) {
      const idx = history.findIndex((h) => h.id === id);
      if (idx >= 0) {
        const wasReplied = history[idx].replied;
        history[idx] = {
          ...history[idx],
          replied: true,
          replyText: result.reply,
          repliedAt: result.repliedAt,
        };

        // Toast only if this reply hasn't been read yet
        if (!wasReplied && !history[idx].notifiedAt) {
          toast.success(getText("about.feedbackNewReply"), {
            duration: 8000,
          });
        }

        changed = true;
      }
    }
  }

  if (changed) {
    state.setFeedbackIds(ids);
    state.setFeedbackHistory(history);
  }
}
