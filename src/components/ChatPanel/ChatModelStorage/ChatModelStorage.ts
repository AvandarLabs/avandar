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
      /** Persists the user's model choice across reloads. */
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

      /**
       * Given a model id, returns it if it is in the available model catalog.
       * Otherwise, uses the stored model id (in local storage) and resolves
       * against the model catalog. Otherwise, falls back to the config-level
       * default model id. If the config-level default model is not an
       * available model, then we fall back to the first model in the
       * `availableModels` catalog.
       */
      resolveChatModelId: ({
        availableModels,
        selectedModelId,
      }: {
        availableModels: ReadonlyArray<{ id: string }>;
        selectedModelId: string | undefined;
      }): string => {
        const modelIdToResolve = selectedModelId ?? _readStoredChatModelId();

        // check if the user's stored model id is an available model
        if (
          modelIdToResolve &&
          availableModels.some(propEq("id", modelIdToResolve))
        ) {
          return modelIdToResolve;
        }

        // check if the config-level default model is an available model in
        // the list.
        if (availableModels.some(propEq("id", AppConfig.chat.defaultModelId))) {
          return AppConfig.chat.defaultModelId;
        }

        // otherwise just default to the first available model. If no available
        // models, then fallback to the config-level default model.
        return availableModels[0]?.id ?? AppConfig.chat.defaultModelId;
      },
    };
  },
});
