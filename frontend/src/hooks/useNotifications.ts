import { useState, useEffect, useCallback, useRef } from "react";
import { AppNotification } from "@/@types/notification";
import { notificationService } from "@/services/notificationService";

const POLL_INTERVAL_MS = 30_000; // poll every 30 seconds

export function useNotifications() {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetch = useCallback(async () => {
    try {
      const data = await notificationService.getAll();
      setNotifications(data);
    } catch {
      // silently fail — don't disrupt the UI
    }
  }, []);

  useEffect(() => {
    fetch();
    intervalRef.current = setInterval(() => {
      if (document.visibilityState !== "hidden") {
        fetch();
      }
    }, POLL_INTERVAL_MS);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetch]);

  const dismiss = useCallback(async (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    await notificationService.dismiss(id);
  }, []);

  const markRead = useCallback(async (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
    await notificationService.markRead(id);
  }, []);

  const markAllRead = useCallback(async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    await notificationService.markAllRead();
  }, []);

  const dismissAll = useCallback(async (type?: string) => {
    const toRemove = type ? notifications.filter((n) => n.type === type) : notifications;
    setNotifications((prev) =>
      type ? prev.filter((n) => n.type !== type) : []
    );
    await Promise.all(toRemove.map((n) => notificationService.dismiss(n.id)));
  }, [notifications]);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return { notifications, unreadCount, dismiss, markRead, markAllRead, dismissAll };
}
