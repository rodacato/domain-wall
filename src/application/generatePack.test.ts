import { describe, expect, it } from "vitest";
import { loadPackDirectory } from "../../scripts/lib/loadPackDirectory";
import { loadTemplates as loadTemplateFiles } from "../../scripts/lib/loadTemplates";
import { SimulatedLlmProvider } from "../adapters/llm/SimulatedLlmProvider";
import { PROGRAMMING_LANGUAGES } from "../domain/language/ProgrammingLanguage";
import { loadDefaultPack } from "../domain/pack/packFixtures";
import { err } from "../domain/shared/Result";
import type { LlmProvider } from "../ports/LlmProvider";
import { generatePack, type GenerationEvent } from "./generatePack";
import type { TemplatesByLanguage } from "./loadTemplates";

const templates = Object.fromEntries(
  PROGRAMMING_LANGUAGES.map((language) => [language, loadTemplateFiles(language)]),
) as TemplatesByLanguage;
const clinic = (() => {
  const loaded = loadPackDirectory("packs/presets/clinic");
  if (!loaded.ok) throw new Error("the clinic pack does not parse");
  return loaded.value;
})();
const input = {
  description: "A neighborhood clinic",
  locales: ["es-MX", "en"],
  model: "simulated",
} as const;

async function run(provider: LlmProvider): Promise<{
  readonly result: Awaited<ReturnType<typeof generatePack>>;
  readonly events: GenerationEvent[];
}> {
  const events: GenerationEvent[] = [];
  const result = await generatePack(input, {
    provider,
    templates,
    example: loadDefaultPack(),
    onEvent: (event) => events.push(event),
  });
  return { result, events };
}

describe("generating a pack", () => {
  it("builds a valid pack from the answers of the four passes", async () => {
    const { result, events } = await run(new SimulatedLlmProvider(clinic));

    expect(result.ok && result.value.meta.origin).toBe("generated");
    expect(result.ok && result.value.business.name.en).toBe("Neighborhood Clinic");
    expect(
      events.filter((event) => event.kind === "passAnswered").map((event) => event.pass),
    ).toEqual(["storm", "strategy", "model", "narrative"]);
    expect(
      events.filter((event) => event.kind === "codeChecked").every((event) => event.passed),
    ).toBe(true);
    expect(events.at(-1)).toMatchObject({ kind: "done" });
  });

  it("sends a pass back with the reasons when the whole is not meaningful, then succeeds", async () => {
    const { result, events } = await run(new SimulatedLlmProvider(clinic, { failFirst: "model" }));

    const refusal = events.find((event) => event.kind === "semanticsRefused");
    expect(refusal).toMatchObject({ retrying: "model" });
    expect(result.ok).toBe(true);
  });

  it("tells the model what was wrong with the previous answer", async () => {
    const prompts: string[] = [];
    const inner = new SimulatedLlmProvider(clinic, { failFirst: "model" });
    const spying: LlmProvider = {
      generateStructured: (request) => {
        prompts.push(request.user);
        return inner.generateStructured(request);
      },
    };

    await run(spying);

    expect(
      prompts.filter((prompt) => prompt.includes("was refused for these reasons")).length,
    ).toBe(1);
  });

  it("stops and says so when the model cannot be reached", async () => {
    const { result } = await run({
      generateStructured: () => Promise.resolve(err({ kind: "unavailable", message: "no key" })),
    });

    expect(result).toEqual({ ok: false, error: { kind: "unavailable", message: "no key" } });
  });

  it("gives up after the attempts when the model keeps answering nonsense", async () => {
    let calls = 0;
    const { result } = await run({
      generateStructured: () => {
        calls += 1;
        return Promise.resolve({ ok: true, value: { nonsense: true } });
      },
    });

    expect(calls).toBe(3);
    expect(result.ok).toBe(false);
    expect(!result.ok && result.error.kind).toBe("exhausted");
  });
});
