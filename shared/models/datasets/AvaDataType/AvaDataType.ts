/* eslint-disable @typescript-eslint/no-namespace,import-x/export */
import type { AvaDataTypeT } from "$/models/datasets/AvaDataType/AvaDataType.types.ts";

export { AvaDataTypeModule as AvaDataType } from "$/models/datasets/AvaDataType/AvaDataTypeModule.ts";

export namespace AvaDataType {
  export type T = AvaDataTypeT;
}
