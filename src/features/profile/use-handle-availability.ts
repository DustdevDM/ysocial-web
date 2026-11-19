import { useEffect, useState } from "react";
import { api } from "@/lib/api";

type Availability = "available" | "taken" | "checking" | "invalid" | "error";

export function useHandleAvailability(
  handle: string,
  currentHandle?: string,
): Availability {
  const valid = /^[a-z0-9_]{3,32}$/.test(handle);
  const [result, setResult] = useState<{
    handle: string;
    status: Availability;
  } | null>(null);
  useEffect(() => {
    if (!valid || handle === currentHandle) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      api
        .handleAvailability(handle, controller.signal)
        .then(({ available }) => {
          if (!controller.signal.aborted)
            setResult({ handle, status: available ? "available" : "taken" });
        })
        .catch(() => {
          if (!controller.signal.aborted)
            setResult({ handle, status: "error" });
        });
    }, 300);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [handle, currentHandle, valid]);
  if (!valid) return "invalid";
  if (handle === currentHandle) return "available";
  return result?.handle === handle ? result.status : "checking";
}
