import { Model } from "@avandar/models";
import { expect, it, vi } from "vitest";
import { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import { fireEvent, render, screen } from "@/test-utils";
import { QueryColumnMultiSelect } from "@/views/DataExplorerApp/QueryColumnMultiSelect/QueryColumnMultiSelect";
/** Exercises selection IDs against supplied source metadata. */
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";

vi.mock("@/clients/datasets/DatasetColumnClient", () => {
  return {
    DatasetColumnClient: {
      useGetAll: () => {
        return [undefined, false];
      },
    },
  };
});
vi.mock("@/clients/ontology/ConceptAttributeClient", () => {
  return {
    ConceptAttributeClient: {
      useGetAll: () => {
        return [undefined, false];
      },
    },
  };
});

it("allocates a separate projection ID when adding a source field", async () => {
  const source = QueryColumn.makeFromDatasetColumn(
    Model.make("DatasetColumn", {
      id: "revenue",
      name: "revenue",
      dataType: "double",
    }) as DatasetColumn.T,
  );
  let selection: QueryColumn.T[] = [];
  render(
    <QueryColumnMultiSelect
      label="Columns"
      placeholder="Choose columns"
      sourceCatalog={{
        sourceKey: undefined,
        status: "ready",
        columns: [source],
      }}
      onChange={(columns) => {
        selection = [...columns];
      }}
    />,
  );
  fireEvent.click(screen.getByRole("combobox", { name: "Columns" }));
  fireEvent.click(await screen.findByRole("option", { name: "revenue" }));
  expect(selection).toHaveLength(1);
  expect(selection[0]?.baseColumn.id).toBe(source.baseColumn.id);
  expect(selection[0]?.id).not.toBe(source.id);
});
