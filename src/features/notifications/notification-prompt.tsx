import { useEffect, useState } from "react";
import { BellRing } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { api, errorMessage, retryRequest } from "@/lib/api";
import { enablePush, supportsPush } from "./enable-push";

export function NotificationPrompt({ userId }: { userId: string }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [error, setError] = useState("");
  const key = `notification-prompt-dismissed:${userId}`;
  useEffect(() => {
    if (!supportsPush() || Notification.permission !== "default") return;
    try {
      if (localStorage.getItem(key)) return;
    } catch {
      /* Server preference still applies. */
    }
    const controller = new AbortController();
    void api
      .pushConfig(undefined, controller.signal)
      .then((config) => {
        if (
          !controller.signal.aborted &&
          config.publicKey &&
          !config.promptDismissed &&
          Notification.permission === "default"
        )
          setOpen(true);
      })
      .catch(() => {
        /* Settings remain available if this check fails. */
      });
    return () => controller.abort();
  }, [key]);
  function rememberDecline() {
    try {
      localStorage.setItem(key, "true");
    } catch {
      /* Persist through the API. */
    }
    void retryRequest(() => api.dismissNotificationPrompt(), {
      context: "dismiss notification recommendation",
      beforeRetry: async () => {
        const session = await api.session();
        if (
          !session.authenticated ||
          session.needsOnboarding ||
          session.user.id !== userId
        )
          throw new Error("Account changed");
      },
    }).catch(() => {});
  }
  function decline() {
    rememberDecline();
    setOpen(false);
  }
  async function allow() {
    setBusy(true);
    setError("");
    try {
      const result = await enablePush();
      if (result === "granted") setOpen(false);
      else if (result === "denied") {
        rememberDecline();
        setBlocked(true);
      } else if (result === "default") decline();
      else
        setError("Notifications are temporarily unavailable. Try again later.");
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!value && !busy) decline();
      }}
    >
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <BellRing className="mb-2 size-7 text-primary" aria-hidden="true" />
          <DialogTitle>
            {blocked
              ? "Enable notifications in your browser"
              : "Stay up to date"}
          </DialogTitle>
          <DialogDescription>
            {blocked
              ? "Notifications are blocked. Enable them in your browser's site settings to receive updates."
              : "We recommend allowing notifications so you can stay up to date with replies, likes, and new followers."}
          </DialogDescription>
        </DialogHeader>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <DialogFooter>
          {blocked ? (
            <Button onClick={() => setOpen(false)}>Got it</Button>
          ) : (
            <>
              <Button variant="ghost" disabled={busy} onClick={decline}>
                Not now
              </Button>
              <Button disabled={busy} onClick={() => void allow()}>
                {busy ? "Waiting for permission…" : "Allow"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
