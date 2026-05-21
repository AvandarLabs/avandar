import { flattenChatModelGroups } from "$/utils/chat/curateOpenRouterModels";
import { useMemo } from "react";
import { useChatModels } from "@/components/ChatPanel/useChatModels";
import { buildOfflineChatPickerGroup } from "@/lib/offlineChat/offlineChatPickerModels";
import { useDownloadedLocalChatModelIds } from "@/lib/offlineChat/useDownloadedLocalChatModelIds";
import type { ChatModelOption, ChatModelOptionGroup } from "$/types/chat.types";

type UseChatModelCatalogResult = {
  groups: ChatModelOptionGroup[];
  models: ChatModelOption[];
  isLoading: boolean;
  isError: boolean;
  hasDownloadedOfflineModels: boolean;
};

/**
 * Cloud OpenRouter catalog plus downloaded offline models in an "Offline
 * models"
 * group at the top of the picker.
 */
export function useChatModelCatalog(): UseChatModelCatalogResult {
  const cloud = useChatModels();
  const downloadedOfflineIds = useDownloadedLocalChatModelIds();

  const offlineGroup = useMemo(() => {
    return buildOfflineChatPickerGroup(downloadedOfflineIds);
  }, [downloadedOfflineIds]);

  const groups = useMemo(() => {
    if (!offlineGroup) {
      return cloud.groups;
    }
    return [offlineGroup, ...cloud.groups];
  }, [cloud.groups, offlineGroup]);

  const models = useMemo(() => {
    return flattenChatModelGroups(groups);
  }, [groups]);

  return {
    groups,
    models,
    isLoading: cloud.isLoading,
    isError: cloud.isError,
    hasDownloadedOfflineModels: downloadedOfflineIds.length > 0,
  };
}
