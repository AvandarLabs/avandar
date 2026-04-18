/* eslint-disable @typescript-eslint/no-namespace,import-x/export */
import type {
  EntityConfigId,
  EntityConfigModel,
} from "$/models/EntityConfig/EntityConfig.types.ts";

export { EntityConfigParsers } from "$/models/EntityConfig/EntityConfigParsers.ts";
export { EntityConfigModule as EntityConfig } from "$/models/EntityConfig/EntityConfigModule.ts";

export namespace EntityConfig {
  export type T<K extends keyof EntityConfigModel = "Read"> =
    EntityConfigModel[K];
  export type Id = EntityConfigId;
}
