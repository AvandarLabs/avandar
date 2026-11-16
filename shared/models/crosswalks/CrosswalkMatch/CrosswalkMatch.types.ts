import type { CrosswalkColumn } from "$/models/crosswalks/CrosswalkColumn/CrosswalkColumn.ts";
import type { CrosswalkMapping } from "$/models/crosswalks/CrosswalkMapping/CrosswalkMapping.ts";
import type { ColumnProfile } from "$/models/dataDictionaries/ColumnProfile/ColumnProfile.ts";

/**
 * A column of the combined dataset that a layout's columns are matched
 * against.
 */
export type CrosswalkMatchTarget = {
  columnId: CrosswalkColumn.Id;
  /**
   * From the reference dataset, or a name-and-type profile for an added
   * column.
   */
  profile: ColumnProfile.T;
};

/** One source column the scorer would fill a target with. */
export type CrosswalkMatchT = {
  columnId: CrosswalkColumn.Id;
  sourceColumn: string;
  score: number;
  band: "match" | "suggestion";
  reason: "name_and_type" | "same_values";
};

/** A fill the layout starts with, and how sure the match was. */
export type CrosswalkPrefill = {
  columnId: CrosswalkColumn.Id;
  fill: CrosswalkMapping.Fill;
  status: CrosswalkMapping.Status;
  confidence: number | undefined;
  reason: CrosswalkMapping.Reason | undefined;
};
