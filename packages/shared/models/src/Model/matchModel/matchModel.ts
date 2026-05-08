/* eslint-disable @typescript-eslint/no-explicit-any */
import type { ModelBase, ModelType } from "@models/Model/Model.types.ts";
import type { UnknownObject } from "@utils/types/common.types.ts";
import type { UnionToIntersection } from "type-fest";

type ValidMatchedValues<M extends ModelBase> =
  | ((model: M) => unknown)
  | string
  | number
  | boolean
  | UnknownObject;

type ValidValueRecord<M extends ModelBase> = UnionToIntersection<
  M extends any ?
    {
      [Mod in M as ModelType<Mod>]: ValidMatchedValues<Mod>;
    }
  : never
>;

type MappedValue<
  M extends ModelBase,
  FunctionRecord extends ValidValueRecord<M>,
> =
  M extends any ?
    ModelType<M> extends keyof FunctionRecord ?
      FunctionRecord[ModelType<M>] extends (model: M) => infer R ?
        R
      : FunctionRecord[ModelType<M>]
    : never
  : never;

export type MatchModelFn = <
  M extends ModelBase,
  FunctionRecord extends ValidValueRecord<M>,
>(
  model: M,
  fns: FunctionRecord,
) => MappedValue<M, FunctionRecord>;

export function matchModel<
  M extends ModelBase,
  FunctionRecord extends ValidValueRecord<M>,
>(model: M, fns: FunctionRecord): MappedValue<M, FunctionRecord> {
  const mType = model.__type;
  if (mType in fns && fns[mType] !== undefined) {
    if (typeof fns[mType] === "function") {
      return fns[mType](model) as MappedValue<M, FunctionRecord>;
    }
    return fns[mType] as MappedValue<M, FunctionRecord>;
  }
  throw new Error(`No match found for model type: ${mType}`);
}
