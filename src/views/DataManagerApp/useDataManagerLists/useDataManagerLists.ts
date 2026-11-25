import { where } from "@avandar/utils";
import { CrosswalkClient } from "@/clients/crosswalks/CrosswalkClient";
import { DataDictionaryClient } from "@/clients/dataDictionaries/DataDictionaryClient/DataDictionaryClient";
import { DatasetClient } from "@/clients/datasets/DatasetClient/DatasetClient";
import { useHasPermission } from "@/hooks/permissions/useHasPermission/useHasPermission";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import type { Crosswalk } from "$/models/crosswalks/Crosswalk/Crosswalk";
import type { DataDictionary } from "$/models/dataDictionaries/DataDictionary/DataDictionary";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";

/** What the Data Sources list shows. */
export type DataManagerLists = {
  datasets: Dataset.T[];
  dictionaries: DataDictionary.T[];
  /** Empty for someone who cannot edit crosswalks. */
  crosswalks: Crosswalk.T[];
  isLoading: boolean;
};

/**
 * The workspace's datasets, dictionaries, and crosswalks that the Data
 * Sources list shows. Crosswalks are read only for someone who can edit
 * them: every crosswalk opens onto an editor's task, so listing one to a
 * viewer would only lead to a no-access notice.
 */
export function useDataManagerLists(): DataManagerLists {
  const workspace = useCurrentWorkspace();
  const canEditCrosswalks = useHasPermission(
    "data_sources__can_edit_crosswalks",
  );
  const [datasets, isLoadingDatasets] = DatasetClient.useGetAll(
    where("workspace_id", "eq", workspace.id),
  );
  const [dictionaries, isLoadingDictionaries] = DataDictionaryClient.useGetAll(
    where("workspace_id", "eq", workspace.id),
  );
  const [crosswalks, isLoadingCrosswalks] = CrosswalkClient.useGetAll({
    ...where("workspace_id", "eq", workspace.id),
    useQueryOptions: { enabled: canEditCrosswalks },
  });
  return {
    datasets: datasets ?? [],
    dictionaries: dictionaries ?? [],
    crosswalks: canEditCrosswalks ? (crosswalks ?? []) : [],
    isLoading:
      isLoadingDatasets || isLoadingDictionaries || isLoadingCrosswalks,
  };
}
