import type { ProgrammingLanguageId } from "../../language/ProgrammingLanguage";
import type { DomainPack } from "../schema/DomainPack";
import { renderCodeName } from "./NameStyle";
import { NAMING_PROFILES } from "../../language/ProgrammingLanguage";
import type { CodeName } from "./CodeName";

/** Something that will become an identifier in generated code, and where it comes from. */
export interface GeneratedSymbol {
  readonly codeName: CodeName | string;
  readonly owner: string;
}

/** Suffixes the generator appends to an aggregate's name to create its companion types. */
export const AGGREGATE_COMPANION_SUFFIXES = [
  "Status",
  "Error",
  "Event",
  "Outcome",
  "Repository",
] as const;

/** Every type-like name the generator will introduce for this pack, including derived companions. */
export function generatedTypeSymbols(pack: DomainPack): readonly GeneratedSymbol[] {
  const symbols: GeneratedSymbol[] = [];
  const add = (codeName: string, owner: string): void => {
    symbols.push({ codeName, owner });
  };

  for (const aggregate of pack.aggregates) {
    add(aggregate.codeName, `aggregate ${aggregate.codeName}`);
    for (const suffix of AGGREGATE_COMPANION_SUFFIXES) {
      add(
        `${aggregate.codeName}${suffix}`,
        `${suffix.toLowerCase()} type of aggregate ${aggregate.codeName}`,
      );
    }
    for (const entity of aggregate.entities) add(entity.codeName, `entity ${entity.codeName}`);
  }
  for (const valueObject of pack.valueObjects) {
    add(valueObject.codeName, `value object ${valueObject.codeName}`);
    if (valueObject.kind === "scalar")
      add(`${valueObject.codeName}Error`, `error type of value object ${valueObject.codeName}`);
  }
  for (const event of pack.events) add(event.codeName, `event ${event.codeName}`);
  for (const command of pack.commands) add(command.codeName, `command ${command.codeName}`);
  for (const readModel of pack.readModels)
    add(readModel.codeName, `read model ${readModel.codeName}`);
  for (const type of pack.workflow.intermediateTypes)
    add(type.codeName, `workflow type ${type.codeName}`);
  for (const type of pack.antiCorruptionLayer.externalTypes)
    add(type.codeName, `external type ${type.codeName}`);
  add(pack.workflow.codeName, `workflow ${pack.workflow.codeName}`);
  for (const stage of pack.workflow.stages) {
    if (stage.kind.type === "callPort")
      add(stage.kind.port.codeName, `port ${stage.kind.port.codeName}`);
  }
  return symbols;
}

/** Every member-like name (field, parameter, derived value) the generator will use. */
export function generatedMemberSymbols(pack: DomainPack): readonly GeneratedSymbol[] {
  const symbols: GeneratedSymbol[] = [];
  const addAll = (fields: readonly { readonly codeName: string }[], owner: string): void => {
    for (const field of fields)
      symbols.push({ codeName: field.codeName, owner: `${owner}.${field.codeName}` });
  };
  for (const aggregate of pack.aggregates) {
    addAll(aggregate.fields, aggregate.codeName);
    addAll(aggregate.derived, aggregate.codeName);
    addAll(
      aggregate.states.flatMap((state) => state.data),
      aggregate.codeName,
    );
    for (const entity of aggregate.entities) {
      addAll(entity.fields, entity.codeName);
      addAll(entity.derived, entity.codeName);
    }
  }
  for (const valueObject of pack.valueObjects) {
    if (valueObject.kind === "record") addAll(valueObject.fields, valueObject.codeName);
  }
  for (const event of pack.events) addAll(event.payload, event.codeName);
  for (const command of pack.commands) addAll(command.params, command.codeName);
  for (const readModel of pack.readModels) addAll(readModel.fields, readModel.codeName);
  for (const type of pack.workflow.intermediateTypes) addAll(type.fields, type.codeName);
  for (const type of pack.antiCorruptionLayer.externalTypes) addAll(type.fields, type.codeName);
  for (const stage of pack.workflow.stages) {
    if (stage.kind.type === "callPort")
      symbols.push({
        codeName: stage.kind.port.operation,
        owner: `${stage.kind.port.codeName}.${stage.kind.port.operation}`,
      });
  }
  return symbols;
}

export function renderTypeSymbol(language: ProgrammingLanguageId, symbol: GeneratedSymbol): string {
  return renderCodeName(symbol.codeName as CodeName, NAMING_PROFILES[language].typeStyle);
}

export function renderMemberSymbol(
  language: ProgrammingLanguageId,
  symbol: GeneratedSymbol,
): string {
  return renderCodeName(symbol.codeName as CodeName, NAMING_PROFILES[language].memberStyle);
}
