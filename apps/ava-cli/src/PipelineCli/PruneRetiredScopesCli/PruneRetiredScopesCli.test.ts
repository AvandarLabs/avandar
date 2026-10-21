import { AvaEnv } from "@ava-cli/AvaEnv/AvaEnv";
import { fetchLivePipelineScopes } from "@ava-cli/PipelineCli/fetchLivePipelineScopes/fetchLivePipelineScopes";
import { pruneRetiredScopesCommand } from "@ava-cli/PipelineCli/PruneRetiredScopesCli/PruneRetiredScopesCli";
import { promptToConfirmReset } from "@ava-cli/PipelineCli/ResetPipelineCli/resetPipelinePrompts";
import { Acclimate } from "@avandar/acclimate";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@ava-cli/PipelineCli/ResetPipelineCli/resetPipelinePrompts", () => {
  return {
    promptToConfirmReset: vi.fn(async () => {
      return true;
    }),
    promptForInUseListingsChoice: vi.fn(),
  };
});

vi.mock(
  "@ava-cli/PipelineCli/fetchLivePipelineScopes/fetchLivePipelineScopes",
  () => {
    return {
      fetchLivePipelineScopes: vi.fn(async () => {
        return [
          { driveKey: "https://data.humdata.org", scopeKeys: ["format:csv"] },
        ];
      }),
    };
  },
);

const API_URL = "http://127.0.0.1:54321";
const PRUNE_RPC = "rpc/rpc_data_catalog_listings__prune_pipeline_scope";
const LIST_RPC = "rpc/rpc_data_catalog_listings__list_pipeline_scopes";

type RecordedPost = Readonly<{ table: string; body: unknown }>;

/**
 * Stubs `fetch` as PostgREST's two scope RPCs: the list RPC returns
 * `storedScopes`, the prune RPC returns fixed counts.
 */
function _mockScopeRpcs(
  storedScopes: ReadonlyArray<
    Readonly<{ drive_key: string; scope_key: string }>
  >,
): RecordedPost[] {
  const posts: RecordedPost[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string, init?: { body?: string }) => {
      const table = new URL(input).pathname.replace("/rest/v1/", "");
      posts.push({ table, body: JSON.parse(init?.body ?? "null") });
      if (table === LIST_RPC) {
        return new Response(JSON.stringify(storedScopes));
      }
      return new Response(
        JSON.stringify([
          {
            listings_deleted: 2,
            listings_kept_in_use: 0,
            listings_detached: 1,
            checkpoints_deleted: 1,
          },
        ]),
      );
    }),
  );
  return posts;
}

function _pruneCalls(posts: readonly RecordedPost[]): unknown[] {
  return posts
    .filter((post) => {
      return post.table === PRUNE_RPC;
    })
    .map((post) => {
      return post.body;
    });
}

function _getCombinedLogs(): string {
  const logCalls = (Acclimate.log as unknown as { mock: { calls: unknown[] } })
    .mock.calls;
  return logCalls.flat().join("\n");
}

const RETIRED = {
  drive_key: "https://data.humdata.org",
  scope_key: "format:parquet",
};
const LIVE = { drive_key: "https://data.humdata.org", scope_key: "format:csv" };

describe("pruneRetiredScopesCommand", () => {
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

  it("dry-runs each retired scope, prints it, and changes nothing with --dry-run", async () => {
    const posts = _mockScopeRpcs([LIVE, RETIRED]);

    await pruneRetiredScopesCommand({ name: "hdx", isDryRun: true, local: false });

    expect([
      _pruneCalls(posts),
      vi.mocked(promptToConfirmReset).mock.calls.length,
      _getCombinedLogs(),
    ]).toEqual([
      [
        {
          p_pipeline_name: "hdx",
          p_scope_key: "format:parquet",
          p_drive_key: "https://data.humdata.org",
          p_is_dry_run: true,
        },
      ],
      0,
      expect.stringContaining(
        "https://data.humdata.org [format:parquet]: delete 2 listing(s)",
      ),
    ]);
  });

  it("prunes each retired scope for real once confirmed", async () => {
    const posts = _mockScopeRpcs([LIVE, RETIRED]);

    await pruneRetiredScopesCommand({ name: "hdx", isDryRun: false, local: false });

    expect(
      _pruneCalls(posts).map((body) => {
        return (body as { p_is_dry_run: boolean }).p_is_dry_run;
      }),
    ).toEqual([true, false]);
  });

  it("changes nothing when the prune is declined", async () => {
    vi.mocked(promptToConfirmReset).mockResolvedValueOnce(false);
    const posts = _mockScopeRpcs([LIVE, RETIRED]);

    await pruneRetiredScopesCommand({ name: "hdx", isDryRun: false, local: false });

    expect(_pruneCalls(posts)).toHaveLength(1);
  });

  it("reports that nothing is retired and prunes nothing", async () => {
    const posts = _mockScopeRpcs([LIVE]);

    await pruneRetiredScopesCommand({ name: "hdx", isDryRun: false, local: false });

    expect([_pruneCalls(posts), _getCombinedLogs()]).toEqual([
      [],
      expect.stringContaining("no retired scopes"),
    ]);
  });

  it("refuses --local against a deployed database before reading anything", async () => {
    vi.mocked(AvaEnv.getLoadedEnvTarget).mockReturnValue("production");
    const posts = _mockScopeRpcs([RETIRED]);

    await expect(
      pruneRetiredScopesCommand({ name: "hdx", isDryRun: true, local: true }),
    ).rejects.toThrow("--local");
    expect([posts, vi.mocked(fetchLivePipelineScopes).mock.calls]).toEqual([
      [],
      [],
    ]);
  });
});
