import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { api, errorMessage, type SocialNotification } from "@/lib/api";
import { NotificationPrompt } from "./notification-prompt";

function useNotificationState(userId: string | null, canWrite: boolean) {
  const [items, setItems] = useState<SocialNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(!!userId);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const request = useRef<AbortController | null>(null);
  const refresh = useCallback(
    async (cursor?: string) => {
      if (!userId) return;
      request.current?.abort();
      const controller = new AbortController();
      request.current = controller;
      setLoading(true);
      setError("");
      try {
        const result = await api.notifications(
          cursor,
          false,
          controller.signal,
        );
        if (controller.signal.aborted) return;
        setItems((previous) =>
          cursor
            ? [
                ...previous,
                ...result.notifications.filter(
                  (item) => !previous.some((old) => old.id === item.id),
                ),
              ]
            : result.notifications,
        );
        setUnreadCount(result.unreadCount);
        setNextCursor(result.nextCursor);
      } catch (reason) {
        if (!controller.signal.aborted) setError(errorMessage(reason));
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    },
    [userId],
  );
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
    // Poll only the count while idle. Opening the panel refreshes its contents.
    const poll = async () => {
      if (document.visibilityState !== "visible" || !userId) return;
      try {
        const result = await api.notifications(
          undefined,
          false,
          controller.signal,
        );
        if (!controller.signal.aborted) setUnreadCount(result.unreadCount);
      } catch {
        /* The panel exposes errors with a retry action. */
      }
    };
    const controller = new AbortController();
    const timer = setInterval(() => void poll(), 30_000);
    const onPush = () => {
      void refresh();
    };
    window.addEventListener("focus", onPush);
    navigator.serviceWorker?.addEventListener("message", onPush);
    return () => {
      clearInterval(timer);
      controller.abort();
      request.current?.abort();
      window.removeEventListener("focus", onPush);
      navigator.serviceWorker?.removeEventListener("message", onPush);
    };
  }, [refresh, userId]);
  async function markRead(id?: string) {
    const newest = items[0];
    if (!canWrite || busy || (!id && !newest)) return false;
    setBusy(true);
    setError("");
    try {
      if (id) await api.readNotification(id);
      else await api.readAllNotifications(newest.createdAt);
      await refresh();
      return true;
    } catch (reason) {
      setError(errorMessage(reason));
      return false;
    } finally {
      setBusy(false);
    }
  }
  return {
    items,
    unreadCount,
    nextCursor,
    loading,
    error,
    busy,
    refresh,
    markRead,
    signedIn: !!userId,
    canWrite,
  };
}
const NotificationsContext = createContext<ReturnType<
  typeof useNotificationState
> | null>(null);
export function NotificationsProvider({
  userId,
  canWrite,
  holdPrompt,
  children,
}: {
  userId: string | null;
  canWrite: boolean;
  holdPrompt: boolean;
  children: ReactNode;
}) {
  const value = useNotificationState(userId, canWrite);
  return (
    <NotificationsContext.Provider value={value}>
      {userId && canWrite && !holdPrompt && <NotificationPrompt key={userId} userId={userId} />}
      {children}
    </NotificationsContext.Provider>
  );
}
export function useNotifications() {
  const context = useContext(NotificationsContext);
  if (!context) throw new Error("NotificationsProvider is missing");
  return context;
}
