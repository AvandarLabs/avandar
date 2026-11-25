/* oxlint-disable typescript/no-namespace, import/export */
import type {
  ChatApp as ChatAppT,
  ChatPageContextId,
  ChatPageContextModel,
  ChatPageContextResultColumn,
} from "$/models/chat/ChatPageContext/ChatPageContext.types.ts";

export { ChatPageContextModule as ChatPageContext } from "$/models/chat/ChatPageContext/ChatPageContextModule.ts";

export namespace ChatPageContext {
  export type T<K extends keyof ChatPageContextModel = "Read"> =
    ChatPageContextModel[K];
  export type Id = ChatPageContextId;
  export type ChatApp = ChatAppT;
  export type ResultColumn = ChatPageContextResultColumn;
}
