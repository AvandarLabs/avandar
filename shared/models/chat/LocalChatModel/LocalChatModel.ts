/* eslint-disable @typescript-eslint/no-namespace,import-x/export */
import type {
  LocalChatModelCopy,
  LocalChatModelId,
  LocalChatModelRamGb,
  LocalChatModelT,
} from "$/models/chat/LocalChatModel/LocalChatModel.types.ts";

export { LocalChatModelModule as LocalChatModel } from "$/models/chat/LocalChatModel/LocalChatModelModule/LocalChatModelModule.ts";

export namespace LocalChatModel {
  export type T = LocalChatModelT;
  export type Id = LocalChatModelId;
  export type RamGb = LocalChatModelRamGb;
  export type Copy = LocalChatModelCopy;
}
