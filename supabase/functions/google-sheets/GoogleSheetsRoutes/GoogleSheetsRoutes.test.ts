import { AvaHTTPError } from "@sbfn/_shared/AvaHTTPError.ts";
import { afterEach, describe, expect, it, vi, type Mock } from "vitest";

vi.mock("@sbfn/_shared/MiniServer/MiniServer.ts", () => {
  return {
    defineRoutes: (functionName: string, routes: Record<string, unknown>) => {
      return { [functionName]: routes };
    },
    GET: () => {
      return {
        action: (action: unknown) => {
          return { state: { action } };
        },
      };
    },
  };
});

// The legacy `/:id` route's Google client reads `Deno.env` at import and
// pulls in `npm:` packages that do not exist under Node. The dataset routes
// use neither.
vi.mock("@sbfn/_shared/getGoogleAuthClient.ts", () => {
  return { getGoogleAuthClient: vi.fn() };
});
vi.mock("@sbfn/google-auth/getGoogleTokens.ts", () => {
  return { getGoogleTokens: vi.fn() };
});
vi.mock("googleapis", () => {
  return { google: {} };
});

const { GoogleSheetsRoutes } =
  await import("@sbfn/google-sheets/GoogleSheetsRoutes/GoogleSheetsRoutes.ts");

const DATASET_ID = "11111111-1111-4111-8111-111111111111";
const OWNER_USER_ID = "22222222-2222-4222-8222-222222222222";
const VIEWER_USER_ID = "33333333-3333-4333-8333-333333333333";
const OWNER_GOOGLE_ACCOUNT_ID = "108374652910384756291";

type DatasetRoutePath =
  | "/datasets/:datasetId/csv"
  | "/datasets/:datasetId/version";

type Scenario = {
  /** Whether the caller may see the dataset. */
  maySelect: boolean;
  /** Who is calling: the account that added the sheet, or anyone else. */
  callerUserId: string;
  sheetName: string | null;
  tokenExpiresInMs: number;
  refreshTokenStatus: number;
};

const DEFAULT_SCENARIO: Scenario = {
  maySelect: true,
  callerUserId: VIEWER_USER_ID,
  sheetName: "Kenya",
  tokenExpiresInMs: 60 * 60 * 1000,
  refreshTokenStatus: 200,
};

/** A fake query builder, as much of one as the dataset routes call. */
type FakeQuery = {
  select: Mock;
  update: Mock;
  eq: Mock;
  maybeSingle: Mock;
};

/** The fake service-role client, and what the routes asked it for. */
type AdminClientFake = {
  queriedTables: string[];
  filters: Array<[string, unknown]>;
  tokenQuery: FakeQuery;
  client: { from: Mock };
};

/** The fake Google transport, and the bearer token each request carried. */
type GoogleFetchFake = {
  bearerTokens: string[];
  googleFetch: Mock;
};

/** Everything one route test needs to call a route and inspect its fakes. */
type RouteTestSetup = {
  adminClientFake: AdminClientFake;
  googleFetchFake: GoogleFetchFake;
  supabaseClient: { rpc: Mock };
  callRoute: (path: DatasetRoutePath) => Promise<Response>;
};

/** A query builder whose `maybeSingle` answers with `row`. */
function _makeQuery(
  options: Readonly<{ row: unknown; filters: Array<[string, unknown]> }>,
): FakeQuery {
  const query: FakeQuery = {
    select: vi.fn(() => {
      return query;
    }),
    update: vi.fn(() => {
      return query;
    }),
    eq: vi.fn((column: string, value: unknown) => {
      options.filters.push([column, value]);
      return Object.assign(query, {
        then: (resolve: (result: unknown) => void) => {
          resolve({ error: null });
        },
      });
    }),
    maybeSingle: vi.fn(async () => {
      return { data: options.row, error: null };
    }),
  };
  return query;
}

function _makeAdminClient(scenario: Scenario): AdminClientFake {
  const queriedTables: string[] = [];
  const filters: Array<[string, unknown]> = [];
  const tokenQuery = _makeQuery({
    row: {
      access_token: "ya29.owner",
      refresh_token: "1//owner-refresh",
      expiry_date: new Date(
        Date.now() + scenario.tokenExpiresInMs,
      ).toISOString(),
      user_id: OWNER_USER_ID,
    },
    filters,
  });
  const sourceQuery = _makeQuery({
    row: {
      google_account_id: OWNER_GOOGLE_ACCOUNT_ID,
      google_document_id: "1sheetFileId",
      sheet_name: scenario.sheetName,
    },
    filters,
  });
  return {
    queriedTables,
    filters,
    tokenQuery,
    client: {
      from: vi.fn((table: string) => {
        queriedTables.push(table);
        return table === "tokens__google" ? tokenQuery : sourceQuery;
      }),
    },
  };
}

/**
 * Answers Google's token endpoint, tab list, version read and tab export,
 * recording the bearer token each Sheets or Drive request carried.
 */
function _makeGoogleFetch(scenario: Scenario): GoogleFetchFake {
  const bearerTokens: string[] = [];
  const googleFetch = vi.fn(async (url: string, init?: RequestInit) => {
    if (url.startsWith("https://oauth2.googleapis.com/token")) {
      return scenario.refreshTokenStatus === 200
        ? Response.json({ access_token: "ya29.refreshed", expires_in: 3600 })
        : Response.json({ error: "invalid_grant" }, { status: 400 });
    }
    const headers = new Headers(init?.headers);
    bearerTokens.push(headers.get("Authorization") ?? "");
    if (url.includes("sheets.googleapis.com")) {
      return Response.json({
        sheets: [
          { properties: { sheetId: 0, title: "Colombia", index: 0 } },
          { properties: { sheetId: 77, title: "Kenya", index: 1 } },
        ],
      });
    }
    if (url.includes("fields=version")) {
      return Response.json({ version: "42" });
    }
    const gid = new URL(url).searchParams.get("gid") ?? "0";
    return new Response(`city\r\ntab-${gid}\r\n`, { status: 200 });
  });
  return { bearerTokens, googleFetch };
}

function _setUp(overrides: Partial<Scenario> = {}): RouteTestSetup {
  const scenario = { ...DEFAULT_SCENARIO, ...overrides };
  const adminClientFake = _makeAdminClient(scenario);
  const googleFetchFake = _makeGoogleFetch(scenario);
  vi.stubGlobal("fetch", googleFetchFake.googleFetch);
  vi.stubGlobal("Deno", {
    env: {
      get: (name: string) => {
        return `test-${name}`;
      },
    },
  });
  const supabaseClient = {
    rpc: vi.fn(async () => {
      return { data: scenario.maySelect, error: null };
    }),
  };
  const callRoute = (path: DatasetRoutePath): Promise<Response> => {
    return Promise.resolve(
      GoogleSheetsRoutes["google-sheets"][path].GET.state.action({
        pathParams: { datasetId: DATASET_ID },
        supabaseClient,
        supabaseAdminClient: adminClientFake.client,
        user: { id: scenario.callerUserId },
        // The fake clients and user cover only what these routes read.
      } as never),
    );
  };
  return { adminClientFake, googleFetchFake, supabaseClient, callRoute };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("google-sheets dataset routes", () => {
  it.each<DatasetRoutePath>([
    "/datasets/:datasetId/csv",
    "/datasets/:datasetId/version",
  ])(
    "refuses a caller who may not see the dataset on %s, before reading its source or any token",
    async (path) => {
      const { adminClientFake, supabaseClient, callRoute } = _setUp({
        maySelect: false,
      });

      const result = callRoute(path);

      await expect(result).rejects.toBeInstanceOf(AvaHTTPError);
      await expect(result).rejects.toHaveProperty("httpCode", 403);
      expect(supabaseClient.rpc).toHaveBeenCalledWith(
        "util__auth_user_may_select_dataset",
        { p_dataset_id: DATASET_ID },
      );
      expect(adminClientFake.queriedTables).toEqual([]);
    },
  );

  it("returns the stored tab as CSV, read with the token of the account that added the sheet", async () => {
    const { adminClientFake, googleFetchFake, callRoute } = _setUp();

    const response = await callRoute("/datasets/:datasetId/csv");

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("text/csv");
    expect(response.headers.get("X-Ava-Source-Version")).toBe("42");
    expect(response.headers.get("Access-Control-Expose-Headers")).toContain(
      "X-Ava-Source-Version",
    );
    await expect(response.text()).resolves.toBe("city\r\ntab-77\r\n");
    expect(adminClientFake.filters).toContainEqual([
      "google_account_id",
      OWNER_GOOGLE_ACCOUNT_ID,
    ]);
    expect(new Set(googleFetchFake.bearerTokens)).toEqual(
      new Set(["Bearer ya29.owner"]),
    );
  });

  it("refreshes the owner's token when it is about to expire, and stores the new one", async () => {
    const { adminClientFake, googleFetchFake, callRoute } = _setUp({
      tokenExpiresInMs: 60 * 1000,
    });

    const response = await callRoute("/datasets/:datasetId/csv");

    expect(response.status).toBe(200);
    expect(new Set(googleFetchFake.bearerTokens)).toEqual(
      new Set(["Bearer ya29.refreshed"]),
    );
    expect(adminClientFake.tokenQuery.update).toHaveBeenCalledWith(
      expect.objectContaining({ access_token: "ya29.refreshed" }),
    );
  });

  it("tells anyone but the owner that the owner must reconnect when Google refuses to refresh the token", async () => {
    const { googleFetchFake, callRoute } = _setUp({
      callerUserId: VIEWER_USER_ID,
      tokenExpiresInMs: 60 * 1000,
      refreshTokenStatus: 400,
    });

    const response = await callRoute("/datasets/:datasetId/csv");

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "owner-reconnect-required" },
    });
    expect(googleFetchFake.bearerTokens).toEqual([]);
  });

  it("tells the owner their own Google connection expired when Google refuses to refresh their token", async () => {
    const { callRoute } = _setUp({
      callerUserId: OWNER_USER_ID,
      tokenExpiresInMs: 60 * 1000,
      refreshTokenStatus: 400,
    });

    const response = await callRoute("/datasets/:datasetId/csv");

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "google-auth-expired" },
    });
  });

  it("names the stored tab when it is no longer in the workbook", async () => {
    const { callRoute } = _setUp({ sheetName: "Renamed away" });

    const response = await callRoute("/datasets/:datasetId/csv");

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "sheet-not-found", reason: "Renamed away" },
    });
  });

  it("reports the sheet's version on the version route", async () => {
    const { callRoute } = _setUp();

    const response = await callRoute("/datasets/:datasetId/version");

    await expect(response.json()).resolves.toEqual({ sourceVersion: "42" });
  });
});
