export interface ActiveSession {
  id: string;
  platform: "android" | "ios" | "web" | null;
  createdAt: string;
  expiresAt: string;
  isCurrent: boolean;
}
export interface SessionsPage {
  currentSession: ActiveSession;
  sessions: ActiveSession[];
  nextCursor: string | null;
}
