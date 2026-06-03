import type { Model } from "@models/Model/Model.ts";
import type { UUID } from "@utils/types/common.types.ts";

type ModelType = "ChatClientMessage";

/** Role of a message in a chat thread sent to the assistant API. */
export type ChatMessageRole = "user" | "assistant" | "system";

export type ChatClientMessageId = UUID<ModelType>;

export type ChatClientMessageRead = Model.Base<
  ModelType,
  {
    role: ChatMessageRole;
    content: string;
  }
>;

export type ChatClientMessageModel = {
  Read: ChatClientMessageRead;
};
