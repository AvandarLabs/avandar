import { runGoogleTokenGet } from "@ava-cli/SupabaseCLI/GoogleTokenCLI/GoogleTokenGetCLI/GoogleTokenGetCLI";
import { Acclimate } from "@avandar/acclimate";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const DRIVE_FILE_SCOPE =
  "openid email https://www.googleapis.com/auth/drive.file";

type FetchInit = Readonly<{ headers?: Record<string, string> }> | undefined;

type TokenRow = Readonly<{
  refresh_token: string;
  google_email: string;
  scope: string;
  expiry_date: string;
  updated_at: string;
}>;

function _makeRow(overrides: Partial<TokenRow> = {}): TokenRow {
  return {
    refresh_token: "1//refresh-token-value",
    google_email: "pablo@avandarlabs.com",
    scope: DRIVE_FILE_SCOPE,
    expiry_date: "2026-08-26T12:00:00.000Z",
    updated_at: "2026-08-26T11:00:00.000Z",
    ...overrides,
  };
}

function _mockFetchReturning(
  rows: readonly TokenRow[],
): ReturnType<typeof vi.fn> {
  const fetchMock = vi.fn((_input: string, _init?: FetchInit) => {
    return Promise.resolve({
      ok: true,
      status: 200,
      json: () => {
        return Promise.resolve(rows);
      },
      text: () => {
        return Promise.resolve(JSON.stringify(rows));
      },
    } as unknown as Response);
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function _getCombinedLogs(): string {
  const logCalls = (Acclimate.log as unknown as { mock: { calls: unknown[] } })
    .mock.calls;
  return logCalls.flat().join("\n");
}

function _getRequestedUrl(fetchMock: ReturnType<typeof vi.fn>): string {
  return String((fetchMock.mock.calls[0] as unknown[])[0]);
}

const LOCAL_OPTIONS = {
  email: "pablo@avandarlabs.com",
  staging: false,
  prod: false,
  raw: false,
} as const;

describe("runGoogleTokenGet", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.VITE_SUPABASE_API_URL = "http://127.0.0.1:54321";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "sb_secret_test";
    vi.spyOn(Acclimate, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("prints the refresh token and the account it belongs to", async () => {
    _mockFetchReturning([_makeRow()]);

    await runGoogleTokenGet({ ...LOCAL_OPTIONS });

    const logs = _getCombinedLogs();
    expect(logs).toContain("1//refresh-token-value");
    expect(logs).toContain("pablo@avandarlabs.com");
  });

  it("queries tokens__google by google_email, newest first", async () => {
    const fetchMock = _mockFetchReturning([_makeRow()]);

    await runGoogleTokenGet({ ...LOCAL_OPTIONS });

    const url = _getRequestedUrl(fetchMock);
    expect(url).toContain("/rest/v1/tokens__google");
    expect(url).toContain("google_email=eq.pablo%40avandarlabs.com");
    expect(url).toContain("order=updated_at.desc");
  });

  it("authenticates with the service-role key on both headers", async () => {
    const fetchMock = _mockFetchReturning([_makeRow()]);

    await runGoogleTokenGet({ ...LOCAL_OPTIONS });

    const init = (fetchMock.mock.calls[0] as unknown[])[1] as {
      headers: Record<string, string>;
    };
    expect(init.headers.apikey).toBe("sb_secret_test");
    expect(init.headers.Authorization).toBe("Bearer sb_secret_test");
  });

  // The point of --raw is `E2E_GOOGLE_REFRESH_TOKEN=$(ava ... --raw)`, so
  // anything else on stdout lands inside the variable.
  it("prints nothing but the token in raw mode", async () => {
    _mockFetchReturning([_makeRow()]);

    await runGoogleTokenGet({ ...LOCAL_OPTIONS, raw: true });

    expect(_getCombinedLogs()).toBe("1//refresh-token-value");
  });

  it("reports the most recent row and says how many matched", async () => {
    _mockFetchReturning([
      _makeRow({ refresh_token: "1//newest" }),
      _makeRow({ refresh_token: "1//older" }),
    ]);

    await runGoogleTokenGet({ ...LOCAL_OPTIONS });

    const logs = _getCombinedLogs();
    expect(logs).toContain("1//newest");
    expect(logs).toContain("2 rows match");
  });

  it("warns when the stored token still carries auth/spreadsheets", async () => {
    _mockFetchReturning([
      _makeRow({
        scope: `${DRIVE_FILE_SCOPE} https://www.googleapis.com/auth/spreadsheets`,
      }),
    ]);

    await runGoogleTokenGet({ ...LOCAL_OPTIONS });

    expect(_getCombinedLogs()).toContain("auth/spreadsheets");
  });

  it("does not warn about scope for a drive.file-only token", async () => {
    _mockFetchReturning([_makeRow()]);

    await runGoogleTokenGet({ ...LOCAL_OPTIONS });

    expect(_getCombinedLogs()).not.toContain(
      "Sensitive auth/spreadsheets scope",
    );
  });

  it("tells the user to connect in the app when no row exists", async () => {
    _mockFetchReturning([]);

    await expect(runGoogleTokenGet({ ...LOCAL_OPTIONS })).rejects.toThrow(
      /No tokens__google row/,
    );
    const logs = _getCombinedLogs();
    expect(logs).toContain("Connect to Google Sheets");
    // A missing row is an ordinary outcome, so it must not also be reported as
    // a failure of the command itself.
    expect(logs).not.toContain("Failed to read the Google refresh token");
  });

  it("rejects --staging and --prod together, before any request", async () => {
    const fetchMock = _mockFetchReturning([_makeRow()]);

    await expect(
      runGoogleTokenGet({ ...LOCAL_OPTIONS, staging: true, prod: true }),
    ).rejects.toThrow(/at most one of --staging and --prod/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("names the missing variable and its file", async () => {
    delete process.env.VITE_SUPABASE_API_URL;
    _mockFetchReturning([_makeRow()]);

    await expect(runGoogleTokenGet({ ...LOCAL_OPTIONS })).rejects.toThrow(
      /VITE_SUPABASE_API_URL is not set in \.env\.development/,
    );
  });

  it("surfaces a failed Supabase response rather than a parse error", async () => {
    const fetchMock = vi.fn(() => {
      return Promise.resolve({
        ok: false,
        status: 401,
        text: () => {
          return Promise.resolve('{"message":"Invalid API key"}');
        },
      } as unknown as Response);
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(runGoogleTokenGet({ ...LOCAL_OPTIONS })).rejects.toThrow(
      /Supabase answered 401/,
    );
  });

  it("trims a trailing slash off the API URL", async () => {
    process.env.VITE_SUPABASE_API_URL = "http://127.0.0.1:54321/";
    const fetchMock = _mockFetchReturning([_makeRow()]);

    await runGoogleTokenGet({ ...LOCAL_OPTIONS });

    expect(_getRequestedUrl(fetchMock)).toContain(
      "http://127.0.0.1:54321/rest/v1/tokens__google",
    );
  });
});
