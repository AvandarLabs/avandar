import { propEq } from "@avandar/utils";
import { ChatModelOption } from "$/models/chat/ChatModelOption/ChatModelOption";

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
   *
   * This answers "which of the models we are currently showing should be
   * selected", which is a presentation question. The security question, "may we
   * spend money on this model", is answered server-side by
   * `enforceChatModelAllowlist`. Both reference `Catalog.defaultId`, but the
   * two must stay separate: this one legitimately consults a client-supplied
   * `availableModels` list, which is exactly why it cannot be the enforcement
   * point.
   */
  resolveChatModelId: ({
    availableModels,
    selectedModelId,
  }: Readonly<{
    availableModels: ReadonlyArray<{ id: string }>;
    selectedModelId?: string;
  }>): string => {
    const candidateModelId = selectedModelId ?? _readStoredChatModelId();
    const isCandidateAvailable =
      candidateModelId !== undefined &&
      availableModels.some(propEq("id", candidateModelId));
    const defaultModelId = ChatModelOption.Catalog.defaultId;
    const isDefaultAvailable = availableModels.some(
      propEq("id", defaultModelId),
    );

    return isCandidateAvailable
      ? candidateModelId
      : isDefaultAvailable
        ? defaultModelId
        : (availableModels[0]?.id ?? defaultModelId);
  },
};
