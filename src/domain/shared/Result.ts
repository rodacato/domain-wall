/** Errors are values: operations that can fail return a Result instead of throwing. */
export type Result<Value, Failure> =
  { readonly ok: true; readonly value: Value } | { readonly ok: false; readonly error: Failure };

export function ok<Value>(value: Value): Result<Value, never> {
  return { ok: true, value };
}

export function err<Failure>(error: Failure): Result<never, Failure> {
  return { ok: false, error };
}

export function mapResult<Value, MappedValue, Failure>(
  result: Result<Value, Failure>,
  transform: (value: Value) => MappedValue,
): Result<MappedValue, Failure> {
  return result.ok ? ok(transform(result.value)) : result;
}
