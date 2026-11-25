/* oxlint-disable typescript/no-namespace, import/export */
import type {
  ColumnConversionCase,
  ColumnConversionOutputType,
  ColumnConversionRows,
  ColumnConversionT,
} from "$/models/dataDictionaries/ColumnConversion/ColumnConversion.types.ts";

export { ColumnConversionModule as ColumnConversion } from "$/models/dataDictionaries/ColumnConversion/ColumnConversionModule/ColumnConversionModule.ts";

/** Public namespace for what a convert binding does to a column. */
export namespace ColumnConversion {
  /** One converted column's rules. */
  export type T = ColumnConversionT;

  /** One `WHEN` of a conversion. */
  export type Case = ColumnConversionCase;

  /** The SQL type a conversion outputs. */
  export type OutputType = ColumnConversionOutputType;

  /** The rows a dataset's conversions are read from. */
  export type Rows = ColumnConversionRows;
}
