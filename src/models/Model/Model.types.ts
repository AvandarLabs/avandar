import type { DistributedPick, EmptyObject, Merge } from "type-fest";

/** The internal key stored in a model object which holds its string type. */
export type ModelTypeKey = "__type";

export type Model<
  MType extends string = string,
  MProps extends Record<string, unknown> = EmptyObject,
> = Merge<{ __type: MType }, MProps>;

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
