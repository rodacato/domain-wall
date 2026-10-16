import type { PackDraft } from "../domain/packGeneration/passes";
import type { LlmProvider } from "../ports/LlmProvider";
import type { LlmSettings } from "./llmSettings";
import type { TemplatesByLanguage } from "./loadTemplates";
import type { GeneratedPack } from "./packLibrary";

/** Everything the screen that generates a business needs from outside the UI. */
export interface GenerationServices {
  readonly createProvider: (settings: LlmSettings) => LlmProvider;
  readonly templates: TemplatesByLanguage;
  /** A known-good pack that shows the model the shape of an answer. */
  readonly example: PackDraft;
  /** Keeps a generated pack so the same request is not generated twice. */
  readonly save: (entry: GeneratedPack, description: string) => Promise<void>;
  /** Packs generated before, to reuse one when the request is the same. */
  readonly known: readonly GeneratedPack[];
  readonly hostOffersLlm: boolean;
}
