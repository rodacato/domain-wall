import { useCallback, useState } from "react";
import {
  DEFAULT_LLM_SETTINGS,
  parseLlmSettings,
  type LlmSettings,
} from "../../application/llmSettings";

const STORAGE_KEY = "muro.llm";

function readStored(): LlmSettings {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw === null ? DEFAULT_LLM_SETTINGS : parseLlmSettings(JSON.parse(raw));
  } catch {
    return DEFAULT_LLM_SETTINGS;
  }
}

/** How the learner reaches a language model. A key stays in this browser and goes nowhere but to the provider. */
export function useLlmSettings(): readonly [LlmSettings, (settings: LlmSettings) => void] {
  const [settings, setSettings] = useState<LlmSettings>(readStored);
  const change = useCallback((next: LlmSettings) => {
    setSettings(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // the settings then last only until the page closes
    }
  }, []);
  return [settings, change];
}
