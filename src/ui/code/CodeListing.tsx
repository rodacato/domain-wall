import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  anchorsInReadingOrder,
  focusedLines,
  innermostAnchorAt,
  type GeneratedFile,
} from "../../application/codeView";
import type { CourseSession } from "../../application/CourseSession";
import type { ProgrammingLanguageId } from "../../domain/language/ProgrammingLanguage";
import { labelOfAnchor, parseAnchorRef, type AnchorKind } from "../../domain/pack/anchorRef";
import { useI18n } from "../i18n/I18n";
import { tokenizeLine } from "./highlight";

interface CodeListingProps {
  readonly session: CourseSession;
  readonly file: GeneratedFile;
  readonly language: ProgrammingLanguageId;
  /** Anchor whose lines stand out; the rest of the file recedes. */
  readonly focus: string | null;
}

const LEGEND_KINDS: readonly AnchorKind[] = [
  "aggregate",
  "entity",
  "command",
  "rule",
  "invariant",
  "factory",
  "repository",
  "event",
  "valueObject",
  "workflow",
  "workflowType",
  "workflowPort",
  "workflowStage",
];

function kindAt(file: GeneratedFile, line: number): AnchorKind | null {
  const anchor = innermostAnchorAt(file, line);
  return anchor === undefined ? null : (parseAnchorRef(anchor.ref)?.kind ?? null);
}

/** A generated file with its lines tied to the notes they came from: hover either side and the other lights up. */
export function CodeListing({ session, file, language, focus }: CodeListingProps): ReactNode {
  const { locale, t } = useI18n();
  const [hovered, setHovered] = useState<string | null>(null);
  const [pinned, setPinned] = useState<string | null>(null);
  const firstFocused = useRef<HTMLDivElement | null>(null);

  const shown = hovered ?? pinned ?? focus;
  const highlighted = useMemo(() => focusedLines(file, shown), [file, shown]);
  const lines = useMemo(() => file.content.replace(/\n$/, "").split("\n"), [file.content]);
  const legend = useMemo(
    () =>
      anchorsInReadingOrder(file).filter((anchor) => {
        const kind = parseAnchorRef(anchor.ref)?.kind;
        return kind !== undefined && LEGEND_KINDS.includes(kind);
      }),
    [file],
  );
  const firstFocusedLine =
    highlighted === null || highlighted.size === 0 ? null : Math.min(...highlighted);
  const emergesFrom = firstFocusedLine ?? 1;

  useEffect(() => {
    if (focus === null) return;
    firstFocused.current?.scrollIntoView({ block: "center" });
  }, [focus, file.path]);

  const labelOf = (ref: string): string => {
    const parsed = parseAnchorRef(ref);
    const named = labelOfAnchor(session.index, ref)?.[locale];
    if (named !== undefined) return named;
    if (parsed?.kind === "factory" || parsed?.kind === "repository") {
      const aggregate =
        parsed.aggregate === null ? undefined : session.index.aggregates.get(parsed.aggregate);
      return t(`ui.code.anchor.${parsed.kind}`, {
        aggregate: aggregate?.label[locale] ?? parsed.aggregate ?? "",
      });
    }
    return ref;
  };

  return (
    <div className="code">
      <header className="code__header">
        <span className="code__file">{t("ui.code.fileHeader", { file: file.path })}</span>
        {pinned !== null && (
          <button
            className="code__reset"
            onClick={() => {
              setPinned(null);
            }}
          >
            {t("ui.code.showAll")}
          </button>
        )}
      </header>

      <ul className="code__legend" aria-label={t("ui.code.legendTitle")}>
        {legend.map((anchor) => {
          const kind = parseAnchorRef(anchor.ref)?.kind ?? "aggregate";
          return (
            <li key={anchor.ref}>
              <button
                className={`chip chip--${kind}`}
                aria-pressed={shown === anchor.ref}
                onMouseEnter={() => {
                  setHovered(anchor.ref);
                }}
                onMouseLeave={() => {
                  setHovered(null);
                }}
                onFocus={() => {
                  setHovered(anchor.ref);
                }}
                onBlur={() => {
                  setHovered(null);
                }}
                onClick={() => {
                  setPinned(pinned === anchor.ref ? null : anchor.ref);
                }}
              >
                <span className="chip__kind">{t(`ui.code.kind.${kind}`)}</span>
                {labelOf(anchor.ref)}
              </button>
            </li>
          );
        })}
      </ul>

      <div className="code__body">
        {lines.map((text, position) => {
          const number = position + 1;
          const kind = kindAt(file, number);
          const receded = highlighted !== null && !highlighted.has(number);
          return (
            <div
              key={number}
              ref={number === firstFocusedLine ? firstFocused : undefined}
              className={`code__line ${kind === null ? "" : `code__line--${kind}`} ${receded ? "code__line--receded" : ""}`}
              style={
                { "--line": Math.min(Math.abs(number - emergesFrom), 40) } as React.CSSProperties
              }
              onMouseEnter={() => {
                const anchor = innermostAnchorAt(file, number);
                setHovered(anchor?.ref ?? null);
              }}
              onMouseLeave={() => {
                setHovered(null);
              }}
            >
              <span className="code__number">{number}</span>
              <span className="code__text">
                {tokenizeLine(text, language).map((token, tokenPosition) => (
                  <span key={tokenPosition} className={`tok tok--${token.kind}`}>
                    {token.text}
                  </span>
                ))}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
