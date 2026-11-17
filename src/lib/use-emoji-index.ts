import { useEffect, useState } from "react";
import { loadEmojiIndex, peekEmojiIndex, type EmojiIndex } from "./emoji";

export function useEmojiIndex(enabled: boolean): EmojiIndex | null {
  const [index, setIndex] = useState<EmojiIndex | null>(peekEmojiIndex);
  useEffect(() => {
    if (!enabled || index) return;
    let active = true;
    loadEmojiIndex()
      .then((loaded) => {
        if (active) setIndex(loaded);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [enabled, index]);
  return index;
}
