import type { APITypeDef } from "@sbfn/_shared/MiniServer/api.types.ts";
import type { ChatClientMessage } from "$/models/chat/ChatClientMessage/ChatClientMessage.ts";
import type { ChatModelOption } from "$/models/chat/ChatModelOption/ChatModelOption.ts";
import type { ChatPageContext } from "$/models/chat/ChatPageContext/ChatPageContext.ts";
import type { ChatResponse } from "$/models/chat/ChatResponse/ChatResponse.ts";
import type {
  ChatRetryContext,
  ChatSessionSecretResponse,
  ChatVoiceLanguage,
  ConsentAck,
  RegeneratePlanResponse,
  SchemaDriftReport,
} from "$/types/chat.types.ts";

export type ChatAPI = APITypeDef<
  "chat",
  [
    "/models",
    "/:workspaceId/messages",
    "/:workspaceId/regenerate-plan",
    "/:workspaceId/session-secret",
  ],
  {
    "/models": {
      GET: {
        queryParams?: {
          useCache?: boolean;
        };
        returnType: {
          groups: ChatModelOption.OptionGroup[];
        };
      };
    };
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
          voiceLanguage?: ChatVoiceLanguage;
        };
        returnType: ChatResponse.T;
      };
    };
    "/:workspaceId/regenerate-plan": {
      POST: {
        pathParams: {
          workspaceId: string;
        };
        body: {
          driftReport: SchemaDriftReport;
          model?: string;
        };
        returnType: RegeneratePlanResponse;
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
