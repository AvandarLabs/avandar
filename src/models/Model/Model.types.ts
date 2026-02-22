import type { DistributedPick, EmptyObject, Simplify } from "type-fest";

/** The internal key stored in a model object which holds its string type. */
export type ModelTypeKey = "__type";

export type Model<
  MType extends string = string,
  MProps extends Record<string, unknown> = EmptyObject,
> = Simplify<{ __type: MType } & MProps>;

export type VersionedModel<
  MType extends string = string,
  Version extends number = number,
  MProps extends Record<string, unknown> = EmptyObject,
> = Simplify<{ __type: MType; version: Version } & MProps>;

/** Utility type: gets the string type of a model. */
export type ModelType<M extends Model<string>> = M[ModelTypeKey];

/**
 * Get the given types of a model along with the model type key.
 *
 * Example:
 * ```ts
 * type TypedId = TypedModelProp<Model<"User">, "id">;
 * // TypedId = { __type: "User", id: string }
 * ```
 */
export type TypedId<M extends Model<string> & { id: unknown }> =
  DistributedPick<M, ModelTypeKey | "id">;
