import { prop } from "@avandar/utils";
import { useLingui } from "@lingui/react/macro";
import { ChatModelOption } from "$/models/chat/ChatModelOption/ChatModelOption";
import { useMemo } from "react";
import { OfflineChatPickerModels } from "@/components/ChatPanel/offlineChatHelpers/OfflineChatPickerModels/OfflineChatPickerModels";
import { useDownloadedLocalChatModelIds } from "@/components/ChatPanel/useChatModelCatalog/useDownloadedLocalChatModelIds/useDownloadedLocalChatModelIds";
import { useLocalChatModelCopy } from "@/hooks/localChatModels/useLocalChatModelCopy/useLocalChatModelCopy";

type UseChatModelCatalogResult = {
  groups: ChatModelOption.OptionGroup[];
  models: ChatModelOption.T[];
};

/**
 * The curated cloud catalog plus any downloaded offline models, as picker
 * groups.
 *
 * The cloud catalog is a compile-time constant, so there is nothing to fetch
 * and no loading or error state. Group labels live here rather than in the
 * shared catalog module because only the client can translate them, and the
 * shared module also has to run under Deno where Lingui is unavailable.
 */
export function useChatModelCatalog(): UseChatModelCatalogResult {
  const { t } = useLingui();
  const getLocalChatModelCopy = useLocalChatModelCopy();
  const downloadedOfflineIds = useDownloadedLocalChatModelIds();

  const cloudGroups = useMemo(() => {
    const modelsInTier = (
      licenseTier: ChatModelOption.LicenseTier,
    ): ChatModelOption.T[] => {
      return ChatModelOption.Catalog.values.filter((model) => {
        return model.licenseTier === licenseTier;
      });
    };
    return [
      { group: t`Frontier models`, models: modelsInTier("proprietary") },
      { group: t`Open models`, models: modelsInTier("open") },
    ].filter((entry) => {
      return entry.models.length > 0;
    });
  }, [t]);

  const offlineGroup = useMemo(() => {
    return OfflineChatPickerModels.buildGroup(
      downloadedOfflineIds,
      getLocalChatModelCopy,
      t`Offline models`,
    );
  }, [downloadedOfflineIds, getLocalChatModelCopy, t]);

  const groups = useMemo(() => {
    return offlineGroup ? [offlineGroup, ...cloudGroups] : cloudGroups;
  }, [cloudGroups, offlineGroup]);

  const models = useMemo(() => {
    return groups.flatMap(prop("models"));
  }, [groups]);

  return {
    groups,
    models,
  };
}
