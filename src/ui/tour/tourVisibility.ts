const SEEN_KEY = "domain-wall:tour-seen";

/** Whether the tour opens by itself: `?tour=on` forces it, `?tour=off` silences it, otherwise only until it has been seen once. */
export function opensByItself(search: string, seen: boolean): boolean {
  const asked = new URLSearchParams(search).get("tour");
  if (asked === "on") return true;
  if (asked === "off") return false;
  return !seen;
}

export function tourSeen(): boolean {
  try {
    return window.localStorage.getItem(SEEN_KEY) === "1";
  } catch {
    return false;
  }
}

export function rememberTourSeen(): void {
  try {
    window.localStorage.setItem(SEEN_KEY, "1");
  } catch {
    return;
  }
}
