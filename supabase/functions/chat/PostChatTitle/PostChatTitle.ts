import { AvaHTTPError } from "@sbfn/_shared/AvaHTTPError.ts";
import { BAD_REQUEST } from "@sbfn/_shared/httpCodes.ts";
import { POST } from "@sbfn/_shared/MiniServer/MiniServer.ts";
import { sendOpenRouterRequest } from "@sbfn/chat/PostChatMessages/openRouter/sendOpenRouterRequest.ts";
import { z } from "zod";
import {
  buildChatTitleMessages,
  isChatTitlePromptId,
} from "$/agent/chatTitle/chatTitlePrompt.ts";
import { DATA_AGENT_MODEL_ROSTER } from "$/agent/DataAgentModelRoster.ts";
import { getAppURL } from "$/env/getAppURL.ts";

const openRouterApiKey = Deno.env.get("OPEN_ROUTER_API_KEY");

/** Names one signed-in workspace member's chat from its opening excerpt. */
export const PostChatTitle = POST({
  path: "/:workspaceId/title/:promptId",
  schema: { workspaceId: z.uuid(), promptId: z.string() },
})
  .bodySchema({
    excerpt: z.string().max(2000),
    locale: z.string().min(1).max(35),
    placeholder: z.string().min(1).max(80),
  })
  .action(async ({ pathParams, body }) => {
    if (!isChatTitlePromptId(pathParams.promptId)) {
      throw new AvaHTTPError(
        `Unknown title prompt "${pathParams.promptId}". Reload the page.`,
        BAD_REQUEST,
      );
    }
    if (!openRouterApiKey) {
      throw new Error("OPEN_ROUTER_API_KEY environment variable is not set");
    }
    const { text } = await sendOpenRouterRequest({
      requestBody: {
        model: DATA_AGENT_MODEL_ROSTER.primary.openRouterId,
        messages: buildChatTitleMessages(body),
        max_tokens: 32,
        temperature: 0,
      },
      apiKey: openRouterApiKey,
      referer: getAppURL(),
    });
    return { title: text };
  });
