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
  readonly signal?: AbortSignal;
}

/** A language model that answers with JSON. The answer is raw: validating it is the domain's job. */
export interface LlmProvider {
  generateStructured(request: StructuredRequest): Promise<Result<unknown, LlmError>>;
}
