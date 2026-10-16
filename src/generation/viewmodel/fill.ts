import Mustache from "mustache";

const WITHOUT_ESCAPING = { escape: (text: string): string => text };

/** Fills a small syntax snippet such as "{{left}} {{operator}} {{right}}"; code is never HTML-escaped. */
export function fill(snippet: string, values: Readonly<Record<string, string>>): string {
  return Mustache.render(snippet, values, {}, WITHOUT_ESCAPING);
}
