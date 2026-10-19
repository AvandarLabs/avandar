import { AvaEnv } from "@ava-cli/AvaEnv/AvaEnv";
import { resetPipelineCommand } from "@ava-cli/PipelineCli/ResetPipelineCli/ResetPipelineCli";
import {
  promptForInUseListingsChoice,
  promptToConfirmReset,
} from "@ava-cli/PipelineCli/ResetPipelineCli/resetPipelinePrompts";
import { Acclimate } from "@avandar/acclimate";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@ava-cli/PipelineCli/ResetPipelineCli/resetPipelinePrompts", () => {
  return {
    promptToConfirmReset: vi.fn(async () => {
      return true;
    }),
    promptForInUseListingsChoice: vi.fn(async () => {
      return "keep";
    }),
  };
});

const API_URL = "http://127.0.0.1:54321";

type InUseRow = Readonly<{
  catalog_listing_id: string;
  dataset_id: string;
  workspace_id: string;
}>;

type RecordedRequest = Readonly<{
  method: string;
  table: string;
  params: URLSearchParams;
}>;

/**
 * Stubs `fetch` as a tiny PostgREST: a HEAD on `data_catalog_listings`
 * reports `listingCount`, a GET on `datasets__open_data` returns `inUseRows`,
 * and every DELETE succeeds. Returns the requests in the order they were made.
 */
function _mockPostgrest(options: {
  listingCount: number;
  inUseRows?: readonly InUseRow[];
}): RecordedRequest[] {
  const requests: RecordedRequest[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string, init?: { method?: string }) => {
      const url = new URL(input);
      const method = init?.method ?? "GET";
      const table = url.pathname.replace("/rest/v1/", "");
      requests.push({ method, table, params: url.searchParams });
      if (method === "HEAD") {
        return new Response(null, {
          status: 200,
          headers: { "content-range": `*/${options.listingCount}` },
        });
      }
      if (method === "GET") {
        return new Response(JSON.stringify(options.inUseRows ?? []));
      }
      return new Response(null, {
        status: 204,
        headers: { "content-range": `*/${options.listingCount}` },
      });
    }),
  );
  return requests;
}

function _getDeletes(requests: readonly RecordedRequest[]): RecordedRequest[] {
  return requests.filter((request) => {
    return request.method === "DELETE";
  });
}

function _getCombinedLogs(): string {
  const logCalls = (Acclimate.log as unknown as { mock: { calls: unknown[] } })
    .mock.calls;
  return logCalls.flat().join("\n");
}

const IN_USE_ROW: InUseRow = {
  catalog_listing_id: "listing-1",
  dataset_id: "dataset-1",
  workspace_id: "workspace-1",
};

describe("resetPipelineCommand", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.VITE_SUPABASE_API_URL = API_URL;
    process.env.SUPABASE_SERVICE_ROLE_KEY = "sb_secret_test";
    vi.spyOn(Acclimate, "log").mockImplementation(() => {});
    vi.spyOn(AvaEnv, "getLoadedEnvTarget").mockReturnValue("local");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("deletes every socrata listing once the reset is confirmed", async () => {
    const requests = _mockPostgrest({ listingCount: 3 });

    await resetPipelineCommand({ name: "socrata" });

    const deletes = _getDeletes(requests);
    expect(
      deletes.map((request) => {
        return [request.table, request.params.toString()];
      }),
    ).toEqual([["data_catalog_listings", "api_service=eq.socrata"]]);
  });

  it("deletes nothing when the reset is declined", async () => {
    vi.mocked(promptToConfirmReset).mockResolvedValueOnce(false);
    const requests = _mockPostgrest({ listingCount: 3 });

    await resetPipelineCommand({ name: "socrata" });

    expect(_getDeletes(requests)).toEqual([]);
  });

  it("skips the confirmation when the pipeline has no listings", async () => {
    const requests = _mockPostgrest({ listingCount: 0 });

    await resetPipelineCommand({ name: "socrata" });

    expect([
      vi.mocked(promptToConfirmReset).mock.calls.length,
      _getDeletes(requests).length,
    ]).toEqual([0, 0]);
  });

  it("warns that the production database is affected on --prod", async () => {
    vi.mocked(AvaEnv.getLoadedEnvTarget).mockReturnValue("production");
    _mockPostgrest({ listingCount: 3 });

    await resetPipelineCommand({ name: "socrata" });

    expect(_getCombinedLogs()).toContain("PRODUCTION database");
  });

  it("gives no production warning on the local database", async () => {
    _mockPostgrest({ listingCount: 3 });

    await resetPipelineCommand({ name: "socrata" });

    expect(_getCombinedLogs()).not.toContain("PRODUCTION");
  });

  it("asks nothing about workspaces when no listing is in use", async () => {
    _mockPostgrest({ listingCount: 3 });

    await resetPipelineCommand({ name: "socrata" });

    expect(vi.mocked(promptForInUseListingsChoice)).not.toHaveBeenCalled();
  });

  it("looks for workspace datasets among this pipeline's listings", async () => {
    const requests = _mockPostgrest({ listingCount: 3 });

    await resetPipelineCommand({ name: "socrata" });

    const lookup = requests.find((request) => {
      return request.table === "datasets__open_data";
    });
    expect(lookup?.params.get("data_catalog_listings.api_service")).toBe(
      "eq.socrata",
    );
  });

  it("leaves listings used by a workspace when asked to keep them", async () => {
    vi.mocked(promptForInUseListingsChoice).mockResolvedValueOnce("keep");
    const requests = _mockPostgrest({
      listingCount: 3,
      inUseRows: [IN_USE_ROW, { ...IN_USE_ROW, dataset_id: "dataset-2" }],
    });

    await resetPipelineCommand({ name: "socrata" });

    expect(
      _getDeletes(requests).map((request) => {
        return [request.table, request.params.get("id")];
      }),
    ).toEqual([["data_catalog_listings", "not.in.(listing-1)"]]);
  });

  it("deletes the workspace datasets first when asked to delete all", async () => {
    vi.mocked(promptForInUseListingsChoice).mockResolvedValueOnce("delete");
    const requests = _mockPostgrest({
      listingCount: 3,
      inUseRows: [IN_USE_ROW, { ...IN_USE_ROW, dataset_id: "dataset-2" }],
    });

    await resetPipelineCommand({ name: "socrata" });

    expect(
      _getDeletes(requests).map((request) => {
        return [request.table, request.params.toString()];
      }),
    ).toEqual([
      ["datasets", new URLSearchParams({ id: "in.(dataset-1,dataset-2)" })
        .toString()],
      ["data_catalog_listings", "api_service=eq.socrata"],
    ]);
  });

  it("selects hdx listings by the CKAN service and the HDX base URL", async () => {
    const requests = _mockPostgrest({ listingCount: 1 });

    await resetPipelineCommand({ name: "hdx" });

    expect(_getDeletes(requests)[0]?.params.toString()).toBe(
      new URLSearchParams({
        api_service: "eq.ckan",
        api_base_url: "eq.https://data.humdata.org",
      }).toString(),
    );
  });

  it("selects any other pipeline's listings by pipeline_name", async () => {
    const requests = _mockPostgrest({ listingCount: 1 });

    await resetPipelineCommand({ name: "world-bank__wdi" });

    expect(_getDeletes(requests)[0]?.params.toString()).toBe(
      "pipeline_name=eq.world-bank__wdi",
    );
  });

  it("throws naming the env file when the service role key is missing", async () => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    _mockPostgrest({ listingCount: 1 });

    await expect(resetPipelineCommand({ name: "socrata" })).rejects.toThrow(
      "SUPABASE_SERVICE_ROLE_KEY is not set in .env.development",
    );
  });
});
