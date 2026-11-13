import { describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@/test-utils";
import { useDatasetProfiles } from "@/views/DataManagerApp/ApplyDictionariesView/useDatasetProfiles";
import type { ColumnProfile } from "$/models/dataDictionaries/ColumnProfile/ColumnProfile";
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
        return useDatasetProfiles({ dataset: DATASET, columns: props.columns });
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
});
