import type {
  ColumnMatchBand,
  ColumnMatchProfile,
  ColumnMatchScore,
  ColumnProfileT,
  ColumnProfileValue,
} from "$/models/dataDictionaries/ColumnProfile/ColumnProfile.types.ts";
/* oxlint-disable typescript/no-namespace, import/export */
import type { NameScorer as NameScorerT } from "$/models/dataDictionaries/ColumnProfile/ColumnProfileModule/columnNameHelpers.ts";

export { ColumnProfileModule as ColumnProfile } from "$/models/dataDictionaries/ColumnProfile/ColumnProfileModule/ColumnProfileModule.ts";

/** Public namespace for column profiles and the scores between them. */
export namespace ColumnProfile {
  export type T = ColumnProfileT;
  export type Value = ColumnProfileValue;
  export type MatchScore = ColumnMatchScore;
  export type MatchBand = ColumnMatchBand;
  export type MatchProfile = ColumnMatchProfile;
  export type NameScorer = NameScorerT;
}
