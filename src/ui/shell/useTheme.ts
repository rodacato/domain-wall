import { useCallback, useEffect, useState } from "react";

export type ThemeChoice = "auto" | "light" | "dark";

const STORAGE_KEY = "muro.theme";
const CHOICES: readonly ThemeChoice[] = ["auto", "light", "dark"];

function parse(value: string | null): ThemeChoice | null {
  return CHOICES.find((choice) => choice === value) ?? null;
}

function readInitial(): ThemeChoice {
  const fromAddress = parse(new URLSearchParams(window.location.search).get("theme"));
  if (fromAddress !== null) return fromAddress;
  try {
    return parse(window.localStorage.getItem(STORAGE_KEY)) ?? "auto";
  } catch {
    return "auto";
  }
}

/** The theme the learner (or the page that embeds the course) asked for, applied to the whole document. */
export function useTheme(): readonly [ThemeChoice, (choice: ThemeChoice) => void] {
  const [choice, setChoice] = useState<ThemeChoice>(readInitial);

  useEffect(() => {
    if (choice === "auto") delete document.documentElement.dataset["theme"];
    else document.documentElement.dataset["theme"] = choice;
  }, [choice]);

  const choose = useCallback((next: ThemeChoice) => {
    setChoice(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // the choice then lasts only until the page closes
    }
  }, []);

  return [choice, choose];
}

export const THEME_CHOICES = CHOICES;
