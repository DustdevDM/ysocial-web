export const OBJECT = "￼";

export type MdNode =
  | { type: "text"; text: string }
  | { type: "code"; text: string }
  | { type: "strong" | "em" | "del" | "spoiler"; children: MdNode[] };

export type MdBlock =
  | { type: "inline"; nodes: MdNode[] }
  | { type: "fence"; text: string; lang: string }
  | { type: "quote"; blocks: MdBlock[] }
  | { type: "list"; ordered: boolean; start: number; items: MdNode[][] }
  | { type: "heading"; level: 1 | 2 | 3; nodes: MdNode[] };

const ESCAPABLE = "\\`*_~|";
const FENCE = /^```([\w+-]*)\s*$/;
const FENCE_END = /^```\s*$/;
const QUOTE = /^>\s?/;
const HEADING = /^(#{1,3})\s+(\S.*)$/;
const LIST = /^[ \t]{0,3}(?:([-*+])|(\d{1,9})[.)])[ \t]+(\S.*)$/;

const isSpace = (char: string | undefined) =>
  char === undefined || /\s/u.test(char);
const isWord = (char: string | undefined) =>
  char !== undefined && /[\p{L}\p{N}]/u.test(char);

function runLength(source: string, at: number) {
  let length = 1;
  while (source[at + length] === source[at]) length++;
  return length;
}

function findCodeEnd(source: string, from: number, size: number) {
  for (let at = from; at < source.length; at++) {
    if (source[at] !== "`") continue;
    const length = runLength(source, at);
    if (length === size) return at;
    at += length - 1;
  }
  return -1;
}

function findCloser(source: string, from: number, char: string, size: number) {
  for (let at = from; at < source.length; at++) {
    const current = source[at];
    if (current === "\\") {
      at++;
      continue;
    }
    if (current === "`") {
      const length = runLength(source, at);
      const end = findCodeEnd(source, at + length, length);
      at = end === -1 ? at + length - 1 : end + length - 1;
      continue;
    }
    if (current !== char) continue;
    const length = runLength(source, at);
    if (
      length === size &&
      at > from &&
      !isSpace(source[at - 1]) &&
      (char !== "_" || !isWord(source[at + size]))
    )
      return at;
    at += length - 1;
  }
  return -1;
}

const WRAPPERS: Record<string, number[]> = {
  "*": [1, 2, 3],
  _: [1, 2, 3],
  "~": [2],
  "|": [2],
};

export function parseInline(source: string): MdNode[] {
  const nodes: MdNode[] = [];
  let text = "";
  const flush = () => {
    if (text) nodes.push({ type: "text", text });
    text = "";
  };
  let at = 0;
  while (at < source.length) {
    const char = source[at];
    if (char === "\\" && ESCAPABLE.includes(source[at + 1] ?? "\n")) {
      text += source[at + 1];
      at += 2;
      continue;
    }
    if (char === "`") {
      const size = runLength(source, at);
      const end = findCodeEnd(source, at + size, size);
      const inner = end === -1 ? "" : source.slice(at + size, end);
      if (end !== -1 && inner.trim()) {
        flush();
        const padded = /^ .*[^ ].* $/s.test(inner);
        nodes.push({
          type: "code",
          text: padded ? inner.slice(1, -1) : inner,
        });
        at = end + size;
        continue;
      }
      text += "`".repeat(size);
      at += size;
      continue;
    }
    const sizes = WRAPPERS[char];
    if (sizes) {
      const size = runLength(source, at);
      const opens =
        sizes.includes(size) &&
        !isSpace(source[at + size]) &&
        (char !== "_" || !isWord(source[at - 1]));
      const end = opens ? findCloser(source, at + size, char, size) : -1;
      if (end !== -1) {
        flush();
        const children = parseInline(source.slice(at + size, end));
        if (char === "~") nodes.push({ type: "del", children });
        else if (char === "|") nodes.push({ type: "spoiler", children });
        else if (size === 1) nodes.push({ type: "em", children });
        else if (size === 2) nodes.push({ type: "strong", children });
        else
          nodes.push({
            type: "strong",
            children: [{ type: "em", children }],
          });
        at = end + size;
        continue;
      }
      text += char.repeat(size);
      at += size;
      continue;
    }
    text += char;
    at++;
  }
  flush();
  return nodes;
}

export function parseMarkdown(source: string): MdBlock[] {
  if (!/[*_~|`>#\\]|^\s{0,3}(?:[-+]|\d+[.)])\s/m.test(source))
    return [{ type: "inline", nodes: [{ type: "text", text: source }] }];
  const lines = source.split("\n");
  const blocks: MdBlock[] = [];
  let pending: string[] = [];
  const flush = () => {
    if (!pending.length) return;
    const joined = pending.join("\n");
    pending = [];
    blocks.push({ type: "inline", nodes: parseInline(joined) });
  };
  for (let row = 0; row < lines.length; row++) {
    const line = lines[row];
    const fence = FENCE.exec(line);
    if (fence) {
      const close = lines.findIndex(
        (candidate, index) => index > row && FENCE_END.test(candidate),
      );
      if (close !== -1) {
        flush();
        blocks.push({
          type: "fence",
          lang: fence[1],
          text: lines.slice(row + 1, close).join("\n"),
        });
        row = close;
        continue;
      }
    }
    if (QUOTE.test(line)) {
      flush();
      const inner: string[] = [];
      while (row < lines.length && QUOTE.test(lines[row]))
        inner.push(lines[row++].replace(QUOTE, ""));
      row--;
      blocks.push({ type: "quote", blocks: parseMarkdown(inner.join("\n")) });
      continue;
    }
    const heading = HEADING.exec(line);
    if (heading) {
      flush();
      blocks.push({
        type: "heading",
        level: heading[1].length as 1 | 2 | 3,
        nodes: parseInline(heading[2].trim()),
      });
      continue;
    }
    const item = LIST.exec(line);
    if (item) {
      flush();
      const ordered = item[2] !== undefined;
      const start = ordered ? Number(item[2]) : 1;
      const items: MdNode[][] = [];
      while (row < lines.length) {
        const next = LIST.exec(lines[row]);
        if (!next || (next[2] !== undefined) !== ordered) break;
        items.push(parseInline(next[3]));
        row++;
      }
      row--;
      blocks.push({ type: "list", ordered, start, items });
      continue;
    }
    pending.push(line);
  }
  flush();
  return blocks;
}
