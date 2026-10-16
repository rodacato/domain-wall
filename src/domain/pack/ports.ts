import type { LocalizedText } from "../locale/LocalizedText";
import type { PackIndex } from "./PackIndex";

export type PortKind = "repository" | "gateway" | "external";

/** A way the domain asks the outside world for something, without knowing who answers. */
export interface DomainPort {
  readonly kind: PortKind;
  readonly codeName: string;
  /** What the port is for; undefined for repositories, whose purpose is the same everywhere. */
  readonly description: LocalizedText | undefined;
  /** The aggregate a repository belongs to, or the external system an anti-corruption layer faces. */
  readonly about: string;
}

/** The ports the pack implies: a repository for each aggregate, the workflow's gateways and the external system behind the anti-corruption layer. */
export function portsOf(index: PackIndex): readonly DomainPort[] {
  const repositories = index.pack.aggregates.map<DomainPort>((aggregate) => ({
    kind: "repository",
    codeName: `${aggregate.codeName}Repository`,
    description: undefined,
    about: aggregate.codeName,
  }));
  const gateways = index.pack.workflow.stages.flatMap<DomainPort>((stage) =>
    stage.kind.type === "callPort"
      ? [
          {
            kind: "gateway",
            codeName: stage.kind.port.codeName,
            description: stage.kind.port.description,
            about: stage.kind.port.codeName,
          },
        ]
      : [],
  );
  const { externalSystem } = index.pack.antiCorruptionLayer;
  const external: DomainPort = {
    kind: "external",
    codeName: `${externalSystem}Translator`,
    description: index.externalSystems.get(externalSystem)?.description,
    about: externalSystem,
  };
  return [...repositories, ...gateways, external];
}
