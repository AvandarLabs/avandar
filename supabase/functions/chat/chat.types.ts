import type { APITypeDef } from "@sbfn/_shared/MiniServer/api.types.ts";
import type {
  ChatClarifyRequest,
  ChatClientMessage,
  ChatDashboardVizType,
  ChatGeneratedDashboardBlock,
  ChatGeneratedSql,
  ChatModelsResponse,
  ChatPageContext,
  ChatPlan,
  ChatPlanStep,
  ChatResponse,
  ChatSessionSecretResponse,
  ConsentAck,
} from "$/types/chat.types.ts";

export type {
  ChatClarifyRequest,
  ChatClientMessage,
  ChatDashboardVizType,
  ChatGeneratedDashboardBlock,
  ChatGeneratedSql as ChatGeneratedSQL,
  ChatModelsResponse,
  ChatPageContext,
  ChatPlan,
  ChatPlanStep,
  ChatResponse,
  ChatSessionSecretResponse,
  ConsentAck,
};

export type ChatAPI = APITypeDef<
  "chat",
  ["/models", "/:workspaceId/messages", "/:workspaceId/session-secret"],
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
          model: string | undefined;
          consentAcks?: ConsentAck[];
        };
        returnType: ChatResponse;
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
