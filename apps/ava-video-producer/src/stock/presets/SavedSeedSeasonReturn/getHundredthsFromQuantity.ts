/** Exact integer hundredths from a finite nonnegative two-decimal quantity. */
export function getHundredthsFromQuantity(value: number): number {
  const text = String(value);
  if (!/^\d+(?:\.\d{1,2})?$/.test(text) || value > 10000) {
    throw new Error("Expected a bounded two-decimal quantity.");
  }
  const [whole, fraction = ""] = text.split(".");
  return Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
}
