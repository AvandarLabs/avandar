/** Refuses a stage whose plan, media, or renderer changed while it ran. */
export function assertFingerprintUnchanged({
  before,
  after,
  message,
}: Readonly<{ before: unknown; after: unknown; message: string }>): void {
  if (JSON.stringify(after) !== JSON.stringify(before)) {
    throw new Error(message);
  }
}
