import type { SetDefined } from "../../types/utilities.types.ts";
import type { SetRequired } from "type-fest";

/**
 * Asserts that `obj` has all the properties in `properties` and that they are
 * not undefined.
 *
 * @param obj - The object to check.
 * @param properties - The properties to check.
 * @param msgOrOptions - The message to throw if the object does not have the
 *   properties.
 */
export function assertHasDefinedProps<T extends object, Key extends keyof T>(
  obj: T,
  properties: Extract<Key, string> | readonly Key[],
  msgOrOptions?: string | { name: string },
): asserts obj is SetRequired<T, Key> & SetDefined<T, Key> {
  const props = typeof properties === "string" ? [properties] : properties;
  const hasDefinedProps = props.every((prop) => {
    return prop in obj && obj[prop] !== undefined;
  });

  if (!hasDefinedProps) {
    const objName =
      typeof msgOrOptions === "string" ? "object" : msgOrOptions?.name;
    throw new Error(
      `Expected ${objName} to have defined properties: ${props.join(", ")}`,
    );
  }
}
