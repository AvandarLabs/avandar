import { Model } from "@avandar/models";
import { LocalChatModel } from "$/models/chat/LocalChatModel/LocalChatModel";
import { ModelPickerCopy } from "@/lib/localModels/ModelPickerCopy/ModelPickerCopy";
import type { ChatModelOption } from "$/models/chat/ChatModelOption/ChatModelOption";

/** Prefix for offline model ids in the shared chat model picker. */
const ID_PREFIX = "offline:" as const;

/**
 * Builds the picker id stored in chat model local storage and assistant-ui
 * model context.
 */
function buildModelId(localModelId: LocalChatModel.Id): string {
  return `${ID_PREFIX}${localModelId}`;
}

/** Parses a picker id back to a local catalog id, if it is an offline model. */
function parseModelId(modelId: string): LocalChatModel.Id | undefined {
  if (!modelId.startsWith(ID_PREFIX)) {
    return undefined;
  }
  const localId = modelId.slice(ID_PREFIX.length);
  if (LocalChatModel.Catalog.isValidId(localId)) {
    return localId;
  }
  return undefined;
}

/** Maps downloaded local models to chat picker options. */
function buildOptions(
  downloadedIds: readonly LocalChatModel.Id[],
  getCopy: (model: LocalChatModel.T) => LocalChatModel.Copy,
): ChatModelOption.T[] {
  return downloadedIds.map((localModelId) => {
    const model = LocalChatModel.Catalog.find(localModelId);
    const copy = getCopy(model);
    return Model.make("ChatModelOption", {
      id: buildModelId(localModelId),
      name: copy.pickerName,
      pickerLabel: copy.pickerName,
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
  downloadedIds: readonly LocalChatModel.Id[],
  getCopy: (model: LocalChatModel.T) => LocalChatModel.Copy,
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
