export type AnnouncementLevel = "info" | "warning" | "critical";

export interface AnnouncementInfo {
  id: string;
  title: string;
  content: string;
  level: AnnouncementLevel;
  publishedAt: string;
  expireAt: string;
}

export async function checkAnnouncement(): Promise<AnnouncementInfo | null> {
  return null;
}

export function dismissAnnouncement(id: string): void {
  void id;
}
