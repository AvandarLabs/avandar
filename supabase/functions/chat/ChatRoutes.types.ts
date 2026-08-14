import type { APITypeDef } from "@sbfn/_shared/MiniServer/api.types.ts";
import type { ChatClientMessage } from "$/models/chat/ChatClientMessage/ChatClientMessage.ts";
import type { ChatPageContext } from "$/models/chat/ChatPageContext/ChatPageContext.ts";
import type { ChatResponse } from "$/models/chat/ChatResponse/ChatResponse.ts";
import type {
  ChatRetryContext,
  ChatSessionSecretResponse,
  ConsentAck,
} from "$/types/chat.types.ts";

export type ChatAPI = APITypeDef<
  "chat",
  ["/:workspaceId/messages", "/:workspaceId/session-secret"],
  {
    "/:workspaceId/messages": {
      POST: {
        pathParams: {
          workspaceId: string;
        };
        body: {
          messages: ChatClientMessage.T[];
          context: ChatPageContext.T;
          model?: string;
          consentAcks?: ConsentAck[];
          retryContext?: ChatRetryContext;
        };
        returnType: ChatResponse.T;
      };
    };
    "/:workspaceId/session-secret": {
      GET: {
        pathParams: {
          workspaceId: string;
        };
        returnType: ChatSessionSecretResponse;
      };
    };
  }
>;
