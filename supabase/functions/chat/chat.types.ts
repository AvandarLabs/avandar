import type { APITypeDef } from "@sbfn/_shared/MiniServer/api.types.ts";
import type { ChatClientMessage } from "$/models/chat/ChatClientMessage/ChatClientMessage.ts";
import type { ChatModelOption } from "$/models/chat/ChatModelOption/ChatModelOption.ts";
import type { ChatPageContext } from "$/models/chat/ChatPageContext/ChatPageContext.ts";
import type { ChatResponse } from "$/models/chat/ChatResponse/ChatResponse.ts";

export type ChatAPI = APITypeDef<
  "chat",
  ["/models", "/:workspaceId/messages"],
  {
    "/models": {
      GET: {
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
          model: string | undefined;
        };
        returnType: ChatResponse.T;
      };
    };
  }
>;
