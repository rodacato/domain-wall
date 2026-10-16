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
    };

export interface Generation {
  readonly state: GenerationState;
  readonly start: (description: string, settings: LlmSettings) => void;
  readonly cancel: () => void;
  readonly reset: () => void;
}

const LOCALES = ["es-MX", "en"] as const;

/** Runs a generation and keeps what the scene shows: every gate passed and every time the model was sent back. */
export function useGeneration(services: GenerationServices): Generation {
  const [state, setState] = useState<GenerationState>({ status: "idle" });
  const controller = useRef<AbortController | null>(null);

  const start = useCallback(
    (description: string, settings: LlmSettings) => {
      const key = packCacheKey({ description, locales: LOCALES, model: modelNameOf(settings) });
      const known = services.known.find((entry) => entry.key === key);
      if (known !== undefined) {
        setState({ status: "succeeded", events: [], entry: known, reused: true });
        return;
      }
      const abort = new AbortController();
      controller.current = abort;
      const events: GenerationEvent[] = [];
      setState({ status: "running", events });
      void generatePack(
        { description, locales: LOCALES, model: modelNameOf(settings) },
        {
          provider: services.createProvider(settings),
          templates: services.templates,
          example: services.example,
          signal: abort.signal,
          onEvent: (event) => {
            events.push(event);
            setState({ status: "running", events: [...events] });
          },
        },
      ).then(async (result) => {
        if (result.ok) {
          const entry = { key, description, pack: result.value };
          await services.save(entry, description);
          setState({ status: "succeeded", events: [...events], entry, reused: false });
        } else {
          setState({ status: "failed", events: [...events], failure: result.error });
        }
      });
    },
    [services],
  );

  const cancel = useCallback(() => {
    controller.current?.abort();
  }, []);
  const reset = useCallback(() => {
    setState({ status: "idle" });
  }, []);

  return { state, start, cancel, reset };
}
