import { v4 as uuidv4 } from "uuid";
import { uuidType } from "./zodHelpers.ts";
import type { UUID } from "@avandar/utils";

// TODO(jpsyx): improve this implementation. use a builtin? and improve types
/**
 * Generates a random UUID, or casts the given string to type UUID<T>
 * if it successfully validates as a UUID.
 * @returns A random UUID string.
 * @throws ZodError if a string is provided and it is not a valid UUID.
 */
export function uuid<
  B extends string = never,
  Brand extends string = B extends UUID<infer U> ? U : B,
>(stringToCast?: string): UUID<Brand> {
  if (stringToCast) {
    try {
      const stringAsUUID = uuidType<Brand>().parse(stringToCast);
      return stringAsUUID as UUID<Brand>;
    } catch {
      throw new Error(`Invalid UUID: ${stringToCast}`);
    }
  }

  return uuidv4() as UUID<Brand>;
}
