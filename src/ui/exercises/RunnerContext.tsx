import { createContext, useContext, type ReactNode } from "react";
import type { CodeRunner } from "../../application/codeExercise";

const RunnerContext = createContext<CodeRunner | null>(null);

/** Provides the runner that really executes tests, when the course is embedded in a host that offers one. */
export function RunnerProvider({
  runner,
  children,
}: {
  readonly runner: CodeRunner | null;
  readonly children: ReactNode;
}): ReactNode {
  return <RunnerContext value={runner}>{children}</RunnerContext>;
}

export function useRunner(): CodeRunner | null {
  return useContext(RunnerContext);
}
