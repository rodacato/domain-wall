import { err, ok, type Result } from "../../domain/shared/Result";
import type { RunOutcome } from "../../domain/execution/RunOutcome";
import type { CodeRunner, RunnerError, RunRequest } from "../../ports/CodeRunner";
import type { HostBridge } from "../../ports/HostBridge";

type Resolver = (outcome: Result<RunOutcome, RunnerError>) => void;

/** Asks the embedding page to run the code, which is how tests really execute (ADR 5). */
export class HostRunner implements CodeRunner {
  private readonly pending = new Map<string, Resolver>();
  private nextId = 0;

  constructor(private readonly bridge: HostBridge) {
    bridge.onMessage((message) => {
      if (message.type !== "host:runResult") return;
      const resolve = this.pending.get(message.payload.requestId);
      this.pending.delete(message.payload.requestId);
      resolve?.(ok(message.payload.outcome));
    });
  }

  run(request: RunRequest): Promise<Result<RunOutcome, RunnerError>> {
    const requestId = `run-${++this.nextId}`;
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        this.pending.delete(requestId);
        resolve(err({ kind: "timedOut", afterMs: request.timeoutMs }));
      }, request.timeoutMs);
      this.pending.set(requestId, (outcome) => {
        clearTimeout(timer);
        resolve(outcome);
      });
      this.bridge.send({ type: "course:runRequested", payload: { ...request, requestId } });
    });
  }
}
