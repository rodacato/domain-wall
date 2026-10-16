import { describe, expect, it } from "vitest";
import { AnthropicProvider } from "./AnthropicProvider";
import { OpenAiCompatibleProvider } from "./OpenAiCompatibleProvider";
import { SimulatedLlmProvider } from "./SimulatedLlmProvider";
import { loadDefaultPack } from "../../domain/pack/packFixtures";

const request = { system: "s", user: "u", jsonSchema: { type: "object" }, label: "storm" };

function reply(body: unknown, status = 200): typeof fetch {
  return () => Promise.resolve(new Response(JSON.stringify(body), { status }));
}

describe("AnthropicProvider", () => {
  it("returns the input of the tool call and sends the schema as the tool's", async () => {
    let sent: { body?: unknown; headers?: unknown } = {};
    const provider = new AnthropicProvider({
      apiKey: "key",
      model: "m",
      fetch: (_url, init) => {
        sent = { body: JSON.parse(init?.body as string), headers: init?.headers };
        return reply({ content: [{ type: "text" }, { type: "tool_use", input: { events: [] } }] })(
          _url,
          init,
        );
      },
    });

    const answer = await provider.generateStructured(request);

    expect(answer).toEqual({ ok: true, value: { events: [] } });
    expect(sent.body).toMatchObject({
      tool_choice: { type: "tool" },
      tools: [{ input_schema: { type: "object" } }],
    });
    expect(sent.headers).toMatchObject({ "x-api-key": "key" });
  });

  it("reports a refusal from the API and a network failure", async () => {
    const refused = await new AnthropicProvider({
      apiKey: "k",
      model: "m",
      fetch: reply({ error: "no" }, 401),
    }).generateStructured(request);
    const down = await new AnthropicProvider({
      apiKey: "k",
      model: "m",
      fetch: () => Promise.reject(new Error("offline")),
    }).generateStructured(request);

    expect(!refused.ok && refused.error.kind).toBe("failed");
    expect(down).toEqual({ ok: false, error: { kind: "unavailable", message: "offline" } });
  });
});

describe("OpenAiCompatibleProvider", () => {
  it("parses the JSON in the first choice", async () => {
    const provider = new OpenAiCompatibleProvider({
      apiKey: "k",
      model: "m",
      baseUrl: "https://example.test/v1/",
      fetch: reply({ choices: [{ message: { content: '{"a":1}' } }] }),
    });

    expect(await provider.generateStructured(request)).toEqual({ ok: true, value: { a: 1 } });
  });

  it("fails clearly when the content is not JSON", async () => {
    const provider = new OpenAiCompatibleProvider({
      apiKey: "k",
      model: "m",
      baseUrl: "https://example.test/v1",
      fetch: reply({ choices: [{ message: { content: "sorry" } }] }),
    });

    const answer = await provider.generateStructured(request);

    expect(!answer.ok && answer.error).toEqual({
      kind: "failed",
      message: "the answer was not JSON",
    });
  });
});

describe("SimulatedLlmProvider", () => {
  it("answers a pass with the matching part of its pack", async () => {
    const answer = await new SimulatedLlmProvider(loadDefaultPack()).generateStructured(request);

    expect(answer.ok && Object.keys(answer.value as object)).toContain("events");
  });

  it("does not know a pass it was not asked about", async () => {
    const answer = await new SimulatedLlmProvider(loadDefaultPack()).generateStructured({
      ...request,
      label: "other",
    });

    expect(answer.ok).toBe(false);
  });
});
