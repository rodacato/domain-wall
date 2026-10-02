import { err, ok, type Result } from "../../shared/Result";
import type { ValidationIssue } from "../../shared/ValidationIssue";
import { buildPackIndex } from "../PackIndex";
import type { SchemaValidPack } from "../parseDomainPack";
import { ambiguousTermSpansContexts } from "./rules/ambiguousTermSpansContexts";
import { antiCorruptionLayerIsComplete } from "./rules/antiCorruptionLayerIsComplete";
import { changeScenariosApplyCleanly } from "./rules/changeScenariosApplyCleanly";
import { codeNamesAreUnique } from "./rules/codeNamesAreUnique";
import { contextMapIsRich } from "./rules/contextMapIsRich";
import { dialoguesAreCoherent } from "./rules/dialoguesAreCoherent";
import { eventPayloadsAreResolvable } from "./rules/eventPayloadsAreResolvable";
import { eventStormingIsCoherent } from "./rules/eventStormingIsCoherent";
import { everythingIsUsed } from "./rules/everythingIsUsed";
import { expressionsAreWellScoped } from "./rules/expressionsAreWellScoped";
import { generatedNamesAreSafe } from "./rules/generatedNamesAreSafe";
import { localizedTextIsComplete } from "./rules/localizedTextIsComplete";
import { packSizeIsWithinBudget } from "./rules/packSizeIsWithinBudget";
import { patternsArePortable } from "./rules/patternsArePortable";
import { referencesResolve } from "./rules/referencesResolve";
import { rulesAreViolable } from "./rules/rulesAreViolable";
import { statesAreReachable } from "./rules/statesAreReachable";
import { subdomainsAreClassified } from "./rules/subdomainsAreClassified";
import { valueObjectExamplesAreCorrect } from "./rules/valueObjectExamplesAreCorrect";
import { walkthroughsAreAccepted } from "./rules/walkthroughsAreAccepted";
import { workflowIsConsistent } from "./rules/workflowIsConsistent";
import type { SemanticRule } from "./SemanticRule";

declare const semanticallyValidBrand: unique symbol;

/** A pack whose meaning has been checked: the generators and the course may rely on it. */
export type SemanticallyValidPack = SchemaValidPack & { readonly [semanticallyValidBrand]: true };

/** Rules without which nothing else can be evaluated: they run first and stop the pipeline on failure. */
export const STRUCTURAL_RULES: readonly SemanticRule[] = [
  codeNamesAreUnique,
  referencesResolve,
  expressionsAreWellScoped,
];

/** Rules that can assume a structurally sound pack, including the ones that run the interpreter. */
export const CONTENT_RULES: readonly SemanticRule[] = [
  rulesAreViolable,
  statesAreReachable,
  walkthroughsAreAccepted,
  everythingIsUsed,
  ambiguousTermSpansContexts,
  generatedNamesAreSafe,
  localizedTextIsComplete,
  eventStormingIsCoherent,
  eventPayloadsAreResolvable,
  contextMapIsRich,
  antiCorruptionLayerIsComplete,
  workflowIsConsistent,
  valueObjectExamplesAreCorrect,
  subdomainsAreClassified,
  dialoguesAreCoherent,
  packSizeIsWithinBudget,
  patternsArePortable,
];

const EVERY_RULE_EXCEPT_CHANGE_SCENARIOS = [...STRUCTURAL_RULES, ...CONTENT_RULES];

export const SEMANTIC_RULES: readonly SemanticRule[] = [
  ...EVERY_RULE_EXCEPT_CHANGE_SCENARIOS,
  changeScenariosApplyCleanly(EVERY_RULE_EXCEPT_CHANGE_SCENARIOS),
];

export function validateSemantics(
  pack: SchemaValidPack,
): Result<SemanticallyValidPack, readonly ValidationIssue[]> {
  const index = buildPackIndex(pack);

  const structuralIssues = STRUCTURAL_RULES.flatMap((rule) => rule.check(index));
  if (structuralIssues.length > 0) return err(structuralIssues);

  const contentIssues = [
    ...CONTENT_RULES,
    changeScenariosApplyCleanly(EVERY_RULE_EXCEPT_CHANGE_SCENARIOS),
  ].flatMap((rule) => rule.check(index));
  return contentIssues.length > 0 ? err(contentIssues) : ok(pack as SemanticallyValidPack);
}
