/**
 * Splits items into consecutive chunks of `chunkSize`, in order. The last
 * chunk holds the remainder, and no items give no chunks.
 *
 * @param items - The items to split.
 * @param chunkSize - The most items a chunk holds.
 * @returns The chunks.
 */
export function splitIntoChunks<T>(
  items: readonly T[],
  chunkSize: number,
): T[][] {
  return Array.from(
    { length: Math.ceil(items.length / chunkSize) },
    (_, index) => {
      return items.slice(index * chunkSize, (index + 1) * chunkSize);
    },
  );
}
