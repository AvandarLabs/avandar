import { isArray, isPlainObject } from "@/lib/utils/guards/guards";
import {
  DescribableObject,
  PrimitiveValue,
} from "./ObjectDescriptionList.types";

export function isPrimitiveDescribableValue(
  value: unknown,
): value is PrimitiveValue {
  return (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean" ||
    value instanceof Date ||
    value === null ||
    value === undefined
  );
}

export function isDescribableValueArray(
  value: unknown,
): value is readonly unknown[] {
  return isArray(value);
}

/**
 * A DescribableObject must be a plain object. We do not allow
 * objects that are not plain objects, like Maps, Sets, etc.
 */
export function isDescribableObject(
  value: unknown,
): value is DescribableObject {
  return isPlainObject(value);
}

export function isStringOrNumber(value: unknown): value is string | number {
  return typeof value === "string" || typeof value === "number";
}
