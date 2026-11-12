import { useHasPermission } from "@/hooks/permissions/useHasPermission/useHasPermission";
import { NewDictionaryFlowView } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/NewDictionaryFlowView";
import { NewDictionaryNoAccess } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/NewDictionaryNoAccess";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { ReactNode } from "react";

type Props = {
  /** The dataset whose menu opened the flow, which skips Pick datasets. */
  originDatasetId: Dataset.Id | undefined;
};

/**
 * Learning a dictionary from datasets, in four steps: Pick datasets, Review
 * columns, Label values, and Save. Opened from the Data Sources toolbar's
 * New dictionary menu, or from a dataset's menu. Only someone who can edit
 * dictionaries gets the flow, so nothing is read before that is checked.
 */
export function NewDictionaryFromDatasetsView({
  originDatasetId,
}: Readonly<Props>): ReactNode {
  const canEditDictionaries = useHasPermission(
    "data_sources__can_edit_dictionaries",
  );
  return canEditDictionaries ? (
    <NewDictionaryFlowView originDatasetId={originDatasetId} />
  ) : (
    <NewDictionaryNoAccess />
  );
}
