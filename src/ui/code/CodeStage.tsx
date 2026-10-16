import { useState, type ReactNode } from "react";
import { sourceFileOf } from "../../application/codeView";
import type { CourseSession } from "../../application/CourseSession";
import type { CodeStageState } from "../../domain/wall/CodeStage";
import type { ProgrammingLanguageId } from "../../domain/language/ProgrammingLanguage";
import { useI18n } from "../i18n/I18n";
import { StageOverlay } from "../wall/StageOverlay";
import { AggregateOpened } from "./AggregateOpened";
import { CodeListing } from "./CodeListing";
import { InvariantBreaker } from "./InvariantBreaker";
import { useGeneratedCode } from "./useGeneratedCode";
import "./code.css";

interface CodeStageProps {
  readonly session: CourseSession;
  readonly language: ProgrammingLanguageId;
  readonly code: CodeStageState;
}

/** The wall zoomed all the way in: the opened aggregate, or the code generated from it in the learner's language. */
export function CodeStage(props: CodeStageProps): ReactNode {
  if (props.code.level === "hidden") return null;
  return <CodeStageBody key={JSON.stringify(props.code)} {...props} />;
}

function CodeStageBody({ session, language, code }: CodeStageProps): ReactNode {
  const { t } = useI18n();
  const generated = useGeneratedCode(session, language);
  const [refusedBy, setRefusedBy] = useState<string | null>(null);

  if (code.level === "aggregate" && code.unit?.kind === "aggregate") {
    return (
      <StageOverlay>
        <AggregateOpened session={session} aggregate={code.unit.aggregate} />
      </StageOverlay>
    );
  }
  if (!generated.ok) {
    return (
      <StageOverlay>
        <p className="code__unavailable">{t("ui.code.unavailable")}</p>
      </StageOverlay>
    );
  }
  const file = sourceFileOf(generated.value, code.unit);
  if (file === undefined) return null;
  const focus = refusedBy ?? code.focus;

  return (
    <StageOverlay wide>
      {code.mode === "breakInvariants" && code.unit?.kind === "aggregate" && (
        <InvariantBreaker
          key={code.unit.aggregate}
          session={session}
          aggregate={code.unit.aggregate}
          onRefused={setRefusedBy}
        />
      )}
      <CodeListing
        key={`${file.path}|${focus ?? ""}`}
        session={session}
        file={file}
        language={language}
        focus={focus}
      />
    </StageOverlay>
  );
}
