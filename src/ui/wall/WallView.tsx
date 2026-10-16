import { AnimatePresence, motion } from "motion/react";
import { useMemo, type ReactNode } from "react";
import type { CourseSession } from "../../application/CourseSession";
import { labelOfConcept } from "../../domain/pack/conceptLabels";
import { viewportsFor } from "../../domain/wall/cameraViewport";
import { layoutWall } from "../../domain/wall/layoutWall";
import { listAllNotes, type NoteKind } from "../../domain/wall/Note";
import { termPlacement } from "../../domain/wall/termPlacement";
import type { WallState } from "../../domain/wall/WallState";
import type { ProgrammingLanguageId } from "../../domain/language/ProgrammingLanguage";
import { CodeStage } from "../code/CodeStage";
import { useI18n } from "../i18n/I18n";
import { PipelineStage } from "../pipeline/PipelineStage";
import { ChangeImpactStage } from "./ChangeImpactStage";
import { GlossaryBoard } from "./GlossaryBoard";
import { StickyNote } from "./StickyNote";
import { TermNote } from "./TermNote";
import { useElementSize } from "./useElementSize";
import { useManualCamera } from "./useManualCamera";
import { WallLegend } from "./WallLegend";
import { WallLines, type RegionLabel } from "./WallLines";
import "./strategic.css";

interface WallViewProps {
  readonly session: CourseSession;
  readonly state: WallState;
  readonly language: ProgrammingLanguageId;
}

const ZONE_PREFIX = "zone:";

export function WallView({ session, state, language }: WallViewProps): ReactNode {
  const { locale, t } = useI18n();
  const [reference, viewSize] = useElementSize<HTMLDivElement>();
  const index =
    state.version === 2 && session.evolved !== undefined ? session.evolved : session.index;

  const specs = useMemo(() => new Map(listAllNotes(index).map((spec) => [spec.id, spec])), [index]);
  const layout = useMemo(() => layoutWall(index, state.layout), [index, state.layout]);
  const viewports = useMemo(
    () => viewportsFor(state.camera, state, layout, viewSize),
    [state, layout, viewSize],
  );
  const last = viewports[viewports.length - 1] ?? { x: 0, y: 0, scale: 1 };
  const manualCamera = useManualCamera(JSON.stringify([state.camera, state.layout]), last);
  const term = termPlacement(layout, state);

  const dropOrderByKind = new Map<NoteKind, number>();
  const kindsOnWall = new Set<NoteKind>();

  const regionLabel = (region: string): RegionLabel => {
    if (region.startsWith(ZONE_PREFIX)) {
      const zone = region.slice(ZONE_PREFIX.length);
      return { title: t(`ui.zone.${zone}.title`), advice: t(`ui.zone.${zone}.advice`) };
    }
    return { title: labelOfConcept(index, region)?.[locale] ?? region, advice: null };
  };

  return (
    <div className="wall" ref={reference} {...manualCamera.handlers}>
      <motion.div
        className="wall__camera"
        initial={false}
        animate={
          manualCamera.override !== null
            ? {
                x: manualCamera.override.x,
                y: manualCamera.override.y,
                scale: manualCamera.override.scale,
              }
            : viewports.length > 1
              ? {
                  x: viewports.map((v) => v.x),
                  y: viewports.map((v) => v.y),
                  scale: viewports.map((v) => v.scale),
                }
              : { x: last.x, y: last.y, scale: last.scale }
        }
        transition={
          manualCamera.override !== null
            ? { duration: 0 }
            : {
                duration: viewports.length > 1 ? 1.4 * viewports.length : 1.1,
                ease: [0.45, 0, 0.2, 1],
              }
        }
      >
        <WallLines
          state={state}
          layout={layout}
          regionLabel={regionLabel}
          patternName={(pattern) => t(`ui.pattern.${pattern}.name`)}
        />
        <AnimatePresence>
          {state.notes.map((wallNote) => {
            const spec = specs.get(wallNote.id);
            const placement = layout.placements.get(wallNote.id);
            if (spec === undefined || placement === undefined) return null;
            const dropOrder = dropOrderByKind.get(spec.kind) ?? 0;
            dropOrderByKind.set(spec.kind, dropOrder + 1);
            kindsOnWall.add(spec.kind);
            const label = labelOfConcept(index, spec.codeName)?.[locale] ?? spec.codeName;
            return (
              <StickyNote
                key={wallNote.id}
                kind={spec.kind}
                label={label}
                placement={placement}
                emphasis={wallNote.emphasis}
                dropOrder={dropOrder}
              />
            );
          })}
        </AnimatePresence>
        <AnimatePresence>
          {term !== null && (
            <TermNote key="term" index={index} context={state.term.context} rectangle={term} />
          )}
        </AnimatePresence>
      </motion.div>
      {state.glossary.entries.length > 0 && (
        <GlossaryBoard session={session} glossary={state.glossary} />
      )}
      {state.impact.model !== null && <ChangeImpactStage session={session} impact={state.impact} />}
      <CodeStage session={session} language={language} code={state.code} />
      <PipelineStage session={session} pipeline={state.pipeline} />
      <WallLegend kindsOnWall={kindsOnWall} />
    </div>
  );
}
