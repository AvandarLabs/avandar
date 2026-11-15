/* eslint-disable @typescript-eslint/no-namespace,import-x/export */
import type {
  CrosswalkLayoutDataset,
  CrosswalkLayoutGroup,
  CrosswalkLayoutId,
  CrosswalkLayoutModel,
  CrosswalkLayoutStatus,
} from "$/models/crosswalks/CrosswalkLayout/CrosswalkLayout.types.ts";

export { CrosswalkLayoutParsers } from "$/models/crosswalks/CrosswalkLayout/CrosswalkLayoutParsers.ts";
export { CrosswalkLayoutModule as CrosswalkLayout } from "$/models/crosswalks/CrosswalkLayout/CrosswalkLayoutModule/CrosswalkLayoutModule.ts";

/** Public namespace for a crosswalk's layouts. */
export namespace CrosswalkLayout {
  /** Selects a CRUD variant of the model. */
  export type T<K extends keyof CrosswalkLayoutModel = "Read"> =
    CrosswalkLayoutModel[K];

  /** Identifies a layout. */
  export type Id = CrosswalkLayoutId;

  /** How far a layout's mapping has come. */
  export type Status = CrosswalkLayoutStatus;

  /** A dataset as layouts see it. */
  export type Dataset = CrosswalkLayoutDataset;

  /** Datasets that share one set of column names. */
  export type Group = CrosswalkLayoutGroup;
}
