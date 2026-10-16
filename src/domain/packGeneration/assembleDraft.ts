import type { DomainPack } from "../pack/schema/DomainPack";
import type { PackDraft } from "./passes";

export interface GenerationMetadata {
  readonly packId: string;
  readonly model: string;
  readonly attempts: number;
  readonly locales: readonly DomainPack["meta"]["locales"][number][];
}

/** A candidate pack: what the passes produced plus the metadata the generator is responsible for. */
export function assembleDraft(draft: PackDraft, metadata: GenerationMetadata): unknown {
  return {
    schemaVersion: 1,
    meta: {
      packId: metadata.packId,
      origin: "generated",
      locales: [...metadata.locales],
      generation: { model: metadata.model, attempts: metadata.attempts },
    },
    ...draft,
  };
}

/** A lowercase slug for a pack id, from the business name and a short stable suffix. */
export function packIdFor(businessName: string, key: string): string {
  const slug = businessName
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 24);
  const base = /^[a-z]/.test(slug) ? slug : `pack-${slug}`;
  return `${base}-${key.slice(0, 6)}`;
}
