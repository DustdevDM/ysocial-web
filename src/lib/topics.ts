// Topics are written #name in a top-level post. This grammar mirrors the API
// (src/topics-text.ts there): the API decides which topics a post has, this
// file finds them in the text for linking, autocomplete and optimistic posts.
export const MAX_TOPICS_PER_POST = 10;
const NAME = "\\p{L}[\\p{L}\\p{N}_]{0,31}";
const BEFORE = "(?<![\\p{L}\\p{N}_&/#])";
const TOPIC_NAME = new RegExp(`^${NAME}$`, "u");

export const normalizeTopic = (name: string) =>
  name.normalize("NFC").toLowerCase();
export const isTopicName = (name: string) => TOPIC_NAME.test(name);
export const topicPath = (name: string) =>
  `/topics/${encodeURIComponent(normalizeTopic(name))}`;

/** Distinct, normalized topics of a post text, in order of first use. */
export function extractTopics(content: string) {
  const topics = new Set<string>();
  const pattern = new RegExp(`${BEFORE}#(${NAME})(?![\\p{L}\\p{N}_#])`, "gu");
  for (const match of content.matchAll(pattern)) {
    topics.add(normalizeTopic(match[1]));
    if (topics.size === MAX_TOPICS_PER_POST) break;
  }
  return [...topics];
}

export type TextPart = { text: string; topic?: string };

/**
 * Split post text into plain text and topic tags. Only names the API reports
 * for the post become topics, so text it ignored (replies, topics beyond the
 * limit) stays plain.
 */
export function splitTopics(content: string, topics: readonly string[]) {
  if (!topics.length || !content.includes("#"))
    return [{ text: content }] satisfies TextPart[];
  return splitMatches(
    content,
    new RegExp(`${BEFORE}#(${NAME})(?![\\p{L}\\p{N}_#])`, "gu"),
    new Set(topics),
  );
}

/**
 * Like splitTopics for text still being typed: a #topic only counts as written
 * once whitespace follows it, and only the topics the API would keep.
 */
export function splitWrittenTopics(content: string) {
  if (!content.includes("#")) return [{ text: content }] satisfies TextPart[];
  return splitMatches(
    content,
    new RegExp(`${BEFORE}#(${NAME})(?=\\s)`, "gu"),
    new Set(extractTopics(content)),
  );
}

function splitMatches(content: string, pattern: RegExp, known: Set<string>) {
  const parts: TextPart[] = [];
  let last = 0;
  for (const match of content.matchAll(pattern)) {
    const topic = normalizeTopic(match[1]);
    if (!known.has(topic)) continue;
    if (match.index > last)
      parts.push({ text: content.slice(last, match.index) });
    parts.push({ text: match[0], topic });
    last = match.index + match[0].length;
  }
  if (last < content.length) parts.push({ text: content.slice(last) });
  return parts;
}

export type TopicQuery = {
  /** Where "#" sits, and where the word ends (it may continue past the caret). */
  start: number;
  end: number;
  /** What was typed up to the caret, lowercase and without "#". */
  prefix: string;
};

/** The topic being typed at the caret, if the caret is inside or right after one. */
export function topicQueryAt(text: string, caret: number): TopicQuery | null {
  const before = new RegExp(`${BEFORE}#(${NAME})$`, "u").exec(
    text.slice(0, caret),
  );
  if (!before) return null;
  const rest = /^[\p{L}\p{N}_]*/u.exec(text.slice(caret))?.[0] ?? "";
  if (before[1].length + rest.length > 32) return null;
  return {
    start: caret - before[1].length - 1,
    end: caret + rest.length,
    prefix: normalizeTopic(before[1]),
  };
}
