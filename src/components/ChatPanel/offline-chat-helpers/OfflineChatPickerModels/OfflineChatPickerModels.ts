import { Model } from "@models";
import { ModelPickerCopy } from "@/lib/localModels/ModelPickerCopy/ModelPickerCopy";
import { LocalChatModelCatalog } from "@/clients/LocalChatModel/LocalChatModelCatalog/LocalChatModelCatalog";
import type {
  LocalChatModelCopy,
  LocalChatModelId,
} from "@/clients/LocalChatModel/LocalChatModelCatalog/LocalChatModelCatalog";
import type { ChatModelOption } from "$/models/chat/ChatModelOption/ChatModelOption";

/** Prefix for offline model ids in the shared chat model picker. */
const ID_PREFIX = "offline:" as const;

/**
 * Builds the picker id stored in chat model local storage and assistant-ui
 * model context.
 */
function buildModelId(localModelId: LocalChatModelId): string {
  return `${ID_PREFIX}${localModelId}`;
}

/** Parses a picker id back to a local catalog id, if it is an offline model. */
function parseModelId(modelId: string): LocalChatModelId | undefined {
  if (!modelId.startsWith(ID_PREFIX)) {
    return undefined;
  }
  const localId = modelId.slice(ID_PREFIX.length);
  if (LocalChatModelCatalog.isValidId(localId)) {
    return localId;
  }
  return undefined;
}

/** Maps downloaded local models to chat picker options. */
function buildOptions(
  downloadedIds: readonly LocalChatModelId[],
  getCopy: (
    model: ReturnType<typeof LocalChatModelCatalog.find>,
  ) => LocalChatModelCopy,
): ChatModelOption.T[] {
  return downloadedIds.map((localModelId) => {
    const model = LocalChatModelCatalog.find(localModelId);
    const copy = getCopy(model);
    return Model.make("ChatModelOption", {
      id: buildModelId(localModelId),
      name: copy.pickerName,
      nameWithoutProvider: copy.pickerName,
      description: ModelPickerCopy.formatDescription({
        description: copy.description,
        recommendedIf: copy.recommendedIf,
        approxSizeMb: model.approxSizeMb,
      }),
      supportsTools: false,
      licenseTier: "open",
      provider: "offline",
    });
  });
}

/** Offline models group for the chat picker (empty when none downloaded). */
function buildGroup(
  downloadedIds: readonly LocalChatModelId[],
  getCopy: (
    model: ReturnType<typeof LocalChatModelCatalog.find>,
  ) => LocalChatModelCopy,
  groupLabel: string,
): ChatModelOption.OptionGroup | undefined {
  const models = buildOptions(downloadedIds, getCopy);
  if (models.length === 0) {
    return undefined;
  }
  return {
    group: groupLabel,
    models,
  };
}

/** Builds and parses downloaded local-model entries for the chat picker. */
export const OfflineChatPickerModels = {
  idPrefix: ID_PREFIX,
  buildModelId,
  parseModelId,
  buildOptions,
  buildGroup,
};
