import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AvandarAppProvider } from "@/components/providers/AvandarAppProvider";
import { VisualizationContainer } from "@/components/VisualizationContainer/VisualizationContainer";
import { render } from "@/test-utils";
import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import type { QueryResult } from "$/models/queries/QueryResult/QueryResult";
import type { UnknownDataFrame } from "@avandar/utils";

const COLUMNS: readonly QueryResult.ColumnWithId[] = [
  { id: "category" as QueryColumn.Id, name: "category", dataType: "varchar" },
  { id: "value" as QueryColumn.Id, name: "value", dataType: "double" },
  { id: "score" as QueryColumn.Id, name: "score", dataType: "double" },
];

const DATA = [
  { category: "Alpha", value: 10, score: 1 },
  { category: "Beta", value: 20, score: 2 },
  { category: "Gamma", value: 30, score: 3 },
];

const EMPTY_DATE_COLUMNS: ReadonlySet<string> = new Set();

function renderViz(
  vizConfig: Parameters<typeof VisualizationContainer>[0]["vizConfig"],
  data: UnknownDataFrame = DATA,
): ReturnType<typeof render> {
  // A plugin chart looks its manifest up through React Query, so the
  // container renders under a query client, as it does in the app.
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <AvandarAppProvider>
      <QueryClientProvider client={queryClient}>
        <VisualizationContainer
          columns={COLUMNS}
          data={data}
          dateColumns={EMPTY_DATE_COLUMNS}
          vizConfig={vizConfig}
        />
      </QueryClientProvider>
    </AvandarAppProvider>,
  );
}

/**
 * Columns, rows, and a `renderViz` helper that mounts `VisualizationContainer`
 * over them inside the app providers and a query client, so each test
 * supplies only the `AvaVizConfig` it checks. Used by the
 * `VisualizationContainer` tests.
 */
export const VisualizationContainerTestFixtures = {
  COLUMNS,
  DATA,
  EMPTY_DATE_COLUMNS,
  renderViz,
};
