/* eslint-disable @typescript-eslint/no-namespace,import-x/export */
import type {
  ConceptAttributeId,
  ConceptAttributeModel,
  ConceptAttributeValueShape,
} from "$/models/ontology/ConceptAttribute/ConceptAttribute.types.ts";
import type { Simplify } from "type-fest";

export { ConceptAttributeModule as ConceptAttribute } from "$/models/ontology/ConceptAttribute/ConceptAttributeModule/ConceptAttributeModule.ts";

export namespace ConceptAttribute {
  export type T<K extends keyof ConceptAttributeModel = "Read"> = Simplify<
    ConceptAttributeModel[K]
  >;
  export type Id = ConceptAttributeId;
  export type ValueShape = ConceptAttributeValueShape;
}
