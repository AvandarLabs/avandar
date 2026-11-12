import type { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType.ts";
import type { Dataset } from "$/models/datasets/Dataset/Dataset.ts";

/** One distinct value a column holds, and how many rows hold it. */
export type ColumnProfileValue = {
  value: string;
  rowCount: number;
};

/**
 * What profiling learned about one dataset column, on the user's device.
 * Learning a dictionary from datasets reads profiles to guess each column's
 * kind and to find columns in other datasets that mean the same thing.
 */
export type ColumnProfileT = {
  datasetId: Dataset.Id;
  datasetName: string;
  columnName: string;
  dataType: AvaDataType.T;
  /** Rows in the dataset. */
  rowCount: number;
  /** Rows where this column has a value. */
  nonNullCount: number;
  /** Different values: exact when `values` is set, approximate otherwise. */
  distinctCount: number;
  /**
   * Every distinct value with its row count, most common first, when the
   * column has 50 or fewer. Undefined for longer columns and for dates.
   */
  values: ColumnProfileValue[] | undefined;
  /** Share of a text column's values that read as dates. */
  dateShare: number | undefined;
  /** Lowest and highest value of a number column. */
  numberRange: { min: number; max: number } | undefined;
};

/** Which band a match score falls in: certain, worth asking, or neither. */
export type ColumnMatchBand = "match" | "suggestion" | "none";

/**
 * How well two columns match, from 0 to 1, and the parts it is built from.
 * Learning a dictionary reads it to decide which columns become one entry.
 */
export type ColumnMatchScore = {
  score: number;
  nameScore: number;
  /** Undefined when neither listed values nor number ranges compare. */
  valueScore: number | undefined;
  typeScore: number;
  band: ColumnMatchBand;
};

/**
 * A profile with what scoring needs worked out once: its listed values by
 * comparison key and their row total. Matching many columns against each
 * other reads these instead of rebuilding them for every pair.
 */
export type ColumnMatchProfile = {
  profile: ColumnProfileT;
  /** Row counts of the listed values, by comparison key. */
  valueRows: ReadonlyMap<string, number> | undefined;
  /** Rows across every listed value. */
  totalValueRows: number;
};
