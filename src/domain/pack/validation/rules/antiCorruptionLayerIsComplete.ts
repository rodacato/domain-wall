import { issueAt, type ValidationIssue } from "../../../shared/ValidationIssue";
import type { PackIndex } from "../../PackIndex";
import type { FieldType } from "../../schema/FieldType";
import type { SemanticRule } from "../SemanticRule";

const RULE_ID = "S11";

/**
 * The translation fills every field of the external document exactly once, and each mapping is
 * compatible with the domain field it reads.
 */
export const antiCorruptionLayerIsComplete: SemanticRule = {
  id: RULE_ID,
  description: "the anti-corruption layer translates every external field consistently",
  check: (index) => {
    const issues: ValidationIssue[] = [];
    const acl = index.pack.antiCorruptionLayer;
    const at = ["antiCorruptionLayer"];

    const aggregate = index.aggregates.get(acl.domainType);
    const root = acl.externalTypes.find((type) => type.codeName === acl.externalRoot);
    if (aggregate === undefined || root === undefined) return issues;
    if (aggregate.context !== acl.context) {
      issues.push(
        issueAt(
          RULE_ID,
          at,
          `domain type "${aggregate.codeName}" lives in "${aggregate.context}", not in "${acl.context}"`,
        ),
      );
    }

    const domainFields = new Map<string, FieldType>(
      [...aggregate.fields, ...aggregate.derived].map((field) => [field.codeName, field.type]),
    );
    const externalFields = new Map<string, FieldType>(
      root.fields.map((field) => [field.codeName, field.type]),
    );
    const filled = new Map<string, number>();

    for (const mapping of acl.translation) {
      const mappingPath = [...at, mapping.externalField];
      filled.set(mapping.externalField, (filled.get(mapping.externalField) ?? 0) + 1);
      if (!externalFields.has(mapping.externalField)) {
        issues.push(
          issueAt(
            RULE_ID,
            mappingPath,
            `external field "${mapping.externalField}" does not exist in "${root.codeName}"`,
          ),
        );
      }
      if (mapping.op === "constant") continue;
      const domainType = domainFields.get(mapping.domainField);
      if (domainType === undefined) {
        issues.push(
          issueAt(
            RULE_ID,
            mappingPath,
            `domain field "${mapping.domainField}" does not exist in "${aggregate.codeName}"`,
          ),
        );
        continue;
      }
      issues.push(
        ...checkMappingCompatibility(index, mapping, unwrapOptional(domainType), mappingPath),
      );
    }

    for (const fieldName of externalFields.keys()) {
      const times = filled.get(fieldName) ?? 0;
      if (times === 0)
        issues.push(
          issueAt(
            RULE_ID,
            [...at, fieldName],
            `external field "${fieldName}" is never filled by the translation`,
          ),
        );
      if (times > 1)
        issues.push(
          issueAt(
            RULE_ID,
            [...at, fieldName],
            `external field "${fieldName}" is filled ${times} times`,
          ),
        );
    }
    return issues;
  },
};

function unwrapOptional(type: FieldType): FieldType {
  return type.kind === "optional" ? unwrapOptional(type.of) : type;
}

function checkMappingCompatibility(
  index: PackIndex,
  mapping: Exclude<
    PackIndex["pack"]["antiCorruptionLayer"]["translation"][number],
    { op: "constant" }
  >,
  domainType: FieldType,
  path: readonly string[],
): ValidationIssue[] {
  const valueObject =
    domainType.kind === "valueObject" ? index.valueObjects.get(domainType.ref) : undefined;
  switch (mapping.op) {
    case "rename":
      return [];
    case "format": {
      const isMoney =
        mapping.format === "minorUnitsToDecimalString" &&
        valueObject?.kind === "scalar" &&
        valueObject.base === "integer";
      const isDate =
        mapping.format === "isoDate" &&
        domainType.kind === "primitive" &&
        domainType.name === "date";
      return isMoney || isDate
        ? []
        : [
            issueAt(
              RULE_ID,
              path,
              `format "${mapping.format}" does not apply to "${mapping.domainField}"`,
            ),
          ];
    }
    case "mapCode": {
      if (valueObject?.kind !== "enum")
        return [
          issueAt(RULE_ID, path, `mapCode needs an enum, but "${mapping.domainField}" is not one`),
        ];
      const members = new Set<string>(valueObject.members.map((member) => member.codeName));
      const issues: ValidationIssue[] = [];
      for (const member of members) {
        if (!(member in mapping.table))
          issues.push(issueAt(RULE_ID, path, `enum member "${member}" has no external code`));
      }
      for (const key of Object.keys(mapping.table)) {
        if (!members.has(key))
          issues.push(issueAt(RULE_ID, path, `table key "${key}" is not a member of the enum`));
      }
      return issues;
    }
  }
}
