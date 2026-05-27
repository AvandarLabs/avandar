/* eslint-disable @typescript-eslint/no-namespace */
import type {
  ChatClientMessageId,
  ChatClientMessageModel,
  ChatMessageRole as ChatMessageRoleT,
} from "$/models/chat/ChatClientMessage/ChatClientMessage.types.ts";

export namespace ChatClientMessage {
  export type T<K extends keyof ChatClientMessageModel = "Read"> =
    ChatClientMessageModel[K];
  export type Id = ChatClientMessageId;
  export type ChatMessageRole = ChatMessageRoleT;
}
