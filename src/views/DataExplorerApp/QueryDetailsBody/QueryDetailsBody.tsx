import { Tabs } from "@ui";
import { ManualQueryForm } from "@/views/DataExplorerApp/QueryForm/ManualQueryForm";
import { SqlQueryView } from "@/views/DataExplorerApp/SqlQueryView/SqlQueryView";

/**
 * Body of the "Query Details" floating window. Lets the user inspect or edit
 * the current query in two ways: a structured form (Manual) and the raw SQL
 * (SQL). Both tabs read and write through `DataExplorerStateManager` so they
 * stay in sync with the canvas and with whichever AI prompt produced the SQL.
 */
export function QueryDetailsBody(): JSX.Element {
  return (
    <Tabs
      indicatorVariant="floating"
      tabIds={["manual-query", "sql"] as const}
      renderTabHeader={{
        "manual-query": "Manual Query",
        sql: "SQL",
      }}
      px="xs"
      py="sm"
      renderTabPanel={{
        "manual-query": () => {
          return <ManualQueryForm withinPortal />;
        },
        sql: () => {
          return <SqlQueryView />;
        },
      }}
    />
  );
}
