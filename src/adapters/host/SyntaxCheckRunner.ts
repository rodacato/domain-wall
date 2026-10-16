import type { ProgrammingLanguageId } from "../../domain/language/ProgrammingLanguage";
import { ok, type Result } from "../../domain/shared/Result";
import type { RunOutcome } from "../../domain/execution/RunOutcome";
import type { CodeRunner, RunnerError, RunRequest } from "../../ports/CodeRunner";
import type { SyntaxChecker } from "../../ports/SyntaxChecker";

const EXTENSION_OF: Readonly<Record<ProgrammingLanguageId, string>> = {
  typescript: ".ts",
  python: ".py",
  ruby: ".rb",
  "ruby-dry": ".rb",
};

/** Parses the files without running them, so the outcome is always `syntaxChecked`. */
export class SyntaxCheckRunner implements CodeRunner {
  constructor(private readonly checker: SyntaxChecker) {}

  async run(request: RunRequest): Promise<Result<RunOutcome, RunnerError>> {
    const extension = EXTENSION_OF[request.language];
    const diagnostics = await Promise.all(
      request.files
        .filter((file) => file.path.endsWith(extension))
        .map(async (file) => {
          const issues = await this.checker.check(request.language, file.content);
          return issues.map((issue) => ({
            line: issue.line,
            column: issue.column,
            message: `${file.path}: ${issue.kind} ${issue.snippet}`.trim(),
          }));
        }),
    );
    return ok({ kind: "syntaxChecked", diagnostics: diagnostics.flat() });
  }
}
