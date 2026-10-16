export interface TestResult {
  readonly name: string;
  readonly status: "passed" | "failed";
  readonly message: string | null;
}

export interface SyntaxDiagnostic {
  readonly line: number;
  readonly column: number;
  readonly message: string;
}

/**
 * What running exercise code produced. A union, so the UI can never claim a pass that did not
 * happen: `SyntaxChecked` means the code was only parsed, and no test ran.
 */
export type RunOutcome =
  | {
      readonly kind: "executed";
      readonly tests: readonly TestResult[];
      readonly durationMs: number;
    }
  | { readonly kind: "syntaxChecked"; readonly diagnostics: readonly SyntaxDiagnostic[] };

interface JsonLine {
  readonly type?: unknown;
  readonly name?: unknown;
  readonly status?: unknown;
  readonly message?: unknown;
}

/** Reads the JSON lines the generated test harness prints, one per test, ignoring any other output. */
export function parseTestResults(stdout: string): readonly TestResult[] {
  return stdout.split("\n").flatMap((line) => {
    if (!line.startsWith("{")) return [];
    let parsed: JsonLine;
    try {
      parsed = JSON.parse(line) as JsonLine;
    } catch {
      return [];
    }
    if (parsed.type !== "test" || typeof parsed.name !== "string") return [];
    return [
      {
        name: parsed.name,
        status: parsed.status === "passed" ? ("passed" as const) : ("failed" as const),
        message: typeof parsed.message === "string" ? parsed.message : null,
      },
    ];
  });
}

export function allPassed(outcome: RunOutcome): boolean {
  return (
    outcome.kind === "executed" &&
    outcome.tests.length > 0 &&
    outcome.tests.every((test) => test.status === "passed")
  );
}
