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
 * Gets every address a hostname could connect to (or passes a literal IP
 * through unchanged). Exposed separately from
 * {@link assertHostIsSafeToConnect} so a test can inject a fake resolver
 * without a real DNS lookup (or `Deno.resolveDns`, which does not exist
 * under the Node/vitest runtime these files are unit-tested in).
 */
export async function getAddressesForHost(host: string): Promise<string[]> {
  if (isIP(host) !== 0) {
    return [host];
  }

  const results = await lookup(host, { all: true, verbatim: true });
  return results.map(prop("address"));
}

function _isPrivateOrLoopbackIPv4(address: string): boolean {
  const octets = address.split(".").map(Number);
  const [firstOctet, secondOctet, thirdOctet] = octets as [
    number,
    number,
    number,
    number,
  ];
  if (firstOctet === 127) {
    return true; // 127.0.0.0/8 loopback
  }
  if (firstOctet === 10) {
    return true; // 10.0.0.0/8 private
  }
  if (firstOctet === 172 && secondOctet >= 16 && secondOctet <= 31) {
    return true; // 172.16.0.0/12 private
  }
  if (firstOctet === 192 && secondOctet === 168) {
    return true; // 192.168.0.0/16 private
  }
  if (firstOctet === 169 && secondOctet === 254) {
    // 169.254.0.0/16 link-local (includes the cloud-metadata address)
    return true;
  }
  if (firstOctet === 0) {
    return true; // 0.0.0.0/8 "this network"
  }
  if (firstOctet === 100 && secondOctet >= 64 && secondOctet <= 127) {
    // 100.64.0.0/10 carrier-grade NAT, which some cloud providers use for
    // their internal networks
    return true;
  }
  if (firstOctet === 192 && secondOctet === 0 && thirdOctet === 0) {
    return true; // 192.0.0.0/24 IETF protocol assignments
  }
  if (firstOctet === 198 && (secondOctet === 18 || secondOctet === 19)) {
    return true; // 198.18.0.0/15 benchmarking
  }
  if (firstOctet >= 224) {
    // 224.0.0.0/4 multicast, then 240.0.0.0/4 reserved (including the
    // 255.255.255.255 broadcast address)
    return true;
  }
  return false;
}

/**
 * Expands any valid IPv6 spelling into its eight 16-bit groups, so the range
 * checks below compare numbers rather than one of the many equivalent ways to
 * write the same address (`::1`, `0::1`, `0:0:0:0:0:0:0:1`, or an embedded
 * IPv4 address written as hex or as dotted decimal). Returns `undefined` for
 * anything it cannot parse.
 */
function _parseIPv6Groups(address: string): number[] | undefined {
  // A zone id (`fe80::1%eth0`) names a local interface, not part of the
  // address itself.
  const [withoutZone = ""] = address.split("%");
  let hexText = withoutZone.toLowerCase();

  // Rewrite a trailing dotted IPv4 address as the two hex groups it occupies.
  const embeddedIPv4 = /(\d+)\.(\d+)\.(\d+)\.(\d+)$/.exec(hexText);
  if (embeddedIPv4) {
    const [first, second, third, fourth] = embeddedIPv4.slice(1).map(Number);
    const highGroup = ((first ?? 0) << 8) | (second ?? 0);
    const lowGroup = ((third ?? 0) << 8) | (fourth ?? 0);
    hexText =
      hexText.slice(0, embeddedIPv4.index) +
      `${highGroup.toString(16)}:${lowGroup.toString(16)}`;
  }

  const halves = hexText.split("::");
  if (halves.length > 2) {
    return undefined;
  }
  const [headText = "", tailText = ""] = halves;
  const headGroups = headText === "" ? [] : headText.split(":");
  const tailGroups = tailText === "" ? [] : tailText.split(":");
  const numMissingGroups =
    halves.length === 2 ? 8 - headGroups.length - tailGroups.length : 0;
  if (numMissingGroups < 0) {
    return undefined;
  }

  const groups = [
    ...headGroups,
    ...Array<string>(numMissingGroups).fill("0"),
    ...tailGroups,
  ].map((groupText) => {
    return /^[0-9a-f]{1,4}$/.test(groupText)
      ? Number.parseInt(groupText, 16)
      : Number.NaN;
  });
  return groups.length === 8 && groups.every(Number.isFinite)
    ? groups
    : undefined;
}

/** Joins two 16-bit groups back into the dotted IPv4 address they carry. */
function _groupsToIPv4(highGroup: number, lowGroup: number): string {
  return [highGroup >> 8, highGroup & 0xff, lowGroup >> 8, lowGroup & 0xff]
    .map(String)
    .join(".");
}

/**
 * The IPv4 address an IPv6 address wraps, for every encoding a connection to
 * it could end up reaching that IPv4 address through, or `undefined` if it
 * wraps none.
 */
function _getEmbeddedIPv4(groups: readonly number[]): string | undefined {
  const [g0, g1, g2, g3, g4, g5, g6 = 0, g7 = 0] = groups;
  const isFirstFiveZero = [g0, g1, g2, g3, g4].every((group) => {
    return group === 0;
  });
  // ::ffff:0:0/96 IPv4-mapped, or ::/96 the deprecated IPv4-compatible form
  if (isFirstFiveZero && (g5 === 0xffff || g5 === 0)) {
    return _groupsToIPv4(g6, g7);
  }
  // 64:ff9b::/96 NAT64 well-known prefix
  const isNat64 =
    g0 === 0x64 &&
    g1 === 0xff9b &&
    [g2, g3, g4, g5].every((group) => {
      return group === 0;
    });
  if (isNat64) {
    return _groupsToIPv4(g6, g7);
  }
  // 2002::/16 6to4, which carries the IPv4 address in the next two groups
  if (g0 === 0x2002 && g1 !== undefined && g2 !== undefined) {
    return _groupsToIPv4(g1, g2);
  }
  return undefined;
}

function _isPrivateOrLoopbackIPv6(address: string): boolean {
  const groups = _parseIPv6Groups(address);
  if (!groups) {
    return true; // unparseable, so treat it as unsafe
  }
  const [firstGroup = 0] = groups;
  const isZeroUntilLast = groups.slice(0, 7).every((group) => {
    return group === 0;
  });
  if (isZeroUntilLast && (groups[7] === 0 || groups[7] === 1)) {
    return true; // :: unspecified, or ::1 loopback
  }
  // Checked ahead of the IPv6 ranges below so every IPv4 range above still
  // applies through any IPv6 encoding of it.
  const embeddedIPv4 = _getEmbeddedIPv4(groups);
  if (embeddedIPv4 !== undefined) {
    return _isPrivateOrLoopbackIPv4(embeddedIPv4);
  }
  if ((firstGroup & 0xfe00) === 0xfc00) {
    return true; // fc00::/7 unique local
  }
  if ((firstGroup & 0xffc0) === 0xfe80) {
    return true; // fe80::/10 link-local
  }
  if ((firstGroup & 0xffc0) === 0xfec0) {
    return true; // fec0::/10 deprecated site-local
  }
  if ((firstGroup & 0xff00) === 0xff00) {
    return true; // ff00::/8 multicast
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
 * is loopback, link-local, or a private range. Checks every **resolved**
 * address, never the input string, so a hostname whose records point at an
 * internal address is refused.
 *
 * This does not pin the address a caller then connects to: the driver
 * resolves `host` again when it opens the socket, so a record that changes
 * between this check and that connect (DNS rebinding) is not caught here.
 *
 * @param host The hostname or literal IP the user supplied in the
 *   connection form.
 * @param resolveHost Injectable for tests; defaults to a real DNS lookup
 *   via {@link getAddressesForHost}.
 */
export async function assertHostIsSafeToConnect(
  host: string,
  resolveHost: (host: string) => Promise<string[]> = getAddressesForHost,
): Promise<void> {
  const addresses = await resolveHost(host);

  const unsafeAddress = addresses.find(isPrivateOrLoopbackAddress);
  if (unsafeAddress) {
    throw new UnsafeHostError(host, unsafeAddress);
  }
}
