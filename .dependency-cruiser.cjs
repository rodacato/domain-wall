/**
 * Architecture rules (see docs/adr/0001-hexagonal-architecture.md).
 * Each layer may only import from the layers listed in its allow-list.
 */
const layerAllowList = {
  domain: ["domain"],
  generation: ["domain", "generation"],
  ports: ["domain", "ports"],
  content: ["domain", "content"],
  application: ["domain", "generation", "ports", "content", "application"],
  adapters: ["domain", "generation", "ports", "adapters"],
  ui: ["domain", "application", "ui"],
};

const layerRules = Object.entries(layerAllowList).map(([layer, allowed]) => ({
  name: `layer-${layer}-imports-only-allowed-layers`,
  comment: `src/${layer} may only import from: ${allowed.join(", ")}`,
  severity: "error",
  from: { path: `^src/${layer}/`, pathNot: "\\.test\\.ts$" },
  to: { path: "^src/", pathNot: `^src/(${allowed.join("|")})/` },
}));

const pureLayersMustNotUsePlatform = ["domain", "generation", "application"].map((layer) => ({
  name: `layer-${layer}-does-not-use-node-core`,
  comment: `src/${layer} must stay platform-independent`,
  severity: "error",
  from: { path: `^src/${layer}/`, pathNot: "\\.test\\.ts$" },
  to: { dependencyTypes: ["core"] },
}));

/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: "no-circular",
      severity: "error",
      comment: "Imports must not form cycles.",
      from: {},
      to: { circular: true },
    },
    {
      name: "no-orphans",
      severity: "warn",
      from: { orphan: true, pathNot: ["\\.test\\.ts$", "^src/main\\.tsx?$", "^scripts/"] },
      to: {},
    },
    ...layerRules,
    ...pureLayersMustNotUsePlatform,
  ],
  options: {
    doNotFollow: { path: "node_modules" },
    tsPreCompilationDeps: true,
    tsConfig: { fileName: "tsconfig.json" },
    enhancedResolveOptions: {
      exportsFields: ["exports"],
      conditionNames: ["import", "require", "node", "default"],
    },
  },
};
