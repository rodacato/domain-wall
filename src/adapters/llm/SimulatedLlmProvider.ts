import { PASSES, type PassId } from "../../domain/packGeneration/passes";
import type { DomainPack } from "../../domain/pack/schema/DomainPack";
import { err, ok, type Result } from "../../domain/shared/Result";
import type { LlmError, LlmProvider, StructuredRequest } from "../../ports/LlmProvider";

export interface SimulationOptions {
  /** A pass whose first answer is wrong in a way the checks catch, so the retry can be seen. */
  readonly failFirst?: PassId;
  /** How long each answer takes, to make the scene watchable. */
  readonly delayMilliseconds?: number;
}

function wait(milliseconds: number, signal: AbortSignal | undefined): Promise<boolean> {
  return new Promise((resolve) => {
    if (signal?.aborted === true) {
      resolve(false);
      return;
    }
    const timer = setTimeout(() => {
      resolve(true);
    }, milliseconds);
    signal?.addEventListener("abort", () => {
      clearTimeout(timer);
      resolve(false);
    });
  });
}

/** Answers every pass from a pack it already has, as a language model that happens to know the business. */
export class SimulatedLlmProvider implements LlmProvider {
  private readonly answered = new Set<string>();

  constructor(
    private readonly pack: DomainPack,
    private readonly options: SimulationOptions = {},
  ) {}

  async generateStructured(request: StructuredRequest): Promise<Result<unknown, LlmError>> {
    const delay = this.options.delayMilliseconds ?? 0;
    if (delay > 0 && !(await wait(delay, request.signal))) return err({ kind: "aborted" });
    const pass = PASSES.find((candidate) => candidate.id === request.label);
    if (pass === undefined) {
      return err({
        kind: "failed",
        message: `the simulation does not know "${request.label ?? ""}"`,
      });
    }
    const part = Object.fromEntries(pass.keys.map((key) => [key, this.pack[key]]));
    const firstTime = !this.answered.has(pass.id);
    this.answered.add(pass.id);
    return ok(firstTime && this.options.failFirst === pass.id ? this.broken(part) : part);
  }

  /** The aggregates keep a transition that uses a rule the answer no longer declares. */
  private broken(part: Record<string, unknown>): Record<string, unknown> {
    const aggregates = part["aggregates"];
    if (!Array.isArray(aggregates)) return part;
    const [first, ...rest] = aggregates as { rules: unknown[] }[];
    if (first === undefined) return part;
    return { ...part, aggregates: [{ ...first, rules: first.rules.slice(1) }, ...rest] };
  }
}
