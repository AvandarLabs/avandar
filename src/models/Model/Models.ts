import type { Model, ModelType, ModelTypeKey, TypedId } from "./Model.types";
import type { EmptyObject, Simplify, UnionToIntersection } from "type-fest";

export type IModels = {
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
  ) => Model<MType, MProps>;

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
    M extends Model,
    FunctionRecord extends UnionToIntersection<
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
  getTypedId: <M extends Model<string> & { id: unknown }>(
    model: M,
  ) => Simplify<TypedId<M>>;
};

export const Models: IModels = {
  make: <
    MType extends string,
    MProps extends Record<string, unknown> = EmptyObject,
  >(
    modelType: MType,
    modelProps: MProps,
  ): Model<MType, MProps> => {
    return {
      __type: modelType,
      ...modelProps,
    };
  },

  match: <
    M extends Model,
    FunctionRecord extends UnionToIntersection<
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

  getTypedId: <M extends Model<string> & { id: unknown }>(
    model: M,
  ): TypedId<M> => {
    return {
      __type: model.__type,
      id: model.id,
    } as TypedId<M>;
  },
};
