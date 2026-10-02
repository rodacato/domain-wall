import type { ValidationIssue } from "../../shared/ValidationIssue";
import type { PackIndex } from "../PackIndex";

/** A semantic rule inspects a schema-valid pack and reports everything wrong with it. */
export interface SemanticRule {
  readonly id: string;
  readonly description: string;
  readonly check: (index: PackIndex) => readonly ValidationIssue[];
}
