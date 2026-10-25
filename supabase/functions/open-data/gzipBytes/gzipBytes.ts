/**
 * Gzips bytes whole. A sample is a few megabytes at most, so holding it
 * compressed in memory costs little and lets the response carry its length.
 *
 * @param bytes - What to compress.
 * @returns The gzip stream's bytes.
 */
export async function gzipBytes(
  bytes: Uint8Array,
): Promise<Uint8Array<ArrayBuffer>> {
  const compressed = new Response(bytes as BodyInit).body?.pipeThrough(
    new CompressionStream("gzip"),
  );
  return new Uint8Array(await new Response(compressed).arrayBuffer());
}
