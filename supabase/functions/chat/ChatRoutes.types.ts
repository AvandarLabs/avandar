import type { ChatClientMessage } from "$/models/chat/ChatClientMessage/ChatClientMessage.ts";
import type { ChatPageContext } from "$/models/chat/ChatPageContext/ChatPageContext.ts";
import type { ChatResponse } from "$/models/chat/ChatResponse/ChatResponse.ts";
import type {
  ChatRetryContext,
  ChatSessionSecretResponse,
  ConsentAck,
} from "$/types/chat.types.ts";
import type { APITypeDef } from "@sbfn/_shared/MiniServer/api.types.ts";

export type ChatAPI = APITypeDef<
  "chat",
  [
    "/:workspaceId/messages",
    "/:workspaceId/session-secret",
    "/:workspaceId/agent/api/stream",
    "/:workspaceId/extract-measurements",
  ],
  {
    "/:workspaceId/messages": {
      POST: {
        pathParams: {
          workspaceId: string;
        };
        body: {
          messages: ChatClientMessage.T[];
          context: ChatPageContext.T;
          /** Ignored. Kept so older clients that send one still validate. */
          model?: string;
          consentAcks?: ConsentAck[];
          retryContext?: ChatRetryContext;
        };
        returnType: ChatResponse.T;
      };
    };
    "/:workspaceId/agent/api/stream": {
      POST: {
        pathParams: {
          workspaceId: string;
        };
        body: {
          model: { id: string };
          context: { messages: unknown[] };
          options?: {
            reasoning?: "minimal" | "low" | "medium";
            sessionId?: string;
            temperature?: number;
            maxTokens?: number;
          };
        };
        returnType: Response;
      };
    };
    "/:workspaceId/extract-measurements": {
      POST: {
        pathParams: {
          workspaceId: string;
        };
        body: {
          /** The text of the region the user drew, as consented to. */
          regionText: string;
          /** Figures the rules already read, so the model adds the rest. */
          alreadyExtracted: Array<{ metric: string; value: number }>;
          /** Proof the user agreed to send `regionText`. */
          ackToken: string;
        };
        returnType: { responseText: string; model: string };
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
