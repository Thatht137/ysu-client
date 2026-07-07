export async function submitFeedback(rating: number, text: string): Promise<string> {
  throw new Error("反馈功能已禁用");
}

export type FeedbackReplyResult =
  | { ts: number; replied: boolean; reply: string; repliedAt: number }
  | { notFound: true }
  | null;

export async function checkFeedbackReply(id: string, ts?: number): Promise<FeedbackReplyResult> {
  return null;
}
