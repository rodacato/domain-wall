import { createContext, useContext, type ReactNode } from "react";
import type { SyntaxChecker } from "../../application/codeExercise";

const SyntaxCheckerContext = createContext<SyntaxChecker | null>(null);

export function SyntaxCheckerProvider({
  checker,
  children,
}: {
  readonly checker: SyntaxChecker;
  readonly children: ReactNode;
}): ReactNode {
  return <SyntaxCheckerContext value={checker}>{children}</SyntaxCheckerContext>;
}

export function useSyntaxChecker(): SyntaxChecker {
  const checker = useContext(SyntaxCheckerContext);
  if (checker === null)
    throw new Error("useSyntaxChecker must be used inside a SyntaxCheckerProvider");
  return checker;
}
