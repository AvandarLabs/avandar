import { isArray, isPlainObject } from "@/lib/utils/guards/guards";
import { DescribableObject, DescribableValue, PrimitiveValue } from "./types";

export function isPrimitiveDescribableValue(
  value: DescribableValue,
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
  value: DescribableValue,
): value is readonly DescribableValue[] {
  return isArray(value);
}

export function isDescribableObject(
  value: DescribableValue,
): value is DescribableObject {
  return isPlainObject(value);
}

export function isStringOrNumber(value: unknown): value is string | number {
  return typeof value === "string" || typeof value === "number";
}
