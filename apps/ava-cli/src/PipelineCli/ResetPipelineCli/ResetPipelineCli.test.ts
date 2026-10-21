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

type PruneCounts = Readonly<{
  listings_deleted: number;
  listings_kept_in_use: number;
  listings_detached: number;
  checkpoints_deleted: number;
}>;

const NO_PRUNE: PruneCounts = {
  listings_deleted: 0,
  listings_kept_in_use: 0,
  listings_detached: 0,
  checkpoints_deleted: 0,
};

type RecordedRequest = Readonly<{
  method: string;
  table: string;
  params: URLSearchParams;
  body: unknown;
}>;

/**
 * Stubs `fetch` as a tiny PostgREST: a HEAD reports `listingCount` on
 * `data_catalog_listings` and `checkpointCount` on
 * `pipeline_scope_checkpoints`, a GET on `datasets__open_data` returns
 * `inUseRows`, a POST to the prune RPC returns `pruneCounts`, and every
 * DELETE succeeds. Returns the requests in the order they were made.
 */
function _mockPostgrest(options: {
  listingCount: number;
  checkpointCount?: number;
  inUseRows?: readonly InUseRow[];
  pruneCounts?: PruneCounts;
}): RecordedRequest[] {
  const requests: RecordedRequest[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string, init?: { method?: string; body?: string }) => {
      const url = new URL(input);
      const method = init?.method ?? "GET";
      const table = url.pathname.replace("/rest/v1/", "");
      const body: unknown =
        init?.body === undefined ? undefined : JSON.parse(init.body);
      requests.push({ method, table, params: url.searchParams, body });
      const count =
        table === "pipeline_scope_checkpoints"
          ? (options.checkpointCount ?? 0)
          : options.listingCount;
      if (method === "HEAD") {
        return new Response(null, {
          status: 200,
          headers: { "content-range": `*/${count}` },
        });
      }
      if (method === "POST") {
        return new Response(JSON.stringify([options.pruneCounts ?? NO_PRUNE]));
      }
      if (method === "GET") {
        return new Response(JSON.stringify(options.inUseRows ?? []));
      }
      return new Response(null, {
        status: 204,
        headers: { "content-range": `*/${count}` },
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
    ).toEqual([
      ["pipeline_scope_checkpoints", "pipeline_name=eq.socrata"],
      ["data_catalog_listings", "pipeline_name=eq.socrata"],
    ]);
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
    expect(lookup?.params.get("data_catalog_listings.pipeline_name")).toBe(
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
    ).toEqual([
      ["pipeline_scope_checkpoints", null],
      ["data_catalog_listings", "not.in.(listing-1)"],
    ]);
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
      ["pipeline_scope_checkpoints", "pipeline_name=eq.socrata"],
      ["datasets", new URLSearchParams({ id: "in.(dataset-1,dataset-2)" })
        .toString()],
      ["data_catalog_listings", "pipeline_name=eq.socrata"],
    ]);
  });

  it("selects any other pipeline's listings by pipeline_name", async () => {
    const requests = _mockPostgrest({ listingCount: 1 });

    await resetPipelineCommand({ name: "world-bank__wdi" });

    const listingsDelete = _getDeletes(requests).find((request) => {
      return request.table === "data_catalog_listings";
    });
    expect(listingsDelete?.params.toString()).toBe(
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

  it("deletes checkpoints even when the pipeline has no listings", async () => {
    const requests = _mockPostgrest({ listingCount: 0, checkpointCount: 2 });

    await resetPipelineCommand({ name: "socrata" });

    expect(
      _getDeletes(requests).map((request) => {
        return request.table;
      }),
    ).toEqual(["pipeline_scope_checkpoints", "data_catalog_listings"]);
  });

  it("deletes nothing else when deleting checkpoints fails", async () => {
    const recorded: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string, init?: { method?: string }) => {
        const table = new URL(input).pathname.replace("/rest/v1/", "");
        recorded.push(`${init?.method ?? "GET"} ${table}`);
        if (init?.method === "DELETE") {
          return new Response("boom", { status: 500 });
        }
        if (init?.method === "HEAD") {
          return new Response(null, {
            status: 200,
            headers: { "content-range": "*/3" },
          });
        }
        return new Response("[]");
      }),
    );

    await expect(resetPipelineCommand({ name: "socrata" })).rejects.toThrow(
      "500",
    );
    expect(
      recorded.filter((request) => {
        return request.startsWith("DELETE");
      }),
    ).toEqual(["DELETE pipeline_scope_checkpoints"]);
  });

  describe("with --scope", () => {
    it("prunes the scope on every drive once confirmed", async () => {
      const requests = _mockPostgrest({
        listingCount: 0,
        pruneCounts: {
          ...NO_PRUNE,
          listings_deleted: 3,
          checkpoints_deleted: 1,
        },
      });

      await resetPipelineCommand({ name: "hdx", scope: "format:parquet" });

      const calls = requests.filter((request) => {
        return request.method === "POST";
      });
      expect(
        calls.map((request) => {
          return [request.table, request.body];
        }),
      ).toEqual([
        [
          "rpc/rpc_data_catalog_listings__prune_pipeline_scope",
          {
            p_pipeline_name: "hdx",
            p_scope_key: "format:parquet",
            p_drive_key: null,
            p_is_dry_run: true,
          },
        ],
        [
          "rpc/rpc_data_catalog_listings__prune_pipeline_scope",
          {
            p_pipeline_name: "hdx",
            p_scope_key: "format:parquet",
            p_drive_key: null,
            p_is_dry_run: false,
          },
        ],
      ]);
    });

    it("changes nothing when the scope has nothing to prune", async () => {
      const requests = _mockPostgrest({ listingCount: 0 });

      await resetPipelineCommand({ name: "hdx", scope: "format:parquet" });

      expect([
        vi.mocked(promptToConfirmReset).mock.calls.length,
        requests.filter((request) => {
          return request.method === "POST";
        }).length,
      ]).toEqual([0, 1]);
    });

    it("keeps the workspace datasets of in-use listings when asked to", async () => {
      vi.mocked(promptForInUseListingsChoice).mockResolvedValueOnce("keep");
      const requests = _mockPostgrest({
        listingCount: 0,
        inUseRows: [IN_USE_ROW],
        pruneCounts: { ...NO_PRUNE, listings_kept_in_use: 1 },
      });

      await resetPipelineCommand({ name: "hdx", scope: "format:parquet" });

      expect(
        requests
          .filter((request) => {
            return request.method === "DELETE" || request.method === "POST";
          })
          .map((request) => {
            return `${request.method} ${request.table}`;
          }),
      ).toEqual([
        "POST rpc/rpc_data_catalog_listings__prune_pipeline_scope",
        "POST rpc/rpc_data_catalog_listings__prune_pipeline_scope",
      ]);
    });

    it("changes nothing when the reset is declined", async () => {
      vi.mocked(promptToConfirmReset).mockResolvedValueOnce(false);
      const requests = _mockPostgrest({
        listingCount: 0,
        pruneCounts: { ...NO_PRUNE, listings_deleted: 3 },
      });

      await resetPipelineCommand({ name: "hdx", scope: "format:parquet" });

      expect([
        requests.filter((request) => {
          return request.method === "POST";
        }).length,
        _getDeletes(requests).length,
      ]).toEqual([1, 0]);
    });

    it("deletes the workspace datasets of in-use listings first when asked to", async () => {
      vi.mocked(promptForInUseListingsChoice).mockResolvedValueOnce("delete");
      const requests = _mockPostgrest({
        listingCount: 0,
        inUseRows: [IN_USE_ROW],
        pruneCounts: { ...NO_PRUNE, listings_kept_in_use: 1 },
      });

      await resetPipelineCommand({ name: "hdx", scope: "format:parquet" });

      const inUseLookup = requests.find((request) => {
        return request.table === "datasets__open_data";
      });
      expect([
        inUseLookup?.params.get("data_catalog_listings.pipeline_scope_keys"),
        requests
          .filter((request) => {
            return request.method === "DELETE" || request.method === "POST";
          })
          .map((request) => {
            return `${request.method} ${request.table}`;
          }),
      ]).toEqual([
        "eq.{format:parquet}",
        [
          "POST rpc/rpc_data_catalog_listings__prune_pipeline_scope",
          "DELETE datasets",
          "POST rpc/rpc_data_catalog_listings__prune_pipeline_scope",
        ],
      ]);
    });
  });
});
