import type { DistributedPick, EmptyObject, Simplify } from "type-fest";

/** The internal key stored in a model object which holds its string type. */
export type ModelTypeKey = "__type";

export type ModelBase<
  MType extends string = string,
  MProps extends Record<string, unknown> = EmptyObject,
> =
  MProps extends EmptyObject ? { __type: MType }
  : Simplify<{ __type: MType } & MProps>;

export type ModelVersioned<
  MType extends string = string,
  Version extends number = number,
  MProps extends Record<string, unknown> = EmptyObject,
> = Simplify<ModelBase<MType, MProps> & { version: Version }>;

export type ModelType<M extends ModelBase<string>> = M[ModelTypeKey];

export type ModelTypedId<M extends ModelBase<string> & { id: unknown }> =
  DistributedPick<M, ModelTypeKey | "id">;
