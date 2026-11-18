import { useState } from "react";
import { Globe } from "lucide-react";

export function WebsiteIcon({ src }: { src?: string }) {
  const [failedSrc, setFailedSrc] = useState<string>();
  return src && failedSrc !== src ? (
    <img
      src={src}
      alt=""
      className="size-3.5 shrink-0 rounded-sm object-contain p-px dark:bg-white/90"
      onError={() => setFailedSrc(src)}
    />
  ) : (
    <Globe aria-hidden="true" className="size-3.5 shrink-0" />
  );
}
