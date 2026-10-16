import { z } from "zod";
import { err, ok, type Result } from "../../domain/shared/Result";
import type { LlmError, LlmProvider, StructuredRequest } from "../../ports/LlmProvider";

export interface AnthropicOptions {
  readonly apiKey: string;
  readonly model: string;
  readonly baseUrl?: string;
  readonly maxTokens?: number;
  readonly fetch?: typeof fetch;
}

const DEFAULT_BASE_URL = "https://api.anthropic.com";
const DEFAULT_MAX_TOKENS = 32_000;
const TOOL_NAME = "submit_pack_part";

const responseSchema = z.object({
  content: z.array(z.object({ type: z.string(), input: z.unknown().optional() })),
});

/** Asks Anthropic's Messages API to answer by calling a tool whose input schema is the shape we want. */
export class AnthropicProvider implements LlmProvider {
  constructor(private readonly options: AnthropicOptions) {}

  async generateStructured(request: StructuredRequest): Promise<Result<unknown, LlmError>> {
    const send = this.options.fetch ?? fetch;
    let response: Response;
    try {
      response = await send(`${this.options.baseUrl ?? DEFAULT_BASE_URL}/v1/messages`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": this.options.apiKey,
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true",
        },
        body: JSON.stringify({
          model: this.options.model,
          max_tokens: this.options.maxTokens ?? DEFAULT_MAX_TOKENS,
          system: request.system,
          messages: [{ role: "user", content: request.user }],
          tools: [
            {
              name: TOOL_NAME,
              description: "Submit the requested part of the domain.",
              input_schema: request.jsonSchema,
            },
          ],
          tool_choice: { type: "tool", name: TOOL_NAME },
        }),
        ...(request.signal === undefined ? {} : { signal: request.signal }),
      });
    } catch (failure) {
      if (request.signal?.aborted === true) return err({ kind: "aborted" });
      return err({
        kind: "unavailable",
        message: failure instanceof Error ? failure.message : "network error",
      });
    }
    if (!response.ok) {
      return err({
        kind: "failed",
        message: `Anthropic answered ${response.status}: ${await response.text()}`,
      });
    }
    const parsed = responseSchema.safeParse(await response.json());
    const call = parsed.success
      ? parsed.data.content.find((block) => block.type === "tool_use")
      : undefined;
    return call?.input === undefined
      ? err({ kind: "failed", message: "the answer did not contain the tool call" })
      : ok(call.input);
  }
}
