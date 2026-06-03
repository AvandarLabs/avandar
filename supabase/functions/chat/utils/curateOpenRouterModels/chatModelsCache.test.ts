import {
  hasCachedChatModels,
  parseUseCacheFromURL,
  resolveChatModelsResponse,
} from "@sbfn/chat/utils/curateOpenRouterModels/chatModelsCache.ts";
import { describe, expect, it, vi } from "vitest";
import type { ChatModelsResponse } from "$/types/chat.types.ts";

const FILLED_RESPONSE: ChatModelsResponse = {
  groups: [
    {
      group: "Proprietary · OpenAI",
      models: [
        {
          id: "openai/gpt-5-mini",
          name: "OpenAI: GPT-5 Mini",
          nameWithoutProvider: " GPT-5 Mini",
          supportsTools: true,
          licenseTier: "proprietary",
          provider: "openai",
        },
      ],
    },
  ],
};

const EMPTY_RESPONSE: ChatModelsResponse = {
  groups: [],
};

describe("parseUseCacheFromURL", () => {
  it("defaults to true when the query param is absent", () => {
    expect(parseUseCacheFromURL("https://example.com/chat/models")).toBe(true);
  });

  it("returns false when useCache=false is passed", () => {
    expect(
      parseUseCacheFromURL("https://example.com/chat/models?useCache=false"),
    ).toBe(false);
  });

  it("returns false when useCache=0 is passed", () => {
    expect(
      parseUseCacheFromURL("https://example.com/chat/models?useCache=0"),
    ).toBe(false);
  });
});

describe("hasCachedChatModels", () => {
  it("returns false for an empty cached response", () => {
    expect(hasCachedChatModels(EMPTY_RESPONSE)).toBe(false);
  });

  it("returns true when at least one cached model exists", () => {
    expect(hasCachedChatModels(FILLED_RESPONSE)).toBe(true);
  });
});

describe("resolveChatModelsResponse", () => {
  it("returns the cached response by default when it is non-empty", async () => {
    const loadLiveResponse = vi.fn(async (): Promise<ChatModelsResponse> => {
      return EMPTY_RESPONSE;
    });

    const response = await resolveChatModelsResponse({
      useCache: true,
      cachedResponse: FILLED_RESPONSE,
      loadLiveResponse,
    });

    expect(response).toEqual(FILLED_RESPONSE);
    expect(loadLiveResponse).not.toHaveBeenCalled();
  });

  it("loads the live response when cache usage is disabled", async () => {
    const liveResponse: ChatModelsResponse = {
      groups: [
        {
          group: "Open models · Meta",
          models: [
            {
              id: "meta-llama/llama-3.3-70b-instruct",
              name: "Meta: Llama 3.3 70B Instruct",
              nameWithoutProvider: " Llama 3.3 70B Instruct",
              supportsTools: true,
              licenseTier: "open",
              provider: "meta-llama",
            },
          ],
        },
      ],
    };
    const loadLiveResponse = vi.fn(async (): Promise<ChatModelsResponse> => {
      return liveResponse;
    });

    const response = await resolveChatModelsResponse({
      useCache: false,
      cachedResponse: FILLED_RESPONSE,
      loadLiveResponse,
    });

    expect(response).toEqual(liveResponse);
    expect(loadLiveResponse).toHaveBeenCalledOnce();
  });

  it("loads the live response when the cached response is empty", async () => {
    const loadLiveResponse = vi.fn(async (): Promise<ChatModelsResponse> => {
      return FILLED_RESPONSE;
    });

    const response = await resolveChatModelsResponse({
      useCache: true,
      cachedResponse: EMPTY_RESPONSE,
      loadLiveResponse,
    });

    expect(response).toEqual(FILLED_RESPONSE);
    expect(loadLiveResponse).toHaveBeenCalledOnce();
  });
});
