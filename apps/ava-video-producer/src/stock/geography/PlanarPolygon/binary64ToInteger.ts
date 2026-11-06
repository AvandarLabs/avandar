/** Converts a finite binary64 number to exact integer units of 2^-1074. */
export function binary64ToInteger(value: number): bigint {
  // Every finite binary64 is an integer multiple of 2^-1074. A common scale
  // makes determinant signs exact, including subnormal/thin geometry.
  const buffer = new ArrayBuffer(8);
  const view = new DataView(buffer);
  view.setFloat64(0, value);
  const bits = view.getBigUint64(0);
  const exponent = Number((bits >> 52n) & 2047n);
  const fraction = bits & ((1n << 52n) - 1n);
  const mantissa = exponent === 0 ? fraction : fraction | (1n << 52n);
  const magnitude = mantissa << BigInt(Math.max(0, exponent - 1));
  return bits >> 63n ? -magnitude : magnitude;
}
