/**
 * Reads a pipeline run's `limit`: a positive integer, or `undefined` when
 * none was given. Accepts a numeric string because argv carries it as one.
 *
 * @param value - The raw limit, from argv or a request body.
 * @returns The limit, or `undefined` when `value` is `undefined`.
 * @throws When `value` is given but is not a positive integer.
 */
export function parsePipelineRunLimit(value: unknown): number | undefined {
  if (value === undefined) {
    return undefined;
  }
  const limit =
    typeof value === "string" && value.trim() !== "" ? Number(value) : value;
  if (typeof limit !== "number" || !Number.isInteger(limit) || limit < 1) {
    throw new Error(
      `A pipeline limit must be a positive integer, got ${JSON.stringify(value)}.`,
    );
  }
  return limit;
}
