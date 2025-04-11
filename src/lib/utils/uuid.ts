import { v4 as uuidv4 } from "uuid";
import { UUID } from "@/lib/types/common";

/**
 * Generates a random UUID.
 * @returns A random UUID string.
 */
export function uuid<T extends string = never>(): UUID<T> {
  return uuidv4() as UUID<T>;
}
