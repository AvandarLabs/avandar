/* eslint-disable @typescript-eslint/no-namespace */
import type {
  EntityFieldValueId,
  EntityFieldValueRead,
} from "$/models/entities/EntityFieldValue/EntityFieldValue.types.ts";

export namespace EntityFieldValue {
  export type T = EntityFieldValueRead;
  export type Id = EntityFieldValueId;
}
