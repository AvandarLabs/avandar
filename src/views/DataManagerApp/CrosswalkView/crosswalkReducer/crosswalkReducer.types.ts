import type { Crosswalk } from "$/models/crosswalks/Crosswalk/Crosswalk";
import type { CrosswalkColumn } from "$/models/crosswalks/CrosswalkColumn/CrosswalkColumn";
import type { CrosswalkLayout } from "$/models/crosswalks/CrosswalkLayout/CrosswalkLayout";
import type { CrosswalkMapping } from "$/models/crosswalks/CrosswalkMapping/CrosswalkMapping";
import type { CrosswalkMatch } from "$/models/crosswalks/CrosswalkMatch/CrosswalkMatch";
import type { ColumnProfile } from "$/models/dataDictionaries/ColumnProfile/ColumnProfile";
import type { DataDictionaryCodeList } from "$/models/dataDictionaries/DataDictionaryCodeList/DataDictionaryCodeList";
import type { DataDictionaryEntry } from "$/models/dataDictionaries/DataDictionaryEntry/DataDictionaryEntry";
import type { DictionaryMatch } from "$/models/dataDictionaries/DictionaryMatch/DictionaryMatch";
import type { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { CrosswalkDraft } from "@/lib/crosswalks/CrosswalkDraft/CrosswalkDraft";

/** The crosswalk view's steps, in order. */
export type CrosswalkStep = "datasets" | "map" | "combine";

/**
 * Everything the reducer reads but does not own, loaded by
 * useCrosswalkCatalog.
 */
export type CrosswalkContext = {
  /** Every dataset the user can read, with its columns in column order. */
  datasetsById: ReadonlyMap<string, CrosswalkLayout.Dataset>;
  /** Dictionary entries ready to match, primary code list first. */
  entriesById: ReadonlyMap<string, DictionaryMatch.Entry>;
};

/**
 * The reference dataset's binding for one of its columns, read when columns
 * are seeded.
 */
export type ReferenceColumnBinding = {
  entryId: DataDictionaryEntry.Id;
  codeListId: DataDictionaryCodeList.Id | undefined;
  holdsLabels: boolean;
};

/**
 * The crosswalk view's state: the draft, what was last saved, and what was
 * read.
 */
export type CrosswalkState = {
  draft: CrosswalkDraft.T;
  /** The draft as last saved; undefined before the first save. */
  savedDraft: CrosswalkDraft.T | undefined;
  /** Layouts whose values were read this session, so each is read once. */
  readLayoutIds: readonly CrosswalkLayout.Id[];
};

/** Everything the user can do to a crosswalk, and what loading tells it. */
export type CrosswalkAction =
  | { type: "renamed"; name: string }
  | {
      type: "datasets_added";
      datasetIds: readonly Dataset.Id[];
      context: CrosswalkContext;
    }
  | { type: "dataset_removed"; datasetId: Dataset.Id }
  | { type: "reference_chosen"; layoutId: CrosswalkLayout.Id }
  | {
      type: "columns_seeded";
      bindingsByColumnName: ReadonlyMap<string, ReferenceColumnBinding>;
      context: CrosswalkContext;
    }
  | {
      type: "values_read";
      layoutId: CrosswalkLayout.Id;
      sources: readonly ColumnProfile.T[];
      targets: readonly CrosswalkMatch.Target[];
      dateFormatsBySourceColumn: ReadonlyMap<string, string>;
      context: CrosswalkContext;
    }
  | {
      type: "fill_set";
      layoutId: CrosswalkLayout.Id;
      columnId: CrosswalkColumn.Id;
      fill: CrosswalkMapping.Fill;
    }
  | {
      type: "suggestion_accepted";
      layoutId: CrosswalkLayout.Id;
      columnId: CrosswalkColumn.Id;
    }
  | {
      type: "suggestion_rejected";
      layoutId: CrosswalkLayout.Id;
      columnId: CrosswalkColumn.Id;
    }
  | { type: "suggestions_accepted"; layoutId: CrosswalkLayout.Id }
  | { type: "layout_confirmed"; layoutId: CrosswalkLayout.Id }
  | { type: "layout_skipped"; layoutId: CrosswalkLayout.Id }
  | { type: "layout_reopened"; layoutId: CrosswalkLayout.Id }
  | {
      type: "column_added";
      columnId: CrosswalkColumn.Id;
      name: string;
      dataType: AvaDataType.T;
    }
  | {
      type: "column_changed";
      columnId: CrosswalkColumn.Id;
      changes: {
        name?: string;
        dataType?: AvaDataType.T;
        entryId?: DataDictionaryEntry.Id | null;
      };
      context: CrosswalkContext;
    }
  | { type: "column_removed"; columnId: CrosswalkColumn.Id }
  | {
      type: "settings_changed";
      changes: {
        codesOutputAs?: Crosswalk.CodesOutput;
        addsSourceColumn?: boolean;
      };
      context: CrosswalkContext;
    }
  | { type: "saved"; draft: CrosswalkDraft.T };
