import Mustache from "mustache";
import { err, type Result } from "../../domain/shared/Result";
import type { AnchoredText } from "./extractAnchors";
import { extractAnchors } from "./extractAnchors";

const WITHOUT_ESCAPING = { escape: (text: string): string => text };

/** Renders a skeleton template and splits the anchor markers from the code. */
export function renderTemplate(
  template: string,
  view: object,
  templateName: string,
): Result<AnchoredText, string> {
  const rendered = Mustache.render(template, view, {}, WITHOUT_ESCAPING);
  const anchored = extractAnchors(rendered);
  return anchored.ok ? anchored : err(`${templateName}: ${anchored.error}`);
}
