import { isNonEmptyArray, prop, propEq, propPasses } from "@avandar/utils";
import { useLingui } from "@lingui/react/macro";
import { ChatModelOption } from "$/models/chat/ChatModelOption/ChatModelOption";
import { OfflineChatPickerModels } from "@/components/ChatPanel/offlineChatHelpers/OfflineChatPickerModels/OfflineChatPickerModels";
import { useDownloadedLocalChatModelIds } from "@/components/ChatPanel/useChatModelCatalog/useDownloadedLocalChatModelIds/useDownloadedLocalChatModelIds";
import { useLocalChatModelCopy } from "@/hooks/localChatModels/useLocalChatModelCopy/useLocalChatModelCopy";

function _modelsInTier(
  licenseTier: ChatModelOption.LicenseTier,
): ChatModelOption.T[] {
  return ChatModelOption.Catalog.values.filter(
    propEq("licenseTier", licenseTier),
  );
}

/** Returns translated cloud and downloaded offline models as picker groups. */
export function useChatModelCatalog(): {
  groups: ChatModelOption.OptionGroup[];
  models: ChatModelOption.T[];
} {
  const { t } = useLingui();
  const getLocalChatModelCopy = useLocalChatModelCopy();
  const downloadedOfflineIds = useDownloadedLocalChatModelIds();

  const cloudGroups = [
    { group: t`Frontier models`, models: _modelsInTier("proprietary") },
    { group: t`Open models`, models: _modelsInTier("open") },
  ].filter(
    propPasses("models", (models) => {
      return isNonEmptyArray(models);
    }),
  );

  const offlineGroup = OfflineChatPickerModels.buildGroup(
    downloadedOfflineIds,
    getLocalChatModelCopy,
    t`Offline models`,
  );

  const groups = offlineGroup ? [offlineGroup, ...cloudGroups] : cloudGroups;

  const models = groups.flatMap(prop("models"));

  return {
    groups,
    models,
  };
}
