import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { prop, valEq } from "@avandar/utils";

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

function _isPrivateOrLoopbackIpv4(address: string): boolean {
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
 * Rewrites a trailing dotted IPv4 address (`::ffff:127.0.0.1`) as the two hex
 * groups it occupies (`::ffff:7f00:1`), or returns the text unchanged when it
 * has none.
 */
function _rewriteDottedIpv4AsHexGroups(addressText: string): string {
  const dottedIpv4 = /(\d+)\.(\d+)\.(\d+)\.(\d+)$/.exec(addressText);
  if (!dottedIpv4) {
    return addressText;
  }
  const [firstOctet = 0, secondOctet = 0, thirdOctet = 0, fourthOctet = 0] =
    dottedIpv4.slice(1).map(Number);
  const highGroup = (firstOctet << 8) | secondOctet;
  const lowGroup = (thirdOctet << 8) | fourthOctet;
  return `${addressText.slice(0, dottedIpv4.index)}${highGroup.toString(16)}:${lowGroup.toString(16)}`;
}

/**
 * Expands any valid IPv6 spelling into its eight 16-bit groups, so the range
 * checks below compare numbers rather than one of the many equivalent ways to
 * write the same address (`::1`, `0::1`, `0:0:0:0:0:0:0:1`, or an embedded
 * IPv4 address written as hex or as dotted decimal). Returns `undefined` for
 * anything it cannot parse.
 */
function _parseIpv6Groups(address: string): number[] | undefined {
  // A zone id (`fe80::1%eth0`) names a local interface, not part of the
  // address itself.
  const [withoutZone = ""] = address.split("%");
  const hexText = _rewriteDottedIpv4AsHexGroups(withoutZone.toLowerCase());

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
function _groupsToIpv4(highGroup: number, lowGroup: number): string {
  return [highGroup >> 8, highGroup & 0xff, lowGroup >> 8, lowGroup & 0xff]
    .map(String)
    .join(".");
}

/**
 * The IPv4 address an IPv6 address carries in one of these encodings, or
 * `undefined` if it carries none: IPv4-mapped (`::ffff:0:0/96`),
 * IPv4-translated (`::ffff:0:0:0/96`), the deprecated IPv4-compatible form
 * (`::/96`), the well-known NAT64 prefix (`64:ff9b::/96`), and 6to4
 * (`2002::/16`).
 */
function _getEmbeddedIpv4(groups: readonly number[]): string | undefined {
  const [firstGroup = 0, secondGroup = 0, thirdGroup = 0] = groups;
  const [fifthGroup, sixthGroup, highGroup = 0, lowGroup = 0] = groups.slice(4);
  const isMappedOrCompatible =
    groups.slice(0, 5).every(valEq(0)) &&
    (sixthGroup === 0xffff || sixthGroup === 0);
  const isTranslated =
    groups.slice(0, 4).every(valEq(0)) &&
    fifthGroup === 0xffff &&
    sixthGroup === 0;
  const isNat64 =
    firstGroup === 0x64 &&
    secondGroup === 0xff9b &&
    groups.slice(2, 6).every(valEq(0));
  const is6to4 = firstGroup === 0x2002;

  return isMappedOrCompatible || isTranslated || isNat64
    ? _groupsToIpv4(highGroup, lowGroup)
    : is6to4
      ? _groupsToIpv4(secondGroup, thirdGroup)
      : undefined;
}

function _isPrivateOrLoopbackIpv6(address: string): boolean {
  const groups = _parseIpv6Groups(address);
  if (!groups) {
    return true; // unparseable, so treat it as unsafe
  }
  const [firstGroup = 0, secondGroup = 0, thirdGroup = 0] = groups;
  const isZeroUntilLast = groups.slice(0, 7).every(valEq(0));
  if (isZeroUntilLast && (groups[7] === 0 || groups[7] === 1)) {
    return true; // :: unspecified, or ::1 loopback
  }
  // Checked ahead of the IPv6 ranges below so every IPv4 range above still
  // applies through each encoding `_getEmbeddedIpv4` recognizes.
  const embeddedIpv4 = _getEmbeddedIpv4(groups);
  if (embeddedIpv4 !== undefined) {
    return _isPrivateOrLoopbackIpv4(embeddedIpv4);
  }
  if (firstGroup === 0x64 && secondGroup === 0xff9b && thirdGroup === 1) {
    // 64:ff9b:1::/48 local-use NAT64, which only translates into an
    // operator's own network
    return true;
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
    return _isPrivateOrLoopbackIpv4(address);
  }
  if (ipVersion === 6) {
    return _isPrivateOrLoopbackIpv6(address);
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
