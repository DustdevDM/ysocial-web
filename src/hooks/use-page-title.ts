import { useEffect } from "react";

const SITE_NAME = "ysocial";

function setMeta(selector: string, content: string) {
  document.head.querySelector(selector)?.setAttribute("content", content);
}

export function usePageTitle(title?: string) {
  useEffect(() => {
    const full = title ? `${title} · ${SITE_NAME}` : SITE_NAME;
    document.title = full;
    setMeta('meta[property="og:title"]', full);
    setMeta('meta[name="twitter:title"]', full);
    const canonical = document.head.querySelector('link[rel="canonical"]');
    canonical?.setAttribute(
      "href",
      `${window.location.origin}${window.location.pathname}`.replace(/(.)\/$/, "$1"),
    );
  }, [title]);
}
