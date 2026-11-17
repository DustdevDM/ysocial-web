import type { MouseEvent } from "react";
import { useLocation, useNavigate } from "react-router";

// Links that mean "back" should actually go back in history (so the previous
// page keeps its scroll position), falling back to a normal link when the
// app was opened directly on this page.
export function useGoBack() {
  const navigate = useNavigate();
  const { key } = useLocation();
  return (event: MouseEvent<HTMLElement>) => {
    if (
      key === "default" ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      event.button !== 0
    )
      return;
    event.preventDefault();
    void navigate(-1);
  };
}
