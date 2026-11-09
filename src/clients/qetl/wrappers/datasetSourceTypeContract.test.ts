/**
 * The contract every dataset source type's wrapper is held to. Each source
 * type needs an entry in `SOURCE_TYPE_CONTRACTS`, so adding one to the
 * database enum fails to compile until its author decides how it behaves,
 * and every live source is then checked the same way: what it acquires goes
 * stale, it types its columns as declared, and it reads its rows through a
 * server route keyed by the dataset with only the caller's session.
 *
 * Which refresh each source type offers is checked in
 * `getDatasetRefreshFromSourceType.test.ts`, and how each one publishes in
 * `DashboardClient.publishSnapshotSources.test.ts`.
 */

import { createWebLogger } from "@avandar/logger";
import { objectEntries } from "@avandar/utils";
import { describe, expect, it, vi } from "vitest";
import { GlobalAppConfig } from "$/config/GlobalAppConfig";
import { createGoogleSheetsWrapper } from "@/clients/qetl/wrappers/GoogleSheetsWrapper/GoogleSheetsWrapper";
import { createPostgresTableWrapper } from "@/clients/qetl/wrappers/PostgresTableWrapper/PostgresTableWrapper";
import { MOCK_SESSION_ACCESS_TOKEN } from "@/test-utils/createAvaSupabaseSessionMock";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { DatasetSource } from "$/models/datasets/DatasetSource/DatasetSource";
import type { RelationRef } from "$/models/relations/RelationRef/RelationRef";
import type {
  AcquiredRelation,
  CsvColumnTypes,
  RelationCsvReader,
  SourceWrapper,
} from "$/models/relations/SourceWrapper/SourceWrapper.types";
import type { Workspace } from "$/models/Workspace/Workspace";
import type { EdgeFunctionFetch } from "@/clients/fetchEdgeFunctionRoute/fetchEdgeFunctionRoute";
import type { Mock } from "vitest";

const { apiGetMock } = vi.hoisted(() => {
  return { apiGetMock: vi.fn() };
});

vi.mock("@/clients/APIClient", () => {
  return { APIClient: { get: apiGetMock } };
});

vi.mock("$/db/supabase/AvaSupabase", async () => {
  return (
    await import("@/test-utils/createAvaSupabaseSessionMock")
  ).createAvaSupabaseSessionMock();
});

type DatasetRef = Extract<RelationRef.T, { kind: "dataset" }>;

/** What a live source's wrapper is built from in these tests. */
type LiveWrapperFakes = {
  readCsv: RelationCsvReader;
  fetch: EdgeFunctionFetch;
};

/**
 * How one source type behaves. A live source's rows can change without
 * anyone re-importing the dataset, so what it acquires must go stale. Its
 * wrapper is built from fakes so the same checks run against every live
 * source.
 */
type SourceTypeContract =
  | { isLive: false }
  | {
      isLive: true;
      columnTypes: CsvColumnTypes;
      makeWrapper: (fakes: LiveWrapperFakes) => SourceWrapper<DatasetRef>;
    };

/** What acquiring through a live source's wrapper produced and sent. */
type LiveAcquisition = {
  acquiredRelation: AcquiredRelation;
  readCsv: Mock<RelationCsvReader>;
  sentRequests: Array<{ url: string; init: RequestInit | undefined }>;
};

const SOURCE_TYPE_CONTRACTS: Record<
  DatasetSource.SourceType,
  SourceTypeContract
> = {
  csv_file: { isLive: false },
  xlsx_file: { isLive: false },
  pdf_file: { isLive: false },
  // Read from a published catalog copy. An API-backed copy has a max age
  // (GlobalAppConfig.timing.openDataCopyMaxAgeMs) but no Refresh action or
  // dataset-keyed route, so it is not held to the live source contract.
  open_data: { isLive: false },
  // Derived from other datasets, which go stale on their own.
  virtual: { isLive: false },
  google_sheets: {
    isLive: true,
    columnTypes: "inferred",
    makeWrapper: ({ readCsv, fetch }) => {
      return createGoogleSheetsWrapper({ readCsv, datasetFetch: fetch });
    },
  },
  postgres_table: {
    isLive: true,
    columnTypes: "source-schema",
    makeWrapper: ({ readCsv, fetch }) => {
      return createPostgresTableWrapper({ readCsv, rowsFetch: fetch });
    },
  },
};

const DATASET_REF = {
  kind: "dataset",
  id: "44444444-4444-4444-8444-444444444444" as Dataset.Id,
} as const satisfies DatasetRef;

const LIVE_SOURCE_CONTRACTS = objectEntries(SOURCE_TYPE_CONTRACTS).flatMap(
  ([sourceType, contract]) => {
    return contract.isLive ? [{ sourceType, contract }] : [];
  },
);

/**
 * Acquires the dataset through a live source's wrapper, answering its server
 * route with one CSV row, and returns what the wrapper did.
 */
async function _acquireThroughLiveSource(
  makeWrapper: (fakes: LiveWrapperFakes) => SourceWrapper<DatasetRef>,
): Promise<LiveAcquisition> {
  const sentRequests: LiveAcquisition["sentRequests"] = [];
  const readCsv = vi.fn<RelationCsvReader>(async () => {
    return { parquetBlob: new Blob(["parquet"]) };
  });
  const wrapper = makeWrapper({
    readCsv,
    fetch: async (url, init) => {
      sentRequests.push({ url, init });
      return new Response("id\r\n1\r\n", {
        status: 200,
        headers: { "Content-Type": "text/csv", "X-Ava-Source-Version": "7" },
      });
    },
  });
  const acquiredRelation = await wrapper.acquire!(
    { ref: DATASET_REF, columns: "all" },
    {
      workspaceId: "99999999-9999-4999-8999-999999999999" as Workspace.Id,
      logger: createWebLogger({ loggerName: "contract", enabled: false }),
    },
  );
  return { acquiredRelation, readCsv, sentRequests };
}

describe.each(LIVE_SOURCE_CONTRACTS)(
  "a live $sourceType dataset",
  ({ contract }) => {
    it("marks what it acquires stale after the live-source max age", async () => {
      const { acquiredRelation } = await _acquireThroughLiveSource(
        contract.makeWrapper,
      );

      expect(acquiredRelation.maxAgeMs).toBe(
        GlobalAppConfig.timing.liveRelationMaxAgeMs,
      );
    });

    it("types its columns the way its contract declares", async () => {
      const { readCsv } = await _acquireThroughLiveSource(contract.makeWrapper);

      expect(readCsv).toHaveBeenCalledWith(
        expect.objectContaining({ columnTypes: contract.columnTypes }),
      );
    });

    it("reads its rows through a server route keyed by the dataset, with only the caller's session", async () => {
      apiGetMock.mockClear();

      const { sentRequests } = await _acquireThroughLiveSource(
        contract.makeWrapper,
      );

      expect(sentRequests).toHaveLength(1);
      expect(sentRequests[0]!.url).toContain(`/datasets/${DATASET_REF.id}/`);
      expect(
        new Headers(sentRequests[0]!.init?.headers).get("Authorization"),
      ).toBe(`Bearer ${MOCK_SESSION_ACCESS_TOKEN}`);
      // No third-party credential is fetched into the browser to read it.
      expect(apiGetMock).not.toHaveBeenCalled();
    });
  },
);
