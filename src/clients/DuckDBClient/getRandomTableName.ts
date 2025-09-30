import { snakeify } from "@/lib/utils/strings/transformations";
import { uuid } from "@/lib/utils/uuid";

/**
 * Generates a random table name (a snakeified UUID).
 * @returns A random table name.
 */
export function getRandomTableName(): string {
  return snakeify(uuid());
}
