import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@/test-utils";
import {
  COUNTY,
  GENDER,
  SEX_LIST,
  SEX_PICK,
} from "@/views/DataManagerApp/ApplyDictionariesView/__tests__/applyFlow.fixtures";
import { buildMatchConversion } from "@/views/DataManagerApp/ApplyDictionariesView/applyInputs/applyInputs";
import {
  buildPreviewSql,
  usePreviewRows,
} from "@/views/DataManagerApp/ApplyDictionariesView/usePreviewRows";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";

const mocks = vi.hoisted(() => {
  return { runQueryMock: vi.fn() };
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

const DATASET = { id: "dataset-1", name: "Bronx" } as Dataset.T;
const CONVERSION = {
  ...buildMatchConversion({
    column: GENDER,
    pick: SEX_PICK,
    codeList: SEX_LIST,
  }),
  isOrdered: true,
};
const COLUMNS = [
  { column: GENDER, conversion: CONVERSION },
  { column: COUNTY, conversion: undefined },
];

describe("usePreviewRows", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("reads 50 stored rows with each converted column's result beside it", () => {
    const sql = buildPreviewSql({ datasetId: DATASET.id, columns: COLUMNS });

    expect(sql).toMatch(/^SELECT CAST\("GENDER" AS VARCHAR\) AS "r0", /);
    expect(sql).toContain('AS "c0"');
    expect(sql).toContain('CAST("county" AS VARCHAR) AS "r1"');
    expect(sql).not.toContain('"c1"');
    // An ordered list previews as text: its ENUM needs the data's kept values.
    expect(sql).not.toContain("ENUM");
    expect(sql).toMatch(/FROM "ava_raw_dataset-1" LIMIT 50$/);
  });

  it("reads nothing until the drawer is open, then lines cells up with columns", async () => {
    mocks.runQueryMock.mockResolvedValue({
      data: [
        { r0: "1", c0: "Male", r1: "Bronx" },
        { r0: null, c0: null, r1: "Kings" },
      ],
    });
    const { result, rerender } = renderHook(
      ({ isEnabled }) => {
        return usePreviewRows({
          dataset: DATASET,
          columns: COLUMNS,
          isEnabled,
        });
      },
      { initialProps: { isEnabled: false } },
    );
    expect(mocks.runQueryMock).not.toHaveBeenCalled();

    rerender({ isEnabled: true });

    await waitFor(() => {
      expect(result.current).toEqual({
        status: "ready",
        result: [
          [
            { raw: "1", converted: "Male" },
            { raw: "Bronx", converted: undefined },
          ],
          [
            { raw: "", converted: "" },
            { raw: "Kings", converted: undefined },
          ],
        ],
      });
    });
  });
});
