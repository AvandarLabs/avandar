/* eslint-disable @typescript-eslint/no-explicit-any */
import type {
  ModelBase,
  ModelType,
  ModelTypedId,
  ModelTypeKey,
} from "@models/Model/Model.types.ts";
import type { EmptyObject, Simplify, UnionToIntersection } from "type-fest";

export type IModelModule = {
  /**
   * Make a new model instance.
   * @param modelType - The type of the model to make.
   * @param modelProps - The properties of the model to make.
   * @returns The model.
   */
  make: <
    MType extends string,
    const MProps extends Record<string, unknown> = EmptyObject,
  >(
    modelType: MType,
    modelProps: MProps,
  ) => ModelBase<MType, MProps>;

  /**
   * Match a model instance to a function based on its type.
   * This is useful for when you have a union of model types and want to do
   * something different depending on the type of the model.
   *
   * Example:
   * ```ts
   * // assume we have received a model which could be either User or Admin
   * // which are each of type Model<"User"> and Model<"Admin"> respectively
   * const model: User | Admin;
   *
   * const result = Models.match(model, {
   *   User: (model) => doSomething();
   *   Admin: (model) => doSomethingElse();
   * });
   * ```
   * @param model - The model instance to pattern match.
   * @param fns - A record of functions, mapping a model type to a function.
   * @returns The result of the function that matched the model instance.
   */
  match: <
    M extends ModelBase,
    FunctionRecord extends UnionToIntersection<
      M extends any ?
        {
          [Mod in M as ModelType<Mod>]: (model: Mod) => unknown;
        }
      : never
    >,
  >(
    model: M,
    fns: FunctionRecord,
  ) => ReturnType<FunctionRecord[M[ModelTypeKey]]>;

  /**
   * Get the typed id of a model (i.e. an object that couples the model id
   * with its model type).
   *
   * @param model - The model to get the typed id of.
   * @returns The typed id of the model.
   */
  getTypedId: <M extends ModelBase<string> & { id: unknown }>(
    model: M,
  ) => Simplify<ModelTypedId<M>>;

  /**
   * Checks if a value is a model object of any type.
   * @param val - The value to check.
   * @returns `true` if the value is a model, `false` otherwise.
   */
  isModel: (val: unknown) => val is ModelBase;

  /**
   * Checks if a value is a model of the given type.
   * @param val - The value to check.
   * @param modelType - The model type to check.
   */
  isOfModelType: <T extends string>(
    val: unknown,
    modelType: T,
  ) => val is ModelBase<T>;

  /**
   * Returns a function that checks if a value is a model of the given type.
   * @param modelType - The model type to check.
   * @returns A function that checks if a value is a model of the given type.
   */
  valIsOfModelType: <MType extends string>(
    modelType: MType,
  ) => <MaybeModel extends ModelBase<string>>(
    v: MaybeModel | null | undefined,
  ) => v is MaybeModel & ModelBase<MType>;
};

export const ModelModule: IModelModule = {
  make: <
    MType extends string,
    MProps extends Record<string, unknown> = EmptyObject,
  >(
    modelType: MType,
    modelProps: MProps,
  ): ModelBase<MType, MProps> => {
    return {
      __type: modelType,
      ...modelProps,
    } as ModelBase<MType, MProps>;
  },

  match: <
    M extends ModelBase,
    FunctionRecord extends UnionToIntersection<
      M extends any ?
        {
          [Mod in M as ModelType<Mod>]: (model: Mod) => unknown;
        }
      : never
    >,
  >(
    model: M,
    fns: FunctionRecord,
  ) => {
    const mType = model.__type;
    if (mType in fns && fns[mType] !== undefined) {
      return fns[mType](model) as ReturnType<FunctionRecord[M[ModelTypeKey]]>;
    }
    throw new Error(`No match found for model type: ${mType}`);
  },

  getTypedId: <M extends ModelBase<string> & { id: unknown }>(
    model: M,
  ): ModelTypedId<M> => {
    return {
      __type: model.__type,
      id: model.id,
    } as ModelTypedId<M>;
  },

  isModel: (val: unknown): val is ModelBase => {
    return (
      typeof val === "object" &&
      val !== null &&
      "__type" in val &&
      typeof val.__type === "string"
    );
  },

  isOfModelType: <MType extends string, MaybeModel>(
    val: MaybeModel,
    modelType: MType,
  ): val is MaybeModel & ModelBase<MType> => {
    return (
      typeof val === "object" &&
      val !== null &&
      "__type" in val &&
      typeof val.__type === "string" &&
      (modelType === undefined || val.__type === modelType)
    );
  },

  valIsOfModelType: <MType extends string>(
    modelType: MType,
  ): (<MaybeModel extends ModelBase<string>>(
    v: MaybeModel | null | undefined,
  ) => v is MaybeModel & ModelBase<MType>) => {
    return (v) => {
      return ModelModule.isOfModelType(v, modelType);
    };
  },
};
