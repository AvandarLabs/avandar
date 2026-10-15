import { prop } from "@avandar/utils";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

/**
 * Thrown when a user-supplied host resolves (or is written as a literal) to
 * an address this server refuses to open a TCP connection to.
 */
export class UnsafeHostError extends Error {
  constructor(
    public readonly host: string,
    public readonly resolvedAddress: string,
  ) {
    super(
      `Refusing to connect to '${host}' - it resolves to '${resolvedAddress}', which is loopback, link-local, or a private range`,
    );
  }
}

/**
 * Resolves a hostname (or passes a literal IP through unchanged) to every
 * address it could connect to. Exposed separately from
 * {@link assertHostIsSafeToConnect} so a test can inject a fake resolver
 * without a real DNS lookup (or `Deno.resolveDns`, which does not exist
 * under the Node/vitest runtime these files are unit-tested in).
 */
export async function resolveHostAddresses(host: string): Promise<string[]> {
  if (isIP(host) !== 0) {
    return [host];
  }

  const results = await lookup(host, { all: true, verbatim: true });
  return results.map(prop("address"));
}

function _isPrivateOrLoopbackIPv4(address: string): boolean {
  const octets = address.split(".").map(Number);
  const [a, b] = octets as [number, number, number, number];
  if (a === 127) {
    return true; // 127.0.0.0/8 loopback
  }
  if (a === 10) {
    return true; // 10.0.0.0/8 private
  }
  if (a === 172 && b >= 16 && b <= 31) {
    return true; // 172.16.0.0/12 private
  }
  if (a === 192 && b === 168) {
    return true; // 192.168.0.0/16 private
  }
  if (a === 169 && b === 254) {
    // 169.254.0.0/16 link-local (includes the cloud-metadata address)
    return true;
  }
  if (a === 0) {
    return true; // 0.0.0.0/8 "this network"
  }
  return false;
}

function _isPrivateOrLoopbackIPv6(address: string): boolean {
  const normalized = address.toLowerCase();
  if (normalized === "::1") {
    return true; // IPv6 loopback
  }
  if (normalized === "::" || normalized.startsWith("::ffff:0.0.0.0")) {
    return true; // unspecified
  }
  // fc00::/7 (unique local) - first two hex nibbles fc or fd
  const firstGroup = normalized.split(":")[0] ?? "";
  if (
    firstGroup.length >= 2 &&
    (firstGroup.startsWith("fc") || firstGroup.startsWith("fd"))
  ) {
    return true;
  }
  // fe80::/10 (link-local)
  if (firstGroup.startsWith("fe8") || firstGroup.startsWith("fe9")) {
    return true;
  }
  if (firstGroup.startsWith("fea") || firstGroup.startsWith("feb")) {
    return true;
  }
  // An IPv4-mapped IPv6 address (::ffff:a.b.c.d) - recurse on the embedded
  // IPv4 address so the v4 ranges above still apply through this encoding.
  const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(normalized);
  if (mapped?.[1]) {
    return isPrivateOrLoopbackAddress(mapped[1]);
  }
  return false;
}

/**
 * True if `address` is loopback, link-local, or a private range, for either
 * IPv4 or IPv6. This is the one place the actual ranges are spelled out -
 * every caller of {@link assertHostIsSafeToConnect} goes through it, so a
 * fix here fixes every connector, present and future.
 */
export function isPrivateOrLoopbackAddress(address: string): boolean {
  const ipVersion = isIP(address);

  if (ipVersion === 4) {
    return _isPrivateOrLoopbackIPv4(address);
  }
  if (ipVersion === 6) {
    return _isPrivateOrLoopbackIPv6(address);
  }

  // Not a valid IP at all - treat as unsafe rather than silently passing it
  // through to a connection attempt.
  return true;
}

/**
 * Resolves `host` and throws {@link UnsafeHostError} if any resolved address
 * is loopback, link-local, or a private range. Checks the **resolved**
 * address, never the input string, so a hostname cannot pass this check and
 * then re-resolve to a different, unsafe address at connect time
 * (DNS rebinding).
 *
 * @param host The hostname or literal IP the user supplied in the
 *   connection form.
 * @param resolveHost Injectable for tests; defaults to a real DNS lookup
 *   via {@link resolveHostAddresses}.
 */
export async function assertHostIsSafeToConnect(
  host: string,
  resolveHost: (host: string) => Promise<string[]> = resolveHostAddresses,
): Promise<void> {
  const addresses = await resolveHost(host);

  const unsafeAddress = addresses.find(isPrivateOrLoopbackAddress);
  if (unsafeAddress) {
    throw new UnsafeHostError(host, unsafeAddress);
  }
}
