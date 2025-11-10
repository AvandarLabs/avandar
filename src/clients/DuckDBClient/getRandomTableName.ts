import { snakeify } from "@/lib/utils/strings/transformations";
import { uuid } from "@/lib/utils/uuid";

/**
 * Generates a random table name (a snakeified UUID).
 * @returns A random table name.
 *
 * TODO(jpsyx): delete this - it should not be needed anymore. We should use
 * dataset IDs directly as the table names.
 */
export function getRandomTableName(): string {
  return snakeify(uuid());
}
