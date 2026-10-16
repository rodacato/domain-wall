import { useMemo, type ReactNode } from "react";
import { codeChangeOf } from "../../application/codeChange";
import type { CourseSession } from "../../application/CourseSession";
import type { ProgrammingLanguageId } from "../../domain/language/ProgrammingLanguage";
import type { CodeUnit } from "../../domain/wall/CodeStage";
import { useI18n } from "../i18n/I18n";
import { tokenizeLine } from "./highlight";

interface CodeDiffProps {
  readonly session: CourseSession;
  readonly language: ProgrammingLanguageId;
  readonly unit: CodeUnit;
}

const SIGN = { added: "+", removed: "−", same: " " } as const;

/** What the business change did to the code: the lines it added and removed, with the unchanged ones folded away. */
export function CodeDiff({ session, language, unit }: CodeDiffProps): ReactNode {
  const { t } = useI18n();
  const change = useMemo(
    () =>
      session.evolved === undefined
        ? undefined
        : codeChangeOf(session.index, session.evolved, language, session.templates, unit),
    [session, language, unit],
  );
  if (change === undefined) return <p className="code__unavailable">{t("ui.code.unavailable")}</p>;

  const added = change.entries.filter((entry) => entry.kind === "added").length;
  const removed = change.entries.filter((entry) => entry.kind === "removed").length;

  return (
    <div className="code">
      <header className="code__header">
        <span className="code__file">{t("ui.diff.header", { file: change.path })}</span>
        <span className="code__tally">
          <span className="code__tally--added">+{added}</span>{" "}
          <span className="code__tally--removed">−{removed}</span>
        </span>
      </header>
      <div className="code__body" role="region" tabIndex={0} aria-label={change.path}>
        {change.entries.map((entry, position) =>
          entry.kind === "gap" ? (
            <div key={`gap-${position}`} className="code__gap">
              {t("ui.diff.unchanged", { count: entry.hidden })}
            </div>
          ) : (
            <div key={position} className={`code__line code__line--${entry.kind}`}>
              <span className="code__number">{entry.newLine ?? entry.oldLine}</span>
              <span className="code__sign">{SIGN[entry.kind]}</span>
              <span className="code__text">
                {tokenizeLine(entry.text, language).map((token, tokenPosition) => (
                  <span key={tokenPosition} className={`tok tok--${token.kind}`}>
                    {token.text}
                  </span>
                ))}
              </span>
            </div>
          ),
        )}
      </div>
    </div>
  );
}
