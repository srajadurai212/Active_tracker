import axios from "@/utils/axios";
import { AppNotification } from "@/@types/notification";

export const notificationService = {
  getAll: (unreadOnly = false): Promise<AppNotification[]> =>
    axios
      .get<AppNotification[]>("/notifications", { params: { unread_only: unreadOnly } })
      .then((r) => r.data),

  markRead: (id: string): Promise<void> =>
    axios.post(`/notifications/${id}/read`).then(() => undefined),

  markAllRead: (): Promise<void> =>
    axios.post("/notifications/read-all").then(() => undefined),

  dismiss: (id: string): Promise<void> =>
    axios.delete(`/notifications/${id}`).then(() => undefined),
};
