/* eslint-disable @typescript-eslint/no-namespace */
import type {
  ChatGeneratedSql,
  ChatResponseId,
  ChatResponseModel,
} from "$/models/chat/ChatResponse/ChatResponse.types.ts";
import type {
  ChatCreatedCaseType,
  ChatProposedCaseType,
} from "$/types/chat.types.ts";

export namespace ChatResponse {
  export type T<K extends keyof ChatResponseModel = "Read"> =
    ChatResponseModel[K];
  export type Id = ChatResponseId;
  export type GeneratedSql = ChatGeneratedSql;
  export type CreatedCaseType = ChatCreatedCaseType;
  export type ProposedCaseType = ChatProposedCaseType;
}
