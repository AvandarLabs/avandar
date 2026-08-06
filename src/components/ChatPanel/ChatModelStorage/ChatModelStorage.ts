import { propEq } from "@utils";
import { AppConfig } from "$/config/AppConfig";

export const CHAT_MODEL_LOCAL_STORAGE_KEY = "ava.chat.selectedModel" as const;

/** Reads the last model id the user picked, if any. */
function _readStoredChatModelId(): string | undefined {
  try {
    const raw = window.localStorage.getItem(CHAT_MODEL_LOCAL_STORAGE_KEY);
    const trimmed = raw?.trim();
    return trimmed ? trimmed : undefined;
  } catch {
    return undefined;
  }
}

export const ChatModelStorage = {
  /** Reads the last model id the user picked, if any. */
  readStoredChatModelId: (): string | undefined => {
    return _readStoredChatModelId();
  },

  /** Persists the user's model choice across reloads. */
  writeStoredChatModelId: (modelId: string): void => {
    try {
      return window.localStorage.setItem(CHAT_MODEL_LOCAL_STORAGE_KEY, modelId);
    } catch {
      // Private browsing or storage disabled: in-memory only for this
      // session.
    }
  },

  /**
   * Resolves the preferred usable model id from the available catalog.
   */
  resolveChatModelId: ({
    availableModels,
    selectedModelId,
    storedModelId,
    honorStoredWhenMissing = false,
  }: Readonly<{
    availableModels: ReadonlyArray<{ id: string }>;
    selectedModelId?: string;
    storedModelId?: string;
    honorStoredWhenMissing?: boolean;
  }>): string => {
    const resolvedStoredModelId =
      storedModelId !== undefined ? storedModelId : _readStoredChatModelId();
    const candidateModelId = selectedModelId ?? resolvedStoredModelId;
    const isCandidateAvailable =
      candidateModelId !== undefined &&
      availableModels.some(propEq("id", candidateModelId));
    const isDefaultAvailable = availableModels.some(
      propEq("id", AppConfig.chat.defaultModelId),
    );

    return (
      (
        isCandidateAvailable ||
          (honorStoredWhenMissing && candidateModelId !== undefined)
      ) ?
        candidateModelId
      : isDefaultAvailable ? AppConfig.chat.defaultModelId
      : (availableModels[0]?.id ?? AppConfig.chat.defaultModelId)
    );
  },
};
