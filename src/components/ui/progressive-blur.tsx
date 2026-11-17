import { cn } from "@/lib/utils";

/**
 * A blur that is strongest at the top edge and fades smoothly to nothing at
 * the bottom edge, after Magic UI's ProgressiveBlur: many stacked backdrop
 * blurs of doubling strength, each masked to its own band.
 *
 * The layers render as siblings (a fragment) and are absolutely positioned
 * against the nearest positioned ancestor; nest them inside another stacking
 * element and Chromium stops blurring the page behind them.
 */
export function ProgressiveBlur({
  height,
  blurLevels = [0.5, 1, 2, 4, 8, 14, 22, 32],
  className,
}: {
  /** Any CSS length. The blur never extends past it. */
  height: string;
  blurLevels?: number[];
  className?: string;
}) {
  const count = blurLevels.length;
  const step = 100 / count;
  return (
    <>
      {blurLevels.map((blur, index) => {
        // 0% is the weak (bottom) edge, 100% the strong (top) edge.
        const from = index * step;
        const stops =
          index === count - 1
            ? `rgba(0,0,0,0) ${from}%, rgba(0,0,0,1) 100%`
            : `rgba(0,0,0,0) ${from}%, rgba(0,0,0,1) ${from + step}%, rgba(0,0,0,1) ${from + step * 2}%, rgba(0,0,0,0) ${from + step * 3}%`;
        const mask = `linear-gradient(to top, ${stops})`;
        return (
          <div
            key={blur}
            aria-hidden="true"
            className={cn(
              "pointer-events-none absolute inset-x-0 top-0 select-none",
              className,
            )}
            style={{
              height,
              backdropFilter: `blur(${blur}px)`,
              WebkitBackdropFilter: `blur(${blur}px)`,
              maskImage: mask,
              WebkitMaskImage: mask,
            }}
          />
        );
      })}
    </>
  );
}
