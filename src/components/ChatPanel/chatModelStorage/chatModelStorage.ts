import { propEq } from "@utils";
import { AppConfig } from "$/config/AppConfig";

export const CHAT_MODEL_LOCAL_STORAGE_KEY = "ava.chat.selectedModel" as const;

/** Reads the last model id the user picked, if any. */
export function readStoredChatModelId(): string | undefined {
  try {
    const raw = window.localStorage.getItem(CHAT_MODEL_LOCAL_STORAGE_KEY);
    const trimmed = raw?.trim();
    return trimmed ? trimmed : undefined;
  } catch {
    return undefined;
  }
}

/** Persists the user's model choice across reloads. */
export function writeStoredChatModelId(modelId: string): void {
  try {
    window.localStorage.setItem(CHAT_MODEL_LOCAL_STORAGE_KEY, modelId);
  } catch {
    // Private browsing or storage disabled: in-memory only for this session.
  }
}

/**
 * Returns the stored model if it exists in the catalog. Otherwise, falls back
 * to our app's default model id.
 */
export function resolveChatModelId(args: {
  availableModels: ReadonlyArray<{ id: string }>;
  storedModelId: string | undefined;
}): string {
  const { availableModels, storedModelId } = args;
  if (storedModelId && availableModels.some(propEq("id", storedModelId))) {
    return storedModelId;
  }
  if (availableModels.some(propEq("id", AppConfig.chat.defaultModelId))) {
    return AppConfig.chat.defaultModelId;
  }
  return availableModels[0]?.id ?? AppConfig.chat.defaultModelId;
}
