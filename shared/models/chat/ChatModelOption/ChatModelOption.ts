/* eslint-disable @typescript-eslint/no-namespace,import-x/export */
import type {
  ChatModelLicenseTier,
  ChatModelOptionGroup,
  ChatModelOptionId,
  ChatModelOptionModel,
} from "$/models/chat/ChatModelOption/ChatModelOption.types.ts";

export { ChatModelOptionModule as ChatModelOption } from "$/models/chat/ChatModelOption/ChatModelOptionModule/ChatModelOptionModule.ts";

export namespace ChatModelOption {
  export type T<K extends keyof ChatModelOptionModel = "Read"> =
    ChatModelOptionModel[K];
  export type Id = ChatModelOptionId;
  export type LicenseTier = ChatModelLicenseTier;
  export type OptionGroup = ChatModelOptionGroup;
  export type Catalog = { groups: ChatModelOptionGroup[] };
}
