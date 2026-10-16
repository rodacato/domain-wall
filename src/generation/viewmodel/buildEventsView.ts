import type { PackIndex } from "../../domain/pack/PackIndex";
import type { LanguageDescriptor } from "../languages/LanguageDescriptor";
import { namingFor } from "./LanguageNaming";
import { asNamedList, referencedNames, uniqueSorted, withLast } from "./referencedNames";
import { renderFieldType } from "./renderFieldType";

export interface EventView {
  readonly name: string;
  readonly anchor: string;
  /** The discriminator value: the event's code name, spelled the same in every language. */
  readonly discriminator: string;
  readonly fields: readonly {
    readonly name: string;
    readonly type: string;
    readonly last: boolean;
  }[];
}

export interface EventsView {
  readonly valueObjectImports: readonly { readonly name: string; readonly last: boolean }[];
  readonly hasValueObjectImports: boolean;
  readonly events: readonly EventView[];
}

export function buildEventsView(index: PackIndex, descriptor: LanguageDescriptor): EventsView {
  const naming = namingFor(descriptor.id);
  const { events } = index.pack;
  const imported = uniqueSorted(
    events.flatMap((event) => event.payload.flatMap((field) => referencedNames(field.type))),
  );
  return {
    valueObjectImports: asNamedList(imported.map(naming.type)),
    hasValueObjectImports: imported.length > 0,
    events: events.map((event) => ({
      name: naming.type(event.codeName),
      anchor: `event.${event.codeName}`,
      discriminator: event.codeName,
      fields: withLast(
        event.payload.map((field) => ({
          name: naming.member(field.codeName),
          type: renderFieldType(descriptor.syntax, naming, field.type),
        })),
      ),
    })),
  };
}
