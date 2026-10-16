import { describe, expect, it } from "vitest";
import { isUsable, parseLlmSettings, settingsFor } from "./llmSettings";

describe("llm settings", () => {
  it("falls back to the simulation when what was stored makes no sense", () => {
    expect(parseLlmSettings({ provider: "nope" })).toEqual({ provider: "simulated" });
    expect(parseLlmSettings(null)).toEqual({ provider: "simulated" });
    expect(parseLlmSettings({ provider: "anthropic", apiKey: "k", model: "m" })).toEqual({
      provider: "anthropic",
      apiKey: "k",
      model: "m",
    });
  });

  it("keeps the key when switching between providers that use one", () => {
    const anthropic = { provider: "anthropic", apiKey: "secret", model: "m" } as const;

    expect(settingsFor("openai", anthropic)).toMatchObject({
      provider: "openai",
      apiKey: "secret",
    });
    expect(settingsFor("host", anthropic)).toEqual({ provider: "host" });
  });

  it("needs a key and a model, or a host that offers one", () => {
    expect(isUsable({ provider: "simulated" }, false)).toBe(true);
    expect(isUsable({ provider: "host" }, false)).toBe(false);
    expect(isUsable({ provider: "host" }, true)).toBe(true);
    expect(isUsable({ provider: "anthropic", apiKey: " ", model: "m" }, false)).toBe(false);
    expect(isUsable({ provider: "anthropic", apiKey: "k", model: "m" }, false)).toBe(true);
  });
});
