import type {
  CrosswalkCombineErrorHint,
  CrosswalkSaveErrorHint,
} from "$/models/crosswalks/Crosswalk/Crosswalk.types.ts";

const SAVE_ERROR_HINTS: readonly CrosswalkSaveErrorHint[] = [
  "crosswalk_editor_required",
  "crosswalk_payload_invalid",
  "crosswalk_name_required",
  "column_name_required",
  "column_names_not_unique",
  "reference_layout_required",
  "layout_signatures_not_unique",
  "item_not_in_crosswalk",
  "dataset_not_readable",
  "entry_not_in_workspace",
  "mappings_not_unique",
  "fill_invalid",
  "output_dataset_in_crosswalk",
];

const COMBINE_ERROR_HINTS: readonly CrosswalkCombineErrorHint[] = [
  "crosswalk_editor_required",
  "combined_dataset_name_required",
  "combined_columns_invalid",
  "binding_column_missing",
  "binding_not_in_workspace",
  "dataset_creator_required",
  "combined_dataset_mismatch",
  "dataset_editor_required",
  "crosswalk_has_unreadable_datasets",
];

/** The `hint` on a thrown database error, when it is one of `knownHints`. */
function _findKnownHint<Hint extends string>(
  error: unknown,
  knownHints: readonly Hint[],
): Hint | undefined {
  if (typeof error !== "object" || error === null || !("hint" in error)) {
    return undefined;
  }
  const { hint } = error;
  return knownHints.find((knownHint) => {
    return knownHint === hint;
  });
}

/**
 * Helpers for crosswalks: the name of the column that says which dataset a
 * combined row came from, and reading why a save was refused so a view can
 * explain it.
 */
export const CrosswalkModule = {
  /** The column a combined dataset adds when `addsSourceColumn` is on. */
  SOURCE_COLUMN_NAME: "source_dataset",

  /** `rpc_crosswalks__save`'s `hint` on a thrown error, when it is known. */
  toSaveErrorHint: (error: unknown): CrosswalkSaveErrorHint | undefined => {
    return _findKnownHint(error, SAVE_ERROR_HINTS);
  },

  /**
   * `rpc_crosswalks__save_combined_dataset`'s `hint` on a thrown error,
   * when it is known.
   */
  toCombineErrorHint: (
    error: unknown,
  ): CrosswalkCombineErrorHint | undefined => {
    return _findKnownHint(error, COMBINE_ERROR_HINTS);
  },
};
