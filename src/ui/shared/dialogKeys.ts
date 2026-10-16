import type { KeyboardEvent } from "react";

const FOCUSABLE = "button:not([disabled]), input, select, textarea, a[href], [tabindex='0']";

/** The keys of a modal dialog: Escape closes it and Tab cycles inside it instead of leaving it. */
export function dialogKeys(onClose: () => void) {
  return (event: KeyboardEvent<HTMLElement>): void => {
    if (event.key === "Escape") {
      event.preventDefault();
      onClose();
      return;
    }
    if (event.key !== "Tab") return;
    const focusable = [...event.currentTarget.querySelectorAll<HTMLElement>(FOCUSABLE)];
    const first = focusable[0];
    const final = focusable[focusable.length - 1];
    if (first === undefined || final === undefined) return;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      final.focus();
    } else if (!event.shiftKey && document.activeElement === final) {
      event.preventDefault();
      first.focus();
    }
  };
}
