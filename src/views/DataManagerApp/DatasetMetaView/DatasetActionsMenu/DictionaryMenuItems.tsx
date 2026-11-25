import { Menu } from "@mantine/core";
import { useCombiningCrosswalk } from "@/hooks/crosswalks/useCombiningCrosswalk/useCombiningCrosswalk";
import { useDatasetHasBindings } from "@/hooks/dataDictionaries/useDatasetHasBindings";
import { useWorkspaceHasDictionaries } from "@/hooks/dataDictionaries/useWorkspaceHasDictionaries";
import { useCanEditDataset } from "@/hooks/datasets/useCanEditDataset/useCanEditDataset";
import { useHasPermission } from "@/hooks/permissions/useHasPermission/useHasPermission";
import { ApplyDictionaryMenuItem } from "@/views/DataManagerApp/DatasetMetaView/DatasetActionsMenu/ApplyDictionaryMenuItem";
import { CreateDictionaryMenuItem } from "@/views/DataManagerApp/DatasetMetaView/DatasetActionsMenu/CreateDictionaryMenuItem";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { ReactNode } from "react";

type Props = {
  datasetId: Dataset.Id;
  sourceType: Dataset.T["sourceType"];
};

/**
 * The dataset menu's dictionary actions, and a divider after them when any
 * shows. Apply shows to someone who can edit the dataset and read
 * dictionaries, once the workspace has at least one dictionary to apply. It
 * is hidden on a crosswalk's combined dataset, whose code lists come from
 * the crosswalk, which replaces its bindings on every update, and while
 * that or the workspace's dictionaries are being looked up. A failed lookup
 * does not hide it. Create shows to a dictionary editor once the bindings are
 * read and no dictionary is attached: not while they load, and not when
 * they cannot be read. Neither shows while its check is still loading.
 */
export function DictionaryMenuItems({
  datasetId,
  sourceType,
}: Readonly<Props>): ReactNode {
  const canViewDictionaries = useHasPermission(
    "data_sources__can_view_dictionaries",
  );
  const canEditDictionaries = useHasPermission(
    "data_sources__can_edit_dictionaries",
  );
  const editRights = useCanEditDataset(datasetId);
  const bindings = useDatasetHasBindings(datasetId);
  // Only a virtual dataset can be a crosswalk's combined dataset.
  const combining = useCombiningCrosswalk(datasetId, {
    isEnabled: sourceType === "virtual",
  });
  const dictionaries = useWorkspaceHasDictionaries();
  const canApply =
    !dictionaries.isLoading &&
    (dictionaries.hasDictionaries || dictionaries.isError) &&
    !editRights.isLoading &&
    editRights.canEdit &&
    canViewDictionaries &&
    !combining.isLoading &&
    combining.crosswalk === undefined;
  const canCreate =
    canEditDictionaries &&
    !bindings.isLoading &&
    !bindings.isError &&
    !bindings.hasBindings;
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
