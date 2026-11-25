import type { Crosswalk } from "$/models/crosswalks/Crosswalk/Crosswalk";
import type { CrosswalkColumn } from "$/models/crosswalks/CrosswalkColumn/CrosswalkColumn";
import type { CrosswalkDataset } from "$/models/crosswalks/CrosswalkDataset/CrosswalkDataset";
import type { CrosswalkLayout } from "$/models/crosswalks/CrosswalkLayout/CrosswalkLayout";
import type { CrosswalkMapping } from "$/models/crosswalks/CrosswalkMapping/CrosswalkMapping";
import type { DataDictionaryEntry } from "$/models/dataDictionaries/DataDictionaryEntry/DataDictionaryEntry";
import type { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";

/** One column of the combined dataset while the crosswalk is edited. */
export type CrosswalkDraftColumn = {
  id: CrosswalkColumn.Id;
  name: string;
  position: number;
  dataType: AvaDataType.T;
  entryId: DataDictionaryEntry.Id | undefined;
};

/** One layout while the crosswalk is edited, with the datasets it maps. */
export type CrosswalkDraftLayout = {
  id: CrosswalkLayout.Id;
  /** `CrosswalkLayout.buildLayoutKey` of its column names */
  key: string;
  signature: string;
  columnNames: readonly string[];
  isReference: boolean;
  status: CrosswalkLayout.Status;
  /** Sorted by dataset name. */
  datasetIds: readonly Dataset.Id[];
};

/** How one column is filled for one layout while the crosswalk is edited. */
export type CrosswalkDraftMapping = {
  id: CrosswalkMapping.Id;
  fill: CrosswalkMapping.Fill;
  status: CrosswalkMapping.Status;
  confidence: number | undefined;
  reason: CrosswalkMapping.Reason | undefined;
};

/** A whole crosswalk as the browser edits it, saved whole. */
export type CrosswalkDraftT = {
  crosswalkId: Crosswalk.Id;
  /** False until the crosswalk row exists. */
  isSaved: boolean;
  name: string;
  description: string | undefined;
  codesOutputAs: Crosswalk.CodesOutput;
  addsSourceColumn: boolean;
  outputDatasetId: Dataset.Id | undefined;
  /** In position order, positions 0..n-1. */
  columns: readonly CrosswalkDraftColumn[];
  /** The reference layout first, then by first dataset name. */
  layouts: readonly CrosswalkDraftLayout[];
  /** By layout id, then column id. A missing entry means no fill yet. */
  mappings: Readonly<
    Record<string, Readonly<Record<string, CrosswalkDraftMapping>>>
  >;
};

/** What the crosswalk's five tables hold, read through their clients. */
export type CrosswalkContents = {
  crosswalk: Crosswalk.T;
  columns: readonly CrosswalkColumn.T[];
  layouts: readonly CrosswalkLayout.T[];
  datasets: readonly CrosswalkDataset.T[];
  mappings: readonly CrosswalkMapping.T[];
};
