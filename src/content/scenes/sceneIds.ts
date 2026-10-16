import type { ConceptId, ModuleId } from "../../domain/course/ConceptId";

export const conceptId = (id: string): ConceptId => id as ConceptId;
export const moduleId = (id: string): ModuleId => id as ModuleId;
