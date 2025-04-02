import { v4 as uuidv4 } from "uuid";
import { UUID } from "@/types/helpers";

/**
 * Generates a random UUID.
 * @returns A random UUID string.
 */
export function uuid(): UUID {
  return uuidv4() as UUID;
}
