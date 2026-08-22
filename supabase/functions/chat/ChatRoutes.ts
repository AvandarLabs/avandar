import type { ChatAPI } from "@sbfn/chat/ChatRoutes.types.ts";

import { defineRoutes } from "@sbfn/_shared/MiniServer/MiniServer.ts";
import { GetChatSessionSecret } from "@sbfn/chat/GetChatSessionSecret.ts";
import { PostChatMessages } from "@sbfn/chat/PostChatMessages/PostChatMessages.ts";

/** Combines the chat endpoint definitions into the chat edge function API. */
export const ChatRoutes = defineRoutes<ChatAPI>("chat", {
  "/:workspaceId/messages": { POST: PostChatMessages },
  "/:workspaceId/session-secret": { GET: GetChatSessionSecret },
});
