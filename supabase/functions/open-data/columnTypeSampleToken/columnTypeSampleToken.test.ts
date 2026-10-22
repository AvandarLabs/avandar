import {
  COLUMN_TYPE_SAMPLE_TOKEN_LIFETIME_MS,
  isColumnTypeSampleTokenValid,
  signColumnTypeSampleToken,
} from "@sbfn/open-data/columnTypeSampleToken/columnTypeSampleToken.ts";
import { describe, expect, it } from "vitest";

const SECRET = "test-secret";
const LISTING_ID = "5b89fc55-586d-485f-8526-3c7a9a1b0d90";
const NOW = Date.UTC(2026, 9, 22);
const HEADER = ["borough", "count"];

async function _token(): Promise<string> {
  return await signColumnTypeSampleToken({
    catalogListingId: LISTING_ID,
    headerNames: HEADER,
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
    headerNames: HEADER,
    secret: SECRET,
    now: NOW + 1000,
    ...overrides,
  });
}

describe("column type sample token", () => {
  it("accepts the names, listing, and secret it was signed for", async () => {
    expect(await _isValid()).toBe(true);
  });

  it.each([
    ["a missing column", { headerNames: ["borough"] }],
    ["an added column", { headerNames: [...HEADER, "extra"] }],
    ["reordered columns", { headerNames: ["count", "borough"] }],
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
        catalogListingId: LISTING_ID,
        headerNamesSha256: "0".repeat(64),
        expiresAtMs: NOW + 60_000,
      }),
    );

    expect(await _isValid({ token: `${forgedClaims}.${signature}` })).toBe(
      false,
    );
  });
});
