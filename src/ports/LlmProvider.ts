import type { Result } from "../domain/shared/Result";

export type LlmError =
  | { readonly kind: "unavailable"; readonly message: string }
  | { readonly kind: "failed"; readonly message: string }
  | { readonly kind: "aborted" };

export interface StructuredRequest {
  readonly system: string;
  readonly user: string;
  /** A JSON Schema the answer must follow. */
  readonly jsonSchema: unknown;
  /** What the request is for, so a provider can log it or route it; it does not change the answer. */
  readonly label?: string;
  readonly signal?: AbortSignal;
}

/** A language model that answers with JSON. The answer is raw: validating it is the domain's job. */
export interface LlmProvider {
  generateStructured(request: StructuredRequest): Promise<Result<unknown, LlmError>>;
}
