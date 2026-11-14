const FNV_OFFSET_BASIS = 0xcbf29ce484222325n;
const FNV_PRIME = 0x100000001b3n;
const UINT64_MASK = 0xffffffffffffffffn;

/**
 * A 64-bit FNV-1a hash of a string's UTF-8 bytes, as 16 lowercase hex
 * digits. Use it for a short, stable fingerprint that is the same in the
 * browser, Node, and Deno, for example to tell whether a list of values
 * changed since it was last read. It is not a cryptographic hash.
 */
export function fnv1a64Hex(text: string): string {
  const hash = new TextEncoder().encode(text).reduce((current, byte) => {
    return ((current ^ BigInt(byte)) * FNV_PRIME) & UINT64_MASK;
  }, FNV_OFFSET_BASIS);
  return hash.toString(16).padStart(16, "0");
}
