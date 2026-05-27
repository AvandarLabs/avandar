/* eslint-disable @typescript-eslint/no-namespace */
import type {
  ChatModelLicenseTier,
  ChatModelOptionGroup,
  ChatModelOptionId,
  ChatModelOptionModel,
} from "$/models/chat/ChatModelOption/ChatModelOption.types.ts";

export namespace ChatModelOption {
  export type T<K extends keyof ChatModelOptionModel = "Read"> =
    ChatModelOptionModel[K];
  export type Id = ChatModelOptionId;
  export type LicenseTier = ChatModelLicenseTier;
  export type OptionGroup = ChatModelOptionGroup;
}
