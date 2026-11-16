import type {
  CrosswalkCombineErrorHint,
  CrosswalkSaveErrorHint,
} from "$/models/crosswalks/Crosswalk/Crosswalk.types.ts";

const SAVE_ERROR_HINTS = {
  crosswalk_editor_required: true,
  crosswalk_payload_invalid: true,
  crosswalk_name_required: true,
  column_name_required: true,
  column_names_not_unique: true,
  reference_layout_required: true,
  layout_signatures_not_unique: true,
  item_not_in_crosswalk: true,
  dataset_not_readable: true,
  entry_not_in_workspace: true,
  mappings_not_unique: true,
  fill_invalid: true,
  output_dataset_in_crosswalk: true,
} satisfies Record<CrosswalkSaveErrorHint, true>;

const COMBINE_ERROR_HINTS = {
  crosswalk_editor_required: true,
  combined_dataset_name_required: true,
  combined_columns_invalid: true,
  binding_column_missing: true,
  binding_not_in_workspace: true,
  dataset_creator_required: true,
  combined_dataset_mismatch: true,
  dataset_editor_required: true,
  crosswalk_has_unreadable_datasets: true,
} satisfies Record<CrosswalkCombineErrorHint, true>;

/**
 * The `hint` on a thrown database error, when it is one of `knownHints`'
 * keys. Each hint list is checked against its union, so a hint added to the
 * union without a key here does not compile.
 */
function _findKnownHint<Hint extends string>(
  error: unknown,
  knownHints: Readonly<Record<Hint, true>>,
): Hint | undefined {
  if (typeof error !== "object" || error === null || !("hint" in error)) {
    return undefined;
  }
  const { hint } = error;
  return (Object.keys(knownHints) as Hint[]).find((knownHint) => {
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
