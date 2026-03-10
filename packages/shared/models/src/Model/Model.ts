/* eslint-disable @typescript-eslint/no-namespace,import-x/export */
// deno-lint-ignore-file no-namespace
import type { ModelTypeKey } from "./Model.types.ts";
import type { DistributedPick, EmptyObject, Simplify } from "type-fest";

export { ModelModule as Model } from "./ModelModule.ts";

export namespace Model {
  export type Base<
    MType extends string = string,
    MProps extends Record<string, unknown> = EmptyObject,
  > = Simplify<{ __type: MType } & MProps>;

  export type Versioned<
    MType extends string = string,
    Version extends number = number,
    MProps extends Record<string, unknown> = EmptyObject,
  > = Simplify<Base<MType, MProps> & { version: Version }>;

  /** Utility type: gets the string type of a model. */
  export type Type<M extends Base<string>> = M[ModelTypeKey];

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
    DistributedPick<M, ModelTypeKey | "id">;
}
