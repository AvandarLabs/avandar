/* eslint-disable @typescript-eslint/no-namespace */
import type {
  IndividualId,
  IndividualModel,
} from "$/models/ontology/Individual/Individual.types.ts";

export { IndividualParsers } from "$/models/ontology/Individual/IndividualParsers.ts";

export namespace Individual {
  export type T<K extends keyof IndividualModel = "Read"> = IndividualModel[K];
  export type Id = IndividualId;
}
