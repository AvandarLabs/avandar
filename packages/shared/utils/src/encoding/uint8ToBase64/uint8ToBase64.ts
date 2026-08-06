/**
 * Encodes a byte array as a standard (padded) base64 string. Works in the
 * browser, Node, Deno, and Bun via `btoa`.
 *
 * @param bytes - The raw bytes to encode.
 * @returns The base64 representation of `bytes`.
 */
export function uint8ToBase64(bytes: Uint8Array): string {
  // Encode in chunks so a large input does not overflow the argument limit of
  // `String.fromCharCode(...spread)`. `btoa` takes the byte-valued chars.
  const CHUNK_SIZE = 0x8000;
  let binary = "";
  for (let offset = 0; offset < bytes.byteLength; offset += CHUNK_SIZE) {
    const chunk = bytes.subarray(offset, offset + CHUNK_SIZE);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}
