/** How long a sample's token stays valid for writing types back. */
export const COLUMN_TYPE_SAMPLE_TOKEN_LIFETIME_MS = 15 * 60 * 1000;

/**
 * Keeps this token's key separate from every other use of the secret it is
 * derived from.
 */
const KEY_PURPOSE = "avandar:open-data:column-type-sample-token:v2";

/**
 * What a token vouches for: that this function served the caller a sample
 * of one listing, until a time. A sample that held the whole source also
 * carries its text's hash, so the caller can hand that text back to be
 * copied without it being trusted.
 */
type _TokenClaims = Readonly<{
  catalogListingId: string;
  expiresAtMs: number;
  completeSampleSha256?: string;
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
 * The SHA-256 of a sample's text, as lowercase hex. The text is hashed as
 * UTF-8, the form a browser reads the sample back as, so the hash of what
 * the browser sends matches the hash of what was served.
 *
 * @param csvText - The sample, as text.
 */
export async function buildCompleteSampleSha256(
  csvText: string,
): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(csvText),
  );
  return Array.from(new Uint8Array(digest), (byte) => {
    return byte.toString(16).padStart(2, "0");
  }).join("");
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
 * @param args.completeSampleSha256 - The sample's hash, from
 *   `buildCompleteSampleSha256`, when the sample is the whole source.
 * @returns `<claims>.<signature>`, both base64url.
 */
export async function signColumnTypeSampleToken(args: {
  catalogListingId: string;
  secret: string;
  now: number;
  completeSampleSha256?: string;
}): Promise<string> {
  const claims: _TokenClaims = {
    catalogListingId: args.catalogListingId,
    expiresAtMs: args.now + COLUMN_TYPE_SAMPLE_TOKEN_LIFETIME_MS,
    ...(args.completeSampleSha256 === undefined
      ? {}
      : { completeSampleSha256: args.completeSampleSha256 }),
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

type _TokenCheck = {
  token: string;
  catalogListingId: string;
  secret: string;
  now: number;
};

/** A token's claims, when it is signed, unexpired, and for this listing. */
async function _readValidClaims(
  args: _TokenCheck,
): Promise<_TokenClaims | undefined> {
  const [encodedClaims, encodedSignature, ...rest] = args.token.split(".");
  if (
    encodedClaims === undefined ||
    encodedSignature === undefined ||
    rest.length > 0
  ) {
    return undefined;
  }
  try {
    const isSigned = await crypto.subtle.verify(
      "HMAC",
      await _importKey(args.secret),
      _fromBase64Url(encodedSignature),
      new TextEncoder().encode(encodedClaims),
    );
    if (!isSigned) {
      return undefined;
    }
    const claims = JSON.parse(
      new TextDecoder().decode(_fromBase64Url(encodedClaims)),
    ) as _TokenClaims;
    return claims.catalogListingId === args.catalogListingId &&
      claims.expiresAtMs > args.now
      ? claims
      : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Whether a token this function signed vouches for a sample of this
 * listing, and has not expired.
 *
 * @param args.token - The token, as `signColumnTypeSampleToken` made it.
 * @param args.now - The current time, in milliseconds.
 */
export async function isColumnTypeSampleTokenValid(
  args: _TokenCheck,
): Promise<boolean> {
  return (await _readValidClaims(args)) !== undefined;
}

/**
 * The hash of the complete sample a valid token vouches for, or nothing when
 * the token is not valid for this listing or its sample was not the whole
 * source.
 *
 * @param args.token - The token, as `signColumnTypeSampleToken` made it.
 * @param args.now - The current time, in milliseconds.
 */
export async function readCompleteSampleSha256(
  args: _TokenCheck,
): Promise<string | undefined> {
  return (await _readValidClaims(args))?.completeSampleSha256;
}

/**
 * Whether a valid token vouches for this exact text as a complete sample of
 * the listing: the token says the sample was the whole source, and the text
 * hashes to what was served. A caller can then hand the text back to be
 * copied without the text being trusted.
 *
 * @param args.csvText - The sample text the caller handed back.
 */
export async function isCompleteSampleVouchedFor(
  args: _TokenCheck & { csvText: string },
): Promise<boolean> {
  const servedSha256 = await readCompleteSampleSha256(args);
  return (
    servedSha256 !== undefined &&
    servedSha256 === (await buildCompleteSampleSha256(args.csvText))
  );
}
