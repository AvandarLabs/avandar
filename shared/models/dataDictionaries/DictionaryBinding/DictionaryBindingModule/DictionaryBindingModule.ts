import type { DictionaryBindingApplyErrorHint } from "$/models/dataDictionaries/DictionaryBinding/DictionaryBinding.types.ts";

const APPLY_ERROR_HINTS: readonly DictionaryBindingApplyErrorHint[] = [
  "dataset_editor_required",
  "dictionary_viewer_required",
  "binding_payload_invalid",
  "binding_mode_unsupported",
  "column_not_in_dataset",
  "entry_not_in_dictionary",
  "code_list_not_in_entry",
  "convert_needs_code_list",
  "dataset_has_linked_datasets",
  "dictionary_editor_required",
  "code_pair_incomplete",
  "codes_not_unique",
  "labels_not_unique",
  "dataset_creator_required",
  "nothing_to_reapply",
];

/**
 * An apply RPC's `hint` on a thrown database error, when it is one the
 * client knows how to explain.
 */
function toApplyErrorHint(
  error: unknown,
): DictionaryBindingApplyErrorHint | undefined {
  if (typeof error !== "object" || error === null || !("hint" in error)) {
    return undefined;
  }
  const { hint } = error;
  return APPLY_ERROR_HINTS.find((knownHint) => {
    return knownHint === hint;
  });
}

/**
 * Helpers for dictionary bindings, such as reading why an apply was
 * refused so a view can explain it.
 */
export const DictionaryBindingModule = {
  toApplyErrorHint,
};
