/**
 * Checks if a value is a primitive type.
 *
 * @param value The value to check.
 * @returns `true` if the value is a primitive type.
 */
export function isPrimitive(
  value: unknown,
): value is string | number | bigint | boolean | symbol | undefined | null {
  return (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean" ||
    typeof value === "symbol" ||
    typeof value === "undefined" ||
    value === null
  );
}
