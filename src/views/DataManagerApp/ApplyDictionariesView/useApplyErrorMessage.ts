import { getIsOnline } from "@avandar/browser-utils";
import { useLingui } from "@lingui/react/macro";
import { DictionaryBinding } from "$/models/dataDictionaries/DictionaryBinding/DictionaryBinding";

/**
 * The toast for a refused apply, link, or re-apply, from the RPC's hint,
 * or the offline message when the connection dropped.
 */
export function useApplyErrorMessage(
  datasetName: string,
): (error: unknown) => string {
  const { t } = useLingui();
  const changedWhileApplying = t`A dictionary changed while you were applying it. Reload the page and try again.`;
  const messages: Record<DictionaryBinding.ApplyErrorHint, string> = {
    dataset_editor_required: t`You need edit access to ${datasetName} to apply a dictionary.`,
    dictionary_viewer_required: t`You can no longer read one of these dictionaries, so nothing was saved. Ask an admin for access to dictionaries.`,
    binding_payload_invalid: changedWhileApplying,
    column_not_in_dataset: changedWhileApplying,
    entry_not_in_dictionary: changedWhileApplying,
    code_list_not_in_entry: changedWhileApplying,
    binding_mode_unsupported: t`${datasetName} can't be changed in place, so nothing was saved. Create a linked dataset instead.`,
    convert_needs_code_list: t`A column set to convert has no code list. Attach it as reference only, or pick an entry with a code list.`,
    dataset_has_linked_datasets: t`A linked dataset reads ${datasetName}, so it can't be changed in place. Convert in the linked dataset instead.`,
    dictionary_editor_required: t`Adding values to a code list needs edit access to dictionaries, so nothing was saved. Choose another way to handle those values.`,
    code_pair_incomplete: t`A value you added to a code list is missing its label or code.`,
    codes_not_unique: t`A value you added is already in its code list, perhaps with different capitalization.`,
    labels_not_unique: t`A label you added is already used in its code list.`,
    dataset_creator_required: t`Only workspace admins can add datasets, so the linked dataset was not created.`,
    nothing_to_reapply: t`${datasetName} is already up to date.`,
  };
  const fallback = t`Nothing was saved. Please try again.`;
  const offline = t`You're offline. Reconnect to save this.`;
  return (error) => {
    if (!getIsOnline()) {
      return offline;
    }
    const hint = DictionaryBinding.toApplyErrorHint(error);
    return hint ? messages[hint] : fallback;
  };
}
