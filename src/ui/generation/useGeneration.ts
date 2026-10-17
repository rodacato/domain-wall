import { useCallback, useRef, useState } from "react";
import type { GenerationServices } from "../../application/generationServices";
import { modelNameOf, type LlmSettings } from "../../application/llmSettings";
import {
  generatePack,
  type GenerationEvent,
  type GenerationFailure,
} from "../../application/generatePack";
import type { GeneratedPack } from "../../application/packLibrary";
import { packCacheKey } from "../../domain/packGeneration/cacheKey";
import {
  PASS_IDS,
  passDefinition,
  type PackDraft,
  type PassId,
} from "../../domain/packGeneration/passes";

export type GenerationState =
  | { readonly status: "idle" }
  | { readonly status: "running"; readonly events: readonly GenerationEvent[] }
  | {
      readonly status: "succeeded";
      readonly events: readonly GenerationEvent[];
      readonly entry: GeneratedPack;
      readonly reused: boolean;
    }
  | {
      readonly status: "failed";
      readonly events: readonly GenerationEvent[];
      readonly failure: GenerationFailure;
      /** The passes whose answers are kept, so trying again does not pay for them twice. */
      readonly kept: readonly PassId[];
    };

/** Reuse what is kept (a finished pack or an unfinished draft), or start over and pay for every pass again. */
export type GenerationMode = "reuse" | "fresh";

export interface Generation {
  readonly state: GenerationState;
  readonly start: (description: string, settings: LlmSettings, mode?: GenerationMode) => void;
  /** The last request again, in the mode the learner chose. */
  readonly retry: (mode: GenerationMode) => void;
  readonly cancel: () => void;
  readonly reset: () => void;
}

const LOCALES = ["es-MX", "en"] as const;

function passesIn(draft: PackDraft | null): PassId[] {
  if (draft === null) return [];
  return PASS_IDS.filter((pass) => passDefinition(pass).keys.every((key) => key in draft));
}

/** Runs a generation and keeps what the scene shows: every gate passed and every time the model was sent back. */
export function useGeneration(services: GenerationServices): Generation {
  const [state, setState] = useState<GenerationState>({ status: "idle" });
  const controller = useRef<AbortController | null>(null);
  const lastRequest = useRef<{ description: string; settings: LlmSettings } | null>(null);

  const start = useCallback(
    (description: string, settings: LlmSettings, mode: GenerationMode = "reuse") => {
      lastRequest.current = { description, settings };
      const model = modelNameOf(settings);
      const key = packCacheKey({ description, locales: LOCALES, model });
      const known = services.known.find((entry) => entry.key === key);
      if (mode === "reuse" && known !== undefined) {
        setState({ status: "succeeded", events: [], entry: known, reused: true });
        return;
      }
      const abort = new AbortController();
      controller.current = abort;
      const events: GenerationEvent[] = [];
      setState({ status: "running", events });

      void (async () => {
        if (mode === "fresh") await services.drafts.remove(key);
        const saved = mode === "fresh" ? null : await services.drafts.load(key);
        let latest = saved;
        const result = await generatePack(
          { description, locales: LOCALES, model },
          {
            provider: services.createProvider(settings),
            templates: services.templates,
            example: services.example,
            signal: abort.signal,
            ...(saved === null ? {} : { resumeFrom: saved }),
            onDraft: (draft) => {
              latest = draft;
              void services.drafts.save(key, draft);
            },
            onEvent: (event) => {
              events.push(event);
              setState({ status: "running", events: [...events] });
            },
          },
        );
        if (result.ok) {
          const entry = { key, description, pack: result.value };
          await services.save(entry, description);
          await services.drafts.remove(key);
          setState({ status: "succeeded", events: [...events], entry, reused: false });
        } else {
          setState({
            status: "failed",
            events: [...events],
            failure: result.error,
            kept: passesIn(latest),
          });
        }
      })();
    },
    [services],
  );

  const retry = useCallback(
    (mode: GenerationMode) => {
      const request = lastRequest.current;
      if (request !== null) start(request.description, request.settings, mode);
    },
    [start],
  );
  const cancel = useCallback(() => {
    controller.current?.abort();
  }, []);
  const reset = useCallback(() => {
    setState({ status: "idle" });
  }, []);

  return { state, start, retry, cancel, reset };
}
