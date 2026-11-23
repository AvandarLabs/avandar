import {
  buildCompleteSampleSha256,
  COLUMN_TYPE_SAMPLE_TOKEN_LIFETIME_MS,
  isColumnTypeSampleTokenValid,
  isCompleteSampleVouchedFor,
  readCompleteSampleSha256,
  signColumnTypeSampleToken,
} from "@sbfn/open-data/columnTypeSampleToken/columnTypeSampleToken.ts";
import { describe, expect, it } from "vitest";

const SECRET = "test-secret";
const LISTING_ID = "5b89fc55-586d-485f-8526-3c7a9a1b0d90";
const NOW = Date.UTC(2026, 9, 22);

async function _token(): Promise<string> {
  return await signColumnTypeSampleToken({
    catalogListingId: LISTING_ID,
    secret: SECRET,
    now: NOW,
  });
}

async function _isValid(
  overrides: Partial<Parameters<typeof isColumnTypeSampleTokenValid>[0]> = {},
): Promise<boolean> {
  return await isColumnTypeSampleTokenValid({
    token: await _token(),
    catalogListingId: LISTING_ID,
    secret: SECRET,
    now: NOW + 1000,
    ...overrides,
  });
}

describe("column type sample token", () => {
  it("accepts the listing and secret it was signed for", async () => {
    expect(await _isValid()).toBe(true);
  });

  it.each([
    [
      "another listing",
      { catalogListingId: "6b89fc55-586d-485f-8526-3c7a9a1b0d90" },
    ],
    ["another secret", { secret: "other-secret" }],
    ["an expired token", { now: NOW + COLUMN_TYPE_SAMPLE_TOKEN_LIFETIME_MS }],
    ["a malformed token", { token: "not-a-token" }],
  ])("refuses %s", async (_label, overrides) => {
    expect(await _isValid(overrides)).toBe(false);
  });

  it("refuses a token whose claims were edited", async () => {
    const [, signature] = (await _token()).split(".");
    const forgedClaims = btoa(
      JSON.stringify({
        catalogListingId: "6b89fc55-586d-485f-8526-3c7a9a1b0d90",
        expiresAtMs: NOW + 60_000,
      }),
    );

    expect(await _isValid({ token: `${forgedClaims}.${signature}` })).toBe(
      false,
    );
  });
});

describe("complete sample hash", () => {
  async function _readHash(
    signedHash: string | undefined,
    overrides: Partial<Parameters<typeof readCompleteSampleSha256>[0]> = {},
  ): Promise<string | undefined> {
    const token = await signColumnTypeSampleToken({
      catalogListingId: LISTING_ID,
      secret: SECRET,
      now: NOW,
      completeSampleSha256: signedHash,
    });
    return await readCompleteSampleSha256({
      token,
      catalogListingId: LISTING_ID,
      secret: SECRET,
      now: NOW + 1000,
      ...overrides,
    });
  }

  it("reads back the hash a complete sample's token was signed with", async () => {
    const hash = await buildCompleteSampleSha256("borocode\n1\n");

    expect(await _readHash(hash)).toBe(hash);
  });

  it("reads no hash from a token for an incomplete sample", async () => {
    expect(await _readHash(undefined)).toBeUndefined();
  });

  it("reads no hash from a token that is not valid for the listing", async () => {
    const hash = await buildCompleteSampleSha256("borocode\n1\n");

    expect(
      await _readHash(hash, {
        catalogListingId: "6b89fc55-586d-485f-8526-3c7a9a1b0d90",
      }),
    ).toBeUndefined();
  });

  it("still accepts a complete sample's token for a column type write-back", async () => {
    const token = await signColumnTypeSampleToken({
      catalogListingId: LISTING_ID,
      secret: SECRET,
      now: NOW,
      completeSampleSha256: await buildCompleteSampleSha256("a\n1\n"),
    });

    expect(await _isValid({ token })).toBe(true);
  });

  it("hashes different text differently", async () => {
    expect(await buildCompleteSampleSha256("a\n1\n")).not.toBe(
      await buildCompleteSampleSha256("a\n2\n"),
    );
  });
});

describe("isCompleteSampleVouchedFor", () => {
  const CSV_TEXT = "borocode,boroname\n1,Manhattan\n";

  async function _isVouchedFor(args: {
    signedText: string | undefined;
    csvText: string;
  }): Promise<boolean> {
    const token = await signColumnTypeSampleToken({
      catalogListingId: LISTING_ID,
      secret: SECRET,
      now: NOW,
      completeSampleSha256:
        args.signedText === undefined
          ? undefined
          : await buildCompleteSampleSha256(args.signedText),
    });
    return await isCompleteSampleVouchedFor({
      token,
      csvText: args.csvText,
      catalogListingId: LISTING_ID,
      secret: SECRET,
      now: NOW + 1000,
    });
  }

  it("vouches for the exact complete sample the token was signed for", async () => {
    expect(
      await _isVouchedFor({ signedText: CSV_TEXT, csvText: CSV_TEXT }),
    ).toBe(true);
  });

  it("refuses a sample that was changed after it was served", async () => {
    expect(
      await _isVouchedFor({
        signedText: CSV_TEXT,
        csvText: CSV_TEXT.replace("Manhattan", "Atlantis"),
      }),
    ).toBe(false);
  });

  it("refuses a sample whose token says it was not the whole source", async () => {
    expect(
      await _isVouchedFor({ signedText: undefined, csvText: CSV_TEXT }),
    ).toBe(false);
  });
});
