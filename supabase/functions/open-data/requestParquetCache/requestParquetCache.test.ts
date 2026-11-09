import {
  parquetCacheAnswerToStatus,
  requestParquetCache,
} from "@sbfn/open-data/requestParquetCache/requestParquetCache.ts";
import { afterEach, describe, expect, it, vi } from "vitest";
import type {
  ParquetCacheDependencies,
  ParquetCacheListingState,
} from "@sbfn/open-data/requestParquetCache/requestParquetCache.ts";

const NOW = new Date("2026-11-09T12:00:00.000Z");
const FOLDER = "catalog-cache/listing/build-a";

const NO_COPY: ParquetCacheListingState = {
  accessKind: "api_resource",
  isInvalid: false,
  parquetCacheStatus: undefined,
  parquetCacheBuildStartedAt: undefined,
  parquetCacheFailureCode: undefined,
  parquetCacheFolderPath: undefined,
  parquetCachePartCount: undefined,
  parquetCacheSourceVersion: undefined,
  parquetCacheRowCount: undefined,
  parquetCacheByteSize: undefined,
  parquetCacheCheckedAt: undefined,
  parquetCacheCheckedSourceVersion: undefined,
};

const READY: ParquetCacheListingState = {
  ...NO_COPY,
  parquetCacheStatus: "ready",
  parquetCacheBuildStartedAt: "2026-11-09T10:00:00.000Z",
  parquetCacheFolderPath: FOLDER,
  parquetCachePartCount: 2,
  parquetCacheSourceVersion: "v1",
  parquetCacheRowCount: 10,
  parquetCacheByteSize: 100,
};

const READY_ANSWER = {
  status: "ready",
  partPaths: [`${FOLDER}/part-00000.parquet`, `${FOLDER}/part-00001.parquet`],
  rowCount: 10,
  byteSize: 100,
  sourceVersion: "v1",
};

function _deps(
  overrides: Partial<ParquetCacheDependencies> = {},
): ParquetCacheDependencies {
  return {
    canStartBuilds: true,
    readFreshnessToken: vi.fn().mockResolvedValue("v1"),
    claimBuild: vi.fn().mockResolvedValue("new-build"),
    startBuild: vi.fn().mockResolvedValue(undefined),
    recordStartFailure: vi.fn().mockResolvedValue(undefined),
    recordFreshnessCheck: vi.fn().mockResolvedValue(undefined),
    now: () => {
      return NOW;
    },
    ...overrides,
  };
}

describe("requestParquetCache", () => {
  it("serves a current copy and asks for nothing", async () => {
    const deps = _deps();

    await expect(
      requestParquetCache({ listing: READY, deps }),
    ).resolves.toEqual({ ...READY_ANSWER, isStale: false });
    expect(deps.claimBuild).not.toHaveBeenCalled();
  });

  it("serves a stale copy while it asks for a rebuild", async () => {
    const deps = _deps({ readFreshnessToken: vi.fn().mockResolvedValue("v2") });

    await expect(
      requestParquetCache({ listing: READY, deps }),
    ).resolves.toEqual({ ...READY_ANSWER, isStale: true });
    expect(deps.startBuild).toHaveBeenCalledWith("new-build");
  });

  it("serves the copy as current, and records nothing, when the source's freshness cannot be read", async () => {
    const deps = _deps({
      readFreshnessToken: vi.fn().mockRejectedValue(new Error("down")),
    });

    await expect(
      requestParquetCache({ listing: READY, deps }),
    ).resolves.toMatchObject({ status: "ready", isStale: false });
    expect(deps.claimBuild).not.toHaveBeenCalled();
    expect(deps.recordFreshnessCheck).not.toHaveBeenCalled();
  });

  it("claims and starts a build for a listing with no copy", async () => {
    const deps = _deps();

    await expect(
      requestParquetCache({ listing: NO_COPY, deps }),
    ).resolves.toEqual({ status: "building" });
    expect(deps.startBuild).toHaveBeenCalledWith("new-build");
  });

  it("answers building without starting another while one runs", async () => {
    const deps = _deps({ claimBuild: vi.fn().mockResolvedValue(undefined) });

    await expect(
      requestParquetCache({
        listing: { ...NO_COPY, parquetCacheStatus: "building" },
        deps,
      }),
    ).resolves.toEqual({ status: "building" });
    expect(deps.startBuild).not.toHaveBeenCalled();
  });

  it("asks again for a build that may be lost, keeping the copy it replaces", async () => {
    const deps = _deps();

    await expect(
      requestParquetCache({
        listing: { ...READY, parquetCacheStatus: "building" },
        deps,
      }),
    ).resolves.toMatchObject({ status: "ready" });
    expect(deps.claimBuild).toHaveBeenCalled();
  });

  it("releases the claim when the pipeline server cannot be reached", async () => {
    const deps = _deps({
      startBuild: vi.fn().mockRejectedValue(new Error("ECONNREFUSED")),
    });

    await expect(
      requestParquetCache({ listing: NO_COPY, deps }),
    ).resolves.toEqual({
      status: "failed",
      failureCode: "pipeline-server-unreachable",
    });
    expect(deps.recordStartFailure).toHaveBeenCalledWith(
      "new-build",
      "pipeline-server-unreachable",
    );
  });

  it("retries a failed build once 15 minutes have passed", async () => {
    const deps = _deps();

    await expect(
      requestParquetCache({
        listing: {
          ...NO_COPY,
          parquetCacheStatus: "failed",
          parquetCacheFailureCode: "source-changed",
          parquetCacheBuildStartedAt: "2026-11-09T11:40:00.000Z",
        },
        deps,
      }),
    ).resolves.toEqual({ status: "building" });
  });

  it.each([
    [
      "it failed under 15 minutes ago",
      "source-changed",
      "2026-11-09T11:50:00.000Z",
      false,
    ],
    [
      "its listing cannot be copied",
      "copy-unsupported",
      "2026-11-01T00:00:00.000Z",
      false,
    ],
    [
      "its listing is invalid",
      "source-empty",
      "2026-11-01T00:00:00.000Z",
      true,
    ],
  ])(
    "does not retry a failed build when %s",
    async (_label, failureCode, startedAt, isInvalid) => {
      const deps = _deps();

      await expect(
        requestParquetCache({
          listing: {
            ...NO_COPY,
            isInvalid,
            parquetCacheStatus: "failed",
            parquetCacheFailureCode: failureCode,
            parquetCacheBuildStartedAt: startedAt,
          },
          deps,
        }),
      ).resolves.toEqual({ status: "failed", failureCode });
      expect(deps.claimBuild).not.toHaveBeenCalled();
    },
  );

  it("retries a failed build at once when the caller holds the whole source", async () => {
    const deps = _deps();

    await expect(
      requestParquetCache({
        listing: {
          ...NO_COPY,
          parquetCacheStatus: "failed",
          parquetCacheFailureCode: "source-download-failed",
          parquetCacheBuildStartedAt: "2026-11-09T11:59:00.000Z",
        },
        deps,
        hasCompleteSample: true,
      }),
    ).resolves.toEqual({ status: "building" });
    expect(deps.startBuild).toHaveBeenCalledWith("new-build");
  });

  it.each([
    ["its listing cannot be copied", "copy-unsupported", false],
    ["its listing is invalid", "source-empty", true],
  ])(
    "does not retry a failed build with the whole source when %s",
    async (_label, failureCode, isInvalid) => {
      const deps = _deps();

      await expect(
        requestParquetCache({
          listing: {
            ...NO_COPY,
            isInvalid,
            parquetCacheStatus: "failed",
            parquetCacheFailureCode: failureCode,
            parquetCacheBuildStartedAt: "2026-11-09T11:59:00.000Z",
          },
          deps,
          hasCompleteSample: true,
        }),
      ).resolves.toEqual({ status: "failed", failureCode });
      expect(deps.claimBuild).not.toHaveBeenCalled();
    },
  );

  it("refuses a listing that is not API-backed", async () => {
    await expect(
      requestParquetCache({
        listing: { ...NO_COPY, accessKind: "pipeline_parquet" },
        deps: _deps(),
      }),
    ).resolves.toEqual({ status: "unavailable", reason: "not-api-backed" });
  });

  it("says copies are unavailable when no pipeline server is configured", async () => {
    const deps = _deps({ canStartBuilds: false });

    await expect(
      requestParquetCache({ listing: NO_COPY, deps }),
    ).resolves.toEqual({ status: "unavailable", reason: "copies-unavailable" });
    expect(deps.claimBuild).not.toHaveBeenCalled();
  });

  it("still serves a copy when no pipeline server is configured", async () => {
    const deps = _deps({
      canStartBuilds: false,
      readFreshnessToken: vi.fn().mockResolvedValue("v2"),
    });

    await expect(
      requestParquetCache({ listing: READY, deps }),
    ).resolves.toMatchObject({ status: "ready", isStale: true });
    expect(deps.claimBuild).not.toHaveBeenCalled();
  });
});

describe("requestParquetCache's throttled freshness checks", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  /** A copy whose source was last checked at `checkedAt`, reading `token`. */
  function _checkedCopy(
    checkedAt: string,
    token: string,
  ): ParquetCacheListingState {
    return {
      ...READY,
      parquetCacheCheckedAt: checkedAt,
      parquetCacheCheckedSourceVersion: token,
    };
  }

  it("reuses a check made under 15 minutes ago without reading the source", async () => {
    const deps = _deps({ readFreshnessToken: vi.fn().mockResolvedValue("v2") });

    await expect(
      requestParquetCache({
        listing: _checkedCopy("2026-11-09T11:50:00.000Z", "v1"),
        deps,
      }),
    ).resolves.toEqual({ ...READY_ANSWER, isStale: false });
    expect(deps.readFreshnessToken).not.toHaveBeenCalled();
    expect(deps.recordFreshnessCheck).not.toHaveBeenCalled();
    expect(deps.claimBuild).not.toHaveBeenCalled();
  });

  it("calls a copy stale, and asks for a rebuild, when the recent check read another token", async () => {
    const deps = _deps();

    await expect(
      requestParquetCache({
        listing: _checkedCopy("2026-11-09T11:50:00.000Z", "v2"),
        deps,
      }),
    ).resolves.toEqual({ ...READY_ANSWER, isStale: true });
    expect(deps.readFreshnessToken).not.toHaveBeenCalled();
    expect(deps.startBuild).toHaveBeenCalledWith("new-build");
  });

  it.each([
    ["was never checked", undefined],
    ["was checked exactly 15 minutes ago", "2026-11-09T11:45:00.000Z"],
    ["was checked over 15 minutes ago", "2026-11-09T11:30:00.000Z"],
  ])(
    "reads the source and records the token when the copy %s",
    async (_label, checkedAt) => {
      const deps = _deps({
        readFreshnessToken: vi.fn().mockResolvedValue("v2"),
      });

      await expect(
        requestParquetCache({
          listing: {
            ...READY,
            parquetCacheCheckedAt: checkedAt,
            parquetCacheCheckedSourceVersion:
              checkedAt === undefined ? undefined : "v1",
          },
          deps,
        }),
      ).resolves.toEqual({ ...READY_ANSWER, isStale: true });
      expect(deps.readFreshnessToken).toHaveBeenCalledTimes(1);
      expect(deps.recordFreshnessCheck).toHaveBeenCalledWith("v2");
      expect(deps.startBuild).toHaveBeenCalledWith("new-build");
    },
  );

  it("still answers when the check cannot be recorded", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {
      return undefined;
    });
    const deps = _deps({
      recordFreshnessCheck: vi.fn().mockRejectedValue(new Error("db down")),
    });

    await expect(
      requestParquetCache({ listing: READY, deps }),
    ).resolves.toEqual({ ...READY_ANSWER, isStale: false });
    expect(deps.recordFreshnessCheck).toHaveBeenCalledWith("v1");
    expect(consoleError).toHaveBeenCalled();
  });
});

describe("parquetCacheAnswerToStatus", () => {
  it.each([
    [{ ...READY_ANSWER, isStale: false } as const, 200],
    [{ status: "building" } as const, 202],
    [{ status: "failed", failureCode: "source-empty" } as const, 409],
    [{ status: "unavailable", reason: "not-api-backed" } as const, 409],
    [{ status: "unavailable", reason: "copies-unavailable" } as const, 503],
  ])("answers %o with %i", (answer, status) => {
    expect(parquetCacheAnswerToStatus(answer)).toBe(status);
  });
});
