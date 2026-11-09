import { where } from "@avandar/utils";
import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";
import { ConceptClient } from "@/clients/ontology/ConceptClient";
import { ConceptStatusClient } from "@/clients/ontology/ConceptStatusClient";
import { IndividualClient } from "@/clients/ontology/IndividualClient";
import { RAW_SQL_KEY_MARKER } from "@/views/DataExplorerApp/useDataQuery/isWorkspaceRawSqlDataQueryKey";
import { invalidateCaseStatusQueries } from "@/views/IndividualManagerApp/invalidateCaseStatusQueries/invalidateCaseStatusQueries";
import { makeRecordsListWhere } from "@/views/IndividualManagerApp/makeRecordsListWhere/makeRecordsListWhere";
import type { Concept } from "$/models/ontology/Concept/Concept";
import type { ConceptStatus } from "$/models/ontology/ConceptStatus/ConceptStatus";
import type { QueryKey } from "@tanstack/react-query";

const CONCEPT_ID = "00000000-0000-4000-8000-0000000000c1" as Concept.Id;
const OTHER_CONCEPT_ID = "00000000-0000-4000-8000-0000000000c2" as Concept.Id;
const STATUS_ID = "00000000-0000-4000-8000-0000000000a1" as ConceptStatus.Id;

type SeededKeys = {
  filteredRecords: QueryKey;
  recordCount: QueryKey;
  otherCaseTypeRecords: QueryKey;
  assigneeQueue: QueryKey;
  statuses: QueryKey;
  statusRecordCounts: QueryKey;
  caseType: QueryKey;
  dataQuery: QueryKey;
};

function _makeSeededCache(): { queryClient: QueryClient; keys: SeededKeys } {
  const queryClient = new QueryClient();
  const keys: SeededKeys = {
    filteredRecords: IndividualClient.QueryKeys.getAll(
      makeRecordsListWhere({
        conceptId: CONCEPT_ID,
        statusIds: [STATUS_ID],
        assignee: { kind: "anyone" },
      }),
    ),
    recordCount: IndividualClient.QueryKeys.getCount(
      makeRecordsListWhere({
        conceptId: CONCEPT_ID,
        statusIds: [],
        assignee: { kind: "anyone" },
      }),
    ),
    otherCaseTypeRecords: IndividualClient.QueryKeys.getAll(
      makeRecordsListWhere({
        conceptId: OTHER_CONCEPT_ID,
        statusIds: [],
        assignee: { kind: "anyone" },
      }),
    ),
    assigneeQueue: IndividualClient.QueryKeys.getAll({
      where: {
        assigned_to: { eq: "00000000-0000-4000-8000-0000000000b1" },
      },
    }),
    statuses: ConceptStatusClient.QueryKeys.getAll(
      where("concept_id", "eq", CONCEPT_ID),
    ),
    statusRecordCounts: ConceptStatusClient.QueryKeys.getRecordCounts({
      conceptId: CONCEPT_ID,
    }),
    caseType: ConceptClient.QueryKeys.getById({ id: CONCEPT_ID }),
    dataQuery: [
      { auth: "workspace", workspaceId: "w1" },
      undefined,
      RAW_SQL_KEY_MARKER,
      "select 1",
    ],
  };
  Object.values(keys).forEach((queryKey) => {
    queryClient.setQueryData(queryKey, "cached");
  });
  return { queryClient, keys };
}

function _isStale(queryClient: QueryClient, queryKey: QueryKey): boolean {
  return queryClient.getQueryState(queryKey)?.isInvalidated === true;
}

function _makeRouter(): { invalidate: ReturnType<typeof vi.fn> } {
  return {
    invalidate: vi.fn(() => {
      return Promise.resolve();
    }),
  };
}

describe("invalidateCaseStatusQueries", () => {
  it("marks the case type's record lists, record count, and status counts stale after a record's status changes", async () => {
    const { queryClient, keys } = _makeSeededCache();

    await invalidateCaseStatusQueries({
      queryClient,
      router: _makeRouter(),
      conceptId: CONCEPT_ID,
      change: "recordStatus",
    });

    expect(_isStale(queryClient, keys.filteredRecords)).toBe(true);
    expect(_isStale(queryClient, keys.recordCount)).toBe(true);
    expect(_isStale(queryClient, keys.statusRecordCounts)).toBe(true);
  });

  it("marks the assignee queue stale when a record's assignee changes, and leaves another case type's list alone", async () => {
    const { queryClient, keys } = _makeSeededCache();
    const router = _makeRouter();

    await invalidateCaseStatusQueries({
      queryClient,
      router,
      conceptId: CONCEPT_ID,
      change: "recordAssignment",
    });

    expect(_isStale(queryClient, keys.assigneeQueue)).toBe(true);
    expect(_isStale(queryClient, keys.filteredRecords)).toBe(true);
    expect(_isStale(queryClient, keys.otherCaseTypeRecords)).toBe(false);
    expect(router.invalidate).toHaveBeenCalledOnce();
  });

  it("leaves another case type's records alone", async () => {
    const { queryClient, keys } = _makeSeededCache();

    await invalidateCaseStatusQueries({
      queryClient,
      router: _makeRouter(),
      conceptId: CONCEPT_ID,
      change: "recordStatus",
    });

    expect(_isStale(queryClient, keys.otherCaseTypeRecords)).toBe(false);
  });

  it("marks every Data Explorer query stale, since a query can group by status", async () => {
    const { queryClient, keys } = _makeSeededCache();

    await invalidateCaseStatusQueries({
      queryClient,
      router: _makeRouter(),
      conceptId: CONCEPT_ID,
      change: "recordStatus",
    });

    expect(_isStale(queryClient, keys.dataQuery)).toBe(true);
  });

  it("reloads the open route's loader data", async () => {
    const { queryClient } = _makeSeededCache();
    const router = _makeRouter();

    await invalidateCaseStatusQueries({
      queryClient,
      router,
      conceptId: CONCEPT_ID,
      change: "recordStatus",
    });

    expect(router.invalidate).toHaveBeenCalledTimes(1);
  });

  it("marks the case type and its statuses stale only when its status set is saved", async () => {
    const recordChange = _makeSeededCache();
    const setSave = _makeSeededCache();

    await invalidateCaseStatusQueries({
      queryClient: recordChange.queryClient,
      router: _makeRouter(),
      conceptId: CONCEPT_ID,
      change: "recordStatus",
    });
    await invalidateCaseStatusQueries({
      queryClient: setSave.queryClient,
      router: _makeRouter(),
      conceptId: CONCEPT_ID,
      change: "statusSet",
    });

    expect(_isStale(recordChange.queryClient, recordChange.keys.caseType)).toBe(
      false,
    );
    expect(_isStale(setSave.queryClient, setSave.keys.caseType)).toBe(true);
    expect(_isStale(setSave.queryClient, setSave.keys.statuses)).toBe(true);
  });
});
