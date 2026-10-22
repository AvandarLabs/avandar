/** How long a sample's token stays valid for writing types back. */
export const COLUMN_TYPE_SAMPLE_TOKEN_LIFETIME_MS = 15 * 60 * 1000;

/**
 * Keeps this token's key separate from every other use of the secret it is
 * derived from.
 */
const KEY_PURPOSE = "avandar:open-data:column-type-sample-token:v1";

/** What a token vouches for: one listing's sample header, until a time. */
type _TokenClaims = Readonly<{
  catalogListingId: string;
  headerNamesSha256: string;
  expiresAtMs: number;
}>;

function _toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function _fromBase64Url(text: string): Uint8Array<ArrayBuffer> {
  const base64 = text.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, "="));
  return Uint8Array.from(binary, (character) => {
    return character.charCodeAt(0);
  });
}

async function _importKey(secret: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const secretKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const derivedKey = await crypto.subtle.sign(
    "HMAC",
    secretKey,
    encoder.encode(KEY_PURPOSE),
  );
  return await crypto.subtle.importKey(
    "raw",
    derivedKey,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

/**
 * The SHA-256 of a header's names, in order, as hex. Two headers hash the
 * same only when they hold the same names in the same order.
 */
export async function hashHeaderNames(
  headerNames: readonly string[],
): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(JSON.stringify(headerNames)),
  );
  return [...new Uint8Array(digest)]
    .map((byte) => {
      return byte.toString(16).padStart(2, "0");
    })
    .join("");
}

/**
 * Signs a token that vouches for the header of a sample this function
 * served, so a later write-back can be checked against the real column
 * names rather than whatever the browser sends.
 *
 * @param args.secret - The secret the signing key is derived from.
 * @param args.now - The current time, in milliseconds.
 * @returns `<claims>.<signature>`, both base64url.
 */
export async function signColumnTypeSampleToken(args: {
  catalogListingId: string;
  headerNames: readonly string[];
  secret: string;
  now: number;
}): Promise<string> {
  const claims: _TokenClaims = {
    catalogListingId: args.catalogListingId,
    headerNamesSha256: await hashHeaderNames(args.headerNames),
    expiresAtMs: args.now + COLUMN_TYPE_SAMPLE_TOKEN_LIFETIME_MS,
  };
  const encodedClaims = _toBase64Url(
    new TextEncoder().encode(JSON.stringify(claims)),
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    await _importKey(args.secret),
    new TextEncoder().encode(encodedClaims),
  );
  return `${encodedClaims}.${_toBase64Url(new Uint8Array(signature))}`;
}

/**
 * Whether a token this function signed vouches for these column names on
 * this listing, and has not expired.
 *
 * @param args.token - The token, as `signColumnTypeSampleToken` made it.
 * @param args.headerNames - The names the caller claims, in order.
 * @param args.now - The current time, in milliseconds.
 */
export async function isColumnTypeSampleTokenValid(args: {
  token: string;
  catalogListingId: string;
  headerNames: readonly string[];
  secret: string;
  now: number;
}): Promise<boolean> {
  const [encodedClaims, encodedSignature, ...rest] = args.token.split(".");
  if (
    encodedClaims === undefined ||
    encodedSignature === undefined ||
    rest.length > 0
  ) {
    return false;
  }
  try {
    const isSigned = await crypto.subtle.verify(
      "HMAC",
      await _importKey(args.secret),
      _fromBase64Url(encodedSignature),
      new TextEncoder().encode(encodedClaims),
    );
    if (!isSigned) {
      return false;
    }
    const claims = JSON.parse(
      new TextDecoder().decode(_fromBase64Url(encodedClaims)),
    ) as _TokenClaims;
    return (
      claims.catalogListingId === args.catalogListingId &&
      claims.expiresAtMs > args.now &&
      claims.headerNamesSha256 === (await hashHeaderNames(args.headerNames))
    );
  } catch {
    return false;
  }
}
