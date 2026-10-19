/**
 * The contract every dataset source type is held to. Each source type needs
 * an entry in `SOURCE_TYPE_CONTRACTS`, so adding one to the database enum
 * fails to compile until its author decides how it behaves, and every live
 * source is then checked the same way: it goes stale, it offers a refresh,
 * it types its columns as declared, and anyone who can see the dataset reads
 * it through the credential it was imported with.
 *
 * Publishing is checked the same way, per source type, in
 * `DashboardClient.publishSnapshotSources.test.ts`.
 */

import { describe, expect, it, vi } from "vitest";
import { GlobalAppConfig } from "$/config/GlobalAppConfig";
import { DatasetSource } from "$/models/datasets/DatasetSource/DatasetSource";
import { createGoogleSheetsWrapper } from "@/clients/qetl/wrappers/GoogleSheetsWrapper/GoogleSheetsWrapper";
import { createPostgresTableWrapper } from "@/clients/qetl/wrappers/PostgresTableWrapper/PostgresTableWrapper";
import { getDatasetRefreshFromSourceType } from "@/views/DataManagerApp/DatasetMetaView/getDatasetRefreshFromSourceType/getDatasetRefreshFromSourceType";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { RelationRef } from "$/models/relations/RelationRef/RelationRef";
import type {
  CsvColumnTypes,
  RelationCsvReader,
  SourceWrapper,
} from "$/models/relations/SourceWrapper/SourceWrapper.types";
import type { Workspace } from "$/models/Workspace/Workspace";
import type { ILogger } from "@avandar/logger";

const SESSION_ACCESS_TOKEN = "session-access-token";

const { apiGetMock } = vi.hoisted(() => {
  return { apiGetMock: vi.fn() };
});

vi.mock("@/clients/APIClient", () => {
  return { APIClient: { get: apiGetMock } };
});

vi.mock("$/db/supabase/AvaSupabase", () => {
  return {
    AvaSupabase: {
      db: () => {
        return {
          auth: {
            getSession: async () => {
              return {
                data: { session: { access_token: SESSION_ACCESS_TOKEN } },
              };
            },
          },
        };
      },
      getEdgeFunctionsURL: () => {
        return "https://project.supabase.co/functions/v1";
      },
    },
  };
});

type DatasetRef = Extract<RelationRef.T, { kind: "dataset" }>;

/** One request a wrapper sent to its server route. */
type SentRequest = { url: string; init: RequestInit | undefined };

/** What a live source's wrapper is built from in these tests. */
type LiveWrapperFakes = {
  readCsv: RelationCsvReader;
  fetch: (url: string, init?: RequestInit) => Promise<Response>;
};

/**
 * How one source type behaves. A live source's rows can change without
 * anyone re-importing the dataset, so its cached rows must go stale and it
 * must offer a refresh. Its wrapper is built from fakes so the same checks
 * run against every live source.
 */
type SourceTypeContract =
  | { isLive: false }
  | {
      isLive: true;
      columnTypes: CsvColumnTypes;
      makeWrapper: (fakes: LiveWrapperFakes) => SourceWrapper<DatasetRef>;
    };

const SOURCE_TYPE_CONTRACTS: Record<
  DatasetSource.SourceType,
  SourceTypeContract
> = {
  csv_file: { isLive: false },
  xlsx_file: { isLive: false },
  pdf_file: { isLive: false },
  // Acquired as a published catalog resource, with no max age.
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

const CONTEXT = {
  workspaceId: "99999999-9999-4999-8999-999999999999" as Workspace.Id,
  logger: console as unknown as ILogger,
};

const LIVE_SOURCE_CONTRACTS = Object.entries(SOURCE_TYPE_CONTRACTS).flatMap(
  ([sourceType, contract]) => {
    return contract.isLive ? [{ sourceType, contract }] : [];
  },
);

const SNAPSHOT_SOURCE_TYPES = Object.entries(SOURCE_TYPE_CONTRACTS).flatMap(
  ([sourceType, contract]) => {
    return contract.isLive ? [] : [sourceType as DatasetSource.SourceType];
  },
);

/**
 * Acquires the dataset through a live source's wrapper, answering its server
 * route with one CSV row, and returns what the wrapper did.
 */
async function _acquireThroughLiveSource(
  makeWrapper: (fakes: LiveWrapperFakes) => SourceWrapper<DatasetRef>,
) {
  const sentRequests: SentRequest[] = [];
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
  const acquired = await wrapper.acquire!(
    { ref: DATASET_REF, columns: "all" },
    CONTEXT,
  );
  return { acquired, readCsv, sentRequests };
}

describe("every dataset source type", () => {
  it("has a contract, so a new source type has to declare how it behaves", () => {
    expect(Object.keys(SOURCE_TYPE_CONTRACTS).sort()).toEqual(
      [...DatasetSource.SourceTypes].sort(),
    );
  });

  it.each(SNAPSHOT_SOURCE_TYPES)(
    "offers no manual refresh for %s, whose rows do not change under it",
    (sourceType) => {
      expect(getDatasetRefreshFromSourceType(sourceType)).toBeUndefined();
    },
  );
});

describe.each(LIVE_SOURCE_CONTRACTS)(
  "a live $sourceType dataset",
  ({ sourceType, contract }) => {
    it("offers a manual refresh, for a user who has just edited the source", () => {
      expect(
        getDatasetRefreshFromSourceType(sourceType as DatasetSource.SourceType),
      ).toBeDefined();
    });

    it("goes stale after the live-source max age, so its rows are acquired again", async () => {
      const { acquired } = await _acquireThroughLiveSource(
        contract.makeWrapper,
      );

      expect(acquired.maxAgeMs).toBe(
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
      ).toBe(`Bearer ${SESSION_ACCESS_TOKEN}`);
      // No third-party credential is fetched into the browser to read it.
      expect(apiGetMock).not.toHaveBeenCalled();
    });
  },
);
