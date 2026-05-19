import type { APITypeDef } from "@sbfn/_shared/MiniServer/api.types.ts";
import type {
  ChatClientMessage,
  ChatGeneratedSql,
  ChatModelsResponse,
  ChatPageContext,
  ChatResponse,
} from "$/types/chat.types.ts";

export type {
  ChatClientMessage,
  ChatGeneratedSql as ChatGeneratedSQL,
  ChatModelsResponse,
  ChatPageContext,
  ChatResponse,
};

export type ChatAPI = APITypeDef<
  "chat",
  ["/models", "/:workspaceId/messages"],
  {
    "/models": {
      GET: {
        returnType: ChatModelsResponse;
      };
    };
    "/:workspaceId/messages": {
      POST: {
        pathParams: {
          workspaceId: string;
        };
        body: {
          messages: ChatClientMessage[];
          context: ChatPageContext;
          model?: string;
        };
        returnType: ChatResponse;
      };
    };
  }
>;
