import { isPlainObject } from "@/utils/guards";
import { EntityObject, FieldValue, PrimitiveFieldValue } from "./types";

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

export function isEntityObject(value: FieldValue): value is EntityObject {
  return isPlainObject(value);
}
