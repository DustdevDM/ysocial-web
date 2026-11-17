import { useEffect, useRef } from "react";

// Share one observer across the result list instead of adding scroll handlers
// or one observer per GIF. The viewport root also accounts for scroll clipping.
const previews = new Map<Element, (visible: boolean) => void>();
let observer: IntersectionObserver | null = null;

export function GifPreview({
  src,
  width = 220,
  height = 165,
  alt,
}: {
  src: string;
  width?: number;
  height?: number;
  alt: string;
}) {
  const container = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const target = container.current;
    if (!target) return;
    let image: HTMLImageElement | null = null;
    let visible = false;

    function update() {
      if (visible && !document.hidden) {
        if (image) return;
        image = new Image();
        image.alt = "";
        image.className = "absolute inset-0 size-full object-cover";
        image.decoding = "async";
        image.src = src;
        target?.append(image);
      } else if (image) {
        // Hiding a loaded GIF with CSS does not reliably stop decoding it.
        image.removeAttribute("src");
        image.remove();
        image = null;
      }
    }

    observer ??= new IntersectionObserver((entries) => {
      for (const entry of entries) {
        previews.get(entry.target)?.(entry.isIntersecting);
      }
    });
    previews.set(target, (intersecting) => {
      visible = intersecting;
      update();
    });
    observer.observe(target);
    document.addEventListener("visibilitychange", update);

    return () => {
      visible = false;
      update();
      document.removeEventListener("visibilitychange", update);
      observer?.unobserve(target);
      previews.delete(target);
      if (previews.size === 0) {
        observer?.disconnect();
        observer = null;
      }
    };
  }, [src]);

  return (
    <span
      ref={container}
      role="img"
      aria-label={alt}
      className="relative block w-full overflow-hidden bg-muted"
      style={{ aspectRatio: `${width} / ${height}` }}
    />
  );
}
