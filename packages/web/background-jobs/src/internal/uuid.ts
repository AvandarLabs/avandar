/**
 * Tiny RFC4122 v4 generator with no external dependencies. Used inside
 * the background-jobs library for generating job ids so the lib stays
 * self-contained.
 */
export function generateJobId(): string {
  const cryptoApi: Crypto | undefined =
    typeof globalThis !== "undefined" ? globalThis.crypto : undefined;
  if (cryptoApi && typeof cryptoApi.randomUUID === "function") {
    return cryptoApi.randomUUID();
  }

  // Fallback for environments without `crypto.randomUUID`. Math.random
  // is not cryptographically secure but is fine for client-side job
  // ids that never leave the browser.
  const hex: string[] = [];
  for (let i = 0; i < 16; i += 1) {
    hex.push(Math.floor(Math.random() * 256).toString(16).padStart(2, "0"));
  }
  hex[6] = ((parseInt(hex[6]!, 16) & 0x0f) | 0x40).toString(16).padStart(2, "0");
  hex[8] = ((parseInt(hex[8]!, 16) & 0x3f) | 0x80).toString(16).padStart(2, "0");
  return (
    hex.slice(0, 4).join("") +
    "-" +
    hex.slice(4, 6).join("") +
    "-" +
    hex.slice(6, 8).join("") +
    "-" +
    hex.slice(8, 10).join("") +
    "-" +
    hex.slice(10, 16).join("")
  );
}
