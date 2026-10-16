import { z } from "zod";

export const llmSettingsSchema = z.discriminatedUnion("provider", [
  z.object({ provider: z.literal("simulated") }),
  z.object({ provider: z.literal("host") }),
  z.object({ provider: z.literal("anthropic"), apiKey: z.string(), model: z.string() }),
  z.object({
    provider: z.literal("openai"),
    apiKey: z.string(),
    model: z.string(),
    baseUrl: z.string(),
  }),
]);
export type LlmSettings = z.infer<typeof llmSettingsSchema>;
export type LlmProviderKind = LlmSettings["provider"];

export const DEFAULT_ANTHROPIC_MODEL = "claude-sonnet-5-5";
export const DEFAULT_OPENAI_BASE_URL = "https://api.openai.com/v1";
export const DEFAULT_OPENAI_MODEL = "gpt-4.1";

export const DEFAULT_LLM_SETTINGS: LlmSettings = { provider: "simulated" };

export function parseLlmSettings(raw: unknown): LlmSettings {
  const parsed = llmSettingsSchema.safeParse(raw);
  return parsed.success ? parsed.data : DEFAULT_LLM_SETTINGS;
}

/** Settings of another provider kind, keeping what can be kept so switching does not lose what was typed. */
export function settingsFor(kind: LlmProviderKind, previous: LlmSettings): LlmSettings {
  const apiKey = "apiKey" in previous ? previous.apiKey : "";
  switch (kind) {
    case "simulated":
    case "host":
      return { provider: kind };
    case "anthropic":
      return { provider: "anthropic", apiKey, model: DEFAULT_ANTHROPIC_MODEL };
    case "openai":
      return {
        provider: "openai",
        apiKey,
        model: DEFAULT_OPENAI_MODEL,
        baseUrl: DEFAULT_OPENAI_BASE_URL,
      };
  }
}

/** Whether the settings are enough to try a generation. */
export function isUsable(settings: LlmSettings, hostOffersLlm: boolean): boolean {
  switch (settings.provider) {
    case "simulated":
      return true;
    case "host":
      return hostOffersLlm;
    case "anthropic":
    case "openai":
      return settings.apiKey.trim() !== "" && settings.model.trim() !== "";
  }
}

/** The name the generated pack records as its author. */
export function modelNameOf(settings: LlmSettings): string {
  switch (settings.provider) {
    case "simulated":
      return "simulated";
    case "host":
      return "host";
    case "anthropic":
    case "openai":
      return settings.model;
  }
}
