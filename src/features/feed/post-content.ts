export function limitBlankLines(content: string, caret = content.length) {
  const normalized = content.replace(/[\r\u2028\u2029]/g, "\n");
  let nextCaret = caret;
  const value = normalized.replace(
    /(^|\n)((?:[^\S\n]*\n){3,})/g,
    (run: string, start: string, blankLines: string, offset: number) => {
      const kept = start + blankLines.split("\n", 2).join("\n") + "\n";
      nextCaret -= Math.max(
        0,
        Math.min(caret, offset + run.length) - (offset + kept.length),
      );
      return kept;
    },
  );
  return { value, caret: nextCaret };
}

export function hasTooManyBlankLines(content: string) {
  const normalized = content.trim().replace(/\r\n?|[\u2028\u2029]/g, "\n");
  return /(?:^|\n)(?:[^\S\n]*\n){3}/.test(normalized);
}
