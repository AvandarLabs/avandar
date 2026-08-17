/* eslint-disable @typescript-eslint/no-namespace */
import type {
  ConceptAttributeId,
  ConceptAttributeModel,
} from "$/models/ontology/ConceptAttribute/ConceptAttribute.types.ts";
import type { Simplify } from "type-fest";

export namespace ConceptAttribute {
  export type T<K extends keyof ConceptAttributeModel = "Read"> = Simplify<
    ConceptAttributeModel[K]
  >;
  export type Id = ConceptAttributeId;
}
