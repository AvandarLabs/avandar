/* eslint-disable @typescript-eslint/no-namespace,import-x/export */
import type {
  CrosswalkConvert,
  CrosswalkFill,
  CrosswalkMappingId,
  CrosswalkMappingModel,
  CrosswalkMappingReason,
  CrosswalkMappingStatus,
} from "$/models/crosswalks/CrosswalkMapping/CrosswalkMapping.types.ts";

export { CrosswalkMappingParsers } from "$/models/crosswalks/CrosswalkMapping/CrosswalkMappingParsers.ts";
export { CrosswalkMappingModule as CrosswalkMapping } from "$/models/crosswalks/CrosswalkMapping/CrosswalkMappingModule/CrosswalkMappingModule.ts";
export type { StoredCrosswalkFill } from "$/models/crosswalks/CrosswalkMapping/CrosswalkMappingModule/CrosswalkMappingModule.ts";

/** Public namespace for how a crosswalk fills each column, per layout. */
export namespace CrosswalkMapping {
  /** Selects a CRUD variant of the model. */
  export type T<K extends keyof CrosswalkMappingModel = "Read"> =
    CrosswalkMappingModel[K];

  /** Identifies a mapping. */
  export type Id = CrosswalkMappingId;

  /** Whether a mapping is confirmed or still a suggestion. */
  export type Status = CrosswalkMappingStatus;

  /** Why a mapping was suggested. */
  export type Reason = CrosswalkMappingReason;

  /** How one column is filled for one layout. */
  export type Fill = CrosswalkFill;

  /** A change applied to a source column's values. */
  export type Convert = CrosswalkConvert;
}
