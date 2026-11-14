/* eslint-disable @typescript-eslint/no-namespace,import-x/export */
import type {
  CrosswalkCodesOutput,
  CrosswalkCombineErrorHint,
  CrosswalkCombinePayload,
  CrosswalkCompiledCodeList,
  CrosswalkId,
  CrosswalkModel,
  CrosswalkSaveErrorHint,
  CrosswalkSavePayload,
} from "$/models/crosswalks/Crosswalk/Crosswalk.types.ts";

export { CrosswalkParsers } from "$/models/crosswalks/Crosswalk/CrosswalkParsers.ts";
export { CrosswalkModule as Crosswalk } from "$/models/crosswalks/Crosswalk/CrosswalkModule/CrosswalkModule.ts";

/** Public namespace for crosswalks and what their RPCs take. */
export namespace Crosswalk {
  /** Selects a CRUD variant of the model. */
  export type T<K extends keyof CrosswalkModel = "Read"> = CrosswalkModel[K];

  /** Identifies a crosswalk. */
  export type Id = CrosswalkId;

  /** How a combined dataset writes coded columns. */
  export type CodesOutput = CrosswalkCodesOutput;

  /** A code list the combined dataset embedded, with its fingerprint. */
  export type CompiledCodeList = CrosswalkCompiledCodeList;

  /** Everything the save RPC replaces. */
  export type SavePayload = CrosswalkSavePayload;

  /** Everything the combined-dataset RPC writes. */
  export type CombinePayload = CrosswalkCombinePayload;

  /** Why the save RPC refused. */
  export type SaveErrorHint = CrosswalkSaveErrorHint;

  /** Why the combined-dataset RPC refused. */
  export type CombineErrorHint = CrosswalkCombineErrorHint;
}
