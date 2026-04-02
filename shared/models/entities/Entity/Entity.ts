/* eslint-disable @typescript-eslint/no-namespace */
import type {
  EntityId,
  EntityModel,
} from "$/models/entities/Entity/Entity.types.ts";

export { EntityParsers } from "$/models/entities/Entity/EntityParsers.ts";

export namespace Entity {
  export type T<K extends keyof EntityModel = "Read"> = EntityModel[K];
  export type Id = EntityId;
}
