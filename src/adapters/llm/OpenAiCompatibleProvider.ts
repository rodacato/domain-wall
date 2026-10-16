import { z } from "zod";
import { err, ok, type Result } from "../../domain/shared/Result";
import type { LlmError, LlmProvider, StructuredRequest } from "../../ports/LlmProvider";

export interface OpenAiCompatibleOptions {
  readonly apiKey: string;
  readonly model: string;
  /** For example https://api.openai.com/v1, or the address of any server that speaks the same API. */
  readonly baseUrl: string;
  readonly fetch?: typeof fetch;
}

const responseSchema = z.object({
  choices: z.array(z.object({ message: z.object({ content: z.string().nullable() }) })).min(1),
});

const chunkSchema = z.object({
  choices: z.array(z.object({ delta: z.object({ content: z.string().nullish() }) })),
});

/** Joins the content of a server-sent chat-completions stream; comments and `[DONE]` carry none. */
export function contentOfStream(stream: string): string | null {
  let content: string | null = null;
  for (const line of stream.split("\n")) {
    if (!line.startsWith("data:")) continue;
    const data = line.slice("data:".length).trim();
    if (data === "[DONE]") continue;
    let chunk: unknown;
    try {
      chunk = JSON.parse(data);
    } catch {
      continue;
    }
    const parsed = chunkSchema.safeParse(chunk);
    const piece = parsed.success ? parsed.data.choices[0]?.delta.content : undefined;
    if (typeof piece === "string") content = (content ?? "") + piece;
  }
  return content;
}

async function contentOf(response: Response): Promise<string | null | undefined> {
  if (response.headers.get("content-type")?.includes("text/event-stream") === true) {
    return contentOfStream(await response.text());
  }
  const parsed = responseSchema.safeParse(await response.json());
  return parsed.success ? parsed.data.choices[0]?.message.content : null;
}

/** Asks a chat-completions API for JSON that follows a schema, streamed so a proxy in front does not time out waiting for the first byte. */
export class OpenAiCompatibleProvider implements LlmProvider {
  constructor(private readonly options: OpenAiCompatibleOptions) {}

  async generateStructured(request: StructuredRequest): Promise<Result<unknown, LlmError>> {
    const send = this.options.fetch ?? fetch;
    let response: Response;
    try {
      response = await send(`${this.options.baseUrl.replace(/\/$/, "")}/chat/completions`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${this.options.apiKey}`,
        },
        body: JSON.stringify({
          model: this.options.model,
          stream: true,
          messages: [
            { role: "system", content: request.system },
            { role: "user", content: request.user },
          ],
          response_format: {
            type: "json_schema",
            json_schema: { name: "pack_part", schema: request.jsonSchema, strict: false },
          },
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
        message: `the server answered ${response.status}: ${await response.text()}`,
      });
    }
    const content = await contentOf(response);
    if (content === null || content === undefined) {
      return err({ kind: "failed", message: "the answer had no content" });
    }
    try {
      return ok(JSON.parse(content));
    } catch {
      return err({ kind: "failed", message: "the answer was not JSON" });
    }
  }
}
