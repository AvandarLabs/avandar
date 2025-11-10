import { Model } from "@/models/Model";
import { SetFieldType, Simplify } from "type-fest";
import { isOfModelType } from "./guards";

/**
 * Returns a function that checks if a value is equal to the given value.
 * @param value - The value to check.
 * @returns A function that checks if a value is equal to a given value.
 */
export function valEq<T>(value: T): (v: unknown) => v is T {
  return (v: unknown): v is T => {
    return v === value;
  };
}

/**
 * Returns a function that checks if a value is not equal to the given value.
 * @param value - The value to check.
 * @returns A function that checks if a value is not equal to a given value.
 */
export function valNotEq<V>(
  value: V,
): <T>(v: T) => v is Exclude<T, V> {
  return <T>(v: T): v is Exclude<T, V> => {
    return v !== value as unknown as T;
  };
}

/**
 * Returns a function that checks if a value is a model of the given type.
 * @param modelType - The model type to check.
 * @returns A function that checks if a value is a model of the given type.
 */
export function valIsOfModelType<
  MType extends string,
>(
  modelType: MType,
): <M extends Model<string>>(
  v: M | null | undefined,
) => v is Simplify<M & SetFieldType<M, "__type", MType>> {
  return <M extends Model<string>>(
    v: M | null | undefined,
  ): v is M & SetFieldType<M, "__type", MType> => {
    return isOfModelType(modelType, v);
  };
}
