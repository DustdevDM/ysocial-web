import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { api, errorMessage } from "@/lib/api";

type Recent = { id: string; avatarUrl: string };

export function RecentAvatars({
  onSelect,
}: {
  onSelect: (id: string, signal: AbortSignal) => Promise<void>;
}) {
  const [avatars, setAvatars] = useState<Recent[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    api
      .recentAvatars(controller.signal)
      .then((result) => setAvatars(result.avatars))
      .catch(() => {});
    return () => controller.abort();
  }, []);

  async function choose(id: string) {
    if (busy) return;
    setBusy(id);
    setError("");
    try {
      await onSelect(id, new AbortController().signal);
    } catch (failure) {
      setError(errorMessage(failure));
      setBusy(null);
    }
  }

  async function remove(id: string) {
    if (busy) return;
    setBusy(id);
    setError("");
    try {
      await api.removeRecentAvatar(id);
      setAvatars((current) => current.filter((item) => item.id !== id));
    } catch (failure) {
      setError(errorMessage(failure));
    } finally {
      setBusy(null);
    }
  }

  if (!avatars.length) return null;
  return (
    <section className="grid gap-2" aria-label="Recent profile pictures">
      <h3 className="text-xs font-medium text-muted-foreground">Recent</h3>
      <ul className="grid grid-cols-5 gap-2">
        {avatars.map((item) => (
          <li key={item.id} className="group/recent relative aspect-square">
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => void choose(item.id)}
              aria-label="Use this profile picture"
              className="size-full cursor-pointer overflow-hidden rounded-[30%] outline-none [corner-shape:squircle] focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
            >
              <img
                src={item.avatarUrl}
                alt=""
                draggable={false}
                className="size-full object-cover"
              />
            </button>
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => void remove(item.id)}
              aria-label="Delete this recent picture"
              className="absolute -top-1.5 -right-1.5 flex size-5 cursor-pointer items-center justify-center rounded-full bg-destructive text-white opacity-0 shadow ring-2 ring-background transition-opacity group-focus-within/recent:opacity-100 group-hover/recent:opacity-100 pointer-coarse:opacity-100"
            >
              <X className="size-3" aria-hidden="true" />
            </button>
          </li>
        ))}
      </ul>
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
