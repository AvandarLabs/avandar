/* eslint-disable @typescript-eslint/no-namespace */
import type {
  EntityFieldConfigId,
  EntityFieldConfigModel,
} from "$/models/EntityConfig/EntityFieldConfig/EntityFieldConfig.types.ts";
import type { Simplify } from "type-fest";

export namespace EntityFieldConfig {
  export type T<K extends keyof EntityFieldConfigModel = "Read"> = Simplify<
    EntityFieldConfigModel[K]
  >;
  export type Id = EntityFieldConfigId;
}
