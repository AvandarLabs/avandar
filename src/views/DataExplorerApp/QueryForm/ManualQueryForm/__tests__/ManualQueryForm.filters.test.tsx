/** Controlled forms emit filters using the same ready catalog as the picker. */
import { Model } from "@avandar/models";
import { useState } from "react";
import { expect, it, vi } from "vitest";
import { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import { StructuredQuery } from "$/models/queries/StructuredQuery/StructuredQuery";
import { structuredQueryToSql } from "$/models/queries/StructuredQuery/structuredQueryToSql/structuredQueryToSql";
import {
  fireEvent,
  render,
  screen,
  TestProviders,
  waitFor,
  within,
} from "@/test-utils";
import { ManualQueryForm } from "@/views/DataExplorerApp/QueryForm/ManualQueryForm/ManualQueryForm";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";
import type { ReactNode } from "react";

const metadata = vi.hoisted(() => {
  return { columns: [] as QueryColumn.T[] };
});
vi.mock("@/views/DataExplorerApp/useQueryColumnsForDataSource", () => {
  return {
    useQueryColumnsForDataSource: () => {
      return {
        columns: metadata.columns,
        isLoading: false,
        isReady: true,
      };
    },
  };
});
vi.mock("@/views/DataExplorerApp/QueryDataSourceSelect", () => {
  return {
    QueryDataSourceSelect: () => {
      return null;
    },
  };
});
vi.mock(
  "@/views/DataExplorerApp/QueryForm/useManualQueryDataSourceChange",
  () => {
    return {
      useManualQueryDataSourceChange: () => {
        return {
          onDataSourceChange: () => {},
          isLargeDatasetLimitHintVisible: false,
          dismissLargeDatasetLimitHint: () => {},
        };
      },
    };
  },
);

function ControlledFormHarness(): ReactNode {
  const [query, setQuery] = useState<StructuredQuery.Partial>(() => {
    return {
      ...StructuredQuery.makeEmpty(),
      dataSource: Model.make("Dataset", {
        id: "cases",
        name: "cases",
      }) as Dataset.T,
      queryColumns: [metadata.columns[0]!],
    };
  });
  const [sql, setSql] = useState("");
  return (
    <>
      <ManualQueryForm
        query={query}
        isStructuredQueryInSync
        handlers={{
          onSetDataSource: () => {},
          onSetColumns: () => {},
          onSetColumnAggregation: () => {},
          onSetOrderByColumn: () => {},
          onSetOrderByDirection: () => {},
          onSetLimit: () => {},
          onSetFilters: (filters, sourceColumns) => {
            const changed = { ...query, filters, sourceColumns };
            setQuery(changed);
            setSql(structuredQueryToSql(changed));
          },
        }}
      />
      <output data-testid="emitted-sql">{sql}</output>
    </>
  );
}

it("filters an unselected source field through a controlled form's catalog", async () => {
  metadata.columns = ["district", "cnt"].map((name) => {
    return QueryColumn.makeFromDatasetColumn(
      Model.make("DatasetColumn", {
        id: `dc_${name}`,
        name,
        originalName: name,
        dataType: name === "cnt" ? "bigint" : "varchar",
        columnIdx: 0,
      }) as DatasetColumn.T,
    );
  });
  render(<ControlledFormHarness />, { wrapper: TestProviders });
  fireEvent.click(screen.getByText("+ Condition"));
  fireEvent.click(
    within(screen.getByTestId("query-filters-field")).getByLabelText("Column", {
      selector: "input",
    }),
  );
  fireEvent.click(await screen.findByRole("option", { name: "cnt" }));
  fireEvent.change(screen.getByTestId("filter-value-scalar"), {
    target: { value: "5" },
  });
  fireEvent.blur(screen.getByTestId("filter-value-scalar"));
  await waitFor(() => {
    return expect(screen.getByTestId("emitted-sql")).toHaveTextContent(
      'where "cnt" = 5',
    );
  });
  expect(screen.getByTestId("emitted-sql")).toHaveTextContent(
    'select "district" as "district"',
  );
});
