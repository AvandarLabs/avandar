/* eslint-disable @typescript-eslint/no-namespace,import-x/export */
import type {
  ColumnMatchBand,
  ColumnMatchScore,
  ColumnProfileT,
  ColumnProfileValue,
} from "$/models/dataDictionaries/ColumnProfile/ColumnProfile.types.ts";

export { ColumnProfileModule as ColumnProfile } from "$/models/dataDictionaries/ColumnProfile/ColumnProfileModule/ColumnProfileModule.ts";

/** Public namespace for column profiles and the scores between them. */
export namespace ColumnProfile {
  export type T = ColumnProfileT;
  export type Value = ColumnProfileValue;
  export type MatchScore = ColumnMatchScore;
  export type MatchBand = ColumnMatchBand;
}
