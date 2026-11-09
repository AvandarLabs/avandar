/**
 * The file name of one part of an ODC listing's Parquet copy. Parts are
 * numbered from zero and padded, so they list in row order.
 *
 * @param partIndex - The part's position in the copy, from zero.
 */
export function buildParquetCachePartName(partIndex: number): string {
  return `part-${String(partIndex).padStart(5, "0")}.parquet`;
}

/**
 * The `opendata` bucket paths of every part of an ODC listing's Parquet
 * copy, in row order. A reader that reads them as one table reads the copy.
 *
 * @param args.folderPath - The copy's folder, as the listing records it.
 * @param args.partCount - How many parts the folder holds.
 */
export function buildParquetCachePartPaths(
  args: Readonly<{ folderPath: string; partCount: number }>,
): string[] {
  return Array.from({ length: args.partCount }, (_, partIndex) => {
    return `${args.folderPath}/${buildParquetCachePartName(partIndex)}`;
  });
}
