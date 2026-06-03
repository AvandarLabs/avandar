import type { ChatModelsResponse } from "$/types/chat.types.ts";

const FALSE_SEARCH_PARAM_VALUES = new Set(["0", "false", "no", "off"]);

type ResolveChatModelsResponseOptions = {
  useCache: boolean;
  cachedResponse: ChatModelsResponse;
  loadLiveResponse: () => Promise<ChatModelsResponse>;
};

function _normalizeUseCacheValue(
  value: string | undefined,
): string | undefined {
  if (!value) {
    return undefined;
  }
  return value.trim().toLowerCase();
}

/**
 * Returns whether the caller should use the cached chat-model JSON.
 */
export function parseUseCacheFromURL(url: string): boolean {
  const parsedURL = new URL(url);
  const rawValue = parsedURL.searchParams.get("useCache") ?? undefined;
  const normalizedValue = _normalizeUseCacheValue(rawValue);

  if (normalizedValue === undefined) {
    return true;
  }

  return !FALSE_SEARCH_PARAM_VALUES.has(normalizedValue);
}

/**
 * Returns true when the cached response has at least one model entry.
 */
export function hasCachedChatModels(response: ChatModelsResponse): boolean {
  return response.groups.some((group) => {
    return group.models.length > 0;
  });
}

/**
 * Returns cached chat models when available, otherwise loads the live list.
 */
export async function resolveChatModelsResponse(
  options: ResolveChatModelsResponseOptions,
): Promise<ChatModelsResponse> {
  if (options.useCache && hasCachedChatModels(options.cachedResponse)) {
    return options.cachedResponse;
  }

  return await options.loadLiveResponse();
}
