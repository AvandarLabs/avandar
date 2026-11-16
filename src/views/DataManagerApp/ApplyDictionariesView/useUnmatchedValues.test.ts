import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@/test-utils";
import {
  COUNTY,
  GENDER,
  SEX_LIST,
  SEX_PICK,
} from "@/views/DataManagerApp/ApplyDictionariesView/__tests__/applyFlow.fixtures";
import { useUnmatchedValues } from "@/views/DataManagerApp/ApplyDictionariesView/useUnmatchedValues";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";

const mocks = vi.hoisted(() => {
  return { runQueryMock: vi.fn(), toSqlMock: vi.fn() };
});

vi.mock("@/clients/qetl/WorkspaceQuerySession/WorkspaceQuerySession", () => {
  return { WorkspaceQuerySession: { runQuery: mocks.runQueryMock } };
});
vi.mock("@/hooks/workspaces/useCurrentWorkspace", () => {
  return {
    useCurrentWorkspace: () => {
      return { id: "workspace-1" };
    },
  };
});
vi.mock(
  "$/models/dataDictionaries/ColumnConversion/ColumnConversion",
  async (importOriginal) => {
    const original =
      await importOriginal<
        typeof import("$/models/dataDictionaries/ColumnConversion/ColumnConversion")
      >();
    return {
      ...original,
      ColumnConversion: {
        ...original.ColumnConversion,
        toUnmatchedValuesSql: mocks.toSqlMock,
      },
    };
  },
);

const DATASET = { id: "dataset-1", name: "Bronx" } as Dataset.T;
const CODE_LISTS = new Map([[SEX_LIST.id, SEX_LIST]]);

describe("useUnmatchedValues", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.toSqlMock.mockReturnValue("SELECT unmatched");
    mocks.runQueryMock.mockResolvedValue({
      data: [
        { value: "7", rows: 3n },
        { value: " X ", rows: 1n },
      ],
    });
  });

  it("reads each coded column's values no pair matches from the raw view", async () => {
    const { result } = renderHook(() => {
      return useUnmatchedValues({
        dataset: DATASET,
        columns: [GENDER, COUNTY],
        picks: { [GENDER.id]: SEX_PICK },
        codeLists: CODE_LISTS,
      });
    });

    await waitFor(() => {
      expect(result.current.status).toBe("ready");
    });
    expect(mocks.toSqlMock).toHaveBeenCalledTimes(1);
    expect(mocks.toSqlMock).toHaveBeenCalledWith(
      expect.objectContaining({
        relationSql: '"ava_raw_dataset-1"',
        valueSql: '"GENDER"',
        limit: 100,
        conversion: expect.objectContaining({
          pairs: SEX_LIST.pairs,
          overrides: [],
        }),
      }),
    );
    expect(mocks.runQueryMock).toHaveBeenCalledWith({
      workspaceId: "workspace-1",
      neededColumnsByDatasetId: { "dataset-1": ["GENDER"] },
      rawSql: "SELECT unmatched",
    });
    expect(result.current).toEqual({
      status: "ready",
      result: new Map([
        [
          GENDER.id,
          [
            { value: "7", valueKey: "7", rowCount: 3 },
            { value: " X ", valueKey: "x", rowCount: 1 },
          ],
        ],
      ]),
    });
  });

  it("runs nothing when no picked column has a code list", async () => {
    const { result } = renderHook(() => {
      return useUnmatchedValues({
        dataset: DATASET,
        columns: [GENDER],
        picks: { [GENDER.id]: { ...SEX_PICK, codeListId: undefined } },
        codeLists: CODE_LISTS,
      });
    });

    await waitFor(() => {
      expect(result.current).toEqual({ status: "ready", result: new Map() });
    });
    expect(mocks.runQueryMock).not.toHaveBeenCalled();
  });
});
