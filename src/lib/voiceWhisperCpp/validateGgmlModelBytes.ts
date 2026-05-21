/**
 * Whisper.cpp model files use ggml-family magics as little-endian uint32 at
 * offset 0.
 * See ggml/ollama `fs/ggml` constants (GGML, GGMF, GGJT, GGLA).
 */
const GGML_FAMILY_MAGICS_LE = new Set<number>([
  0x67676d6c, // GGML
  0x67676d66, // GGMF
  0x67676a74, // GGJT
  0x67676c61, // GGLA
]);

/**
 * Returns true when `buffer` begins with a known ggml-family file magic.
 * Rejects HTML error pages and other corrupt downloads that used to land in
 * IndexedDB on 404s.
 */
export function isValidGgmlModelBytes(buffer: ArrayBuffer): boolean {
  if (buffer.byteLength < 4) {
    return false;
  }
  const magic = new DataView(buffer).getUint32(0, true);
  return GGML_FAMILY_MAGICS_LE.has(magic);
}

/** Throws when bytes are missing or not a ggml whisper model. */
export function assertValidGgmlModelBytes(
  buffer: ArrayBuffer,
  fileName: string,
): void {
  if (!isValidGgmlModelBytes(buffer)) {
    throw new Error(
      `${fileName} is not a valid ggml model file. Remove the model and download again.`,
    );
  }
}
