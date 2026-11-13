/* eslint-disable @typescript-eslint/no-namespace,import-x/export */
import type {
  ColumnCodePair,
  ColumnCodesContext,
  ColumnCodesRows,
  ColumnCodesT,
} from "$/models/dataDictionaries/ColumnCodes/ColumnCodes.types.ts";

export { ColumnCodesModule as ColumnCodes } from "$/models/dataDictionaries/ColumnCodes/ColumnCodesModule/ColumnCodesModule.ts";

/** Public namespace for what a dictionary says about one bound column. */
export namespace ColumnCodes {
  export type T = ColumnCodesT;
  export type Pair = ColumnCodePair;
  export type Context = ColumnCodesContext;
  export type Rows = ColumnCodesRows;
}
