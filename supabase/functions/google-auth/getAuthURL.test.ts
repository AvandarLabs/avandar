import { describe, expect, it, vi } from "vitest";

/**
 * `getAuthURL` imports the edge function's `GoogleAuthClient`, whose module
 * reads `Deno.env` and imports `npm:google-auth-library@10`, neither of which
 * exists under Node. The mock substitutes a **real** `OAuth2Client` from the
 * same library at the same major version, so the URL under assertion is the one
 * the library actually builds rather than one this test formats for itself.
 */
vi.mock("@sbfn/_shared/getGoogleAuthClient.ts", async () => {
  const { OAuth2Client: RealClient } = await import("google-auth-library");
  return {
    GoogleAuthClient: new RealClient(
      "323714789211-test.apps.googleusercontent.com",
      "test-client-secret",
      "http://localhost:54321/functions/v1/google-auth-callback",
    ),
    getGoogleAuthClient: () => {
      return new RealClient();
    },
  };
});

const SPREADSHEETS_SCOPE = "https://www.googleapis.com/auth/spreadsheets";
const DRIVE_FILE_SCOPE = "https://www.googleapis.com/auth/drive.file";

async function _getRequestedParams(): Promise<URLSearchParams> {
  const { getAuthURL } = await import("@sbfn/google-auth/getAuthURL.ts");
  const { authorizeURL } = getAuthURL({
    redirectURL: "http://localhost:5173/data",
    userId: "00000000-0000-4000-8000-000000000001",
  });
  return new URL(authorizeURL).searchParams;
}

describe("getAuthURL", () => {
  it("requests exactly openid, email and drive.file", async () => {
    // Parsed off the generated URL rather than compared against a constant the
    // source also exports, so the assertion cannot follow the source anywhere
    // it goes.
    const params = await _getRequestedParams();

    expect(params.get("scope")?.split(" ")).toEqual([
      "openid",
      "email",
      DRIVE_FILE_SCOPE,
    ]);
  });

  it("does not request the Sensitive auth/spreadsheets scope", async () => {
    // The membership assertion above is this test's positive control: an empty
    // scope list would satisfy this one on its own.
    const params = await _getRequestedParams();

    expect(params.get("scope")).not.toContain(SPREADSHEETS_SCOPE);
  });

  it("still asks for offline access and re-consent", async () => {
    // Both are load-bearing. `offline` is what lets acquisition run without the
    // user present, and `consent` is what makes a re-authentication re-issue
    // the grant on the narrowed scope list instead of silently reusing the
    // old one.
    const params = await _getRequestedParams();

    expect(params.get("access_type")).toBe("offline");
    expect(params.get("prompt")).toBe("consent");
  });

  it("round-trips the callback state", async () => {
    const params = await _getRequestedParams();

    expect(JSON.parse(params.get("state") ?? "{}")).toEqual({
      redirectURL: "http://localhost:5173/data",
      userId: "00000000-0000-4000-8000-000000000001",
    });
  });
});
