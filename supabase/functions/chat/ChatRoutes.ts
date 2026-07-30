import { defineRoutes } from "@sbfn/_shared/MiniServer/MiniServer.ts";
import { ChatMessagesRoute } from "@sbfn/chat/ChatMessagesRoute.ts";
import { ChatModelsRoute } from "@sbfn/chat/ChatModelsRoute.ts";
import { ChatSessionSecretRoute } from "@sbfn/chat/ChatSessionSecretRoute.ts";
import type { ChatAPI } from "@sbfn/chat/ChatRoutes.types.ts";

/** Combines the chat endpoint definitions into the chat edge function API. */
export const ChatRoutes = defineRoutes<ChatAPI>("chat", {
  ...ChatModelsRoute,
  ...ChatMessagesRoute,
  ...ChatSessionSecretRoute,
});
