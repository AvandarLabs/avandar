import type { APITypeDef } from "@sbfn/_shared/MiniServer/api.types.ts";
import type {
  ChatClientMessage,
  ChatGeneratedSql,
  ChatPageContext,
  ChatResponse,
} from "$/types/chat.types.ts";

export type {
  ChatClientMessage,
  ChatGeneratedSql as ChatGeneratedSQL,
  ChatPageContext,
  ChatResponse,
};

export type ChatAPI = APITypeDef<
  "chat",
  ["/:workspaceId/messages"],
  {
    "/:workspaceId/messages": {
      POST: {
        pathParams: {
          workspaceId: string;
        };
        body: {
          messages: ChatClientMessage[];
          context: ChatPageContext;
        };
        returnType: ChatResponse;
      };
    };
  }
>;
