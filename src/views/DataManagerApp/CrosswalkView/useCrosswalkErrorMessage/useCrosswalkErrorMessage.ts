import { getIsOnline } from "@avandar/browser-utils";
import { useLingui } from "@lingui/react/macro";
import { Crosswalk } from "$/models/crosswalks/Crosswalk/Crosswalk";

type ErrorHint = Crosswalk.SaveErrorHint | Crosswalk.CombineErrorHint;

/** The copy for each hint a crosswalk save or combine can refuse with. */
function useHintMessages(): Record<ErrorHint, string> {
  const { t } = useLingui();
  const sourceColumnName = Crosswalk.SOURCE_COLUMN_NAME;
  const changedElsewhere = t`This crosswalk changed while you were working on it. Reload the page and try again.`;
  return {
    crosswalk_editor_required: t`You need edit access to Data Sources to change this crosswalk.`,
    crosswalk_payload_invalid: changedElsewhere,
    crosswalk_name_required: t`Give the crosswalk a name.`,
    column_name_required: t`Every column of the combined dataset needs a name.`,
    column_names_not_unique: t`Two columns of the combined dataset have the same name, or one is named ${sourceColumnName}. Rename one of them.`,
    reference_layout_required: t`Choose a reference layout before saving.`,
    layout_signatures_not_unique: changedElsewhere,
    item_not_in_crosswalk: changedElsewhere,
    dataset_not_readable: t`This change involves a dataset you can't open, so nothing was saved. Ask for access to it, or reload the crosswalk to go back to what was last saved.`,
    entry_not_in_workspace: t`A dictionary entry this crosswalk uses was deleted. Choose another entry for that column.`,
    mappings_not_unique: changedElsewhere,
    fill_invalid: t`One of the mappings is incomplete, so nothing was saved. Check how each column is filled and try again.`,
    combined_dataset_name_required: t`Give the combined dataset a name.`,
    combined_columns_invalid: t`The combined dataset needs at least one column, and no two columns can share a name.`,
    binding_column_missing: changedElsewhere,
    binding_not_in_workspace: t`A dictionary this crosswalk uses changed. Reload the page and try again.`,
    dataset_creator_required: t`Only workspace admins can add datasets.`,
    combined_dataset_mismatch: t`This crosswalk's combined dataset changed while you were working. Reload the page and try again.`,
    dataset_editor_required: t`You need edit access to the combined dataset to update it.`,
    output_dataset_in_crosswalk: t`This crosswalk would include its own combined dataset. Remove it from the datasets and try again.`,
    crosswalk_has_unreadable_datasets: t`This crosswalk includes a dataset you can't open, so it can't be updated by you.`,
  };
}

/**
 * The toast for a refused crosswalk save or combine, from the RPC's hint,
 * or the offline message when the connection dropped.
 */
export function useCrosswalkErrorMessage(): (error: unknown) => string {
  const { t } = useLingui();
  const messages = useHintMessages();
  const fallback = t`Nothing was saved. Please try again.`;
  const offline = t`You're offline. Reconnect to save this.`;
  return (error) => {
    if (!getIsOnline()) {
      return offline;
    }
    const hint =
      Crosswalk.toSaveErrorHint(error) ?? Crosswalk.toCombineErrorHint(error);
    return hint ? messages[hint] : fallback;
  };
}
