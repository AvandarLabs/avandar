import { GET } from "@sbfn/_shared/MiniServer/MiniServer.ts";
import cachedChatModelsCatalogJSON from "@sbfn/chat/chat-models-catalog.gen.json" with { type: "json" };
import { curateOpenRouterModels } from "@sbfn/chat/utils/curateOpenRouterModels/curateOpenRouterModels.ts";
import { getAppURL } from "$/env/getAppURL.ts";
import { z } from "zod";
import type { OpenRouterModelInput } from "@sbfn/chat/utils/curateOpenRouterModels/curateOpenRouterModels.ts";
import type { ChatModelOption } from "$/models/chat/ChatModelOption/ChatModelOption.ts";

const openRouterApiKey = Deno.env.get("OPEN_ROUTER_API_KEY");
if (!openRouterApiKey) {
  throw new Error("OPEN_ROUTER_API_KEY environment variable is not set");
}

const openRouterReferer = getAppURL();
const OPENROUTER_MODELS_URL =
  "https://openrouter.ai/api/v1/models?output_modalities=text&supported_parameters=tools";

type OpenRouterModelsResponse = {
  data?: OpenRouterModelInput[];
};

const cachedChatModelsCatalog =
  cachedChatModelsCatalogJSON as ChatModelOption.Catalog;

async function _loadLiveChatModelsResponse(): Promise<ChatModelOption.Catalog> {
  const response = await fetch(OPENROUTER_MODELS_URL, {
    headers: {
      Authorization: `Bearer ${openRouterApiKey}`,
      "HTTP-Referer": openRouterReferer,
      "X-Title": "Avandar",
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenRouter models API error: ${errorText}`);
  }

  const payload = (await response.json()) as OpenRouterModelsResponse;
  const groups = curateOpenRouterModels(payload.data ?? []);
  return { groups };
}

/** Returns the OpenRouter model catalog for the chat panel model picker. */
export const ChatModelsRoute = {
  "/models": {
    GET: GET("/models")
      .querySchema({
        useCache: z
          .enum(["true", "false", "0", "1", "yes", "no"])
          .optional()
          .transform((value) => {
            return value === "true" || value === "1" || value === "yes";
          }),
      })
      .action(async ({ queryParams }): Promise<ChatModelOption.Catalog> => {
        const isCacheNonEmpty = cachedChatModelsCatalog.groups.some((group) => {
          return group.models.length === 0;
        });

        if (queryParams.useCache && isCacheNonEmpty) {
          return cachedChatModelsCatalog;
        }
        return await _loadLiveChatModelsResponse();
      }),
  },
};
