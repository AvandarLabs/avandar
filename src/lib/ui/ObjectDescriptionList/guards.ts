import { isPlainObject } from "@/lib/utils/guards";
import { DescribableObject, FieldValue, PrimitiveFieldValue } from "./types";

export function isPrimitiveFieldValue(
  value: FieldValue,
): value is PrimitiveFieldValue {
  return (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean" ||
    value instanceof Date ||
    value === null ||
    value === undefined
  );
}

export function isFieldValueArray(
  value: FieldValue,
): value is readonly FieldValue[] {
  return Array.isArray(value);
}

export function isEntityObject(value: FieldValue): value is DescribableObject {
  return isPlainObject(value);
}
