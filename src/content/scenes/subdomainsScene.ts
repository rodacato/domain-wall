import type { PackIndex } from "../../domain/pack/PackIndex";
import type { SubdomainType } from "../../domain/pack/schema/Strategy";
import { noteIdOf, notesOfKind } from "../../domain/wall/Note";
import type { Scene, SceneStep } from "../../domain/wall/Scene";
import { zoneKey } from "../../domain/wall/WallState";
import { conceptId, moduleId } from "./sceneIds";

const ZONE_STEPS: readonly { readonly zone: SubdomainType; readonly concept: string }[] = [
  { zone: "core", concept: "strategy.core-domain" },
  { zone: "supporting", concept: "strategy.supporting-subdomain" },
  { zone: "generic", concept: "strategy.generic-subdomain" },
];

/** Module 6: the contexts settle into core, supporting and generic zones, from where the effort should go to where it can be spared. */
export function buildSubdomainsScene(index: PackIndex): Scene {
  const zoneSteps: SceneStep[] = ZONE_STEPS.map(({ zone, concept }) => {
    const members = index.pack.contexts
      .filter((context) => context.subdomain.type === zone)
      .map((context) => noteIdOf("context", context.codeName));
    return {
      id: `zone-${zone}`,
      concept: conceptId(concept),
      dialogue: zone === "core" ? "subdomains.focus" : null,
      focus: { kind: "zone", zone },
      commands: [
        { kind: "clearEmphasis" },
        { kind: "drawBoundary", region: zoneKey(zone) },
        { kind: "emphasize", ids: members, emphasis: "highlighted" },
        { kind: "focusCamera", target: { kind: "region", region: zoneKey(zone) } },
      ],
    };
  });

  return {
    id: "subdomains",
    module: moduleId("subdomains"),
    prelude: [{ kind: "clearWall" }, { kind: "setLayout", layout: "subdomains" }],
    steps: [
      {
        id: "the-contexts",
        concept: null,
        dialogue: null,
        commands: [
          { kind: "placeNotes", ids: notesOfKind(index, "context", "subdomains") },
          { kind: "focusCamera", target: { kind: "overview" } },
        ],
      },
      ...zoneSteps,
      {
        id: "where-to-invest",
        concept: conceptId("strategy.investment"),
        dialogue: null,
        commands: [
          { kind: "clearEmphasis" },
          { kind: "focusCamera", target: { kind: "overview" } },
        ],
      },
    ],
  };
}
