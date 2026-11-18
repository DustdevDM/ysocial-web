import { useEffect, useRef, useState } from "react";
import { api, type Post } from "@/lib/api";
import {
  isWebsiteLink,
  type firstPostEmbed,
  type splitPostLinks,
} from "./post-links";

type WebsiteDetails = Pick<
  Awaited<ReturnType<typeof api.websitePreviews>>,
  "links" | "previews"
>;
type LinkDetails = {
  posts: Map<string, Post>;
  websites: WebsiteDetails;
  images: Set<string>;
};
const BATCH_SIZE = 4;

export function usePostLinkDetails(
  postId: string,
  parts: ReturnType<typeof splitPostLinks>,
  embed: ReturnType<typeof firstPostEmbed>,
  loadWebsites: boolean,
) {
  const captionRef = useRef<HTMLParagraphElement>(null);
  const [details, setDetails] = useState<LinkDetails>();
  const hasWebsites = parts.some(isWebsiteLink);
  const needsDetails =
    hasWebsites || parts.some((part) => part.kind === "post");
  const waitingForPublish = hasWebsites && !loadWebsites;

  useEffect(() => {
    const caption = captionRef.current;
    if (!caption || !needsDetails || waitingForPublish) return;
    const controller = new AbortController();
    let observer: IntersectionObserver | undefined;
    let started = false;

    function start() {
      if (started || controller.signal.aborted) return;
      started = true;
      observer?.disconnect();
      const linkedIds = [
        ...new Set(
          parts.flatMap((part) => (part.kind === "post" ? [part.postId] : [])),
        ),
      ];
      const signal = controller.signal;
      void Promise.all([
        loadPosts(linkedIds, signal),
        loadSites(postId, hasWebsites, signal),
      ]).then(async ([posts, websites]) => {
        const sources = new Set<string>();
        for (const { author } of posts.values()) {
          if (author.avatarUrl) sources.add(author.avatarUrl);
        }
        for (const link of [...websites.links, ...websites.previews]) {
          if (link.iconKey)
            sources.add(api.websitePreviewIcon(postId, link.iconKey));
        }
        if (embed?.kind === "post") {
          const gif = posts.get(embed.postId)?.gif;
          if (gif) sources.add(gif.url);
        }
        if (embed?.kind === "external") {
          const preview = websites.previews.find(
            ({ href }) => href === embed.href,
          );
          if (preview?.imageKey)
            sources.add(api.websitePreviewImage(postId, preview.imageKey));
        }
        const images = new Set<string>();
        await inBatches([...sources], signal, async (src, batchSignal) => {
          if (await loadImage(src, batchSignal)) images.add(src);
        });
        if (!signal.aborted) setDetails({ posts, websites, images });
      });
    }

    if (typeof IntersectionObserver === "undefined") start();
    else {
      observer = new IntersectionObserver((entries) => {
        if (entries.some((entry) => entry.isIntersecting)) start();
      });
      observer.observe(caption.closest("article") ?? caption);
    }
    return () => {
      observer?.disconnect();
      controller.abort();
    };
  }, [embed, hasWebsites, needsDetails, parts, postId, waitingForPublish]);

  return { captionRef, details, loading: needsDetails && !details };
}

async function inBatches<T>(
  values: readonly T[],
  signal: AbortSignal,
  run: (value: T, batchSignal: AbortSignal) => Promise<void>,
) {
  for (
    let index = 0;
    index < values.length && !signal.aborted;
    index += BATCH_SIZE
  ) {
    const batchSignal = AbortSignal.any([signal, AbortSignal.timeout(9000)]);
    await Promise.all(
      values
        .slice(index, index + BATCH_SIZE)
        .map((value) => run(value, batchSignal)),
    );
  }
}

async function loadPosts(ids: readonly string[], signal: AbortSignal) {
  const posts = new Map<string, Post>();
  await inBatches(ids, signal, async (id, batchSignal) => {
    try {
      const { post } = await api.postPreview(id, batchSignal);
      posts.set(id, post);
    } catch {
      // The chip still links to the original destination.
    }
  });
  return posts;
}

async function loadSites(
  postId: string,
  enabled: boolean,
  signal: AbortSignal,
) {
  const details: WebsiteDetails = { links: [], previews: [] };
  if (!enabled) return details;
  let offset = 0;
  while (!signal.aborted) {
    try {
      const batchSignal = AbortSignal.any([signal, AbortSignal.timeout(9000)]);
      const { links, previews, nextOffset } = await api.websitePreviews(
        postId,
        offset,
        batchSignal,
      );
      details.links.push(...links);
      if (offset === 0) details.previews = previews;
      if (nextOffset === undefined || nextOffset <= offset) break;
      offset = nextOffset;
    } catch {
      break;
    }
  }
  return details;
}

function loadImage(src: string, signal: AbortSignal) {
  return new Promise<boolean>((resolve) => {
    if (signal.aborted) return resolve(false);
    const image = new Image();
    image.referrerPolicy = "no-referrer";
    function finish(ready: boolean) {
      signal.removeEventListener("abort", abort);
      resolve(ready);
    }
    function abort() {
      image.removeAttribute("src");
      finish(false);
    }
    signal.addEventListener("abort", abort, { once: true });
    image.src = src;
    void image.decode().then(
      () => finish(true),
      () => finish(false),
    );
  });
}
