import { Model } from "@avandar/models";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { uuid } from "$/lib/uuid";
import { act, renderHook } from "@/test-utils";
import { useRecordFields } from "@/views/IndividualManagerApp/SingleIndividualView/useRecordFields/useRecordFields";
import type { Concept } from "$/models/ontology/Concept/Concept";
import type { ConceptAttribute } from "$/models/ontology/ConceptAttribute/ConceptAttribute";
import type { ConceptStatus } from "$/models/ontology/ConceptStatus/ConceptStatus";
import type { Individual } from "$/models/ontology/Individual/Individual";
import type { User } from "$/models/User/User";
import type { Workspace } from "$/models/Workspace/Workspace";
import type { RecordFields } from "@/views/IndividualManagerApp/SingleIndividualView/useRecordFields/useRecordFields";
import type { RenderHookResult } from "@testing-library/react";

/** The parts of a query result the hook reads. */
type QueryState = {
  isError: boolean;
  isRefetching: boolean;
  refetch: ReturnType<typeof vi.fn>;
};

const {
  attributesResultRef,
  mappingsResultRef,
  datasetsResultRef,
  valuesResultRef,
  useGetConceptRecordValuesMock,
} = vi.hoisted(() => {
  return {
    attributesResultRef: { current: [] as unknown[] },
    mappingsResultRef: { current: [] as unknown[] },
    datasetsResultRef: { current: [] as unknown[] },
    valuesResultRef: { current: [] as unknown[] },
    useGetConceptRecordValuesMock: vi.fn(),
  };
});

vi.mock("@/clients/ontology/ConceptAttributeClient", () => {
  return {
    ConceptAttributeClient: {
      useGetAll: () => {
        return attributesResultRef.current;
      },
      useGetAllAttributeMappings: () => {
        return mappingsResultRef.current;
      },
    },
  };
});

vi.mock("@/clients/datasets/DatasetClient/DatasetClient", () => {
  return {
    DatasetClient: {
      useGetAll: () => {
        return datasetsResultRef.current;
      },
    },
  };
});

vi.mock(
  "@/clients/ontology/ConceptRecordValuesClient/ConceptRecordValuesClient",
  () => {
    return {
      ConceptRecordValuesClient: {
        useGetConceptRecordValues: useGetConceptRecordValuesMock,
      },
    };
  },
);

const WORKSPACE_ID = uuid<Workspace.Id>();
const NOW = "2026-11-06T00:00:00.000Z";

const CONCEPT = Model.make("Concept", {
  id: uuid<Concept.Id>(),
  workspaceId: WORKSPACE_ID,
  ownerId: uuid<User.Id>(),
  name: "Measles cases",
  description: undefined,
  createdAt: NOW,
  updatedAt: NOW,
  allowManualCreation: false,
  defaultStatusId: uuid<ConceptStatus.Id>(),
});

const RECORD: Individual.T = {
  assignedTo: undefined,
  conceptId: CONCEPT.id,
  createdAt: NOW,
  externalId: "CH-0001",
  id: uuid<Individual.Id>(),
  missingFromSourceAt: undefined,
  name: "Case 001",
  statusId: CONCEPT.defaultStatusId,
  updatedAt: NOW,
  workspaceId: WORKSPACE_ID,
};

const AGE = Model.make("ConceptAttribute", {
  id: uuid<ConceptAttribute.Id>(),
  conceptId: CONCEPT.id,
  workspaceId: WORKSPACE_ID,
  name: "age",
  description: undefined,
  createdAt: NOW,
  updatedAt: NOW,
  dataType: "bigint",
  mappingType: "dataset_column",
  isLabel: false,
  isIdentifier: false,
  allowManualEdit: false,
  isArray: false,
});

function _makeQueryState(isError: boolean): QueryState {
  return {
    isError,
    isRefetching: false,
    refetch: vi.fn(async () => {
      return undefined;
    }),
  };
}

/** A values read that has returned the record's age. */
function _makeLoadedValuesResult(): unknown[] {
  return [
    [{ externalId: "CH-0001", valuesByAttributeId: { [AGE.id]: 41 } }],
    false,
    _makeQueryState(false),
  ];
}

function _renderRecordFields(): RenderHookResult<RecordFields, unknown> {
  return renderHook(() => {
    return useRecordFields({ concept: CONCEPT, individual: RECORD });
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  attributesResultRef.current = [[AGE], false, _makeQueryState(false)];
  mappingsResultRef.current = [[], false, _makeQueryState(false)];
  datasetsResultRef.current = [[], false, _makeQueryState(false)];
  valuesResultRef.current = [undefined, true, _makeQueryState(false)];
  useGetConceptRecordValuesMock.mockImplementation(() => {
    return valuesResultRef.current;
  });
});

describe("useRecordFields", () => {
  // A failed read must end the loading state, or the rail shows placeholder
  // rows forever.
  it("reports a load error instead of loading forever when the values fail to load", () => {
    valuesResultRef.current = [undefined, false, _makeQueryState(true)];

    const { result } = _renderRecordFields();

    expect(result.current.isLoadError).toBe(true);
  });

  it("reports a load error when the fields fail to load", () => {
    attributesResultRef.current = [undefined, false, _makeQueryState(true)];

    const { result } = _renderRecordFields();

    expect(result.current.isLoadError).toBe(true);
  });

  // Placeholder rows, not "No value", until the values are known.
  it("keeps the fields loading until the record's values arrive", () => {
    const { result } = _renderRecordFields();

    expect(result.current.rows).toBeUndefined();
  });

  // The source lines would otherwise appear after the values and shift the
  // rail.
  it("keeps the fields loading until their sources arrive", () => {
    mappingsResultRef.current = [undefined, true, _makeQueryState(false)];
    valuesResultRef.current = _makeLoadedValuesResult();

    const { result } = _renderRecordFields();

    expect(result.current.rows).toBeUndefined();
  });

  it("shows the fields without sources when their sources fail to load", () => {
    mappingsResultRef.current = [undefined, false, _makeQueryState(true)];
    valuesResultRef.current = _makeLoadedValuesResult();

    const { result } = _renderRecordFields();

    expect(result.current.rows).toEqual([
      { id: AGE.id, name: "age", value: 41, sourceNames: [] },
    ]);
    expect(result.current.isLoadError).toBe(false);
  });

  it("retries only the read that failed", () => {
    const attributesState = _makeQueryState(false);
    const valuesState = _makeQueryState(true);
    attributesResultRef.current = [[AGE], false, attributesState];
    valuesResultRef.current = [undefined, false, valuesState];
    const { result } = _renderRecordFields();

    act(() => {
      result.current.retry();
    });

    expect(valuesState.refetch).toHaveBeenCalledTimes(1);
    expect(attributesState.refetch).not.toHaveBeenCalled();
  });

  it("retries both reads when both failed", () => {
    const attributesState = _makeQueryState(true);
    const valuesState = _makeQueryState(true);
    attributesResultRef.current = [undefined, false, attributesState];
    valuesResultRef.current = [undefined, false, valuesState];
    const { result } = _renderRecordFields();

    act(() => {
      result.current.retry();
    });

    expect(attributesState.refetch).toHaveBeenCalledTimes(1);
    expect(valuesState.refetch).toHaveBeenCalledTimes(1);
  });

  // Only a retry spins the button, not a background refresh of a read that
  // succeeded.
  it("reports no retry while only a healthy read refreshes", () => {
    attributesResultRef.current = [
      [AGE],
      false,
      { ..._makeQueryState(false), isRefetching: true },
    ];
    valuesResultRef.current = [undefined, false, _makeQueryState(true)];

    const { result } = _renderRecordFields();

    expect(result.current.isRetrying).toBe(false);
  });

  // A case type with no fields has nothing to compute, so it never starts a
  // DuckDB query.
  it("shows no fields without reading values when the case type has none", () => {
    attributesResultRef.current = [[], false, _makeQueryState(false)];

    const { result } = _renderRecordFields();

    expect(result.current.rows).toEqual([]);
    expect(useGetConceptRecordValuesMock).toHaveBeenCalledWith(
      expect.objectContaining({ useQueryOptions: { enabled: false } }),
    );
  });

  it("builds one row per field from the record's values", () => {
    valuesResultRef.current = _makeLoadedValuesResult();

    const { result } = _renderRecordFields();

    expect(result.current.rows).toEqual([
      { id: AGE.id, name: "age", value: 41, sourceNames: [] },
    ]);
  });
});
