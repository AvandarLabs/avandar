import { beforeEach, describe, expect, it, vi } from "vitest";
import { uuid } from "$/lib/uuid";
import type { Concept } from "$/models/ontology/Concept/Concept";
import type { ConceptStatus } from "$/models/ontology/ConceptStatus/ConceptStatus";

const { fromMock, rpcMock } = vi.hoisted(() => {
  return { fromMock: vi.fn(), rpcMock: vi.fn() };
});

vi.mock("$/db/supabase/AvaSupabase", () => {
  return {
    AvaSupabase: {
      db: () => {
        return { from: fromMock, rpc: rpcMock };
      },
    },
  };
});

const { ConceptStatusClient } = await import("./ConceptStatusClient");

const CONCEPT_ID = uuid<Concept.Id>();
const ACTIVE_ID = uuid<ConceptStatus.Id>();
const CLOSED_ID = uuid<ConceptStatus.Id>();

function _createStatusIdsQuery(statusIds: readonly string[]): {
  select: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  throwOnError: ReturnType<typeof vi.fn>;
} {
  const query = {
    select: vi.fn(() => {
      return query;
    }),
    eq: vi.fn(() => {
      return query;
    }),
    throwOnError: vi.fn(() => {
      return Promise.resolve({
        data: statusIds.map((id) => {
          return { id };
        }),
      });
    }),
  };
  return query;
}

function _createCountQuery(
  countsByStatusId: Readonly<Record<string, number>>,
): {
  select: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  throwOnError: ReturnType<typeof vi.fn>;
} {
  let statusId = "";
  const query = {
    select: vi.fn(() => {
      return query;
    }),
    eq: vi.fn((column: string, value: string) => {
      if (column === "status_id") {
        statusId = value;
      }
      return query;
    }),
    throwOnError: vi.fn(() => {
      return Promise.resolve({ count: countsByStatusId[statusId] ?? 0 });
    }),
  };
  return query;
}

describe("ConceptStatusClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("counts each status's records, including statuses with none", async () => {
    fromMock.mockImplementation((tableName: string) => {
      return tableName === "concept_statuses"
        ? _createStatusIdsQuery([ACTIVE_ID, CLOSED_ID])
        : _createCountQuery({ [ACTIVE_ID]: 3 });
    });

    const recordCounts = await ConceptStatusClient.getRecordCounts({
      conceptId: CONCEPT_ID,
    });

    expect(recordCounts).toEqual({ [ACTIVE_ID]: 3, [CLOSED_ID]: 0 });
  });

  it("sends a status set to the save RPC under its parameter names", async () => {
    rpcMock.mockReturnValue({
      throwOnError: () => {
        return Promise.resolve({ data: null });
      },
    });
    const payload: ConceptStatus.SavePayload = {
      conceptId: CONCEPT_ID,
      statuses: [
        {
          id: ACTIVE_ID,
          name: "Active",
          description: undefined,
          color: "#40c057",
          position: 0,
        },
      ],
      defaultStatusId: ACTIVE_ID,
      replacements: { [CLOSED_ID]: ACTIVE_ID },
    };

    await ConceptStatusClient.saveStatusSet(payload);

    expect(rpcMock).toHaveBeenCalledWith("rpc_concept_statuses__save", {
      p_concept_id: CONCEPT_ID,
      p_statuses: payload.statuses,
      p_default_status_id: ACTIVE_ID,
      p_replacements: { [CLOSED_ID]: ACTIVE_ID },
    });
  });
});
