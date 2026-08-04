/**
 * Decodes a standard (padded) base64 string back into its raw bytes. Inverse
 * of {@link uint8ToBase64}.
 *
 * @param base64 - A standard (padded) base64 string.
 * @returns The decoded bytes.
 */
export function base64ToUint8(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}
