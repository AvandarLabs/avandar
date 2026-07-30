import { defineRoutes } from "@sbfn/_shared/MiniServer/MiniServer.ts";
import { GetChatModels } from "@sbfn/chat/GetChatModels.ts";
import { GetChatSessionSecret } from "@sbfn/chat/GetChatSessionSecret.ts";
import { PostChatMessages } from "@sbfn/chat/PostChatMessages.ts";
import type { ChatAPI } from "@sbfn/chat/ChatRoutes.types.ts";

/** Combines the chat endpoint definitions into the chat edge function API. */
export const ChatRoutes = defineRoutes<ChatAPI>("chat", {
  "/models": GetChatModels,
  "/:workspaceId/messages": PostChatMessages,
  "/:workspaceId/session-secret": GetChatSessionSecret,
});
