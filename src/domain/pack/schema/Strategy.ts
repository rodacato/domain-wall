import { z } from "zod";
import { localizedTextSchema } from "../../locale/LocalizedText";
import { memberNameSchema, typeNameSchema } from "../naming/CodeName";
import { fieldSchema } from "./Field";
import { literalSchema } from "./Literal";
import { presentableShape } from "./Presentable";

export const SUBDOMAIN_TYPES = ["core", "supporting", "generic"] as const;
export type SubdomainType = (typeof SUBDOMAIN_TYPES)[number];

export const boundedContextSchema = z.strictObject({
  codeName: typeNameSchema,
  ...presentableShape,
  subdomain: z.strictObject({
    type: z.enum(SUBDOMAIN_TYPES),
    rationale: localizedTextSchema,
  }),
});
export type BoundedContext = z.infer<typeof boundedContextSchema>;

/** Evans' context-mapping patterns. */
export const CONTEXT_PATTERNS = [
  "CustomerSupplier",
  "Conformist",
  "AntiCorruptionLayer",
  "OpenHostService",
  "PublishedLanguage",
  "SharedKernel",
  "Partnership",
  "SeparateWays",
] as const;
export type ContextPattern = (typeof CONTEXT_PATTERNS)[number];

export const UPSTREAM_ROLES = ["OpenHostService", "PublishedLanguage"] as const;
export const DOWNSTREAM_ROLES = ["AntiCorruptionLayer", "Conformist"] as const;

/**
 * Evans' context-mapping patterns, grouped by shape:
 * directional relationships (with upstream/downstream roles), symmetric ones, and separate ways.
 * An anti-corruption layer against an external system is declared in `antiCorruptionLayer`.
 */
export const contextRelationSchema = z.discriminatedUnion("type", [
  z.strictObject({
    type: z.literal("upstreamDownstream"),
    upstream: typeNameSchema,
    downstream: typeNameSchema,
    upstreamRoles: z.array(z.enum(UPSTREAM_ROLES)),
    downstreamRoles: z.array(z.enum(DOWNSTREAM_ROLES)),
    customerSupplier: z.boolean(),
    /** Events that travel from upstream to downstream. */
    via: z.array(typeNameSchema),
    description: localizedTextSchema,
  }),
  z.strictObject({
    type: z.enum(["partnership", "sharedKernel"]),
    a: typeNameSchema,
    b: typeNameSchema,
    shared: z.array(typeNameSchema),
    description: localizedTextSchema,
  }),
  z.strictObject({
    type: z.literal("separateWays"),
    a: typeNameSchema,
    b: typeNameSchema,
    description: localizedTextSchema,
  }),
]);
export type ContextRelation = z.infer<typeof contextRelationSchema>;

/** A word that means different things in different contexts: the course's "term transformation" moment. */
export const ambiguousTermSchema = z.strictObject({
  codeName: typeNameSchema,
  label: localizedTextSchema,
  meanings: z
    .array(
      z.strictObject({
        context: typeNameSchema,
        /** The local type that this context uses for the term, for example Listing or Parcel. */
        concept: typeNameSchema,
        definition: localizedTextSchema,
        /** Fields of the local concept that the note shows when the term transforms. */
        showcaseFields: z.array(memberNameSchema).min(1),
      }),
    )
    .min(2),
});
export type AmbiguousTerm = z.infer<typeof ambiguousTermSchema>;

/** A field of a type owned by an external system. `wireName` is how that system spells it on the wire. */
export const externalFieldSchema = fieldSchema.extend({ wireName: z.string().min(1) });

export const externalTypeSchema = z.strictObject({
  codeName: typeNameSchema,
  ...presentableShape,
  wireName: z.string().min(1),
  fields: z.array(externalFieldSchema).min(1),
});
export type ExternalType = z.infer<typeof externalTypeSchema>;

/** How a domain field becomes an external field. Closed vocabulary (ADR 2). */
export const MAPPING_FORMATS = ["minorUnitsToDecimalString", "isoDate"] as const;
export const mappingSchema = z.discriminatedUnion("op", [
  z.strictObject({
    op: z.literal("rename"),
    domainField: memberNameSchema,
    externalField: memberNameSchema,
  }),
  z.strictObject({
    op: z.literal("format"),
    domainField: memberNameSchema,
    externalField: memberNameSchema,
    format: z.enum(MAPPING_FORMATS),
  }),
  z.strictObject({
    op: z.literal("mapCode"),
    domainField: memberNameSchema,
    externalField: memberNameSchema,
    table: z.record(z.string(), z.string()),
  }),
  z.strictObject({
    op: z.literal("constant"),
    externalField: memberNameSchema,
    value: literalSchema,
  }),
]);
export type Mapping = z.infer<typeof mappingSchema>;

export const antiCorruptionLayerSchema = z.strictObject({
  context: typeNameSchema,
  externalSystem: typeNameSchema,
  /** The domain aggregate being translated. */
  domainType: typeNameSchema,
  /** The external document being produced; its fields are described in `externalTypes`. */
  externalRoot: typeNameSchema,
  externalTypes: z.array(externalTypeSchema).min(1),
  translation: z.array(mappingSchema).min(1),
});
export type AntiCorruptionLayer = z.infer<typeof antiCorruptionLayerSchema>;
