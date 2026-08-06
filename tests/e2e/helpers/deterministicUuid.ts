import { createHash } from "node:crypto";

/**
 * Builds a stable RFC-4122-shaped UUID from a seed string so each E2E
 * workspace slug gets unique `subscriptions` Polar ids (the table PK is
 * `polar_subscription_id`, not `workspace_id`).
 */
export function deterministicUuid(seed: string): string {
  const digest = createHash("sha256").update(seed).digest();
  const bytes = Buffer.from(digest.subarray(0, 16));
  bytes[6] = (bytes[6]! & 0x0f) | 0x40;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20, 32),
  ].join("-");
}
