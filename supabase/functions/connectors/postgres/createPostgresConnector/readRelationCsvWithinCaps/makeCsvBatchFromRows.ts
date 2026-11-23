import { PostgresCsv } from "@sbfn/connectors/postgres/createPostgresConnector/PostgresCsv/PostgresCsv.ts";

/** CSV text encoded as bytes, as `TextEncoder` returns it. */
export type CsvBytes = ReturnType<TextEncoder["encode"]>;

/**
 * The size in bytes of the widest of a batch's CSV lines, given how many
 * bytes the whole batch encodes to.
 */
function _getWidestLineBytes(
  options: Readonly<{
    encoder: TextEncoder;
    lines: readonly string[];
    batchByteLength: number;
  }>,
): number {
  const { encoder, lines } = options;
  const longestLineLength = lines.reduce((longestSoFar, line) => {
    return Math.max(longestSoFar, line.length);
  }, 0);
  const batchLength = lines.reduce((lengthSoFar, line) => {
    return lengthSoFar + line.length;
  }, 0);
  // All ASCII: every character is one byte, so the longest line is widest.
  if (options.batchByteLength === batchLength) {
    return longestLineLength;
  }
  // Each UTF-16 unit of a line encodes to at most 3 bytes, so only a line at
  // least a third as long as the widest found so far can be wider.
  return lines.reduce((widestBytesSoFar, line) => {
    return line.length * 3 > widestBytesSoFar
      ? Math.max(widestBytesSoFar, encoder.encode(line).byteLength)
      : widestBytesSoFar;
  }, longestLineLength);
}

/** One batch of rows written as CSV bytes, with its widest row's size. */
export function makeCsvBatchFromRows(
  options: Readonly<
    Parameters<typeof PostgresCsv.makeRowLinesFromRows>[0] & {
      encoder: TextEncoder;
    }
  >,
): { chunk: CsvBytes; widestRowBytes: number } {
  const lines = PostgresCsv.makeRowLinesFromRows(options);
  const chunk = options.encoder.encode(lines.join(""));
  return {
    chunk,
    widestRowBytes: _getWidestLineBytes({
      encoder: options.encoder,
      lines,
      batchByteLength: chunk.byteLength,
    }),
  };
}
