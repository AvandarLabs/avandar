import { formatModelSelectDescription } from "@/lib/localModels/formatModelPickerCopy";
import {
  findLocalChatModel,
  isLocalChatModelId,
} from "./localChatModelCatalog";
import type { LocalChatModelId } from "./localChatModelCatalog";
import type { ChatModelOption, ChatModelOptionGroup } from "$/types/chat.types";

/** Prefix for offline model ids in the shared chat model picker. */
export const OFFLINE_CHAT_PICKER_ID_PREFIX = "offline:" as const;

/** Combobox group label for downloaded on-device chat models. */
export const OFFLINE_CHAT_PICKER_GROUP_LABEL = "Offline models" as const;

/**
 * Builds the picker id stored in chat model local storage and assistant-ui
 * model context.
 */
export function buildOfflineChatPickerModelId(
  localModelId: LocalChatModelId,
): string {
  return `${OFFLINE_CHAT_PICKER_ID_PREFIX}${localModelId}`;
}

/** Parses a picker id back to a local catalog id, if it is an offline model. */
export function parseOfflineChatPickerModelId(
  modelId: string,
): LocalChatModelId | undefined {
  if (!modelId.startsWith(OFFLINE_CHAT_PICKER_ID_PREFIX)) {
    return undefined;
  }
  const localId = modelId.slice(OFFLINE_CHAT_PICKER_ID_PREFIX.length);
  if (isLocalChatModelId(localId)) {
    return localId;
  }
  return undefined;
}

function localChatModelDisplayNameForPicker(displayName: string): string {
  return displayName.replace(/ \(offline\)$/u, "");
}

/** Maps downloaded local models to chat picker options. */
export function buildOfflineChatPickerOptions(
  downloadedIds: readonly LocalChatModelId[],
): ChatModelOption[] {
  return downloadedIds.map((localModelId) => {
    const model = findLocalChatModel(localModelId);
    const name = localChatModelDisplayNameForPicker(model.displayName);
    return {
      id: buildOfflineChatPickerModelId(localModelId),
      name,
      nameWithoutProvider: name,
      description: formatModelSelectDescription({
        description: model.description,
        recommendedIf: model.recommendedIf,
        approxSizeMb: model.approxSizeMb,
      }),
      supportsTools: false,
      licenseTier: "open",
      provider: "offline",
    };
  });
}

/** Offline models group for the chat picker (empty when none downloaded). */
export function buildOfflineChatPickerGroup(
  downloadedIds: readonly LocalChatModelId[],
): ChatModelOptionGroup | null {
  const models = buildOfflineChatPickerOptions(downloadedIds);
  if (models.length === 0) {
    return null;
  }
  return {
    group: OFFLINE_CHAT_PICKER_GROUP_LABEL,
    models,
  };
}
