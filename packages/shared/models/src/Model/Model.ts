/* eslint-disable @typescript-eslint/no-namespace,import-x/export */
import type {
  ModelBase,
  ModelType,
  ModelTypedId,
  ModelVersioned,
} from "@models/Model/Model.types.ts";
import type { EmptyObject } from "type-fest";

export { ModelModule as Model } from "@models/Model/ModelModule.ts";

export namespace Model {
  export type Base<
    MType extends string = string,
    MProps extends Record<string, unknown> = EmptyObject,
  > = ModelBase<MType, MProps>;

  /**
   * A model that has a version field.
   */
  export type Versioned<
    MType extends string = string,
    Version extends number = number,
    MProps extends Record<string, unknown> = EmptyObject,
  > = ModelVersioned<MType, Version, MProps>;

  /** Utility type: gets the string type of a model. */
  export type Type<M extends Base<string>> = ModelType<M>;

  /**
   * Get the `id` type of a model coupled with the model type key.
   *
   * Example:
   * ```ts
   * type MyType = TypedId<Model<"User">>;
   * // TypedId = { __type: "User", id: UserId }
   * ```
   */
  export type TypedId<M extends Base<string> & { id: unknown }> =
    ModelTypedId<M>;
}
