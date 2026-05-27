/* eslint-disable @typescript-eslint/no-namespace */
import type {
  ChatApp as ChatAppT,
  ChatPageContextId,
  ChatPageContextModel,
} from "$/models/chat/ChatPageContext/ChatPageContext.types.ts";

export namespace ChatPageContext {
  export type T<K extends keyof ChatPageContextModel = "Read"> =
    ChatPageContextModel[K];
  export type Id = ChatPageContextId;
  export type ChatApp = ChatAppT;
}
