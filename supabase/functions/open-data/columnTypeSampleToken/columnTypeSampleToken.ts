/** How long a sample's token stays valid for writing types back. */
export const COLUMN_TYPE_SAMPLE_TOKEN_LIFETIME_MS = 15 * 60 * 1000;

/**
 * Keeps this token's key separate from every other use of the secret it is
 * derived from.
 */
const KEY_PURPOSE = "avandar:open-data:column-type-sample-token:v2";

/**
 * What a token vouches for: that this function served the caller a sample
 * of one listing, until a time.
 */
type _TokenClaims = Readonly<{
  catalogListingId: string;
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
 * Signs a token that vouches for a sample of a listing this function
 * served, so a later write-back, or a report that the sample could not be
 * parsed, comes from a caller who read one recently. It does not vouch for
 * column names: the app's DuckDB finds those, and this function never parses
 * the sample.
 *
 * @param args.secret - The secret the signing key is derived from.
 * @param args.now - The current time, in milliseconds.
 * @returns `<claims>.<signature>`, both base64url.
 */
export async function signColumnTypeSampleToken(args: {
  catalogListingId: string;
  secret: string;
  now: number;
}): Promise<string> {
  const claims: _TokenClaims = {
    catalogListingId: args.catalogListingId,
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
 * Whether a token this function signed vouches for a sample of this
 * listing, and has not expired.
 *
 * @param args.token - The token, as `signColumnTypeSampleToken` made it.
 * @param args.now - The current time, in milliseconds.
 */
export async function isColumnTypeSampleTokenValid(args: {
  token: string;
  catalogListingId: string;
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
      claims.expiresAtMs > args.now
    );
  } catch {
    return false;
  }
}
