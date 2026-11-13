import { Menu } from "@mantine/core";
import { useDatasetHasBindings } from "@/hooks/dataDictionaries/useDatasetHasBindings";
import { useCanEditDataset } from "@/hooks/datasets/useCanEditDataset/useCanEditDataset";
import { useHasPermission } from "@/hooks/permissions/useHasPermission/useHasPermission";
import { ApplyDictionaryMenuItem } from "@/views/DataManagerApp/DatasetMetaView/DatasetActionsMenu/ApplyDictionaryMenuItem";
import { CreateDictionaryMenuItem } from "@/views/DataManagerApp/DatasetMetaView/DatasetActionsMenu/CreateDictionaryMenuItem";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { ReactNode } from "react";

type Props = {
  datasetId: Dataset.Id;
};

/**
 * The dataset menu's dictionary actions, and a divider after them when any
 * shows. Apply shows to someone who can edit the dataset and read
 * dictionaries. Create shows to a dictionary editor while no dictionary is
 * attached to the dataset, and not while that is still loading.
 */
export function DictionaryMenuItems({ datasetId }: Readonly<Props>): ReactNode {
  const canViewDictionaries = useHasPermission(
    "data_sources__can_view_dictionaries",
  );
  const canEditDictionaries = useHasPermission(
    "data_sources__can_edit_dictionaries",
  );
  const { canEdit } = useCanEditDataset(datasetId);
  const { hasBindings, isLoading } = useDatasetHasBindings(datasetId);
  const canApply = canEdit && canViewDictionaries;
  const canCreate = canEditDictionaries && !isLoading && !hasBindings;
  if (!canApply && !canCreate) {
    return null;
  }
  return (
    <>
      {canApply ? <ApplyDictionaryMenuItem datasetId={datasetId} /> : null}
      {canCreate ? <CreateDictionaryMenuItem datasetId={datasetId} /> : null}
      <Menu.Divider />
    </>
  );
}
