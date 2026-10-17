import { useEffect } from "react";

/** Keep keyboard navigation inside the current dialog and restore its trigger. */
export function useDialogFocus() {
  useEffect(() => {
    let dialog: HTMLElement | null = null;
    let trigger: HTMLElement | null = null;
    const focusable = (root: HTMLElement) =>
      Array.from(
        root.querySelectorAll<HTMLElement>(
          'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href], [tabindex="0"]',
        ),
      );
    const observe = () => {
      const next = document.querySelector<HTMLElement>('[role="dialog"]');
      if (next === dialog) return;
      if (next) {
        trigger = document.activeElement as HTMLElement;
        dialog = next;
        if (!next.contains(document.activeElement)) focusable(next)[0]?.focus();
      } else {
        dialog = null;
        if (trigger?.isConnected) trigger.focus();
        trigger = null;
      }
    };
    const keydown = (event: KeyboardEvent) => {
      if (!dialog) return;
      if (event.key === "Escape") {
        dialog
          .querySelector<HTMLButtonElement>('button[aria-label^="Close"]')
          ?.click();
        return;
      }
      if (event.key !== "Tab") return;
      const controls = focusable(dialog);
      const first = controls[0];
      const last = controls.at(-1);
      if (!first) {
        event.preventDefault();
        return;
      }
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    const observer = new MutationObserver(observe);
    observer.observe(document.body, { childList: true, subtree: true });
    document.addEventListener("keydown", keydown);
    observe();
    return () => {
      observer.disconnect();
      document.removeEventListener("keydown", keydown);
    };
  }, []);
}
