/** Verifies local catalog ownership for standalone source controls. */
import { Model } from "@avandar/models";
import { expect, it, vi } from "vitest";
import { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import { renderHook } from "@/test-utils";
import { useSourceColumnCatalog } from "@/views/DataExplorerApp/useSourceColumnCatalog/useSourceColumnCatalog";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";
import type { QueryDataSource } from "$/models/queries/QueryDataSource/QueryDataSource";

const loader = vi.hoisted(() => {
  return { columns: [] as QueryColumn.T[], isLoading: true };
});
vi.mock("@/views/DataExplorerApp/useQueryColumnsForDataSource", () => {
  return {
    useQueryColumnsForDataSource: () => {
      return { ...loader };
    },
  };
});

it("retains source IDs on refresh and distinguishes loading from ready-empty", () => {
  const firstColumn = QueryColumn.makeFromDatasetColumn(
    Model.make("DatasetColumn", {
      id: "dc_revenue",
      name: "revenue",
      dataType: "double",
    }) as DatasetColumn.T,
  );
  loader.columns = [];
  loader.isLoading = true;
  const sourceKey: QueryDataSource.TypedId = {
    __type: "Dataset",
    id: "sales" as Dataset.Id,
  };
  const { result, rerender } = renderHook(
    (props) => {
      return useSourceColumnCatalog(props.sourceKey);
    },
    { initialProps: { sourceKey } },
  );
  expect(result.current.status).toBe("loading");
  loader.columns = [firstColumn];
  loader.isLoading = false;
  rerender({ sourceKey: { ...sourceKey } });
  const retainedId = result.current.columns[0]?.id;
  loader.columns = [
    QueryColumn.makeFromDatasetColumn({
      ...firstColumn.baseColumn,
      name: "net_revenue",
    } as DatasetColumn.T),
  ];
  rerender({ sourceKey });
  expect(result.current.columns[0]).toMatchObject({
    id: retainedId,
    baseColumn: { name: "net_revenue" },
  });
  const incomingId = loader.columns[0]?.id;
  rerender({ sourceKey: { ...sourceKey, id: "other" as Dataset.Id } });
  expect(result.current.columns[0]?.id).toBe(incomingId);
  loader.columns = [];
  rerender({ sourceKey });
  expect(result.current).toMatchObject({ status: "ready", columns: [] });
});
