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
  /** What unfinished generations produced, by request, so a failure can be resumed instead of paid for again. */
  readonly drafts: {
    readonly load: (key: string) => Promise<PackDraft | null>;
    readonly save: (key: string, draft: PackDraft) => Promise<void>;
    readonly remove: (key: string) => Promise<void>;
  };
  /** Whether generated businesses outlive the page; false in a browser that offers no storage. */
  readonly durable: boolean;
}

export type { LlmProvider };
export type { PackRepository } from "../ports/PackRepository";
