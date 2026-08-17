/* eslint-disable @typescript-eslint/no-namespace,import-x/export */
import type {
  ConceptId,
  ConceptModel,
} from "$/models/ontology/Concept/Concept.types.ts";

export { ConceptParsers } from "$/models/ontology/Concept/ConceptParsers.ts";
export { ConceptModule as Concept } from "$/models/ontology/Concept/ConceptModule.ts";

export namespace Concept {
  export type T<K extends keyof ConceptModel = "Read"> = ConceptModel[K];
  export type Id = ConceptId;
}
