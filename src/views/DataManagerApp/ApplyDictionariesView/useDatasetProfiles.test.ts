import { describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@/test-utils";
import { useDatasetProfiles } from "@/views/DataManagerApp/ApplyDictionariesView/useDatasetProfiles";
import type { ColumnProfile } from "$/models/dataDictionaries/ColumnProfile/ColumnProfile";
import type { DictionaryBinding } from "$/models/dataDictionaries/DictionaryBinding/DictionaryBinding";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";

const { profileMock } = vi.hoisted(() => {
  return { profileMock: vi.fn() };
});

vi.mock(
  "@/lib/dataDictionaries/profileDatasetColumns/profileDatasetColumns",
  () => {
    return { profileDatasetColumns: profileMock };
  },
);
vi.mock("@/hooks/workspaces/useCurrentWorkspace", () => {
  return {
    useCurrentWorkspace: () => {
      return { id: "workspace-1", slug: "demo" };
    },
  };
});

const DATASET = { id: "dataset-1", name: "Kings" } as Dataset.T;

function _column(name: string): DatasetColumn.T {
  return {
    id: `col-${name}`,
    name,
    dataType: "varchar",
    columnIdx: 0,
  } as DatasetColumn.T;
}

describe("useDatasetProfiles", () => {
  it("drops a read that finishes after the columns changed", async () => {
    let finishFirst: (profiles: ColumnProfile.T[]) => void = () => {
      return undefined;
    };
    profileMock
      .mockReturnValueOnce(
        new Promise((resolve) => {
          finishFirst = resolve;
        }),
      )
      .mockResolvedValueOnce([{ columnName: "renamed" }]);
    const { result, rerender } = renderHook(
      (props: { columns: DatasetColumn.T[] }) => {
        return useDatasetProfiles({
          dataset: DATASET,
          columns: props.columns,
          bindings: [],
        });
      },
      { initialProps: { columns: [_column("GENDER")] } },
    );

    rerender({ columns: [_column("renamed")] });
    await act(async () => {
      finishFirst([{ columnName: "GENDER" } as ColumnProfile.T]);
    });

    await waitFor(() => {
      expect(result.current).toEqual({
        status: "ready",
        profiles: [{ columnName: "renamed" }],
      });
    });
  });

  it("profiles a converted column as the type it is stored as", async () => {
    profileMock.mockReset().mockResolvedValue([]);
    const gender = { ..._column("GENDER"), columnIdx: 1 };
    const caseId = _column("case_id");
    const bindings = [
      {
        datasetColumnId: gender.id,
        mode: "convert",
        replacedDataType: "bigint",
      },
      {
        datasetColumnId: caseId.id,
        mode: "reference",
        replacedDataType: undefined,
      },
    ] as DictionaryBinding.T[];

    renderHook(() => {
      return useDatasetProfiles({
        dataset: DATASET,
        columns: [gender, caseId],
        bindings,
      });
    });

    await waitFor(() => {
      expect(profileMock).toHaveBeenCalledTimes(1);
    });
    expect(profileMock.mock.calls[0]?.[0].columns).toEqual([
      { name: "case_id", dataType: "varchar" },
      { name: "GENDER", dataType: "bigint" },
    ]);
  });
});
