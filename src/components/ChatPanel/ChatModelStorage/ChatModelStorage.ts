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
      /** Reads the last model id the user picked, if any. */
      readStoredChatModelId: (): string | undefined => {
        return _readStoredChatModelId();
      },

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
       * Resolves a model id against the available catalog. Preference order:
       * 1. `selectedModelId` if present in the catalog.
       * 2. The stored model id from `localStorage` if present in the catalog.
       * 3. When `honorStoredWhenMissing` is true (catalog still loading), the
       *    stored model id is returned even if not yet in the catalog so we do
       *    not flicker to the default while offline models hydrate.
       * 4. `AppConfig.chat.defaultModelId` if present in the catalog.
       * 5. The first available model id.
       * 6. `AppConfig.chat.defaultModelId` as a last resort.
       */
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
