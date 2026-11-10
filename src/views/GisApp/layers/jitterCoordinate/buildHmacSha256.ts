/** SHA-256 round constants (FIPS 180-4, section 4.2.2). */
const ROUND_CONSTANTS = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1,
  0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
  0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786,
  0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147,
  0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
  0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b,
  0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a,
  0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
  0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

/** SHA-256 initial hash value (FIPS 180-4, section 5.3.3). */
const INITIAL_HASH = [
  0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c,
  0x1f83d9ab, 0x5be0cd19,
];

const BLOCK_BYTES = 64;

function _rotateRight(word: number, bits: number): number {
  return (word >>> bits) | (word << (32 - bits));
}

/** Expands one 64-byte block into the 64-word message schedule. */
function _fillMessageSchedule(
  schedule: Uint32Array,
  view: DataView,
  blockOffset: number,
): void {
  for (let index = 0; index < 16; index += 1) {
    schedule[index] = view.getUint32(blockOffset + index * 4);
  }
  for (let index = 16; index < 64; index += 1) {
    const early = schedule[index - 15]!;
    const late = schedule[index - 2]!;
    const sigmaZero =
      _rotateRight(early, 7) ^ _rotateRight(early, 18) ^ (early >>> 3);
    const sigmaOne =
      _rotateRight(late, 17) ^ _rotateRight(late, 19) ^ (late >>> 10);
    schedule[index] =
      (schedule[index - 16]! + sigmaZero + schedule[index - 7]! + sigmaOne) >>>
      0;
  }
}

/** Runs the 64 compression rounds of one block into `state`. */
function _compressBlock(state: Uint32Array, schedule: Uint32Array): void {
  const work = Uint32Array.from(state);
  for (let index = 0; index < 64; index += 1) {
    const [a, b, c, , e, f, g, h] = work as unknown as number[];
    const sumOne =
      _rotateRight(e!, 6) ^ _rotateRight(e!, 11) ^ _rotateRight(e!, 25);
    const choice = (e! & f!) ^ (~e! & g!);
    const temporaryOne =
      h! + sumOne + choice + ROUND_CONSTANTS[index]! + schedule[index]!;
    const sumZero =
      _rotateRight(a!, 2) ^ _rotateRight(a!, 13) ^ _rotateRight(a!, 22);
    const majority = (a! & b!) ^ (a! & c!) ^ (b! & c!);
    work.copyWithin(1, 0, 7);
    work[4] = work[4]! + temporaryOne;
    work[0] = temporaryOne + sumZero + majority;
  }
  for (let index = 0; index < 8; index += 1) {
    state[index] = state[index]! + work[index]!;
  }
}

/** Hashes bytes with SHA-256 (FIPS 180-4). */
function _sha256(bytes: Uint8Array): Uint8Array {
  const paddedLength =
    Math.ceil((bytes.length + 9) / BLOCK_BYTES) * BLOCK_BYTES;
  const padded = new Uint8Array(paddedLength);
  padded.set(bytes);
  padded[bytes.length] = 0x80;
  const view = new DataView(padded.buffer);
  const bitLength = bytes.length * 8;
  view.setUint32(paddedLength - 8, Math.floor(bitLength / 0x100000000));
  view.setUint32(paddedLength - 4, bitLength >>> 0);

  const state = new Uint32Array(INITIAL_HASH);
  const schedule = new Uint32Array(64);
  for (let offset = 0; offset < paddedLength; offset += BLOCK_BYTES) {
    _fillMessageSchedule(schedule, view, offset);
    _compressBlock(state, schedule);
  }
  const digest = new Uint8Array(32);
  const digestView = new DataView(digest.buffer);
  state.forEach((word, index) => {
    digestView.setUint32(index * 4, word);
  });
  return digest;
}

/** Concatenates two byte arrays. */
function _concatBytes(first: Uint8Array, second: Uint8Array): Uint8Array {
  const joined = new Uint8Array(first.length + second.length);
  joined.set(first);
  joined.set(second, first.length);
  return joined;
}

/** XORs a block-sized key with a padding byte, as HMAC's ipad and opad do. */
function _padKey(keyBlock: Uint8Array, padByte: number): Uint8Array {
  return keyBlock.map((byte) => {
    return byte ^ padByte;
  });
}

/**
 * Computes HMAC-SHA-256 (RFC 2104) synchronously.
 *
 * Map displacement runs inside synchronous render code, where Web Crypto's
 * promise-based `crypto.subtle` cannot be awaited, so this is a small
 * self-contained implementation checked against Node's HMAC in tests.
 *
 * @param params The key and message, both encoded as UTF-8.
 * @param params.key The secret key.
 * @param params.message The message to authenticate.
 * @returns The 32-byte digest.
 */
export function buildHmacSha256({
  key,
  message,
}: Readonly<{ key: string; message: string }>): Uint8Array {
  const encoder = new TextEncoder();
  const keyBytes = encoder.encode(key);
  const keyBlock = new Uint8Array(BLOCK_BYTES);
  keyBlock.set(keyBytes.length > BLOCK_BYTES ? _sha256(keyBytes) : keyBytes);
  const innerDigest = _sha256(
    _concatBytes(_padKey(keyBlock, 0x36), encoder.encode(message)),
  );
  return _sha256(_concatBytes(_padKey(keyBlock, 0x5c), innerDigest));
}
