import type { PackIndex } from "../../domain/pack/PackIndex";
import { contextsOfRelation, patternsOfRelation } from "../../domain/pack/relations";
import { noteIdOf, notesOfKind, type NoteId } from "../../domain/wall/Note";
import type { Scene, SceneStep } from "../../domain/wall/Scene";
import type { ArrowSpec } from "../../domain/wall/WallCommand";
import type { ContextPattern } from "../../domain/wall/WallState";
import { conceptId, moduleId } from "./sceneIds";

const PATTERN_CONCEPTS: readonly { readonly pattern: ContextPattern; readonly concept: string }[] =
  [
    { pattern: "CustomerSupplier", concept: "map.customer-supplier" },
    { pattern: "Conformist", concept: "map.conformist" },
    { pattern: "AntiCorruptionLayer", concept: "map.anticorruption-layer" },
    { pattern: "OpenHostService", concept: "map.open-host-service" },
    { pattern: "PublishedLanguage", concept: "map.published-language" },
    { pattern: "SharedKernel", concept: "map.shared-kernel" },
    { pattern: "Partnership", concept: "map.partnership" },
    { pattern: "SeparateWays", concept: "map.separate-ways" },
  ];

interface MapArrow {
  readonly spec: ArrowSpec;
  readonly notes: readonly NoteId[];
}

function relationArrows(index: PackIndex): readonly MapArrow[] {
  return index.pack.contextRelations.map((relation) => {
    const [first, second] = contextsOfRelation(relation);
    const from = noteIdOf("context", first);
    const to = noteIdOf("context", second);
    const style =
      relation.type === "separateWays"
        ? "severed"
        : relation.type === "upstreamDownstream"
          ? "plain"
          : "mutual";
    return { spec: { from, to, patterns: patternsOfRelation(relation), style }, notes: [from, to] };
  });
}

function aclArrow(index: PackIndex): MapArrow {
  const { externalSystem, context } = index.pack.antiCorruptionLayer;
  const from = noteIdOf("externalSystem", externalSystem);
  const to = noteIdOf("context", context);
  return {
    spec: { from, to, patterns: ["AntiCorruptionLayer"], style: "shielded" },
    notes: [from, to],
  };
}

/** Module 5: the contexts become nodes, relations appear as labelled arrows, one pattern at a time. */
export function buildContextMapScene(index: PackIndex): Scene {
  const arrows = [...relationArrows(index), aclArrow(index)];
  const contextNotes = notesOfKind(index, "context", "contextMap");
  const externalNote = aclArrow(index).spec.from;

  const patternSteps: SceneStep[] = PATTERN_CONCEPTS.map(({ pattern, concept }) => {
    const usingPattern = arrows.filter((arrow) => arrow.spec.patterns?.includes(pattern) === true);
    const involved = usingPattern.flatMap((arrow) => arrow.notes);
    return {
      id: `pattern-${pattern}`,
      concept: conceptId(concept),
      dialogue: pattern === "AntiCorruptionLayer" ? "contexts.mapping" : null,
      focus: { kind: "pattern", pattern },
      commands: [
        { kind: "clearEmphasis" },
        ...(pattern === "AntiCorruptionLayer"
          ? ([{ kind: "placeNotes", ids: [externalNote] }] as const)
          : []),
        { kind: "drawArrows", arrows: usingPattern.map((arrow) => arrow.spec) },
        { kind: "emphasize", ids: involved, emphasis: "highlighted" },
        { kind: "focusCamera", target: { kind: "overview" } },
      ],
    };
  });

  return {
    id: "context-map",
    module: moduleId("context-map"),
    prelude: [{ kind: "clearWall" }, { kind: "setLayout", layout: "contextMap" }],
    steps: [
      {
        id: "the-map",
        concept: conceptId("map.context-map"),
        dialogue: "contexts.mapping",
        commands: [
          { kind: "placeNotes", ids: contextNotes },
          { kind: "focusCamera", target: { kind: "overview" } },
        ],
      },
      ...patternSteps,
      {
        id: "the-whole-map",
        concept: null,
        dialogue: null,
        commands: [
          { kind: "clearEmphasis" },
          { kind: "focusCamera", target: { kind: "overview" } },
        ],
      },
    ],
  };
}
