export interface AppNotification {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  type: string; // "task" | "log" | "message"
  is_read: boolean;
  related_activity_id: string | null;
  created_at: string;
}
