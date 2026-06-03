import { useQuery } from "@hooks";
import { prop } from "@utils";
import { useMemo } from "react";
import { ChatModelOption } from "$/models/chat/ChatModelOption/ChatModelOption";
import { APIClient } from "@/clients/APIClient";
import { buildOfflineChatPickerGroup } from "@/lib/offlineChat/offlineChatPickerModels";
import { useDownloadedLocalChatModelIds } from "@/lib/offlineChat/useDownloadedLocalChatModelIds";

type UseChatModelCatalogResult = {
  groups: ChatModelOption.OptionGroup[];
  models: ChatModelOption.T[];
  isLoading: boolean;
  isError: boolean;
  hasDownloadedOfflineModels: boolean;
};

/**
 * Cloud OpenRouter catalog plus downloaded offline models in an "Offline
 * models" group at the top of the picker.
 */
export function useChatModelCatalog(): UseChatModelCatalogResult {
  const [cloudGroups = [], isLoading, queryResult] = useQuery({
    queryKey: ["chat", "models"],
    queryFn: async () => {
      const response = await APIClient.get({
        route: "chat/models",
      });
      return response.groups;
    },
    staleTime: 60 * 60 * 1000, // 1 hour
  });

  const downloadedOfflineIds = useDownloadedLocalChatModelIds();

  const offlineGroup = useMemo(() => {
    return buildOfflineChatPickerGroup(downloadedOfflineIds);
  }, [downloadedOfflineIds]);

  const groups = useMemo(() => {
    if (!offlineGroup) {
      return cloudGroups;
    }
    return [offlineGroup, ...cloudGroups];
  }, [cloudGroups, offlineGroup]);

  const models = useMemo(() => {
    return groups.flatMap(prop("models"));
  }, [groups]);

  return {
    groups,
    models,
    isLoading,
    isError: queryResult.isError,
    hasDownloadedOfflineModels: downloadedOfflineIds.length > 0,
  };
}
