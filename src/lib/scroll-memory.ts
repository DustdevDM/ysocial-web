// Remembers the main scroller's position per history entry, so going back
// lands where the user left instead of at the top.
const positions = new Map<string, number>();
const LIMIT = 200;

export function rememberScroll(key: string, top: number) {
  positions.delete(key);
  positions.set(key, top);
  if (positions.size > LIMIT) {
    const oldest = positions.keys().next().value;
    if (oldest !== undefined) positions.delete(oldest);
  }
}
export const recallScroll = (key: string) => positions.get(key);
