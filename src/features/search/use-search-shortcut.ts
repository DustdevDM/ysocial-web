import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router";

const BLOCKING =
  "input, textarea, select, [contenteditable], [role=textbox], [role=dialog], [role=alertdialog], [role=menu], [role=listbox]";

export function useSearchShortcut() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (
        event.key !== "/" ||
        event.defaultPrevented ||
        event.metaKey ||
        event.ctrlKey ||
        event.altKey
      )
        return;
      if (event.target instanceof Element && event.target.closest(BLOCKING))
        return;
      event.preventDefault();
      if (pathname === "/search")
        document
          .querySelector<HTMLInputElement>("[data-search-input]")
          ?.focus();
      else void navigate("/search");
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [navigate, pathname]);
}
