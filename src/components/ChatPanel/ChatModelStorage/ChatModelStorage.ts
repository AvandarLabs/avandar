import { createModule } from "@modules";
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

export const ChatModelStorage = createModule("ChatModelStorage", {
  builder: () => {
    return {
      // Reads the last model id the user picked, if any.
      readStoredChatModelId: (): string | undefined => {
        return _readStoredChatModelId();
      },

      // Persists the user's model choice across reloads.
      writeStoredChatModelId: (modelId: string) => {
        try {
          return window.localStorage.setItem(
            CHAT_MODEL_LOCAL_STORAGE_KEY,
            modelId,
          );
        } catch {
          // Private browsing or storage disabled: in-memory only for this
          // session.
        }
      },

      // Resolves a model id against the available catalog. Preference order:
      // selected model, stored model, default model, first available model,
      // then the configured default as a final fallback.
      resolveChatModelId: ({
        availableModels,
        selectedModelId,
        storedModelId,
        honorStoredWhenMissing = false,
      }: {
        availableModels: ReadonlyArray<{ id: string }>;
        selectedModelId?: string | undefined;
        storedModelId?: string | undefined;
        honorStoredWhenMissing?: boolean;
      }): string => {
        const resolvedStoredModelId =
          storedModelId !== undefined ? storedModelId : (
            _readStoredChatModelId()
          );
        const candidate = selectedModelId ?? resolvedStoredModelId;

        if (candidate && availableModels.some(propEq("id", candidate))) {
          return candidate;
        }

        if (honorStoredWhenMissing && candidate) {
          return candidate;
        }

        if (availableModels.some(propEq("id", AppConfig.chat.defaultModelId))) {
          return AppConfig.chat.defaultModelId;
        }

        return availableModels[0]?.id ?? AppConfig.chat.defaultModelId;
      },
    };
  },
});
