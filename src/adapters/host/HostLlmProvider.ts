import { err, ok, type Result } from "../../domain/shared/Result";
import type { HostBridge } from "../../ports/HostBridge";
import type { LlmError, LlmProvider, StructuredRequest } from "../../ports/LlmProvider";

type Resolver = (answer: Result<unknown, LlmError>) => void;

/** Reaches a language model through the embedding page, which holds the keys and the quota. */
export class HostLlmProvider implements LlmProvider {
  private readonly pending = new Map<string, Resolver>();
  private nextId = 0;

  constructor(private readonly bridge: HostBridge) {
    bridge.onMessage((message) => {
      if (message.type === "host:llmResult") {
        this.settle(message.payload.requestId, ok(message.payload.json));
      } else if (message.type === "host:llmFailed") {
        this.settle(
          message.payload.requestId,
          err({ kind: "failed", message: message.payload.message }),
        );
      }
    });
  }

  private settle(requestId: string, answer: Result<unknown, LlmError>): void {
    const resolve = this.pending.get(requestId);
    this.pending.delete(requestId);
    resolve?.(answer);
  }

  generateStructured(request: StructuredRequest): Promise<Result<unknown, LlmError>> {
    const requestId = `llm-${++this.nextId}`;
    return new Promise((resolve) => {
      if (request.signal?.aborted === true) {
        resolve(err({ kind: "aborted" }));
        return;
      }
      this.pending.set(requestId, resolve);
      request.signal?.addEventListener("abort", () => {
        this.settle(requestId, err({ kind: "aborted" }));
      });
      this.bridge.send({
        type: "course:llmRequested",
        payload: {
          requestId,
          system: request.system,
          user: request.user,
          jsonSchema: request.jsonSchema,
        },
      });
    });
  }
}
