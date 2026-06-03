/* eslint-disable @typescript-eslint/no-namespace */
import type {
  ChatGeneratedSql,
  ChatResponseId,
  ChatResponseModel,
} from "$/models/chat/ChatResponse/ChatResponse.types.ts";

export namespace ChatResponse {
  export type T<K extends keyof ChatResponseModel = "Read"> =
    ChatResponseModel[K];
  export type Id = ChatResponseId;
  export type GeneratedSql = ChatGeneratedSql;
}
