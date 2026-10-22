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

type PruneCounts = Readonly<{
  listings_deleted: number;
  listings_kept_in_use: number;
  listings_detached: number;
  checkpoints_deleted: number;
}>;

const DEFAULT_COUNTS: PruneCounts = {
  listings_deleted: 2,
  listings_kept_in_use: 0,
  listings_detached: 1,
  checkpoints_deleted: 1,
};

/** Counts for a retired scope whose listings workspaces all still use. */
const IN_USE_ONLY_COUNTS: PruneCounts = {
  listings_deleted: 0,
  listings_kept_in_use: 4,
  listings_detached: 0,
  checkpoints_deleted: 0,
};

/**
 * Stubs `fetch` as PostgREST's two scope RPCs: the list RPC returns
 * `storedScopes`, the prune RPC returns `countsByScope[p_scope_key]`, or
 * fixed counts for a scope not in it.
 */
function _mockScopeRpcs(
  storedScopes: ReadonlyArray<
    Readonly<{ drive_key: string; scope_key: string }>
  >,
  countsByScope: Readonly<Record<string, PruneCounts>> = {},
): RecordedPost[] {
  const posts: RecordedPost[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string, init?: { body?: string }) => {
      const table = new URL(input).pathname.replace("/rest/v1/", "");
      const body = JSON.parse(init?.body ?? "null") as {
        p_scope_key?: string;
      } | null;
      posts.push({ table, body });
      if (table === LIST_RPC) {
        return new Response(JSON.stringify(storedScopes));
      }
      const counts = countsByScope[body?.p_scope_key ?? ""] ?? DEFAULT_COUNTS;
      return new Response(JSON.stringify([counts]));
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

/** The bodies the prune sent to one of the execution functions. */
function _executionBodies(
  posts: readonly RecordedPost[],
  step: "start" | "record_scope" | "finish",
): Array<Record<string, unknown>> {
  return posts
    .filter((post) => {
      return post.table === `rpc/rpc_pipeline_executions__${step}`;
    })
    .map((post) => {
      return post.body as Record<string, unknown>;
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
const OTHER_RETIRED = {
  drive_key: "https://retired.invalid",
  scope_key: "all",
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

    await pruneRetiredScopesCommand({
      name: "hdx",
      isDryRun: true,
      local: false,
    });

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

    await pruneRetiredScopesCommand({
      name: "hdx",
      isDryRun: false,
      local: false,
    });

    expect(
      _pruneCalls(posts).map((body) => {
        return (body as { p_is_dry_run: boolean }).p_is_dry_run;
      }),
    ).toEqual([true, false]);
  });

  it("changes nothing when the prune is declined", async () => {
    vi.mocked(promptToConfirmReset).mockResolvedValueOnce(false);
    const posts = _mockScopeRpcs([LIVE, RETIRED]);

    await pruneRetiredScopesCommand({
      name: "hdx",
      isDryRun: false,
      local: false,
    });

    expect(_pruneCalls(posts)).toHaveLength(1);
  });

  it("reports that nothing is retired and prunes nothing", async () => {
    const posts = _mockScopeRpcs([LIVE]);

    await pruneRetiredScopesCommand({
      name: "hdx",
      isDryRun: false,
      local: false,
    });

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

  it("prunes nothing and rethrows when the live scopes cannot be read", async () => {
    vi.mocked(fetchLivePipelineScopes).mockRejectedValueOnce(
      new Error("server down"),
    );
    const posts = _mockScopeRpcs([LIVE, RETIRED]);

    await expect(
      pruneRetiredScopesCommand({ name: "hdx", isDryRun: false, local: false }),
    ).rejects.toThrow("server down");
    expect(_pruneCalls(posts)).toEqual([]);
  });

  it("dry-runs only the scope named by --scope", async () => {
    const posts = _mockScopeRpcs([LIVE, RETIRED, OTHER_RETIRED]);

    await pruneRetiredScopesCommand({
      name: "hdx",
      scope: "all",
      isDryRun: true,
      local: false,
    });

    expect(_pruneCalls(posts)).toEqual([
      {
        p_pipeline_name: "hdx",
        p_scope_key: "all",
        p_drive_key: "https://retired.invalid",
        p_is_dry_run: true,
      },
    ]);
  });

  it("rejects an invalid --scope before any request", async () => {
    const posts = _mockScopeRpcs([LIVE, RETIRED]);

    await expect(
      pruneRetiredScopesCommand({
        name: "hdx",
        scope: "Format CSV",
        isDryRun: true,
        local: false,
      }),
    ).rejects.toThrow("Invalid scope key: Format CSV");
    expect([posts, vi.mocked(fetchLivePipelineScopes).mock.calls]).toEqual([
      [],
      [],
    ]);
  });

  it("skips a retired scope whose listings workspaces all still use", async () => {
    const posts = _mockScopeRpcs([LIVE, RETIRED, OTHER_RETIRED], {
      "format:parquet": IN_USE_ONLY_COUNTS,
    });

    await pruneRetiredScopesCommand({
      name: "hdx",
      isDryRun: false,
      local: false,
    });

    expect([
      _pruneCalls(posts).map((body) => {
        const { p_scope_key, p_is_dry_run } = body as {
          p_scope_key: string;
          p_is_dry_run: boolean;
        };
        return `${p_scope_key} ${p_is_dry_run}`;
      }),
      vi.mocked(promptToConfirmReset).mock.calls,
      _getCombinedLogs(),
    ]).toEqual([
      ["format:parquet true", "all true", "all false"],
      [["Prune 1 retired scope(s) of hdx?"]],
      expect.stringContaining(
        "https://data.humdata.org [format:parquet]: kept 4 listing(s) a workspace uses; nothing to prune",
      ),
    ]);
  });

  it("finishes without asking when every retired scope is only in use", async () => {
    const posts = _mockScopeRpcs([LIVE, RETIRED], {
      "format:parquet": IN_USE_ONLY_COUNTS,
    });

    await pruneRetiredScopesCommand({
      name: "hdx",
      isDryRun: false,
      local: false,
    });

    expect([
      _pruneCalls(posts).length,
      vi.mocked(promptToConfirmReset).mock.calls.length,
    ]).toEqual([1, 0]);
  });

  it("records a dry run, with each retired scope's counts", async () => {
    const posts = _mockScopeRpcs([LIVE, RETIRED]);

    await pruneRetiredScopesCommand({
      name: "hdx",
      isDryRun: true,
      local: false,
    });

    expect([
      _executionBodies(posts, "start")[0]?.p_execution,
      _executionBodies(posts, "record_scope").map((body) => {
        return body.p_scope;
      }),
      _executionBodies(posts, "finish")[0]?.p_outcome,
    ]).toEqual([
      expect.objectContaining({
        command: "prune_retired_scopes",
        is_dry_run: true,
        is_scoped: false,
        arguments: { dryRun: true },
      }),
      [
        expect.objectContaining({
          drive_key: RETIRED.drive_key,
          scope_key: RETIRED.scope_key,
          status: "succeeded",
          listings_deleted: 2,
          listings_detached: 1,
          checkpoints_deleted: 1,
        }),
      ],
      expect.objectContaining({ status: "succeeded" }),
    ]);
  });

  it("records each scope it pruned, after pruning it", async () => {
    const posts = _mockScopeRpcs([LIVE, RETIRED, OTHER_RETIRED]);

    await pruneRetiredScopesCommand({
      name: "hdx",
      isDryRun: false,
      local: false,
    });

    expect([
      posts
        .map((post) => {
          return post.table;
        })
        .filter((table) => {
          return table !== LIST_RPC;
        })
        .slice(-5),
      _executionBodies(posts, "finish")[0]?.p_outcome,
    ]).toEqual([
      [
        PRUNE_RPC,
        "rpc/rpc_pipeline_executions__record_scope",
        PRUNE_RPC,
        "rpc/rpc_pipeline_executions__record_scope",
        "rpc/rpc_pipeline_executions__finish",
      ],
      expect.objectContaining({ status: "succeeded" }),
    ]);
  });

  it("records a declined prune as cancelled, its retired scopes as skipped", async () => {
    vi.mocked(promptToConfirmReset).mockResolvedValueOnce(false);
    const posts = _mockScopeRpcs([LIVE, RETIRED]);

    // The outcome carries no deletions: the scope rows carry the counts, and
    // the database adds them up into the execution's totals.
    const outcome = () => {
      return _executionBodies(posts, "finish")[0]?.p_outcome;
    };
    await pruneRetiredScopesCommand({
      name: "hdx",
      isDryRun: false,
      local: false,
    });

    expect([
      _executionBodies(posts, "record_scope").map((body) => {
        return (body.p_scope as { status: string }).status;
      }),
      outcome(),
      outcome(),
    ]).toEqual([
      ["skipped"],
      expect.objectContaining({ status: "cancelled" }),
      expect.not.objectContaining({ listings_deleted: expect.anything() }),
    ]);
  });

  it("records a failed prune with its error", async () => {
    vi.mocked(fetchLivePipelineScopes).mockRejectedValueOnce(
      new Error("server down"),
    );
    const posts = _mockScopeRpcs([LIVE, RETIRED]);

    await expect(
      pruneRetiredScopesCommand({ name: "hdx", isDryRun: false, local: false }),
    ).rejects.toThrow("server down");

    expect(_executionBodies(posts, "finish")[0]?.p_outcome).toMatchObject({
      status: "failed",
      error: "server down",
    });
  });
});
